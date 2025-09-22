import { defineConfig, Plugin } from "vite";

const BUDGET_LIMITS = {
  js: 350 * 1024,
  css: 120 * 1024,
  wasm: 6 * 1024 * 1024,
};

const SECURITY_HEADINGS = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none';",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Opener-Policy": "same-origin",
};

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB"] as const;
  let current = size;
  let idx = 0;
  while (current >= 1024 && idx < units.length) {
    current /= 1024;
    idx += 1;
  }
  return `${current.toFixed(1)} ${units[idx - 1]}`;
}

function assetBudgetPlugin(): Plugin {
  return {
    name: "woodshop-asset-budget",
    generateBundle(_options, bundle) {
      const totals: Record<keyof typeof BUDGET_LIMITS, number> = {
        js: 0,
        css: 0,
        wasm: 0,
      };

      for (const [, output] of Object.entries(bundle)) {
        if (!("type" in output) || output.type !== "asset") {
          continue;
        }
        const fileName = output.fileName;
        const size = Buffer.byteLength(
          typeof output.source === "string" ? output.source : output.source ?? ""
        );

        if (fileName.endsWith(".js") || fileName.endsWith(".mjs")) {
          totals.js += size;
        } else if (fileName.endsWith(".css")) {
          totals.css += size;
        } else if (fileName.endsWith(".wasm")) {
          totals.wasm += size;
        }
      }

      const failures: string[] = [];
      for (const [key, limit] of Object.entries(BUDGET_LIMITS)) {
        const total = totals[key as keyof typeof BUDGET_LIMITS];
        if (total > limit) {
          failures.push(
            `${key.toUpperCase()} bundle ${formatBytes(total)} exceeds budget ${formatBytes(limit)}`
          );
        }
      }

      if (failures.length > 0) {
        this.error(`Asset budgets failed:\n${failures.join("\n")}`);
      }
    },
  };
}

function securityHeadersPlugin(): Plugin {
  const headers = SECURITY_HEADINGS;
  const wasmMime = "application/wasm";

  const applyHeaders = (req: { url?: string }, res: any, next: () => void) => {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
    const url = req.url ?? "";
    if (typeof url === "string" && url.endsWith(".wasm")) {
      res.setHeader("Content-Type", wasmMime);
      res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    }
    next();
  };

  return {
    name: "woodshop-security-headers",
    configureServer(server) {
      server.middlewares.use(applyHeaders);
    },
    configurePreviewServer(server) {
      server.middlewares.use(applyHeaders);
    },
    generateBundle() {
      const headerLines = [
        "/*",
        ...Object.entries(headers).map(([key, value]) => `  ${key}: ${value}`),
        "",
        "/wasm/*",
        `  Content-Type: ${wasmMime}`,
        "  Cross-Origin-Resource-Policy: same-origin",
        "  Cache-Control: public, max-age=31536000, immutable",
        "",
        "/wasm/occt/*",
        `  Content-Type: ${wasmMime}`,
        "  Cache-Control: public, max-age=31536000, immutable",
      ].join("\n");

      this.emitFile({ type: "asset", fileName: "_headers", source: headerLines });
    },
  };
}

export default defineConfig({
  plugins: [assetBudgetPlugin(), securityHeadersPlugin()],
  build: {
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 500,
  },
});
