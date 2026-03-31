"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useParams, useRouter } from "next/navigation";
import { useDeletePrompt, usePrompt, useUpdatePrompt } from "@/hooks/use-prompts";
import { useFolders } from "@/hooks/use-folders";
import { cn } from "@promptbase/ui";
import { ActionFeedback } from "@/components/prompt/action-feedback";
import { PromptEditor } from "@/components/editor/prompt-editor";
import { TagSelector } from "@/components/prompt/tag-selector";
import { VersionHistory } from "@/components/prompt/version-history";
import { TemplateVariables } from "@/components/prompt/template-variables";
import { AITestPanel } from "@/components/prompt/ai-test-panel";
import { flattenFolderTree } from "@/lib/folder-tree";
import { ArrowLeft, Save, Trash2, Settings, History, Braces, Zap } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/providers/i18n-provider";

export default function EditPromptPage() {
  const { t } = useI18n();
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const { id } = useParams();
  const router = useRouter();

  const { data: prompt, isLoading } = usePrompt(orgId, id as string);
  const { mutate: updatePrompt, isPending } = useUpdatePrompt(orgId, id as string);
  const { mutate: deletePrompt, isPending: isDeleting } = useDeletePrompt(orgId);
  const { data: folders } = useFolders(orgId);
  const flattenedFolders = flattenFolderTree(folders);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"props" | "history" | "variables" | "test">("props");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setDescription(prompt.description || "");
      setFolderId(prompt.folderId || "");
      setContent((prompt as any).currentVersion?.content || "");
      setSelectedTagIds(
        (((prompt as any).tagRelations as Array<{ tagId: string }> | undefined) ?? []).map((relation) => relation.tagId),
      );
    }
  }, [prompt]);

  const handleSave = () => {
    setFeedback(null);
    updatePrompt(
      { title, description, folderId: folderId || undefined, content, tagIds: selectedTagIds },
      {
        onSuccess: () => setFeedback({ tone: "success", message: t("editPromptPage.saveSuccess") }),
        onError: (error) => {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : t("editPromptPage.saveFailedRetry") });
        },
      },
    );
  };

  const handleDelete = () => {
    if (!window.confirm(t("editPromptPage.deleteConfirm"))) return;
    deletePrompt(id as string, {
      onSuccess: () => router.push("/prompts"),
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">{t("common.loading")}</div>;

  const tabs = [
    { key: "props" as const, label: t("editPromptPage.props"), icon: Settings },
    { key: "history" as const, label: t("editPromptPage.history"), icon: History },
    { key: "variables" as const, label: t("editPromptPage.template"), icon: Braces },
    { key: "test" as const, label: t("editPromptPage.test"), icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/prompts" className="p-2 hover:bg-muted rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t("editPromptPage.title")}</h1>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || isDeleting}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isPending ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>

      {feedback ? <ActionFeedback tone={feedback.tone} message={feedback.message} /> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("editPromptPage.content")}</label>
            <PromptEditor value={content} onChange={(v) => setContent(v || "")} />
          </div>
        </div>
        <div className="border rounded-xl bg-card h-fit overflow-hidden flex flex-col shadow-sm">
          <div className="flex border-b bg-muted/30 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 py-2 px-3 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 rounded-lg transition-all",
                  activeTab === tab.key
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "props" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("editPromptPage.titleLabel")}</label>
                  <input
                    className="w-full rounded-md border p-2.5 bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                    placeholder={t("editPromptPage.titlePlaceholder")}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("editPromptPage.description")}</label>
                  <textarea
                    className="w-full rounded-md border p-2.5 bg-background text-sm min-h-[120px] outline-none focus:ring-1 focus:ring-primary resize-none"
                    placeholder={t("editPromptPage.descriptionPlaceholder")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("editPromptPage.folder")}</label>
                    <Link href="/settings/folders" className="text-xs normal-case tracking-normal text-primary hover:underline">
                      {t("editPromptPage.manageFolders")}
                    </Link>
                  </div>
                  <select
                    className="w-full rounded-md border p-2.5 bg-background text-sm outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                  >
                    <option value="">{t("common.rootFolder")}</option>
                    {flattenedFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {"　".repeat(f.depth)}
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <TagSelector
                  orgId={orgId}
                  selectedTagIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                  labelClassName="text-xs font-bold text-muted-foreground uppercase tracking-wider"
                />
              </div>
            )}
            {activeTab === "history" && (
              <VersionHistory orgId={orgId} promptId={id as string} currentVersionId={prompt?.currentVersionId} />
            )}
            {activeTab === "variables" && (
              <TemplateVariables content={content} variables={(prompt as any)?.currentVersion?.variables} />
            )}
            {activeTab === "test" && (
              <AITestPanel
                orgId={orgId}
                promptId={id as string}
                promptVersionId={prompt?.currentVersionId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
