"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { ActionFeedback } from "@/components/prompt/action-feedback";
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from "@/hooks/use-tags";
import type { Tag } from "@promptbase/shared";
import { Edit2, Hash, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";

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
  const { t, locale } = useI18n();
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
          setFeedback({ tone: "success", message: t("settingsTagsPage.created") });
        },
        onError: (error) => {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : t("settingsTagsPage.createFailedRetry") });
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
          setFeedback({ tone: "success", message: t("settingsTagsPage.updated") });
        },
        onError: (error) => {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : t("settingsTagsPage.updateFailedRetry") });
        },
      },
    );
  };

  const handleDelete = (tag: Tag) => {
    if (!window.confirm(t("settingsTagsPage.deleteConfirm", { name: tag.name }))) return;

    setFeedback(null);
    deleteTag(tag.id, {
      onSuccess: () => {
        if (editingId === tag.id) cancelEdit();
        setFeedback({ tone: "success", message: t("settingsTagsPage.deleted") });
      },
      onError: (error) => {
        setFeedback({ tone: "error", message: error instanceof Error ? error.message : t("settingsTagsPage.deleteFailedRetry") });
      },
    });
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("settingsTagsPage.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("settingsTagsPage.subtitle")}</p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {t("settingsTagsPage.count", { count: tags?.length ?? 0 })}
        </div>
      </div>

      {feedback ? <ActionFeedback tone={feedback.tone} message={feedback.message} /> : null}

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold">{t("settingsTagsPage.newTag")}</h2>
            <p className="text-sm text-muted-foreground">{t("settingsTagsPage.newTagHint")}</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px]">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("settingsTagsPage.name")}</label>
              <input
                required
                className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                placeholder={t("settingsTagsPage.namePlaceholder")}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("settingsTagsPage.description")}</label>
              <textarea
                rows={3}
                className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder={t("settingsTagsPage.descriptionPlaceholder")}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("settingsTagsPage.color")}</label>
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
              {t("settingsTagsPage.createTag")}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t("settingsTagsPage.tagList")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("settingsTagsPage.tagListHint")}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !tags?.length ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">{t("settingsTagsPage.noTags")}</div>
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
                          <label className="text-sm font-medium">{t("settingsTagsPage.name")}</label>
                          <input
                            className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">{t("settingsTagsPage.description")}</label>
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
                          <label className="text-sm font-medium">{t("settingsTagsPage.color")}</label>
                          <input
                            type="color"
                            className="h-10 w-full rounded-md border bg-background p-1"
                            value={editForm.color}
                            onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                          <div className="text-xs font-medium text-muted-foreground">{t("settingsTagsPage.preview")}</div>
                          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swatchColor }} />
                            {editForm.name || t("settingsTagsPage.unnamedTag")}
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
                            {t("common.save")}
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
                            <p className="text-xs text-muted-foreground">{t("common.updatedAt", { value: new Date(tag.updatedAt).toLocaleString(locale) })}</p>
                          </div>
                        </div>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                          {tag.description || t("common.noDescriptionProvided")}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(tag)}
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                        >
                          <Edit2 className="h-4 w-4" />
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tag)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-2 rounded-md border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          {t("common.delete")}
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
