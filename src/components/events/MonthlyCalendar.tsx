/**
 * MonthlyCalendar - Calendar view for closed events
 *
 * Displays a monthly calendar grid showing closed events on their respective days.
 * - 7 columns (Lun-Dom), Italian locale
 * - Max 2 events visible per day on desktop, "+N altri" overflow
 * - Mobile: numeric count indicator per day
 * - Highlight current day
 * - Click event navigates to detail page
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Link } from 'react-router-dom';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from 'date-fns';
import { it } from 'date-fns/locale';
import type { Id } from '../../../convex/_generated/dataModel';

interface ClosedEvent {
  _id: Id<"events">;
  nome: string;
  dataInizio: string;
  dataFine: string;
  localita?: string;
  durataMinuti: number;
  participantCount: number;
}

interface MonthlyCalendarProps {
  year: number;
  month: number; // 1-12
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

/**
 * Build a map of day-of-month -> events for the given month
 */
function buildEventsByDay(events: ClosedEvent[]): Map<number, ClosedEvent[]> {
  const map = new Map<number, ClosedEvent[]>();
  for (const ev of events) {
    const day = new Date(ev.dataInizio).getDate();
    const existing = map.get(day) ?? [];
    existing.push(ev);
    map.set(day, existing);
  }
  return map;
}

export function MonthlyCalendar({ year, month, onMonthChange }: MonthlyCalendarProps) {
  const events = useQuery(api.events.listClosedEventsByMonth, { year, month });

  const currentDate = new Date(year, month - 1, 1);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const eventsByDay: Map<number, ClosedEvent[]> = events ? buildEventsByDay(events) : new Map();

  const handlePrevMonth = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  const isLoading = events === undefined;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <button
          onClick={handlePrevMonth}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Mese precedente"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-slate-900 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: it })}
        </h2>
        <button
          onClick={handleNextMonth}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Mese successivo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-1 py-2 text-center text-xs font-medium text-slate-500 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const dayNum = day.getDate();
            const dayEvents = inMonth ? (eventsByDay.get(dayNum) ?? []) : [];
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={idx}
                className={`min-h-[80px] md:min-h-[100px] border-b border-r border-slate-100 p-1 ${
                  !inMonth ? 'bg-slate-50' : ''
                }`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full ${
                      today
                        ? 'bg-blue-600 text-white'
                        : inMonth
                          ? 'text-slate-900'
                          : 'text-slate-400'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {/* Mobile: show count badge */}
                  {hasEvents && (
                    <span className="md:hidden inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Desktop: show event names */}
                <div className="hidden md:block space-y-0.5">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <Link
                      key={ev._id}
                      to={`/eventi/${ev._id}`}
                      className="block px-1.5 py-0.5 text-[11px] font-medium text-slate-700 bg-slate-100 rounded truncate hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      title={ev.nome}
                    >
                      {ev.nome}
                    </Link>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="block px-1.5 text-[10px] text-slate-500">
                      +{dayEvents.length - 2} altri
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MonthlyCalendar;
