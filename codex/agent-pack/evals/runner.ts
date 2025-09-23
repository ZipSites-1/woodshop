import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

export interface ScenarioToolExpectation {
  name: string;
  order: number;
  consent_required?: boolean;
  must_precede?: string[];
  expect_warnings?: boolean;
}

export interface ScenarioDefinition {
  name: string;
  description: string;
  seed: number;
  prompt: string;
  expectations: {
    tools: ScenarioToolExpectation[];
  };
  artifacts?: {
    path: string;
    sha256?: string;
  }[];
}

function parseScenarioJson(raw: string): ScenarioDefinition {
  return JSON.parse(raw) as ScenarioDefinition;
}

async function loadScenario(filePath: string): Promise<ScenarioDefinition> {
  const raw = await fs.readFile(filePath, "utf8");
  return parseScenarioJson(raw);
}

export async function loadScenarios(root = path.resolve("codex/agent-pack/evals/scenarios")): Promise<ScenarioDefinition[]> {
  const entries = await fs.readdir(root);
  const scenarios: ScenarioDefinition[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const scenario = await loadScenario(path.join(root, entry));
    scenarios.push(scenario);
  }
  return scenarios.sort((a, b) => a.name.localeCompare(b.name));
}

interface TraceStep {
  phase: string;
  tool?: string;
  consent_token?: string | null;
  warnings?: string[];
}

interface TraceDocument {
  scenario?: string;
  seed?: number;
  steps: TraceStep[];
}

interface EvaluationIssue {
  level: "error" | "warning";
  message: string;
}

interface EvaluationResult {
  scenario: ScenarioDefinition;
  tracePath: string;
  passed: boolean;
  issues: EvaluationIssue[];
}

function computeSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function verifyArtifacts(scenario: ScenarioDefinition, issues: EvaluationIssue[]): Promise<void> {
  if (!scenario.artifacts) return;
  for (const artifact of scenario.artifacts) {
    try {
      const data = await fs.readFile(artifact.path);
      const sha = computeSha256(data);
      if (artifact.sha256 && artifact.sha256 !== sha) {
        issues.push({
          level: "error",
          message: `${artifact.path} hash mismatch (expected ${artifact.sha256}, got ${sha})`,
        });
      }
    } catch (error) {
      issues.push({
        level: "error",
        message: `Missing artifact ${artifact.path}: ${(error as Error).message}`,
      });
    }
  }
}

function evaluateTraceAgainstScenario(
  scenario: ScenarioDefinition,
  trace: TraceDocument,
  tracePath: string,
): EvaluationResult {
  const issues: EvaluationIssue[] = [];
  const toolSteps = (trace.steps ?? []).filter((step) => typeof step.tool === "string");
  const expected = [...scenario.expectations.tools].sort((a, b) => a.order - b.order);

  if (toolSteps.length < expected.length) {
    issues.push({ level: "error", message: `Trace has ${toolSteps.length} tool calls but ${expected.length} expected.` });
  }

  expected.forEach((expectation, index) => {
    const actual = toolSteps[index];
    if (!actual) {
      issues.push({ level: "error", message: `Missing tool call for ${expectation.name} at position ${expectation.order}.` });
      return;
    }
    if (actual.tool !== expectation.name) {
      issues.push({
        level: "error",
        message: `Expected tool ${expectation.name} at position ${expectation.order}, got ${actual.tool ?? "unknown"}.`,
      });
    }
    if (expectation.consent_required && !(typeof actual.consent_token === "string" && actual.consent_token.length > 0)) {
      issues.push({ level: "error", message: `${expectation.name} requires consent token but none was recorded.` });
    }
    if (expectation.expect_warnings && !(actual.warnings && actual.warnings.length > 0)) {
      issues.push({ level: "warning", message: `${expectation.name} expected warnings but none were recorded.` });
    }
    if (!expectation.expect_warnings && actual.warnings && actual.warnings.length > 0) {
      issues.push({
        level: "warning",
        message: `${expectation.name} emitted warnings when none were expected: ${actual.warnings.join(", ")}`,
      });
    }
    if (expectation.must_precede && actual.tool) {
      expectation.must_precede.forEach((target) => {
        const targetIndex = toolSteps.findIndex((step) => step.tool === target);
        if (targetIndex !== -1 && targetIndex < index) {
          issues.push({ level: "error", message: `${expectation.name} must precede ${target}, but ${target} appeared earlier.` });
        }
      });
    }
  });

  const passed = issues.every((issue) => issue.level !== "error");
  return { scenario, tracePath, passed, issues };
}

async function loadTrace(tracePath: string): Promise<TraceDocument> {
  const raw = await fs.readFile(tracePath, "utf8");
  return JSON.parse(raw) as TraceDocument;
}

interface RunnerOptions {
  tracePaths: string[];
  traceDir?: string;
  scenarioOverride?: string;
}

function parseArgs(argv: string[]): RunnerOptions {
  const opts: RunnerOptions = { tracePaths: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--trace" && argv[i + 1]) {
      opts.tracePaths.push(argv[++i]);
    } else if (arg === "--trace-dir" && argv[i + 1]) {
      opts.traceDir = argv[++i];
    } else if (arg === "--scenario" && argv[i + 1]) {
      opts.scenarioOverride = argv[++i];
    } else if (arg === "--help") {
      console.log("Usage: node runner.ts --trace <trace.json> [--scenario name] [--trace-dir dir]");
      process.exit(0);
    }
  }
  return opts;
}

async function collectTracePaths(opts: RunnerOptions): Promise<string[]> {
  const traces = [...opts.tracePaths];
  if (opts.traceDir) {
    const dirEntries = await fs.readdir(opts.traceDir);
    for (const entry of dirEntries) {
      if (entry.endsWith(".json")) {
        traces.push(path.join(opts.traceDir, entry));
      }
    }
  }
  if (traces.length === 0) {
    throw new Error("No trace files provided. Use --trace or --trace-dir.");
  }
  return traces;
}

async function runCli(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const scenarios = await loadScenarios();
  const scenarioMap = new Map(scenarios.map((scenario) => [scenario.name, scenario]));
  const traces = await collectTracePaths(options);

  const results: EvaluationResult[] = [];
  for (const tracePath of traces) {
    const trace = await loadTrace(tracePath);
    const scenarioName = options.scenarioOverride ?? trace.scenario;
    if (!scenarioName) {
      throw new Error(`Trace ${tracePath} missing scenario name and no --scenario override provided.`);
    }
    const scenario = scenarioMap.get(scenarioName);
    if (!scenario) {
      throw new Error(`Unknown scenario '${scenarioName}'.`);
    }
    const evaluation = evaluateTraceAgainstScenario(scenario, trace, tracePath);
    await verifyArtifacts(scenario, evaluation.issues);
    results.push(evaluation);
  }

  let exitCode = 0;
  results.forEach((result) => {
    const status = result.passed ? "PASS" : "FAIL";
    console.log(`[${status}] ${path.basename(result.tracePath)} → ${result.scenario.name}`);
    result.issues.forEach((issue) => {
      console.log(`  - ${issue.level.toUpperCase()}: ${issue.message}`);
      if (issue.level === "error") {
        exitCode = 1;
      }
    });
  });

  process.exitCode = exitCode;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error("Evaluation runner failed", error);
    process.exitCode = 1;
  });
}
