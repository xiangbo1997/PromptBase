"use client";

import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useSearch } from "@/hooks/use-search";
import { useFolders } from "@/hooks/use-folders";
import { useTags } from "@/hooks/use-tags";
import { useState } from "react";
import { Search as SearchIcon, Filter, Folder, Hash, Grid, List as ListIcon, Heart, Pin } from "lucide-react";
import Link from "next/link";
import { cn } from "@promptbase/ui";
import { flattenFolderTree } from "@/lib/folder-tree";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const query = searchParams.get("q") || "";
  
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [tagId, setTagId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: results, isLoading } = useSearch(orgId, query, { folderId, tagId });
  const { data: folders } = useFolders(orgId);
  const { data: tags } = useTags(orgId);
  const flattenedFolders = flattenFolderTree(folders);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">搜索结果</h1>
          <p className="text-muted-foreground">
            {query ? `正在搜索: "${query}"` : "请输入关键词搜索"}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Filters */}
        <div className="w-full md:w-64 space-y-4">
          <div className="p-4 border rounded-lg bg-card space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Filter className="h-4 w-4" />
              筛选条件
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">文件夹</label>
              <select 
                className="w-full text-sm border rounded-md p-2 bg-background"
                value={folderId || ""}
                onChange={(e) => setFolderId(e.target.value || undefined)}
              >
                <option value="">所有文件夹</option>
                {flattenedFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {"　".repeat(f.depth)}
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">标签</label>
              <select 
                className="w-full text-sm border rounded-md p-2 bg-background"
                value={tagId || ""}
                onChange={(e) => setTagId(e.target.value || undefined)}
              >
                <option value="">所有标签</option>
                {tags?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <button 
              onClick={() => { setFolderId(undefined); setTagId(undefined); }}
              className="w-full text-xs text-center text-muted-foreground hover:text-primary transition-colors"
            >
              重置筛选
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              共找到 {results?.length || 0} 个结果
            </div>
            <div className="flex items-center border rounded-md p-1 bg-muted/50">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1 rounded ${viewMode === "grid" ? "bg-background shadow-sm" : ""}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1 rounded ${viewMode === "list" ? "bg-background shadow-sm" : ""}`}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 rounded-lg border bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : results?.length ? (
            <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-2" : "space-y-2"}>
              {results.map((prompt) => (
                <Link
                  key={prompt.id}
                  href={`/prompts/${prompt.id}`}
                  className={cn(
                    "group block rounded-lg border p-6 hover:shadow-md transition-shadow bg-card relative",
                    viewMode === "list" && "flex items-center justify-between p-4"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                        {prompt.title}
                      </h3>
                      {prompt.isPinned && <Pin className="h-3 w-3 text-primary" />}
                      {prompt.isFavorite && <Heart className="h-3 w-3 text-red-500 fill-current" />}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {prompt.description || "暂无描述"}
                    </p>
                  </div>
                  {viewMode === "grid" && (
                    <div className="flex items-center gap-2 mt-4">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        <Folder className="h-3 w-3" />
                        {prompt.folderId ? flattenedFolders.find((f) => f.id === prompt.folderId)?.name : "根目录"}
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 border rounded-lg bg-muted/5 border-dashed">
              <SearchIcon className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">没有找到匹配的提示词</p>
              <p className="text-sm text-muted-foreground/60 mt-1">尝试更换关键词或清除筛选条件</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
