/**
 * Helper to get the UTC Date object corresponding to a wall-clock date/time in a target IANA timezone.
 */
export function makeZonedDate(
  year: number,
  month: number, // 0-indexed (0 = Jan, 11 = Dec)
  day: number,
  hour: number,
  minute = 0,
  second = 0,
  timeZone = 'UTC'
): Date {
  const y = String(year).padStart(4, '0');
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  const h = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  const sec = String(second).padStart(2, '0');

  const isoTarget = `${y}-${m}-${d}T${h}:${min}:${sec}`;

  try {
    const naiveDate = new Date(`${isoTarget}Z`);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(naiveDate);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

    let fHour = parseInt(getPart('hour'), 10);
    if (fHour === 24) fHour = 0;
    const fYear = parseInt(getPart('year'), 10);
    const fMonth = parseInt(getPart('month'), 10) - 1;
    const fDay = parseInt(getPart('day'), 10);
    const fMin = parseInt(getPart('minute'), 10);
    const fSec = parseInt(getPart('second'), 10);

    const formattedAsUtc = Date.UTC(fYear, fMonth, fDay, fHour, fMin, fSec);
    const naiveAsUtc = naiveDate.getTime();
    const diff = naiveAsUtc - formattedAsUtc;

    return new Date(naiveAsUtc + diff);
  } catch {
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }
}

/**
 * Extracts wall-clock date/time parts in a target IANA timezone.
 */
export function getZonedParts(date: Date, timeZone = 'UTC') {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '0';

    let hour = parseInt(getPart('hour'), 10);
    if (hour === 24) hour = 0;

    return {
      year: parseInt(getPart('year'), 10),
      month: parseInt(getPart('month'), 10) - 1, // 0-indexed
      day: parseInt(getPart('day'), 10),
      hour,
      minute: parseInt(getPart('minute'), 10),
      second: parseInt(getPart('second'), 10),
    };
  } catch {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
    };
  }
}
