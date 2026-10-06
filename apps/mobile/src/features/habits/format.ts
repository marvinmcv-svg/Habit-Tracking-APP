import type { TFunction } from 'i18next';

import { type LocalDate, toDisplayDate } from './logic/dates';
import { effectiveTarget } from './logic/schedule';
import type { Habit } from './types';

export function scheduleLabel(t: TFunction, h: Habit): string {
  const s = h.schedule;
  switch (s.kind) {
    case 'daily':
      return t('schedule.daily');
    case 'weekdays':
      if (s.days.length === 7) return t('schedule.daily');
      if (s.days.length === 5 && [1, 2, 3, 4, 5].every((d) => s.days.includes(d))) return t('schedule.weekdaysOnly');
      return [...s.days]
        .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
        .map((d) => t(`weekday.short.${d}`))
        .join(' · ');
    case 'x_per_week':
      return t('schedule.perWeek', { count: s.times });
    case 'every_n_days':
      return t('schedule.everyN', { count: s.n });
  }
}

/** "3 / 8 glasses", "10 / 20 min", or null for yes/no habits. */
export function amountLabel(t: TFunction, h: Habit, value: number): string | null {
  if (h.type === 'count') return `${formatNumber(value)} / ${formatNumber(effectiveTarget(h))}${h.unit ? ` ${h.unit}` : ''}`;
  if (h.type === 'duration') return `${value} / ${effectiveTarget(h)} ${t('units.min')}`;
  return null;
}

export function formatNumber(n: number): string {
  return n >= 10000 ? `${Math.round(n / 1000)}k` : n.toLocaleString();
}

export function formatDate(d: LocalDate, lang: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(lang, opts).format(toDisplayDate(d));
  } catch {
    return d;
  }
}

export function formatTime(hhmm: string, lang: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  try {
    return new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, h, m));
  } catch {
    return hhmm;
  }
}
