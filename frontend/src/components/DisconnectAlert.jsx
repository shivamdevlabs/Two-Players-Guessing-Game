import React from "react";
import { AlertTriangle, X } from "lucide-react";

export function DisconnectAlert({ alert, onClose }) {
  if (!alert) return null;

  return (
    <div
      style={{
        background: "rgba(245, 158, 11, 0.15)",
        border: "1px solid rgba(245, 158, 11, 0.4)",
        borderRadius: "0.85rem",
        padding: "0.85rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        color: "#fde68a",
        marginBottom: "1rem"
      }}
      className="animate-fade-in"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: "0.9rem" }}>
          <strong>Connection Notice: </strong>
          {alert.message}
        </div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#fde68a",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "0.2rem",
            opacity: 0.8
          }}
          title="Dismiss notice"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
