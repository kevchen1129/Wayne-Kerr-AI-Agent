import Link from "next/link";
import { locales, type Locale, isLocale, getDictionary } from "@/lib/i18n";

export default function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const locale = isLocale(params.locale) ? params.locale : locales[0];
  const copy = getDictionary(locale);

  return (
    <div className="site-shell">
      <header className="topbar">
        <Link href={`/${locale}`} className="brandmark">
          <span className="brandmark-badge">KA</span>
          <div>
            <strong>{copy.brand}</strong>
            <span>{copy.nav.tagline}</span>
          </div>
        </Link>
        <nav className="topnav">
          <Link href={`/${locale}/listings`} className="topnav-pill">
            <span>{copy.nav.listings}</span>
          </Link>
        </nav>
        <div className="locale-switch">
          {locales.map((item) => (
            <Link
              key={item}
              href={`/${item}`}
              className={item === locale ? "locale-pill active" : "locale-pill"}
            >
              {item.toUpperCase()}
            </Link>
          ))}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
