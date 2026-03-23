"use client";

import { useAuthStore } from "@/stores/auth";
import { Bell, Search, LogOut, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSearch } from "@/hooks/use-search";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Header() {
  const { user, logout } = useAuthStore();
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { data: searchResults, isLoading } = useSearch(orgId, query);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setShowResults(false);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="relative w-96" ref={containerRef}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="搜索提示词... (Enter 开启全屏搜索)"
          className="w-full rounded-md bg-muted/50 py-1.5 pl-10 pr-4 text-sm outline-none ring-primary focus:ring-1"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
        />
        
        {showResults && (query || isLoading) && (
          <div className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded-md border bg-popover shadow-lg z-50 p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults?.length ? (
              <div className="space-y-1">
                {searchResults.slice(0, 5).map((result) => (
                  <Link
                    key={result.id}
                    href={`/prompts/${result.id}`}
                    className="block px-3 py-2 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setShowResults(false)}
                  >
                    <div className="text-sm font-medium">{result.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{result.description}</div>
                  </Link>
                ))}
                {searchResults.length > 5 && (
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}`}
                    className="block text-center py-2 text-xs text-primary hover:underline"
                    onClick={() => setShowResults(false)}
                  >
                    查看全部 {searchResults.length} 个结果
                  </Link>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-muted-foreground">未找到相关提示词</div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button className="rounded-full p-2 hover:bg-muted relative" aria-label="通知">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 pl-2 border-l">
          <span className="text-sm font-medium">{user?.name ?? "未登录"}</span>
          <button
            onClick={logout}
            className="rounded-md p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="登出"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
