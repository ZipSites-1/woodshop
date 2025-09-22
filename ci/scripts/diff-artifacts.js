#!/usr/bin/env node
const fs = require("node:fs/promises");
const path = require("node:path");
const process = require("node:process");

const repoRoot = path.resolve(__dirname, "..", "..");

const TEXT_EXTENSIONS = new Set([
  ".json",
  ".svg",
  ".dxf",
  ".nc",
  ".txt",
  ".md",
  ".csv",
  ".tsv",
  ".log",
  ".yaml",
  ".yml",
]);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function pathExists(absolutePath) {
  try {
    await fs.stat(absolutePath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function listFiles(root) {
  const result = new Map();
  async function walk(current, relativePrefix) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const relative = relativePrefix ? path.posix.join(relativePrefix, entry.name) : entry.name;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute, relative);
      } else if (entry.isFile()) {
        const stats = await fs.stat(absolute);
        result.set(toPosix(relative), {
          absolute,
          relative: toPosix(relative),
          size: stats.size,
        });
      }
    }
  }
  await walk(root, "");
  return result;
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJson(item));
  }
  if (value && typeof value === "object" && !(value instanceof Buffer)) {
    const entries = Object.keys(value).sort().map((key) => [key, canonicalizeJson(value[key])]);
    return Object.fromEntries(entries);
  }
  return value;
}

function formatJsonPath(segments) {
  if (segments.length === 0) {
    return "$";
  }
  return segments
    .map((segment, index) => (segment.startsWith("[") || index === 0 ? segment : `.${segment}`))
    .join("");
}

function findJsonDifference(expected, actual, pathSoFar = ["$"]) {
  if (Object.is(expected, actual)) {
    return null;
  }

  const expectedType = expected === null ? "null" : Array.isArray(expected) ? "array" : typeof expected;
  const actualType = actual === null ? "null" : Array.isArray(actual) ? "array" : typeof actual;

  if (expectedType !== actualType) {
    return {
      path: formatJsonPath(pathSoFar),
      reason: "type",
      expectedType,
      actualType,
      expected,
      actual,
    };
  }

  if (Array.isArray(expected) && Array.isArray(actual)) {
    const max = Math.max(expected.length, actual.length);
    for (let i = 0; i < max; i += 1) {
      if (i >= expected.length) {
        return {
          path: formatJsonPath([...pathSoFar, `[${i}]`]),
          reason: "extra-array-item",
          expected: undefined,
          actual: actual[i],
        };
      }
      if (i >= actual.length) {
        return {
          path: formatJsonPath([...pathSoFar, `[${i}]`]),
          reason: "missing-array-item",
          expected: expected[i],
          actual: undefined,
        };
      }
      const diff = findJsonDifference(expected[i], actual[i], [...pathSoFar, `[${i}]`]);
      if (diff) {
        return diff;
      }
    }
    return null;
  }

  if (expected && typeof expected === "object" && actual && typeof actual === "object") {
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();
    for (const key of expectedKeys) {
      if (!Object.prototype.hasOwnProperty.call(actual, key)) {
        return {
          path: formatJsonPath([...pathSoFar, key]),
          reason: "missing-key",
          expected: expected[key],
          actual: undefined,
        };
      }
      const diff = findJsonDifference(expected[key], actual[key], [...pathSoFar, key]);
      if (diff) {
        return diff;
      }
    }
    for (const key of actualKeys) {
      if (!Object.prototype.hasOwnProperty.call(expected, key)) {
        return {
          path: formatJsonPath([...pathSoFar, key]),
          reason: "extra-key",
          expected: undefined,
          actual: actual[key],
        };
      }
    }
    return null;
  }

  return {
    path: formatJsonPath(pathSoFar),
    reason: "value",
    expected,
    actual,
  };
}

function diffText(expected, actual) {
  if (expected === actual) {
    return null;
  }
  const expectedLines = expected.split(/\r?\n/);
  const actualLines = actual.split(/\r?\n/);
  const max = Math.max(expectedLines.length, actualLines.length);
  for (let i = 0; i < max; i += 1) {
    if (expectedLines[i] !== actualLines[i]) {
      return {
        line: i + 1,
        expected: expectedLines[i] ?? "",
        actual: actualLines[i] ?? "",
      };
    }
  }
  return {
    line: expectedLines.length,
    expected: expectedLines[expectedLines.length - 1] ?? "",
    actual: actualLines[actualLines.length - 1] ?? "",
  };
}

async function compareFiles(referenceEntry, candidateEntry) {
  const extension = path.extname(referenceEntry.relative).toLowerCase();
  const referenceBuffer = await fs.readFile(referenceEntry.absolute);
  const candidateBuffer = await fs.readFile(candidateEntry.absolute);

  if (referenceBuffer.equals(candidateBuffer)) {
    return { equal: true };
  }

  if (extension === ".json") {
    try {
      const referenceJson = canonicalizeJson(JSON.parse(referenceBuffer.toString("utf8")));
      const candidateJson = canonicalizeJson(JSON.parse(candidateBuffer.toString("utf8")));
      const diff = findJsonDifference(referenceJson, candidateJson);
      return {
        equal: !diff,
        type: "json",
        diff,
      };
    } catch (error) {
      return {
        equal: false,
        type: "json-parse-error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    const diff = diffText(referenceBuffer.toString("utf8"), candidateBuffer.toString("utf8"));
    return {
      equal: !diff,
      type: "text",
      diff,
    };
  }

  return {
    equal: false,
    type: "binary",
    referenceSize: referenceBuffer.length,
    candidateSize: candidateBuffer.length,
  };
}

function createLogger(options) {
  const logger = options?.logger ?? console;
  return {
    info: logger.info ? logger.info.bind(logger) : logger.log.bind(logger),
    warn: logger.warn ? logger.warn.bind(logger) : logger.log.bind(logger),
    error: logger.error ? logger.error.bind(logger) : logger.log.bind(logger),
  };
}

async function diffArtifacts(referenceArg, candidateArg, options = {}) {
  const cwd = options.cwd ? path.resolve(options.cwd) : repoRoot;
  const { info, warn } = createLogger(options);

  const referenceRoot = path.resolve(cwd, referenceArg);
  const candidateRoot = path.resolve(cwd, candidateArg);

  if (!(await pathExists(referenceRoot))) {
    throw new Error(`Reference directory not found: ${referenceArg}`);
  }
  if (!(await pathExists(candidateRoot))) {
    throw new Error(`Candidate directory not found: ${candidateArg}`);
  }

  const referenceFiles = await listFiles(referenceRoot);
  const candidateFiles = await listFiles(candidateRoot);

  const allPaths = new Set([...referenceFiles.keys(), ...candidateFiles.keys()]);
  const sortedPaths = [...allPaths].sort();

  const summary = {
    changed: 0,
    missing: 0,
    added: 0,
  };

  for (const relative of sortedPaths) {
    const referenceEntry = referenceFiles.get(relative);
    const candidateEntry = candidateFiles.get(relative);
    if (referenceEntry && !candidateEntry) {
      summary.missing += 1;
      warn(`[diff] MISSING ${relative} (expected ${referenceEntry.size} bytes). Hint: artifact not produced.`);
      continue;
    }
    if (!referenceEntry && candidateEntry) {
      summary.added += 1;
      warn(`[diff] NEW ${relative} (${candidateEntry.size} bytes). Hint: new artifact; update reference if intentional.`);
      continue;
    }
    if (!referenceEntry || !candidateEntry) {
      continue;
    }

    const comparison = await compareFiles(referenceEntry, candidateEntry);
    if (comparison.equal) {
      continue;
    }

    summary.changed += 1;
    if (comparison.type === "json" && comparison.diff) {
      const { path: diffPath, reason, expected, actual, expectedType, actualType } = comparison.diff;
      if (reason === "type") {
        warn(`[diff] CHANGED ${relative} @ ${diffPath}: type ${expectedType} → ${actualType}`);
      } else if (reason === "missing-key") {
        warn(`[diff] CHANGED ${relative} @ ${diffPath}: field missing in candidate.`);
      } else if (reason === "extra-key") {
        warn(`[diff] CHANGED ${relative} @ ${diffPath}: additional field in candidate.`);
      } else if (reason === "missing-array-item") {
        warn(`[diff] CHANGED ${relative} @ ${diffPath}: array item removed.`);
      } else if (reason === "extra-array-item") {
        warn(`[diff] CHANGED ${relative} @ ${diffPath}: array item added.`);
      } else {
        warn(`[diff] CHANGED ${relative} @ ${diffPath}: ${JSON.stringify(expected)} → ${JSON.stringify(actual)}`);
      }
      continue;
    }

    if (comparison.type === "json-parse-error") {
      warn(`[diff] CHANGED ${relative}: unable to parse JSON (${comparison.error}).`);
      continue;
    }

    if (comparison.type === "text" && comparison.diff) {
      warn(
        `[diff] CHANGED ${relative} line ${comparison.diff.line}: "${comparison.diff.expected}" → "${comparison.diff.actual}"`,
      );
      continue;
    }

    if (comparison.type === "binary") {
      warn(
        `[diff] CHANGED ${relative}: binary diff (${comparison.referenceSize} → ${comparison.candidateSize} bytes).`,
      );
      continue;
    }

    warn(`[diff] CHANGED ${relative}: content differs.`);
  }

  const total = summary.changed + summary.missing + summary.added;
  if (total === 0) {
    info("[diff] No differences detected. 🎉");
  } else {
    info(
      `[diff] Summary: ${summary.changed} changed, ${summary.missing} missing, ${summary.added} new.`,
    );
  }

  return {
    ...summary,
    total,
    hasDifferences: total > 0,
  };
}

module.exports = {
  diffArtifacts,
};

if (require.main === module) {
  const [, , referenceArg, candidateArg] = process.argv;
  if (!referenceArg || !candidateArg) {
    console.error("Usage: node ci/scripts/diff-artifacts.js <referenceDir> <candidateDir>");
    process.exit(1);
  }
  diffArtifacts(referenceArg, candidateArg, { cwd: repoRoot, logger: console })
    .then((result) => {
      if (result.hasDifferences) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(`[diff] Failed: ${error.message}`);
      process.exitCode = 1;
    });
}
