"use client";

import { useState } from "react";
import { X, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@promptbase/ui";
import { useCreateImportJob, useJob } from "@/hooks/use-import-export";

interface ImportDialogProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImportDialog({ orgId, isOpen, onClose }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const { mutate: createJob, isPending: isCreating } = useCreateImportJob(orgId);
  const { data: job } = useJob(orgId, jobId);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleSubmit = () => {
    if (!file) return;
    createJob(file, { onSuccess: (data) => setJobId(data.id) });
  };

  const handleClose = () => {
    setFile(null);
    setJobId(null);
    onClose();
  };

  const isRunning = job?.status === "RUNNING" || job?.status === "QUEUED";
  const isSucceeded = job?.status === "SUCCEEDED";
  const isFailed = job?.status === "FAILED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold text-lg">导入数据</h3>
          <button onClick={handleClose} className="p-1 rounded-md hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!jobId ? (
            <>
              <label
                className={cn(
                  "group relative flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                  file ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                )}
              >
                <input type="file" className="hidden" onChange={handleFileChange} accept=".json,.csv,.md" />
                <Upload className={cn("h-8 w-8 mb-2", file ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-medium">{file ? file.name : "点击或拖拽文件到这里"}</span>
                <span className="text-xs text-muted-foreground mt-1">支持 JSON, CSV, Markdown 格式</span>
              </label>
              <button
                onClick={handleSubmit}
                disabled={!file || isCreating}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium shadow hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                开始导入
              </button>
            </>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center gap-4">
              {isRunning && (
                <>
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <p className="font-semibold">正在导入...</p>
                  <p className="text-sm text-muted-foreground">这可能需要几分钟时间</p>
                </>
              )}
              {isSucceeded && (
                <>
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <p className="font-semibold text-green-600">导入成功</p>
                  <p className="text-sm text-muted-foreground">成功导入 {job?.summary?.importedCount ?? 0} 条数据</p>
                  <button onClick={handleClose} className="mt-4 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">完成</button>
                </>
              )}
              {isFailed && (
                <>
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <p className="font-semibold text-destructive">导入失败</p>
                  <p className="text-sm text-muted-foreground">{job?.errorMessage || "发生未知错误"}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
