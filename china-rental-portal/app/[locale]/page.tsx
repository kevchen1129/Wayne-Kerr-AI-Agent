import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

export default function LocaleHomePage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = isLocale(params.locale) ? params.locale : "en";
  redirect(`/${locale}/listings`);
}
