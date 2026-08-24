'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { fr } from 'date-fns/locale';

interface ArchiveCalendarProps {
  locale: string;
  /** Current ?search= term, if any - preserved when the date changes. */
  search?: string;
  /** Current ?date= filter ('YYYY-MM-DD'), if any. */
  selectedDate?: string;
}

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Popover-style date filter for the Archives page. Built from date-fns
// (already a dependency, no network access from this environment to add
// a calendar package) rather than the shadcn Calendar/react-day-picker
// pattern - src/components/ui/popover.tsx exists but is an empty file,
// so this manages its own open/close state and outside-click handling
// instead of depending on it.
export function ArchiveCalendar({ locale, search, selectedDate }: ArchiveCalendarProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    selectedDate ? parseISO(selectedDate) : new Date()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const today = new Date();
  const selectedDateObj = selectedDate ? parseISO(selectedDate) : null;

  // Full navigation (not router.push) - the results list below is
  // server-rendered off the ?date=/?search= query string, same
  // full-navigation pattern used across this app for anything that
  // renders fetched data (see the comment on the search form in
  // page.tsx), so the new list is never left showing a stale page.
  const goTo = (dateOverride: string | undefined) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (dateOverride) params.set('date', dateOverride);
    const qs = params.toString();
    setOpen(false);
    window.location.href = `/${locale}/articles${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors ${
          selectedDate
            ? 'border-primary/40 bg-primary/5 text-primary'
            : 'hover:bg-muted'
        }`}
      >
        <FiCalendar className="h-4 w-4" />
        {selectedDateObj ? format(selectedDateObj, 'd MMMM yyyy', { locale: fr }) : 'Filtrer par date'}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 origin-top-left animate-scale-in rounded-xl border bg-background p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="rounded-md p-1.5 hover:bg-muted"
              aria-label="Mois précédent"
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold capitalize">
              {format(viewMonth, 'MMMM yyyy', { locale: fr })}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="rounded-md p-1.5 hover:bg-muted"
              aria-label="Mois suivant"
            >
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {WEEKDAY_LABELS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((d) => {
              const isCurrentMonth = isSameMonth(d, viewMonth);
              const isSelected = selectedDateObj ? isSameDay(d, selectedDateObj) : false;
              const isTodayDate = isSameDay(d, today);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => goTo(format(d, 'yyyy-MM-dd'))}
                  className={`aspect-square rounded-md text-xs transition-colors ${
                    !isCurrentMonth ? 'text-muted-foreground/30' : 'text-foreground'
                  } ${
                    isSelected
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'hover:bg-primary/10'
                  } ${isTodayDate && !isSelected ? 'ring-1 ring-inset ring-primary/40' : ''}`}
                >
                  {format(d, 'd')}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <button
              type="button"
              onClick={() => goTo(undefined)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              <FiX className="h-3.5 w-3.5" />
              Effacer le filtre de date
            </button>
          )}
        </div>
      )}
    </div>
  );
}
