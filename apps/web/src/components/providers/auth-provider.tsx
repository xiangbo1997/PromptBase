"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const isPublicPath = pathname.startsWith("/login") || pathname.startsWith("/register");

    if (!isAuthenticated && !token && !isPublicPath) {
      router.push("/login");
    } else if ((isAuthenticated || token) && isPublicPath) {
      router.push("/prompts");
    }
  }, [hydrated, isAuthenticated, token, pathname, router]);

  if (!hydrated) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return <>{children}</>;
}
