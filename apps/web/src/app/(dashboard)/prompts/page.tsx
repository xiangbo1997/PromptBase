"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { usePrompts } from "@/hooks/use-prompts";
import { usePins, useTogglePin } from "@/hooks/use-pins";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useFolders } from "@/hooks/use-folders";
import { useTags } from "@/hooks/use-tags";
import { useState } from "react";
import { Search, Plus, Grid, List as ListIcon, Pin, Heart, PinOff, Upload, Download } from "lucide-react";
import { cn } from "@promptbase/ui";
import { ImportDialog } from "@/components/import-export/import-dialog";
import { ExportDialog } from "@/components/import-export/export-dialog";
import { flattenFolderTree } from "@/lib/folder-tree";

export default function PromptsPage() {
  const searchParams = useSearchParams();
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const folderId = searchParams.get("folder") || undefined;
  const tagId = searchParams.get("tag") || undefined;
  const { data: prompts, isLoading: isLoadingPrompts } = usePrompts(orgId, { folderId, tagId });
  const { data: pinnedPrompts, isLoading: isLoadingPins } = usePins(orgId);
  const { mutate: togglePin } = useTogglePin(orgId);
  const { mutate: toggleFavorite } = useToggleFavorite(orgId);
  const { data: folders } = useFolders(orgId);
  const { data: tags } = useTags(orgId);
  const flattenedFolders = flattenFolderTree(folders);
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch = (prompt: { title: string; description?: string | null }) =>
    !normalizedSearch ||
    prompt.title.toLowerCase().includes(normalizedSearch) ||
    prompt.description?.toLowerCase().includes(normalizedSearch);

  const filteredPrompts = prompts?.filter(matchesSearch);
  const filteredPinnedPrompts = pinnedPrompts?.filter((prompt) => {
    if (folderId && prompt.folderId !== folderId) return false;
    if (
      tagId &&
      !((prompt as any).tagRelations as Array<{ tagId: string }> | undefined)?.some((relation) => relation.tagId === tagId)
    ) {
      return false;
    }
    return matchesSearch(prompt);
  });
  const pinnedPromptIds = new Set(filteredPinnedPrompts?.map((prompt) => prompt.id) ?? []);
  const visiblePrompts = filteredPrompts?.filter((prompt) => !pinnedPromptIds.has(prompt.id));

  const isLoading = isLoadingPrompts || isLoadingPins;
  const activeFolder = flattenedFolders.find((folder) => folder.id === folderId);
  const activeTag = tags?.find((tag) => tag.id === tagId);

  const PromptCard = ({ prompt, isPinnedView = false }: { prompt: any; isPinnedView?: boolean }) => (
    <div
      className={cn(
        "group relative block rounded-lg border p-6 hover:shadow-md transition-shadow bg-card",
        viewMode === "list" && "flex items-center justify-between p-4"
      )}
    >
      <Link href={`/prompts/${prompt.id}`} className="flex-1 min-w-0">
        <div>
          <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
            {prompt.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {prompt.description || "暂无描述"}
          </p>
        </div>
        {viewMode === "grid" && (
          <div className="flex gap-2 mt-4">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border font-medium">
              {prompt.status}
            </span>
          </div>
        )}
      </Link>
      
      <div className={cn(
        "flex gap-1",
        viewMode === "grid" ? "absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" : "ml-4"
      )}>
        <button
          onClick={(e) => {
            e.preventDefault();
            togglePin(prompt.id);
          }}
          className={cn(
            "p-1.5 rounded-md transition-colors hover:bg-muted",
            prompt.isPinned ? "text-primary" : "text-muted-foreground"
          )}
          title={prompt.isPinned ? "取消置顶" : "置顶"}
        >
          {prompt.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(prompt.id);
          }}
          className={cn(
            "p-1.5 rounded-md transition-colors hover:bg-muted",
            prompt.isFavorite ? "text-red-500" : "text-muted-foreground"
          )}
          title={prompt.isFavorite ? "取消收藏" : "收藏"}
        >
          <Heart className={cn("h-4 w-4", prompt.isFavorite && "fill-current")} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">提示词库</h1>
          <p className="text-muted-foreground">
            管理和组织您的团队 AI 提示词
            {activeFolder ? ` · 文件夹：${activeFolder.name}` : ""}
            {activeTag ? ` · 标签：${activeTag.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted transition-colors"
          >
            <Upload className="h-4 w-4" />
            导入
          </button>
          <button
            onClick={() => setIsExportOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" />
            导出
          </button>
          <Link
            href="/prompts/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            新建提示词
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-md border bg-background pl-9 p-2 text-sm"
            placeholder="搜索提示词..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center border rounded-md p-1 bg-muted/50">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded ${viewMode === "grid" ? "bg-background shadow-sm" : ""}`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded ${viewMode === "list" ? "bg-background shadow-sm" : ""}`}
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
        {(folderId || tagId) && (
          <Link href="/prompts" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            清除筛选
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {filteredPinnedPrompts && filteredPinnedPrompts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Pin className="h-4 w-4" />
                置顶提示词
              </div>
              <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                {filteredPinnedPrompts.map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} isPinnedView />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {filteredPinnedPrompts && filteredPinnedPrompts.length > 0 && (
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                全部提示词
              </div>
            )}
            <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
              {visiblePrompts?.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
            {(filteredPrompts?.length ?? 0) === 0 && (
              <div className="py-12 text-center border rounded-lg bg-muted/10 text-muted-foreground">
                没有找到相关提示词
              </div>
            )}
          </div>
        </div>
      )}
      <ImportDialog orgId={orgId} isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
      <ExportDialog orgId={orgId} isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}
