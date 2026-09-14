import React from "react";
import { Clock } from "lucide-react";

export function CountdownTimer({ remainingSeconds, timeLimitSeconds }) {
  const seconds = remainingSeconds !== null && remainingSeconds !== undefined ? Math.max(0, remainingSeconds) : timeLimitSeconds;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  let timerClass = "";
  if (seconds <= 10) {
    timerClass = "critical";
  } else if (seconds <= 30) {
    timerClass = "warning";
  }

  return (
    <div className={`timer-container ${timerClass}`}>
      <Clock size={18} />
      <span>{formatted}</span>
    </div>
  );
}
