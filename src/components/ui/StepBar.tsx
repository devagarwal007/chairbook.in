import React from "react";
import { Icons as I } from "@/components/ui/Icons";

export interface StepBarProps {
  steps: string[] | { id: string; label: string }[];
  currentStep: number; // 1-indexed
  variant?: "public" | "onboarding";
  className?: string;
}

export function StepBar({
  steps,
  currentStep,
  variant = "public",
  className = "",
}: StepBarProps) {
  const isOb = variant === "onboarding";

  const containerClass = isOb ? "ob-rail" : "step-bar";
  const innerClass = isOb ? "ob-rail-inner" : "";
  const stepClass = isOb ? "ob-rail-step" : "step";
  const numClass = isOb ? "ob-rail-num" : "step-num";
  const lblClass = isOb ? "ob-rail-lbl" : "step-lbl";
  const lineClass = isOb ? "ob-rail-line" : "step-line";

  const renderSteps = () => {
    return steps.map((step, index) => {
      const n = index + 1;
      const done = currentStep > n;
      const active = currentStep === n;
      const label = typeof step === "string" ? step : step.label;

      return (
        <React.Fragment key={label}>
          <div
            className={`${stepClass} ${active ? "active" : ""} ${
              done ? "done" : ""
            }`}
          >
            <div className={numClass}>{done ? <I.check /> : n}</div>
            <div className={lblClass}>{label}</div>
          </div>
          {index < steps.length - 1 && (
            <div className={`${lineClass} ${done ? "done" : ""}`} />
          )}
        </React.Fragment>
      );
    });
  };

  if (isOb) {
    return (
      <div className={`${containerClass} ${className}`}>
        <div className={innerClass}>{renderSteps()}</div>
      </div>
    );
  }

  return <div className={`${containerClass} ${className}`}>{renderSteps()}</div>;
}
