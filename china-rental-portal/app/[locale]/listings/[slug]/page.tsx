import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListingBySlug, getListingPrice, getRelatedListings } from "@/lib/data";
import { getDictionary, isLocale } from "@/lib/i18n";
import { GalleryLightbox } from "./gallery-lightbox";

type SearchParams = {
  checkIn?: string;
  checkOut?: string;
  rooms?: string;
  guests?: string;
};

export default function ListingDetailPage({
  params,
  searchParams,
}: {
  params: { locale: string; slug: string };
  searchParams: SearchParams;
}) {
  if (!isLocale(params.locale)) {
    notFound();
  }

  const locale = params.locale;
  const copy = getDictionary(locale);
  const listing = getListingBySlug(locale, params.slug);

  if (!listing) {
    notFound();
  }

  const pricing = getListingPrice(locale, listing, searchParams);
  const related = getRelatedListings(locale, listing.slug);
  const backQuery = new URLSearchParams();

  if (searchParams.checkIn) {
    backQuery.set("checkIn", searchParams.checkIn);
  }
  if (searchParams.checkOut) {
    backQuery.set("checkOut", searchParams.checkOut);
  }
  if (searchParams.rooms) {
    backQuery.set("rooms", searchParams.rooms);
  }
  if (searchParams.guests) {
    backQuery.set("guests", searchParams.guests);
  }

  const backHref = backQuery.toString() ? `/${locale}/listings?${backQuery.toString()}` : `/${locale}/listings`;

  return (
    <div className="page-stack">
      <section className="trip-header">
        <Link href={backHref} className="back-link">
          {copy.detail.backToListings}
        </Link>
        <div className="trip-title-row">
          <div>
            <p className="eyebrow">{listing.buildingName}</p>
            <h1>{listing.title}</h1>
            <p className="address-line">{listing.address}</p>
          </div>
          <div className="title-price">
            <strong>{pricing.primary}</strong>
            {pricing.secondary ? <span>{pricing.secondary}</span> : null}
            {pricing.tertiary ? <span>{pricing.tertiary}</span> : null}
          </div>
        </div>
      </section>

      <section className="trip-gallery-shell">
        <GalleryLightbox gallery={listing.gallery} altPrefix={listing.title} />

        <aside className="booking-card">
          <div className="booking-price">
            <strong>{pricing.primary}</strong>
            <span>{copy.detail.summaryPrice}</span>
          </div>
          <div className="booking-meta">
            <div>
              <span>{copy.detail.summaryMoveIn}</span>
              <strong>{listing.availabilityLabel}</strong>
            </div>
            <div>
              <span>{copy.detail.summaryDeposit}</span>
              <strong>{listing.depositLabel}</strong>
            </div>
            <div>
              <span>{copy.detail.summaryHousekeeping}</span>
              <strong>{listing.housekeepingLabel}</strong>
            </div>
          </div>
          {pricing.breakdown ? (
            <div className="booking-note">
              <span>{copy.detail.pricingBreakdown}</span>
              <strong>{pricing.breakdown}</strong>
            </div>
          ) : null}
          <button type="button" className="primary-cta">
            {copy.detail.reserve}
          </button>
          <p className="booking-hint">{copy.detail.reserveHint}</p>
        </aside>
      </section>

      <section className="summary-strip">
        {[listing.apartmentTypeLabel, listing.sizeLabel, listing.guestCapacityLabel, listing.housekeepingLabel].map((item) => (
          <div key={item} className="summary-item">
            <strong>{item}</strong>
          </div>
        ))}
      </section>

      <section className="trip-detail-layout">
        <div className="trip-main">
          <article className="info-card">
            <h2>{copy.detail.about}</h2>
            <p>{listing.description}</p>
          </article>

          <article className="info-card">
            <h2>{copy.detail.amenities}</h2>
            <ul className="pill-list">
              {listing.amenityHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="info-card">
            <h2>{copy.detail.stayInfo}</h2>
            <ul className="detail-list">
              <li>{listing.depositLabel}</li>
              <li>{listing.utilitiesLabel}</li>
              <li>{listing.housekeepingLabel}</li>
            </ul>
          </article>

          <article className="info-card">
            <h2>{copy.detail.kitchen}</h2>
            <p>{listing.kitchenFacilitiesLabel}</p>
          </article>

          <article className="info-card">
            <h2>{copy.detail.workspace}</h2>
            <p>{listing.workspaceDetail}</p>
          </article>

          <article className="info-card">
            <h2>{copy.detail.checkInMethod}</h2>
            <p>{listing.checkInMethodLabel}</p>
          </article>

          <article className="info-card">
            <h2>{copy.detail.cancellation}</h2>
            <p>{listing.cancellationTermsLabel}</p>
          </article>

          <article className="info-card">
            <h2>{copy.detail.longStayTerms}</h2>
            <p>{listing.longStayTermsLabel}</p>
          </article>
        </div>

        <aside className="trip-side">
          <article className="sidebar-card">
            <h2>{copy.detail.quickFacts}</h2>
            <ul className="detail-list">
              <li>{listing.apartmentTypeLabel}</li>
              <li>{listing.sizeLabel}</li>
              <li>{listing.guestCapacityLabel}</li>
              <li>{listing.bathroomLabel}</li>
              <li>{listing.floorLabel}</li>
              <li>{listing.metroLabel}</li>
            </ul>
          </article>

          <article className="sidebar-card">
            <h2>{copy.detail.location}</h2>
            <p>{listing.address}</p>
            <ul className="detail-list">
              <li>{listing.buildingName}</li>
              <li>{listing.area}</li>
              <li>{listing.walk}</li>
            </ul>
          </article>
        </aside>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.detail.moreOptionsEyebrow}</p>
            <h2>{copy.detail.moreOptionsTitle}</h2>
          </div>
        </div>
        <div className="listing-grid">
          {related.map((item) => {
            const relatedPricing = getListingPrice(locale, item, searchParams);
            const href = backQuery.toString()
              ? `/${locale}/listings/${item.slug}?${backQuery.toString()}`
              : `/${locale}/listings/${item.slug}`;

            return (
              <article key={item.slug} className="listing-card">
                <div className="listing-media">
                  <Image
                    src={item.coverImage}
                    alt={item.imageLabel}
                    fill
                    sizes="(max-width: 980px) 100vw, 30vw"
                    className="media-image"
                  />
                </div>
                <div className="listing-body">
                  <div className="listing-row">
                    <h3>{item.title}</h3>
                    <span>{relatedPricing.primary}</span>
                  </div>
                  <p>{item.address}</p>
                  <Link href={href} className="card-link">
                    {copy.detail.viewUnit}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
