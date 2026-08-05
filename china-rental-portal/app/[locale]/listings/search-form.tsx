"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateRangePicker } from "./date-range-picker";

const TODAY = "2026-07-28";

type SearchFormCopy = {
  checkIn: string;
  checkOut: string;
  rooms: string;
  guests: string;
  anyRooms: string;
  anyGuests: string;
  cta: string;
  helper: string;
  studio: string;
  oneBedroom: string;
  twoBedroom: string;
  invalidDateOrder: string;
  pastDate: string;
  missingFilters: string;
};

export function SearchForm({
  locale,
  copy,
  initialValues,
}: {
  locale: string;
  copy: SearchFormCopy;
  initialValues: {
    checkIn?: string;
    checkOut?: string;
    rooms?: string;
    guests?: string;
  };
}) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(initialValues.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initialValues.checkOut ?? "");
  const [rooms, setRooms] = useState(initialValues.rooms ?? "");
  const [guests, setGuests] = useState(initialValues.guests ?? "");
  const [error, setError] = useState<string | null>(null);

  const checkOutMin = checkIn || TODAY;

  const handleCheckInChange = (value: string) => {
    setCheckIn(value);
    if (checkOut && value && checkOut < value) {
      setCheckOut("");
    }
    setError(null);
  };

  const handleCheckOutChange = (value: string) => {
    setCheckOut(value);
    setError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!rooms || !guests) {
      setError(copy.missingFilters);
      return;
    }

    if (checkIn && checkIn < TODAY) {
      setError(copy.pastDate);
      return;
    }

    if (checkOut && checkOut < TODAY) {
      setError(copy.pastDate);
      return;
    }

    if (checkIn && checkOut && checkOut <= checkIn) {
      setError(copy.invalidDateOrder);
      return;
    }

    const params = new URLSearchParams();
    if (checkIn) {
      params.set("checkIn", checkIn);
    }
    if (checkOut) {
      params.set("checkOut", checkOut);
    }
    params.set("rooms", rooms);
    params.set("guests", guests);

    setError(null);
    router.push(`/${locale}/listings?${params.toString()}`);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="filter-row">
        <DateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          minDate={TODAY}
          checkInLabel={copy.checkIn}
          checkOutLabel={copy.checkOut}
          onCheckInChange={handleCheckInChange}
          onCheckOutChange={handleCheckOutChange}
        />
        <select name="rooms" value={rooms} onChange={(event) => { setRooms(event.target.value); setError(null); }}>
          <option value="">{copy.anyRooms}</option>
          <option value="studio">{copy.studio}</option>
          <option value="1">{copy.oneBedroom}</option>
          <option value="2">{copy.twoBedroom}</option>
        </select>
        <select name="guests" value={guests} onChange={(event) => { setGuests(event.target.value); setError(null); }}>
          <option value="">{copy.anyGuests}</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
          <button type="submit">{copy.cta}</button>
      </form>
      {error ? <p className="search-error">{error}</p> : null}
    </>
  );
}
