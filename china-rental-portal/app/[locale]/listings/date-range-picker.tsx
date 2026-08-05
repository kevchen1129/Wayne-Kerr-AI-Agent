"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MONTH_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

const DISPLAY_LABEL = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="date-field-icon"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3.5v3" />
      <path d="M17 3.5v3" />
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 13h.01" />
      <path d="M12 13h.01" />
      <path d="M16 13h.01" />
      <path d="M8 17h.01" />
      <path d="M12 17h.01" />
      <path d="M16 17h.01" />
    </svg>
  );
}

const DAY_MS = 1000 * 60 * 60 * 24;

type DateRangePickerProps = {
  checkIn: string;
  checkOut: string;
  minDate: string;
  checkInLabel: string;
  checkOutLabel: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
};

function parseDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function isSameDay(a: Date | null, b: Date | null) {
  return Boolean(a && b && a.toDateString() === b.toDateString());
}

function isBetween(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) {
    return false;
  }

  const time = date.getTime();
  return time > start.getTime() && time < end.getTime();
}

function buildMonthDays(month: Date) {
  const firstDay = startOfMonth(month);
  const firstWeekday = firstDay.getDay();
  const nextMonth = addMonths(month, 1);
  const lastDay = new Date(nextMonth.getTime() - DAY_MS);
  const daysInMonth = lastDay.getDate();
  const cells: Array<Date | null> = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (cells.length < 42) {
    cells.push(null);
  }

  return cells;
}

export function DateRangePicker({
  checkIn,
  checkOut,
  minDate,
  checkInLabel,
  checkOutLabel,
  onCheckInChange,
  onCheckOutChange,
}: DateRangePickerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const minDateValue = parseDate(minDate) ?? new Date();
  const checkInDate = parseDate(checkIn);
  const checkOutDate = parseDate(checkOut);
  const [isOpen, setIsOpen] = useState(false);
  const [activeField, setActiveField] = useState<"checkIn" | "checkOut">("checkIn");
  const [visibleMonth, setVisibleMonth] = useState(
    startOfMonth(checkInDate ?? minDateValue)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const calendars = useMemo(
    () => [visibleMonth, addMonths(visibleMonth, 1)],
    [visibleMonth]
  );
  const emptyLabel = "Select dates";
  const nights =
    checkInDate && checkOutDate
      ? Math.max(0, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / DAY_MS))
      : 0;
  const summaryLabel =
    checkInDate && checkOutDate
      ? `${DISPLAY_LABEL.format(checkInDate)}  -  ${DISPLAY_LABEL.format(checkOutDate)}`
      : emptyLabel;
  const isComplete = Boolean(checkInDate && checkOutDate);

  const handleDateSelect = (selectedDate: Date) => {
    const selectedValue = toDateInputValue(selectedDate);

    if (activeField === "checkIn") {
      onCheckInChange(selectedValue);
      if (checkOutDate && selectedDate >= checkOutDate) {
        onCheckOutChange("");
      }
      setActiveField("checkOut");
      return;
    }

    if (!checkInDate || selectedDate <= checkInDate) {
      onCheckInChange(selectedValue);
      onCheckOutChange("");
      setActiveField("checkOut");
      return;
    }

    onCheckOutChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <div className="date-range-picker" ref={wrapperRef}>
      <button
        type="button"
        className={isOpen ? "date-field date-field-range active" : "date-field date-field-range"}
        onClick={() => {
          setActiveField(checkInDate && !checkOutDate ? "checkOut" : "checkIn");
          setIsOpen(true);
        }}
      >
        <span className="sr-only">
          {checkInLabel} / {checkOutLabel}
        </span>
        <span className="date-field-content">
          <span className="date-field-leading">
            <CalendarIcon />
          </span>
          <span className="date-field-copy">
            <span className="date-field-heading">{emptyLabel}</span>
            <span className={isComplete ? "date-field-value" : "date-field-placeholder"}>
              {summaryLabel}
            </span>
          </span>
          {nights > 0 ? (
            <span className="date-night-pill">
              {nights} {nights === 1 ? "night" : "nights"}
            </span>
          ) : null}
        </span>
      </button>
      <input type="hidden" name="checkIn" value={checkIn} />
      <input type="hidden" name="checkOut" value={checkOut} />

      {isOpen ? (
        <div className="date-range-popover">
          <div className="date-range-toolbar">
            <strong>{activeField === "checkIn" ? checkInLabel : checkOutLabel}</strong>
            <div className="date-range-nav">
              <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}>
                ‹
              </button>
              <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}>
                ›
              </button>
            </div>
          </div>
          <div className="calendar-panels">
            {calendars.map((month) => {
              const days = buildMonthDays(month);
              return (
                <div key={month.toISOString()} className="calendar-panel">
                  <div className="calendar-title">{MONTH_LABEL.format(month)}</div>
                  <div className="calendar-weekdays">
                    {Array.from({ length: 7 }, (_, index) => (
                      <span key={index}>
                        {DAY_LABEL.format(new Date(2026, 6, 26 + index)).slice(0, 1)}
                      </span>
                    ))}
                  </div>
                  <div className="calendar-grid">
                    {days.map((day, index) => {
                      if (!day) {
                        return <span key={`empty-${month.toISOString()}-${index}`} className="calendar-day calendar-day-empty" />;
                      }

                      const beforeMin = day < minDateValue;
                      const beforeCheckIn = activeField === "checkOut" && checkInDate ? day <= checkInDate : false;
                      const disabled = beforeMin || beforeCheckIn;
                      const isStart = isSameDay(day, checkInDate);
                      const isEnd = isSameDay(day, checkOutDate);
                      const inRange = isBetween(day, checkInDate, checkOutDate);

                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          className={[
                            "calendar-day",
                            disabled ? "disabled" : "",
                            inRange ? "in-range" : "",
                            isStart ? "range-start" : "",
                            isEnd ? "range-end" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => handleDateSelect(day)}
                          disabled={disabled}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
