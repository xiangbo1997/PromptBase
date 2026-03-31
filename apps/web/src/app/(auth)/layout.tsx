import { ReactNode } from "react";
import LocaleSwitcher from "@/components/layout/locale-switcher";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-xl">
        <div className="flex justify-end">
          <LocaleSwitcher />
        </div>
        {children}
      </div>
    </div>
  );
}
