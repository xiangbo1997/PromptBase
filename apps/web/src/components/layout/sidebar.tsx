"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { MessageSquare, Settings, Users, Sparkles, Folder, Hash, Heart, History } from "lucide-react";
import { cn } from "@promptbase/ui";
import { useFolders } from "@/hooks/use-folders";
import { useTags } from "@/hooks/use-tags";
import { flattenFolderTree } from "@/lib/folder-tree";
import { useI18n } from "@/components/providers/i18n-provider";

const navItems = [
  { labelKey: "nav.prompts", href: "/prompts", icon: MessageSquare },
  { labelKey: "nav.favorites", href: "/favorites", icon: Heart },
  { labelKey: "nav.playground", href: "/playground", icon: Sparkles },
  { labelKey: "nav.models", href: "/settings/models", icon: Settings },
  { labelKey: "nav.folders", href: "/settings/folders", icon: Folder },
  { labelKey: "nav.tags", href: "/settings/tags", icon: Hash },
  { labelKey: "nav.team", href: "/settings/team", icon: Users },
  { labelKey: "nav.audit", href: "/settings/audit", icon: History },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const { data: folders } = useFolders(orgId);
  const { data: tags } = useTags(orgId);
  const flattenedFolders = flattenFolderTree(folders);
  const { t } = useI18n();

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
            {t(item.labelKey)}
          </Link>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
        <div className="space-y-2">
          <h4 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("common.folders")}
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
            {t("common.tags")}
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
