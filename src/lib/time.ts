const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const pad = (value: number, len = 2) => value.toString().padStart(len, '0');

export function todayKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}`;
}

export function weekKey(date: Date = new Date()): string {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7; // Sunday -> 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${pad(weekNumber)}`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '00:00';
  }

  const totalMs = Math.floor(ms);
  const hours = Math.floor(totalMs / MS_PER_HOUR);
  const remainingAfterHours = totalMs % MS_PER_HOUR;
  const minutes = Math.floor(remainingAfterHours / MS_PER_MINUTE);
  const seconds = Math.floor((remainingAfterHours % MS_PER_MINUTE) / MS_PER_SECOND);

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}
