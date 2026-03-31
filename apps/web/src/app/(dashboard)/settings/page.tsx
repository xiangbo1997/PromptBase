 "use client";

import { useI18n } from "@/components/providers/i18n-provider";

export default function SettingsPage() {
  const { t } = useI18n();

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settingsPage.title")}</h1>
        <p className="text-muted-foreground">{t("settingsPage.subtitle")}</p>
      </div>
      <div className="grid gap-6">
        <section className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">{t("settingsPage.profile")}</h2>
          <div className="grid gap-4 max-w-md">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("settingsPage.displayName")}</label>
              <input className="rounded-md border p-2 bg-background" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("settingsPage.emailAddress")}</label>
              <input className="rounded-md border p-2 bg-muted cursor-not-allowed" disabled />
            </div>
            <button className="w-fit rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">{t("settingsPage.saveChanges")}</button>
          </div>
        </section>
      </div>
    </div>
  );
}
