"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { ActionFeedback } from "@/components/prompt/action-feedback";
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from "@/hooks/use-tags";
import type { Tag } from "@promptbase/shared";
import { Edit2, Hash, Loader2, Plus, Save, Trash2, X } from "lucide-react";

interface TagFormState {
  name: string;
  color: string;
  description: string;
}

const defaultFormState: TagFormState = {
  name: "",
  color: "#2563eb",
  description: "",
};

function toFormState(tag?: Tag): TagFormState {
  if (!tag) return defaultFormState;
  return {
    name: tag.name,
    color: tag.color || "#2563eb",
    description: tag.description || "",
  };
}

export default function TagsPage() {
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const { data: tags, isLoading } = useTags(orgId);
  const { mutate: createTag, isPending: isCreating } = useCreateTag(orgId);
  const { mutate: updateTag, isPending: isUpdating } = useUpdateTag(orgId);
  const { mutate: deleteTag, isPending: isDeleting } = useDeleteTag(orgId);

  const [createForm, setCreateForm] = useState<TagFormState>(defaultFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TagFormState>(defaultFormState);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const resetCreateForm = () => setCreateForm(defaultFormState);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    createTag(
      {
        name: createForm.name.trim(),
        color: createForm.color.trim() || undefined,
        description: createForm.description.trim() || undefined,
      },
      {
        onSuccess: () => {
          resetCreateForm();
          setFeedback({ tone: "success", message: "标签已创建" });
        },
        onError: (error) => {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : "创建标签失败，请重试" });
        },
      },
    );
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditForm(toFormState(tag));
    setFeedback(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(defaultFormState);
  };

  const handleUpdate = (id: string) => {
    setFeedback(null);
    updateTag(
      {
        id,
        name: editForm.name.trim(),
        color: editForm.color.trim() || undefined,
        description: editForm.description.trim() || undefined,
      },
      {
        onSuccess: () => {
          cancelEdit();
          setFeedback({ tone: "success", message: "标签已更新" });
        },
        onError: (error) => {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : "更新标签失败，请重试" });
        },
      },
    );
  };

  const handleDelete = (tag: Tag) => {
    if (!window.confirm(`确定要删除标签“${tag.name}”吗？相关提示词会失去这个标签。`)) return;

    setFeedback(null);
    deleteTag(tag.id, {
      onSuccess: () => {
        if (editingId === tag.id) cancelEdit();
        setFeedback({ tone: "success", message: "标签已删除" });
      },
      onError: (error) => {
        setFeedback({ tone: "error", message: error instanceof Error ? error.message : "删除标签失败，请重试" });
      },
    });
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">标签管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">统一维护标签的名称、颜色和描述，用于提示词分类和筛选。</p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {tags?.length ?? 0} 个标签
        </div>
      </div>

      {feedback ? <ActionFeedback tone={feedback.tone} message={feedback.message} /> : null}

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold">新建标签</h2>
            <p className="text-sm text-muted-foreground">创建后可立即在提示词编辑页选择使用。</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px]">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">名称</label>
              <input
                required
                className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                placeholder="例如：营销、代码审查、客服"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">描述</label>
              <textarea
                rows={3}
                className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder="说明这个标签的使用场景，可选。"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">颜色</label>
              <input
                type="color"
                className="h-10 w-full rounded-md border bg-background p-1"
                value={createForm.color}
                onChange={(e) => setCreateForm({ ...createForm, color: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={isCreating || !createForm.name.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              创建标签
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">标签列表</h2>
          <p className="mt-1 text-sm text-muted-foreground">支持修改名称、颜色和描述，也可以直接删除不再使用的标签。</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !tags?.length ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">还没有标签，先创建一个。</div>
        ) : (
          <div className="divide-y">
            {tags.map((tag) => {
              const isEditing = editingId === tag.id;
              const swatchColor = isEditing ? editForm.color || "#94a3b8" : tag.color || "#94a3b8";

              return (
                <div key={tag.id} className="px-6 py-5">
                  {isEditing ? (
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px]">
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">名称</label>
                          <input
                            className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">描述</label>
                          <textarea
                            rows={3}
                            className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">颜色</label>
                          <input
                            type="color"
                            className="h-10 w-full rounded-md border bg-background p-1"
                            value={editForm.color}
                            onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                          <div className="text-xs font-medium text-muted-foreground">预览</div>
                          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swatchColor }} />
                            {editForm.name || "未命名标签"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdate(tag.id)}
                            disabled={isUpdating || !editForm.name.trim()}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow disabled:opacity-50"
                          >
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/30">
                            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: swatchColor }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{tag.name}</h3>
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                <Hash className="h-3 w-3" />
                                {tag.slug}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">更新于 {new Date(tag.updatedAt).toLocaleString("zh-CN")}</p>
                          </div>
                        </div>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                          {tag.description || "未填写描述"}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(tag)}
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                        >
                          <Edit2 className="h-4 w-4" />
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tag)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-2 rounded-md border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          删除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
