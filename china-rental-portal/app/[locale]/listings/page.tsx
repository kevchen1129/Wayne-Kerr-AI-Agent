import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListingPrice, searchListings } from "@/lib/data";
import { getDictionary, isLocale } from "@/lib/i18n";
import { SearchForm } from "./search-form";

type SearchParams = {
  checkIn?: string;
  checkOut?: string;
  rooms?: string;
  guests?: string;
};

function getSearchError(
  searchParams: SearchParams,
  copy: ReturnType<typeof getDictionary>
) {
  const { checkIn, checkOut } = searchParams;

  if (checkIn && checkIn < "2026-07-28") {
    return copy.search.pastDate;
  }

  if (checkOut && checkOut < "2026-07-28") {
    return copy.search.pastDate;
  }

  if (checkIn && checkOut && checkOut <= checkIn) {
    return copy.search.invalidDateOrder;
  }

  return null;
}

export default function ListingsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: SearchParams;
}) {
  if (!isLocale(params.locale)) {
    notFound();
  }

  const locale = params.locale;
  const copy = getDictionary(locale);
  const searchError = getSearchError(searchParams, copy);
  const listings = searchError ? [] : searchListings(locale, searchParams);
  const sharedQuery = new URLSearchParams();

  if (searchParams.checkIn) {
    sharedQuery.set("checkIn", searchParams.checkIn);
  }
  if (searchParams.checkOut) {
    sharedQuery.set("checkOut", searchParams.checkOut);
  }
  if (searchParams.rooms) {
    sharedQuery.set("rooms", searchParams.rooms);
  }
  if (searchParams.guests) {
    sharedQuery.set("guests", searchParams.guests);
  }

  const sharedQueryString = sharedQuery.toString();

  return (
    <div className="page-stack">
      <section className="search-shell integrated-search-shell">
        <SearchForm
          locale={locale}
          copy={copy.search}
          initialValues={searchParams}
        />
        {searchError ? <p className="search-error">{searchError}</p> : null}
      </section>

      <section className="results-shell">
        <div className="results-meta">
          <strong>{copy.listings.resultCount(listings.length)}</strong>
          <span>{copy.listings.helper}</span>
        </div>
        <div className="listing-grid">
          {listings.map((listing) => {
            const pricing = getListingPrice(locale, listing, searchParams);
            const detailHref = sharedQueryString
              ? `/${locale}/listings/${listing.slug}?${sharedQueryString}`
              : `/${locale}/listings/${listing.slug}`;

            return (
              <article key={listing.slug} className="listing-card">
                <div className="listing-media">
                  <Image
                    src={listing.coverImage}
                    alt={listing.imageLabel}
                    fill
                    sizes="(max-width: 980px) 100vw, 30vw"
                    className="media-image"
                  />
                </div>
                <div className="listing-body">
                  <div className="listing-row">
                    <div>
                      <span className="muted">{listing.buildingName}</span>
                      <h3>{listing.title}</h3>
                    </div>
                    <span>{pricing.primary}</span>
                  </div>
                  <p>{listing.address}</p>
                  <ul className="feature-line">
                    <li>{listing.apartmentTypeLabel}</li>
                    <li>{listing.sizeLabel}</li>
                    <li>{listing.guestCapacityLabel}</li>
                    <li>{listing.housekeepingLabel}</li>
                  </ul>
                  <ul className="amenity-line">
                    {listing.amenityHighlights.slice(0, 4).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="rate-stack">
                    {pricing.secondary ? <span>{pricing.secondary}</span> : null}
                    {pricing.tertiary ? <span>{pricing.tertiary}</span> : null}
                    <span>{listing.housekeepingLabel}</span>
                  </div>
                  <div className="listing-footer">
                    <span>{listing.availabilityLabel}</span>
                    <Link href={detailHref} className="card-link">
                      {copy.listings.viewDetails}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
