"use client";

import Link from "next/link";
import { useState } from "react";
import { useRegister } from "@/hooks/use-auth";
import { useI18n } from "@/components/providers/i18n-provider";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { mutate: register, isPending, error } = useRegister();
  const { t } = useI18n();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register({ name, email, password });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">{t("auth.registerTitle")}</h1>
        <p className="text-muted-foreground">{t("auth.registerSubtitle")}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
            {error.message}
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("auth.name")}</label>
          <input
            className="w-full rounded-md border p-2 bg-background"
            placeholder={t("auth.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("auth.email")}</label>
          <input
            className="w-full rounded-md border p-2 bg-background"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("auth.password")}</label>
          <input
            className="w-full rounded-md border p-2 bg-background"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-primary p-2 text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? t("auth.submitting") : t("auth.register")}
        </button>
      </form>
      <div className="text-center text-sm">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="text-primary hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </div>
    </div>
  );
}
