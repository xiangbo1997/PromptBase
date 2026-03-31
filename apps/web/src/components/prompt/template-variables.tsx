"use client";

import { useState, useMemo } from "react";
import { Braces, Copy, Check, Eye } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";

interface VariableDefinition {
  name: string;
  type: string;
  defaultValue: string;
  description: string;
}

interface TemplateVariablesProps {
  content: string;
  variables?: VariableDefinition[];
}

function parseVariablesFromContent(content: string): VariableDefinition[] {
  const matches = Array.from(content.matchAll(/\{\{([^}]+)\}\}/g));
  const seen = new Set<string>();
  const result: VariableDefinition[] = [];

  for (const m of matches) {
    const raw = m[1].trim();
    const segments = raw.split(":");
    const name = (segments[0] ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);

    let type = "text";
    let defaultValue = "";
    let description = "";

    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i] ?? "";
      const eqIdx = seg.indexOf("=");
      if (eqIdx === -1) continue;
      const key = seg.slice(0, eqIdx).trim();
      const val = seg.slice(eqIdx + 1).trim();
      if (key === "type") type = val;
      else if (key === "default") defaultValue = val;
      else if (key === "description") description = val;
    }

    result.push({ name, type, defaultValue, description });
  }

  return result;
}

export function TemplateVariables({ content, variables: backendVars }: TemplateVariablesProps) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const variables = useMemo(() => {
    if (backendVars && backendVars.length > 0) return backendVars;
    return parseVariablesFromContent(content);
  }, [content, backendVars]);

  // Initialize defaults
  useMemo(() => {
    const defaults: Record<string, string> = {};
    for (const v of variables) {
      if (v.defaultValue && !values[v.name]) {
        defaults[v.name] = v.defaultValue;
      }
    }
    if (Object.keys(defaults).length > 0) {
      setValues((prev) => ({ ...defaults, ...prev }));
    }
  }, [variables]);

  const renderedContent = useMemo(() => {
    let result = content;
    for (const v of variables) {
      const val = values[v.name];
      if (val) {
        result = result.replaceAll(
          new RegExp(`\\{\\{\\s*${v.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^}]*\\}\\}`, "g"),
          val,
        );
      }
    }
    return result;
  }, [content, variables, values]);

  const handleCopy = () => {
    navigator.clipboard.writeText(renderedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variables.length === 0) {
    return (
      <div className="text-center py-12 px-4 border-2 border-dashed rounded-xl bg-muted/20 space-y-3">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Braces className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium">{t("prompt.noTemplateVariables")}</p>
        <p className="text-xs text-muted-foreground">{t("prompt.templateHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Braces className="h-4 w-4 text-primary" />
          <span>{t("prompt.variableAssignments")}</span>
        </div>
        <div className="grid gap-3 bg-muted/30 p-4 rounded-lg border border-dashed">
          {variables.map((variable) => (
            <div key={variable.name} className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {variable.name}
                {variable.type !== "text" && (
                  <span className="ml-1.5 text-[9px] bg-muted px-1.5 py-0.5 rounded normal-case">{variable.type}</span>
                )}
              </label>
              {variable.description && (
                <p className="text-[10px] text-muted-foreground/70">{variable.description}</p>
              )}
              {variable.type === "textarea" ? (
                <textarea
                  className="w-full rounded-md border p-2 bg-background text-sm min-h-[80px] outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder={variable.defaultValue || t("prompt.variableInputPlaceholder", { name: variable.name })}
                  value={values[variable.name] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [variable.name]: e.target.value }))}
                />
              ) : (
                <input
                  className="w-full rounded-md border p-2 bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                  placeholder={variable.defaultValue || t("prompt.variableInputPlaceholder", { name: variable.name })}
                  value={values[variable.name] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [variable.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Eye className="h-4 w-4 text-primary" />
            <span>{t("prompt.renderedPreview")}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors bg-muted/50 px-2 py-1 rounded"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            {copied ? t("prompt.copied") : t("prompt.copyResult")}
          </button>
        </div>
        <div className="bg-card rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed min-h-[120px] border shadow-sm">
          {renderedContent}
        </div>
      </div>
    </div>
  );
}
