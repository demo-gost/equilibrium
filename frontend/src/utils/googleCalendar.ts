/**
 * Formats a Date object to ISO string format suitable for Google Calendar URLs (YYYYMMDDTHHMMSSZ)
 */
const formatGCalDate = (dateStr: string | Date): string => {
  const d = new Date(dateStr);
  return d.toISOString().replace(/-|:|\.\d+/g, '');
};

/**
 * Generates a Google Calendar event creation URL
 */
export const getGoogleCalendarUrl = ({
  title,
  description = '',
  startTime,
  endTime,
}: {
  title: string;
  description?: string;
  startTime: string | Date;
  endTime: string | Date;
}): string => {
  const start = formatGCalDate(startTime);
  const end = formatGCalDate(endTime);
  const details = encodeURIComponent(description + '\n\nScheduled via Equilibrium AI Workload Balancer');
  const text = encodeURIComponent(title);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
};
