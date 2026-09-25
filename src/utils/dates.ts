export const rangePresets = [
  ['today', 'Hoje'],
  ['week', 'Esta semana'],
  ['month', 'Este mês'],
  ['last-month', 'Mês passado'],
  ['30-days', 'Últimos 30 dias'],
  ['3-months', 'Últimos 3 meses'],
  ['6-months', 'Últimos 6 meses'],
  ['year', 'Este ano'],
  ['custom', 'Período personalizado'],
] as const;
export type RangePreset = (typeof rangePresets)[number][0];
export type DateRange = { start: string; end: string; preset: RangePreset; label: string };
export function businessToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function isDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= '0001-01-01' &&
    !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}
const iso = (date: Date) => date.toISOString().slice(0, 10);
export function resolveDateRange(
  preset: string | undefined,
  today: string,
  customStart?: string,
  customEnd?: string,
): DateRange {
  const known = rangePresets.find(([key]) => key === preset) || rangePresets[2];
  const start = new Date(`${today}T12:00:00Z`),
    end = new Date(start);
  const month = start.getUTCMonth(),
    year = start.getUTCFullYear();
  switch (known[0]) {
    case 'today':
      break;
    case 'week':
      start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
      end.setTime(start.getTime());
      end.setUTCDate(start.getUTCDate() + 6);
      break;
    case 'last-month':
      start.setUTCFullYear(year, month - 1, 1);
      end.setUTCFullYear(year, month, 0);
      break;
    case '30-days':
      start.setUTCDate(start.getUTCDate() - 29);
      break;
    case '3-months':
      start.setUTCFullYear(year, month - 2, 1);
      break;
    case '6-months':
      start.setUTCFullYear(year, month - 5, 1);
      break;
    case 'year':
      start.setUTCFullYear(year, 0, 1);
      break;
    case 'custom':
      if (
        customStart &&
        customEnd &&
        isDate(customStart) &&
        isDate(customEnd) &&
        customStart <= customEnd &&
        (Date.parse(customEnd) - Date.parse(customStart)) / 86400000 <= 3660
      )
        return { start: customStart, end: customEnd, preset: 'custom', label: 'Personalizado' };
      return resolveDateRange('month', today);
    default:
      start.setUTCFullYear(year, month, 1);
      end.setUTCFullYear(year, month + 1, 0);
  }
  return { start: iso(start), end: iso(end), preset: known[0], label: known[1] };
}
export function formatDate(date: string) {
  return isDate(date) ? date.split('-').reverse().join('/') : '—';
}
