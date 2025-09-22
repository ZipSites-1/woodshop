import React, { useMemo, useState } from "react";

type ArtifactType = "pdf" | "svg" | "dxf";

type Artifact = {
  id: string;
  name: string;
  type: ArtifactType;
  href: string;
  description: string;
};

const SAMPLE_ARTIFACTS: Artifact[] = [
  {
    id: "svg-shell",
    name: "Minimal hull (SVG)",
    type: "svg",
    description: "Planar silhouette exported as SVG.",
    href:
      "data:image/svg+xml;utf8,<?xml version='1.0' encoding='UTF-8'?>" +
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>" +
      "<rect width='120' height='120' fill='%23f5f5f5'/>" +
      "<g fill='none' stroke='%230071c1' stroke-width='3'>" +
      "<path d='M20 90 L40 30 L60 70 L80 20 L100 90 Z'/>" +
      "<circle cx='60' cy='60' r='12'/>" +
      "</g></svg>",
  },
  {
    id: "pdf-report",
    name: "Manufacturing report (PDF)",
    type: "pdf",
    description: "One-page tolerance breakdown.",
    href:
      "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA0IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDU5NSA4NDJdL0NvbnRlbnRzIDUgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9Db3VudCAxL0tpZHNbMSAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvTmFtZS9GMS9CYXNlRm9udC9IZWx2ZXRpY2EvRW5jb2RpbmcvV2luQW5zaUVuY29kaW5nPj4KZW5kb2JqCjUgMCBvYmoKPDwvTGVuZ3RoIDY0Pj4Kc3RyZWFtCkJUIAovRjEgMjQgVGYKMTIwIDcwMCBUZAooV29vZHNob3AgUGRmIFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKNiAwIG9iago8PC9UeXBlL1RyYWlsZXIvUm9vdCAzIDAgUi9TaXplIDc+PgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNzIgMDAwMDAgbiAKMDAwMDAwMDE1MSAwMDAwMCBuIAowMDAwMDAwMjQwIDAwMDAwIG4gCjAwMDAwMDAzNDEgMDAwMDAgbiAKMDAwMDAwMDQxMiAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNy9Sb290IDYgMCBSL0luZm8gMSAwIFIvSWQgWyA8NDlhNTZkMjMxNmQ0MTI3MTk1ZjkyZjJjNGE1ODEyMz4gPDQ5YTU2ZDIzMTZkNDEyNzE5NWY5MmYyYzRhNTgxMjM+IF0+PgpzdGFydHhyZWYKNDM1CiUlRU9GIg==",
  },
  {
    id: "dxf-outline",
    name: "Tool path (DXF)",
    type: "dxf",
    description: "Simple DXF outline for download.",
    href:
      "data:application/dxf;base64,MCBTRUNUSU9OCjIgRU5USVRJRVMKMCAKTElORQogOCAKMTAKIDAKMjAKIDAKMzAKIDAKMTEKIDEwCjIxCiAwCjMxCiAwCjAgRU5EU0VDCjAgRU9GIg==",
  },
];

const buttonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 12px",
  border: "1px solid #d0d7de",
  background: "#fff",
  borderRadius: "6px",
  fontSize: "0.95rem",
  cursor: "pointer",
};

export const ArtifactPanel: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(SAMPLE_ARTIFACTS[0].id);

  const selectedArtifact = useMemo(
    () => SAMPLE_ARTIFACTS.find((artifact) => artifact.id === selectedId),
    [selectedId]
  );

  return (
    <aside
      style={{
        minWidth: "280px",
        maxWidth: "320px",
        display: "grid",
        gap: "16px",
        padding: "16px",
        border: "1px solid #e0e0e0",
        borderRadius: "12px",
        background: "#fafafa",
      }}
    >
      <header>
        <h3 style={{ margin: "0 0 8px" }}>Artifacts</h3>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#424242" }}>
          Signed artifact links (mock data) demonstrate how exports appear in the
          viewer.
        </p>
      </header>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "8px" }}>
        {SAMPLE_ARTIFACTS.map((artifact) => {
          const isSelected = artifact.id === selectedId;
          return (
            <li key={artifact.id}>
              <button
                type="button"
                onClick={() => setSelectedId(artifact.id)}
                style={{
                  ...buttonStyle,
                  borderColor: isSelected ? "#1976d2" : buttonStyle.border,
                  boxShadow: isSelected ? "0 0 0 1px #1976d2" : "none",
                  background: isSelected ? "#e3f2fd" : buttonStyle.background,
                }}
                aria-pressed={isSelected}
              >
                <strong style={{ display: "block", fontSize: "1rem" }}>{artifact.name}</strong>
                <span style={{ fontSize: "0.85rem", color: "#424242" }}>{artifact.description}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <section style={{ display: "grid", gap: "12px" }}>
        <h4 style={{ margin: 0 }}>Preview</h4>
        {selectedArtifact ? (
          <ArtifactPreview artifact={selectedArtifact} />
        ) : (
          <p style={{ margin: 0, color: "#757575" }}>Select an artifact to preview.</p>
        )}
      </section>
    </aside>
  );
};

const iframeStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "240px",
  border: "1px solid #c7c7c7",
  borderRadius: "8px",
  background: "#fff",
};

const ArtifactPreview: React.FC<{ artifact: Artifact }> = ({ artifact }) => {
  if (artifact.type === "pdf") {
    return (
      <iframe
        title={`${artifact.name} preview`}
        src={artifact.href}
        style={iframeStyle}
        sandbox="allow-same-origin allow-scripts"
      />
    );
  }

  if (artifact.type === "svg") {
    return (
      <iframe
        title={`${artifact.name} preview`}
        src={artifact.href}
        style={iframeStyle}
        sandbox="allow-same-origin allow-scripts"
      />
    );
  }

  return (
    <div
      style={{
        padding: "16px",
        border: "1px dashed #9e9e9e",
        borderRadius: "8px",
        background: "#fff",
        fontSize: "0.9rem",
        color: "#424242",
      }}
    >
      <p style={{ marginTop: 0 }}>DXF preview is not available in-browser.</p>
      <a href={artifact.href} download="woodshop-outline.dxf">
        Download DXF artifact
      </a>
    </div>
  );
};

export default ArtifactPanel;
