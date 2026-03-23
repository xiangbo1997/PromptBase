"use client";

import { useFavorites, useToggleFavorite } from "@/hooks/use-favorites";
import { useAuthStore } from "@/stores/auth";
import { useState } from "react";
import { Heart, Grid, List as ListIcon, Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@promptbase/ui";

export default function FavoritesPage() {
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const { data: favorites, isLoading } = useFavorites(orgId);
  const { mutate: toggleFavorite } = useToggleFavorite(orgId);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">我的收藏</h1>
          <p className="text-muted-foreground">您收藏的所有重要提示词</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          共收藏 {favorites?.length || 0} 个提示词
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : favorites?.length ? (
        <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {favorites.map((prompt) => (
            <div
              key={prompt.id}
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
              </Link>
              
              <div className={cn(
                "flex gap-1",
                viewMode === "grid" ? "absolute top-4 right-4" : "ml-4"
              )}>
                <button
                  onClick={() => toggleFavorite(prompt.id)}
                  className="p-1.5 rounded-md transition-colors hover:bg-muted text-red-500"
                  title="取消收藏"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border rounded-lg bg-muted/5 border-dashed">
          <Heart className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">暂无收藏内容</p>
          <p className="text-sm text-muted-foreground/60 mt-1">点击提示词卡片上的心形图标进行收藏</p>
          <Link 
            href="/prompts" 
            className="mt-6 text-sm font-medium text-primary hover:underline"
          >
            去词库看看
          </Link>
        </div>
      )}
    </div>
  );
}
