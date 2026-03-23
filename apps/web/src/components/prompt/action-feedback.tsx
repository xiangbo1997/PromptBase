"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ActionFeedbackProps {
  tone: "success" | "error";
  message: string;
}

export function ActionFeedback({ tone, message }: ActionFeedbackProps) {
  const isSuccess = tone === "success";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live="polite"
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
        isSuccess
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      <span>{message}</span>
    </div>
  );
}
