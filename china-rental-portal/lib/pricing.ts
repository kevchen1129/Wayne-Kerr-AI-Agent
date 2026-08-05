import type { Locale } from "@/lib/i18n";

export type StaySearch = {
  checkIn?: string;
  checkOut?: string;
};

export type PriceableListing = {
  minimumStay: number;
  maximumStay?: number;
  nightlyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  cleaningFee?: number;
  deposit?: number;
  utilitiesIncluded: boolean;
  housekeepingFrequency: string;
};

type TierBreakdown = {
  label: "monthly" | "weekly" | "nightly";
  quantity: number;
  subtotal: number;
};

function formatUsd(amount: number) {
  return `US$${amount.toLocaleString("en-US")}`;
}

export function getStayNights(stay: StaySearch) {
  if (!stay.checkIn || !stay.checkOut) {
    return 0;
  }

  const start = new Date(stay.checkIn).getTime();
  const end = new Date(stay.checkOut).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }

  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function buildAccommodationBreakdown(listing: PriceableListing, nights: number) {
  let remaining = nights;
  const breakdown: TierBreakdown[] = [];

  if (listing.monthlyRate && remaining >= 28) {
    const months = Math.floor(remaining / 28);
    breakdown.push({
      label: "monthly",
      quantity: months,
      subtotal: months * listing.monthlyRate,
    });
    remaining -= months * 28;
  }

  if (listing.weeklyRate && remaining >= 7) {
    const weeks = Math.floor(remaining / 7);
    breakdown.push({
      label: "weekly",
      quantity: weeks,
      subtotal: weeks * listing.weeklyRate,
    });
    remaining -= weeks * 7;
  }

  if (remaining > 0) {
    breakdown.push({
      label: "nightly",
      quantity: remaining,
      subtotal: remaining * listing.nightlyRate,
    });
  }

  const accommodationTotal = breakdown.reduce((sum, item) => sum + item.subtotal, 0);

  return { breakdown, accommodationTotal };
}

export function getPriceSummary(listing: PriceableListing, locale: Locale, stay: StaySearch) {
  const isZh = locale === "zh";
  const nights = getStayNights(stay);

  if (nights === 0) {
    return {
      nights,
      eligible: true,
      total: null,
      primary: isZh
        ? `每晚 ${formatUsd(listing.nightlyRate)} 起`
        : `From ${formatUsd(listing.nightlyRate)} per night`,
      secondary: listing.monthlyRate
        ? isZh
          ? "可提供月租价"
          : "Monthly rates available"
        : listing.weeklyRate
          ? isZh
            ? "可提供周租价"
            : "Weekly rates available"
          : undefined,
      tertiary: undefined,
      breakdown: null,
    };
  }

  const eligible =
    listing.maximumStay === undefined || nights <= listing.maximumStay;

  if (!eligible) {
    return {
      nights,
      eligible: false,
      total: null,
      primary: isZh ? "此房已超过最长可入住晚数" : "This unit exceeds the maximum stay limit",
      secondary:
        listing.maximumStay !== undefined
          ? isZh
            ? `最长入住 ${listing.maximumStay} 晚`
            : `Maximum stay: ${listing.maximumStay} nights`
          : undefined,
      tertiary: undefined,
      breakdown: null,
    };
  }

  const { breakdown, accommodationTotal } = buildAccommodationBreakdown(listing, nights);
  const cleaningFee = listing.cleaningFee ?? 0;
  const total = accommodationTotal + cleaningFee;
  const usedMonthly = breakdown.some((item) => item.label === "monthly");
  const usedWeekly = breakdown.some((item) => item.label === "weekly");
  const breakdownLabel = usedMonthly
    ? isZh
      ? "已使用月租价并补足剩余晚数"
      : "Monthly rate applied with remaining nights added"
    : usedWeekly
      ? isZh
        ? "已使用周租价并补足剩余晚数"
        : "Weekly rate applied with remaining nights added"
      : isZh
        ? "以每晚价格计算"
        : "Nightly rate applied";

  return {
    nights,
    eligible: true,
    total,
    accommodationTotal,
    cleaningFee,
    primary: isZh
      ? `${formatUsd(total)} / ${nights} 晚`
      : `${formatUsd(total)} total for ${nights} nights`,
    secondary: cleaningFee > 0
      ? isZh
        ? `含清洁费 ${formatUsd(cleaningFee)}`
        : `Includes ${formatUsd(cleaningFee)} cleaning fee`
      : undefined,
    tertiary: breakdownLabel,
    breakdown:
      breakdown.length > 0
        ? breakdown
            .map((item) => {
              const label =
                item.label === "monthly"
                  ? isZh
                    ? `月租 x ${item.quantity}`
                    : `Monthly x ${item.quantity}`
                  : item.label === "weekly"
                    ? isZh
                      ? `周租 x ${item.quantity}`
                      : `Weekly x ${item.quantity}`
                    : isZh
                      ? `每晚 x ${item.quantity}`
                      : `Nightly x ${item.quantity}`;
              return `${label}: ${formatUsd(item.subtotal)}`;
            })
            .join(" · ")
        : null,
  };
}
