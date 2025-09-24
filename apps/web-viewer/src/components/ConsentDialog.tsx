import React from "react";

// Placeholder consent dialog scaffolded during AI Assisted Development planning.
// TODO: enhance accessibility (focus trap), animations, and styling before release.

export interface ConsentDialogProps {
  open: boolean;
  toolName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConsentDialog: React.FC<ConsentDialogProps> = ({ open, toolName, onConfirm, onCancel }) => {
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-dialog-title"
      style={{
        position: "fixed",
        zIndex: 1000,
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "rgba(15, 23, 42, 0.55)",
      }}
    >
      <div
        style={{
          minWidth: "320px",
          maxWidth: "420px",
          padding: "24px",
          borderRadius: "12px",
          background: "#ffffff",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.25)",
          display: "grid",
          gap: "16px",
        }}
      >
        <h2 id="consent-dialog-title" style={{ margin: 0 }}>
          Confirm consent
        </h2>
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          The action "{toolName}" may overwrite artifacts or generate machine code. Confirm before continuing.
        </p>
        <footer style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} style={primaryButtonStyle}>
            Confirm
          </button>
        </footer>
      </div>
    </div>
  );
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "8px",
  border: "1px solid #cbd5f5",
  background: "#f8fafc",
  fontWeight: 500,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "8px",
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "white",
  fontWeight: 600,
};
