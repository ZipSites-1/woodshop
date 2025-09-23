import { promises as fs } from "node:fs";
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

async function loadScenario(filePath: string): Promise<ScenarioDefinition> {
  const raw = await fs.readFile(filePath, "utf8");
  try {
    const yamlModule = await import("yaml");
    return yamlModule.parse(raw) as ScenarioDefinition;
  } catch (error) {
    console.warn("yaml package not installed; attempting JSON parse fallback");
    return JSON.parse(raw) as ScenarioDefinition;
  }
}

export async function loadScenarios(root = path.resolve("codex/agent-pack/evals/scenarios")): Promise<ScenarioDefinition[]> {
  const entries = await fs.readdir(root);
  const scenarios: ScenarioDefinition[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".yaml")) continue;
    const scenario = await loadScenario(path.join(root, entry));
    scenarios.push(scenario);
  }
  return scenarios.sort((a, b) => a.name.localeCompare(b.name));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  loadScenarios()
    .then((scenarios) => {
      console.log(`Loaded ${scenarios.length} scenarios:`);
      for (const scenario of scenarios) {
        console.log(`- ${scenario.name} (seed ${scenario.seed})`);
      }
    })
    .catch((error) => {
      console.error("Failed to load scenarios", error);
      process.exitCode = 1;
    });
}
