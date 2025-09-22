import React, { FormEvent, useMemo, useState } from "react";

type RequestState = "idle" | "loading" | "success" | "error";

type ProvenanceResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

const defaultEndpoint = "http://localhost:8787/mcp/provenance";

export const McpClientPanel: React.FC = () => {
  const [endpoint, setEndpoint] = useState(defaultEndpoint);
  const [token, setToken] = useState("");
  const [state, setState] = useState<RequestState>("idle");
  const [result, setResult] = useState<ProvenanceResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(() => state === "loading", [state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setResult(null);
    setErrorMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });

      const contentType = response.headers.get("content-type") ?? "";
      let body: unknown = null;
      if (contentType.includes("application/json")) {
        body = await response.json();
      } else {
        body = await response.text();
      }

      const payload: ProvenanceResult = {
        ok: response.ok,
        status: response.status,
        body,
      };
      setResult(payload);
      setState(response.ok ? "success" : "error");
      if (!response.ok) {
        setErrorMessage(`MCP responded with status ${response.status}`);
      }
    } catch (error) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section
      style={{
        marginTop: "48px",
        padding: "24px",
        borderTop: "1px solid #e0e0e0",
        display: "grid",
        gap: "16px",
      }}
    >
      <header>
        <h2 style={{ margin: "0 0 8px" }}>MCP provenance probe</h2>
        <p style={{ margin: 0, maxWidth: "560px", color: "#424242" }}>
          Supply a base endpoint and optional bearer token to request provenance
          metadata from the MCP gateway. This panel is optional—leave the fields
          blank if no MCP service is running.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: "12px", maxWidth: "560px" }}
      >
        <label style={{ display: "grid", gap: "4px" }}>
          <span>Endpoint URL</span>
          <input
            type="url"
            required
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            placeholder="https://api.example.com/mcp/provenance"
            style={{
              padding: "8px 10px",
              border: "1px solid #cfd8dc",
              borderRadius: "6px",
              fontSize: "0.95rem",
            }}
          />
        </label>
        <label style={{ display: "grid", gap: "4px" }}>
          <span>Bearer token (optional)</span>
          <input
            type="text"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            autoComplete="off"
            spellCheck={false}
            style={{
              padding: "8px 10px",
              border: "1px solid #cfd8dc",
              borderRadius: "6px",
              fontSize: "0.95rem",
            }}
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitDisabled}
          style={{
            padding: "10px 16px",
            fontSize: "0.95rem",
            borderRadius: "6px",
            border: "1px solid #1976d2",
            background: isSubmitDisabled ? "#90caf9" : "#1976d2",
            color: "#fff",
            cursor: isSubmitDisabled ? "wait" : "pointer",
          }}
        >
          {state === "loading" ? "Requesting provenance…" : "Fetch provenance"}
        </button>
      </form>

      {state === "error" && errorMessage ? (
        <p role="alert" style={{ color: "#b71c1c", margin: 0 }}>
          {errorMessage}
        </p>
      ) : null}

      {result ? (
        <pre
          style={{
            margin: 0,
            padding: "16px",
            borderRadius: "8px",
            background: "#0d1117",
            color: "#f8fafc",
            overflowX: "auto",
            fontSize: "0.85rem",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : (
        <p style={{ margin: 0, color: "#616161" }}>
          No provenance fetched yet. Submit the form to test MCP connectivity.
        </p>
      )}
    </section>
  );
};

export default McpClientPanel;
