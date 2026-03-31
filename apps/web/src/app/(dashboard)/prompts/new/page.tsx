"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useCreatePrompt } from "@/hooks/use-prompts";
import { useFolders } from "@/hooks/use-folders";
import { ActionFeedback } from "@/components/prompt/action-feedback";
import { PromptEditor } from "@/components/editor/prompt-editor";
import { TagSelector } from "@/components/prompt/tag-selector";
import { flattenFolderTree } from "@/lib/folder-tree";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/providers/i18n-provider";

export default function NewPromptPage() {
  const { t } = useI18n();
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const router = useRouter();
  const { mutate: createPrompt, isPending } = useCreatePrompt(orgId);
  const { data: folders } = useFolders(orgId);
  const flattenedFolders = flattenFolderTree(folders);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const handleSave = () => {
    setFeedback(null);
    createPrompt(
      { title, content, description, folderId: folderId || undefined, tagIds: selectedTagIds },
      {
        onSuccess: (data) => {
          setFeedback({ tone: "success", message: t("newPromptPage.createSuccessRedirecting") });
          window.setTimeout(() => router.push(`/prompts/${data.id}`), 900);
        },
        onError: (error) => {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : t("newPromptPage.createFailedRetry") });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/prompts" className="p-2 hover:bg-muted rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t("newPromptPage.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("newPromptPage.subtitle")}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending || !title}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isPending ? t("common.saving") : t("common.save")}
        </button>
      </div>

      {feedback ? <ActionFeedback tone={feedback.tone} message={feedback.message} /> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("newPromptPage.content")}</label>
            <PromptEditor value={content} onChange={(v) => setContent(v || "")} />
          </div>
        </div>
        <div className="space-y-4 border rounded-lg p-6 bg-card h-fit">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("newPromptPage.titleLabel")}</label>
            <input
              className="w-full rounded-md border p-2 bg-background text-sm"
              placeholder={t("newPromptPage.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("newPromptPage.description")}</label>
            <textarea
              className="w-full rounded-md border p-2 bg-background text-sm min-h-[100px]"
              placeholder={t("newPromptPage.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium">{t("newPromptPage.folder")}</label>
              <Link href="/settings/folders" className="text-xs text-primary hover:underline">
                {t("newPromptPage.manageFolders")}
              </Link>
            </div>
            <select
              className="w-full rounded-md border p-2 bg-background text-sm"
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
          <TagSelector orgId={orgId} selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
        </div>
      </div>
    </div>
  );
}
