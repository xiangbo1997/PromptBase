"use client";

import { useMemo, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { ActionFeedback } from "@/components/prompt/action-feedback";
import { flattenFolderTree } from "@/lib/folder-tree";
import { useCreateFolder, useDeleteFolder, useFolders, useMoveFolder, useUpdateFolder } from "@/hooks/use-folders";
import type { Folder } from "@promptbase/shared";
import { Edit2, Folder as FolderIcon, Loader2, Plus, Save, Trash2, X } from "lucide-react";

interface FolderFormState {
  name: string;
  description: string;
  parentId: string;
}

const defaultFormState: FolderFormState = {
  name: "",
  description: "",
  parentId: "",
};

function toFormState(folder?: Folder): FolderFormState {
  if (!folder) return defaultFormState;
  return {
    name: folder.name,
    description: folder.description || "",
    parentId: folder.parentId || "",
  };
}

export default function FoldersPage() {
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const { data: folders, isLoading } = useFolders(orgId);
  const { mutateAsync: createFolder, isPending: isCreating } = useCreateFolder(orgId);
  const { mutateAsync: updateFolder, isPending: isUpdating } = useUpdateFolder(orgId);
  const { mutateAsync: moveFolder, isPending: isMoving } = useMoveFolder(orgId);
  const { mutate: deleteFolder, isPending: isDeleting } = useDeleteFolder(orgId);

  const flattenedFolders = useMemo(() => flattenFolderTree(folders), [folders]);

  const [createForm, setCreateForm] = useState<FolderFormState>(defaultFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FolderFormState>(defaultFormState);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const isSaving = isUpdating || isMoving;

  const resetCreateForm = () => setCreateForm(defaultFormState);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    try {
      await createFolder({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        parentId: createForm.parentId || undefined,
      });
      resetCreateForm();
      setFeedback({ tone: "success", message: "文件夹已创建" });
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "创建文件夹失败，请重试" });
    }
  };

  const startCreateChild = (folder: Folder) => {
    setCreateForm({
      name: "",
      description: "",
      parentId: folder.id,
    });
    setFeedback(null);
  };

  const startEdit = (folder: Folder) => {
    setEditingId(folder.id);
    setEditForm(toFormState(folder));
    setFeedback(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(defaultFormState);
  };

  const handleUpdate = async (folder: Folder) => {
    setFeedback(null);

    try {
      await updateFolder({
        id: folder.id,
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
      });

      const nextParentId = editForm.parentId || null;
      const currentParentId = folder.parentId || null;
      if (nextParentId !== currentParentId) {
        await moveFolder({ id: folder.id, parentId: nextParentId });
      }

      cancelEdit();
      setFeedback({ tone: "success", message: "文件夹已更新" });
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "更新文件夹失败，请重试" });
    }
  };

  const handleDelete = (folder: Folder) => {
    if (!window.confirm(`确定要删除文件夹“${folder.name}”吗？删除前需要先清空其子文件夹和提示词。`)) return;

    setFeedback(null);
    deleteFolder(folder.id, {
      onSuccess: () => {
        if (editingId === folder.id) cancelEdit();
        setFeedback({ tone: "success", message: "文件夹已删除" });
      },
      onError: (error) => {
        setFeedback({ tone: "error", message: error instanceof Error ? error.message : "删除文件夹失败，请重试" });
      },
    });
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">文件夹管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">维护提示词文件夹层级，方便在创建、筛选和搜索时按目录归类。</p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {flattenedFolders.length} 个文件夹
        </div>
      </div>

      {feedback ? <ActionFeedback tone={feedback.tone} message={feedback.message} /> : null}

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold">新建文件夹</h2>
            <p className="text-sm text-muted-foreground">支持创建根目录或挂到已有文件夹下作为子目录。</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">名称</label>
              <input
                required
                className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                placeholder="例如：销售话术、客服 SOP、代码模板"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">描述</label>
              <textarea
                rows={3}
                className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder="说明这个文件夹的用途，可选。"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">父级目录</label>
              <select
                className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={createForm.parentId}
                onChange={(e) => setCreateForm({ ...createForm, parentId: e.target.value })}
              >
                <option value="">根目录</option>
                {flattenedFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {"　".repeat(folder.depth)}
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isCreating || !createForm.name.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              创建文件夹
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">目录结构</h2>
          <p className="mt-1 text-sm text-muted-foreground">支持改名、调整父级目录，以及删除空文件夹。</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !flattenedFolders.length ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">还没有文件夹，先创建一个。</div>
        ) : (
          <div className="divide-y">
            {flattenedFolders.map((folder) => {
              const isEditing = editingId === folder.id;
              const parentOptions = flattenedFolders.filter(
                (candidate) =>
                  candidate.id !== folder.id &&
                  !candidate.materializedPath.startsWith(`${folder.materializedPath}/`),
              );

              return (
                <div key={folder.id} className="px-6 py-5">
                  {isEditing ? (
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
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
                          <label className="text-sm font-medium">父级目录</label>
                          <select
                            className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                            value={editForm.parentId}
                            onChange={(e) => setEditForm({ ...editForm, parentId: e.target.value })}
                          >
                            <option value="">根目录</option>
                            {parentOptions.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {"　".repeat(candidate.depth)}
                                {candidate.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdate(folder)}
                            disabled={isSaving || !editForm.name.trim()}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
                      <div className="space-y-2" style={{ paddingLeft: `${folder.depth * 1.5}rem` }}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FolderIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{folder.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {folder.parentId ? "子目录" : "根目录"} · 更新于 {new Date(folder.updatedAt).toLocaleString("zh-CN")}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{folder.description || "未填写描述"}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startCreateChild(folder)}
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                        >
                          <Plus className="h-4 w-4" />
                          新建子级
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(folder)}
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                        >
                          <Edit2 className="h-4 w-4" />
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(folder)}
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
