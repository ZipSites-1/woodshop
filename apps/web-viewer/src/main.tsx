import React from "react";
import { createRoot } from "react-dom/client";
import { ViewerCanvas } from "./components/ViewerCanvas";
import { McpClientPanel } from "./components/McpClientPanel";

function App() {
  return (
    <main style={{ padding: "32px", fontFamily: "system-ui, sans-serif" }}>
      <header>
        <h1 style={{ marginTop: 0 }}>Woodshop Viewer</h1>
        <p style={{ maxWidth: "480px" }}>
          Minimal viewer harness for the occt-core tessellator. Adjust the
          deflection parameters to explore the mesh density heuristics used in
          native and WASM builds.
        </p>
      </header>
      <ViewerCanvas />
      <McpClientPanel />
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("#root container missing from document");
}

createRoot(root).render(<App />);
