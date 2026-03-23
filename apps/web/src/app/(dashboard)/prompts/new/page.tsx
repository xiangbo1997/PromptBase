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

export default function NewPromptPage() {
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
          setFeedback({ tone: "success", message: "创建成功，正在跳转到详情页..." });
          window.setTimeout(() => router.push(`/prompts/${data.id}`), 900);
        },
        onError: (error) => {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : "创建失败，请重试" });
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
            <h1 className="text-2xl font-bold">新建提示词</h1>
            <p className="text-sm text-muted-foreground">创建一个新的提示词模板</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending || !title}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isPending ? "保存中..." : "保存"}
        </button>
      </div>

      {feedback ? <ActionFeedback tone={feedback.tone} message={feedback.message} /> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">内容</label>
            <PromptEditor value={content} onChange={(v) => setContent(v || "")} />
          </div>
        </div>
        <div className="space-y-4 border rounded-lg p-6 bg-card h-fit">
          <div className="space-y-2">
            <label className="text-sm font-medium">标题</label>
            <input
              className="w-full rounded-md border p-2 bg-background text-sm"
              placeholder="提示词标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">描述</label>
            <textarea
              className="w-full rounded-md border p-2 bg-background text-sm min-h-[100px]"
              placeholder="简短描述该提示词的用途"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium">文件夹</label>
              <Link href="/settings/folders" className="text-xs text-primary hover:underline">
                管理文件夹
              </Link>
            </div>
            <select
              className="w-full rounded-md border p-2 bg-background text-sm"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            >
              <option value="">根目录</option>
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
