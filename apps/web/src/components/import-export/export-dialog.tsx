"use client";

import { useState } from "react";
import { X, Download, FileJson, FileSpreadsheet, FileCode, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@promptbase/ui";
import { useCreateExportJob, useJob } from "@/hooks/use-import-export";
import { useI18n } from "@/components/providers/i18n-provider";

interface ExportDialogProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportDialog({ orgId, isOpen, onClose }: ExportDialogProps) {
  const { t } = useI18n();
  const [format, setFormat] = useState<"JSON" | "CSV" | "MARKDOWN">("JSON");
  const [jobId, setJobId] = useState<string | null>(null);
  const { mutate: createJob, isPending: isCreating } = useCreateExportJob(orgId);
  const { data: job } = useJob(orgId, jobId);

  if (!isOpen) return null;

  const handleSubmit = () => {
    createJob({ format }, { onSuccess: (data) => setJobId(data.id) });
  };

  const handleClose = () => {
    setJobId(null);
    onClose();
  };

  const isRunning = job?.status === "RUNNING" || job?.status === "QUEUED";
  const isSucceeded = job?.status === "SUCCEEDED";
  const formats = [
    { id: "JSON" as const, label: "JSON", icon: FileJson, desc: t("importExport.exportJsonDesc") },
    { id: "CSV" as const, label: "CSV", icon: FileSpreadsheet, desc: t("importExport.exportCsvDesc") },
    { id: "MARKDOWN" as const, label: "Markdown", icon: FileCode, desc: t("importExport.exportMarkdownDesc") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold text-lg">{t("importExport.exportData")}</h3>
          <button onClick={handleClose} className="p-1 rounded-md hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!jobId ? (
            <>
              <div className="grid gap-3">
                {formats.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                      format === f.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg", format === f.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      <f.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleSubmit}
                disabled={isCreating}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium shadow hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("importExport.prepareExport")}
              </button>
            </>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center gap-4">
              {isRunning && (
                <>
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <p className="font-semibold">{t("importExport.preparingExport")}</p>
                  <p className="text-sm text-muted-foreground">{t("importExport.exportReadySoon")}</p>
                </>
              )}
              {isSucceeded && (
                <>
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <p className="font-semibold text-green-600">{t("importExport.exportReady")}</p>
                  <p className="text-sm text-muted-foreground">{t("importExport.exportedCount", { count: job?.summary?.exportedCount ?? 0 })}</p>
                  <a
                    href={job?.targetUri || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 px-8 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium shadow hover:opacity-90"
                  >
                    <Download className="h-4 w-4" />
                    {t("importExport.downloadNow")}
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
