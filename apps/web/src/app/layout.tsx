"use client";

import "./globals.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ReactNode } from "react";
import { I18nProvider } from "@/components/providers/i18n-provider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full" suppressHydrationWarning>
      <head>
        <title>PromptBase</title>
        <meta name="description" content="团队级 AI 提示词管理平台" />
      </head>
      <body className="h-full">
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
