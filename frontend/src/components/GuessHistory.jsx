import React from "react";
import { ArrowUp, ArrowDown, CheckCircle2 } from "lucide-react";

export function GuessHistory({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-dim)", fontStyle: "italic" }}>
        No guesses submitted yet. Make your first attempt!
      </div>
    );
  }

  // Show newest guesses on top
  const reversedHistory = [...history].reverse();

  return (
    <div style={{ overflowX: "auto", maxHeight: "300px", overflowY: "auto", marginTop: "1rem" }}>
      <table className="history-table">
        <thead>
          <tr>
            <th style={{ width: "80px" }}>Attempt</th>
            <th style={{ width: "120px" }}>Guess</th>
            <th>Feedback</th>
          </tr>
        </thead>
        <tbody>
          {reversedHistory.map((item, idx) => {
            const attemptNum = history.length - idx;
            let badgeClass = "low";
            let Icon = ArrowUp;

            if (item.feedback === "TOO_HIGH") {
              badgeClass = "high";
              Icon = ArrowDown;
            } else if (item.feedback === "CORRECT") {
              badgeClass = "correct";
              Icon = CheckCircle2;
            }

            return (
              <tr key={idx} className="animate-fade-in">
                <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>
                  #{attemptNum}
                </td>
                <td>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "1.1rem",
                      fontWeight: "700",
                      color: "var(--text-main)"
                    }}
                  >
                    {item.guess}
                  </span>
                </td>
                <td>
                  <span className={`feedback-badge ${badgeClass}`}>
                    <Icon size={14} />
                    {item.message}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
