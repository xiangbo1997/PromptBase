"use client";

import Link from "next/link";
import { useState } from "react";
import { useCreateTag, useTags } from "@/hooks/use-tags";
import { useI18n } from "@/components/providers/i18n-provider";
import type { UUID } from "@promptbase/shared";
import { Loader2, Plus } from "lucide-react";

interface TagSelectorProps {
  orgId: UUID;
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  labelClassName?: string;
  emptyText?: string;
}

export function TagSelector({
  orgId,
  selectedTagIds,
  onChange,
  labelClassName = "text-sm font-medium",
  emptyText,
}: TagSelectorProps) {
  const { t } = useI18n();
  const { data: tags } = useTags(orgId);
  const { mutate: createTag, isPending: isCreating } = useCreateTag(orgId);
  const [newTagName, setNewTagName] = useState("");
  const [createError, setCreateError] = useState("");

  const resolvedEmptyText = emptyText ?? t("prompt.noAvailableTags");

  const toggleTag = (tagId: string) => {
    onChange(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId],
    );
  };

  const handleCreateTag = () => {
    const name = newTagName.trim();
    if (!name) return;

    setCreateError("");
    createTag(
      { name },
      {
        onSuccess: (createdTag) => {
          setNewTagName("");
          if (!selectedTagIds.includes(createdTag.id)) {
            onChange([...selectedTagIds, createdTag.id]);
          }
        },
        onError: (error) => {
          setCreateError(error instanceof Error ? error.message : t("prompt.createTagFailed"));
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className={labelClassName}>{t("prompt.tagLabel")}</label>
        <Link href="/settings/tags" className="text-xs text-primary hover:underline">
          {t("prompt.manageTags")}
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags?.length ? (
          tags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  isSelected ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {tag.name}
              </button>
            );
          })
        ) : (
          <div className="text-sm text-muted-foreground">{resolvedEmptyText}</div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border p-2 bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
          placeholder={t("prompt.newTagName")}
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreateTag();
            }
          }}
        />
        <button
          type="button"
          onClick={handleCreateTag}
          disabled={isCreating || !newTagName.trim()}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t("prompt.createTag")}
        </button>
      </div>
      {createError ? <div className="text-xs text-destructive">{createError}</div> : null}
    </div>
  );
}
