"use client";

import { useI18n } from "@/components/providers/i18n-provider";
import { SUPPORTED_LOCALES, type Locale, type TranslationKey } from "@/lib/i18n";

const LOCALE_LABELS: Record<Locale, TranslationKey> = {
  "zh-CN": "localeSwitcher.zhCN",
  "en-US": "localeSwitcher.enUS",
};

export default function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <span>{t("localeSwitcher.label")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="rounded-md border bg-background px-2 py-1 text-xs text-foreground outline-none ring-primary focus:ring-1"
        aria-label={t("localeSwitcher.label")}
      >
        {SUPPORTED_LOCALES.map((item) => (
          <option key={item} value={item}>
            {t(LOCALE_LABELS[item])}
          </option>
        ))}
      </select>
    </label>
  );
}
