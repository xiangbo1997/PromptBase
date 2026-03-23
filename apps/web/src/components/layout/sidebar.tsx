"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { MessageSquare, Settings, Users, Sparkles, Folder, Hash, Heart, History } from "lucide-react";
import { cn } from "@promptbase/ui";
import { useFolders } from "@/hooks/use-folders";
import { useTags } from "@/hooks/use-tags";
import { flattenFolderTree } from "@/lib/folder-tree";

const navItems = [
  { label: "提示词", href: "/prompts", icon: MessageSquare },
  { label: "收藏", href: "/favorites", icon: Heart },
  { label: "AI 实验室", href: "/playground", icon: Sparkles },
  { label: "模型配置", href: "/settings/models", icon: Settings },
  { label: "文件夹管理", href: "/settings/folders", icon: Folder },
  { label: "标签管理", href: "/settings/tags", icon: Hash },
  { label: "团队管理", href: "/settings/team", icon: Users },
  { label: "审计日志", href: "/settings/audit", icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const { data: folders } = useFolders(orgId);
  const { data: tags } = useTags(orgId);
  const flattenedFolders = flattenFolderTree(folders);

  return (
    <aside className="hidden w-64 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Sparkles className="h-6 w-6" />
          <span>PromptBase</span>
        </Link>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
        <div className="space-y-2">
          <h4 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            文件夹
          </h4>
          <div className="space-y-1">
            {flattenedFolders.map((folder) => (
              <Link
                key={folder.id}
                href={`/prompts?folder=${folder.id}`}
                className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                style={{ paddingLeft: `${0.75 + folder.depth * 0.75}rem` }}
              >
                <Folder className="h-4 w-4" />
                {folder.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            标签
          </h4>
          <div className="flex flex-wrap gap-2 px-3">
            {tags?.map((tag) => (
              <Link
                key={tag.id}
                href={`/prompts?tag=${tag.id}`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Hash className="h-3 w-3" />
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
