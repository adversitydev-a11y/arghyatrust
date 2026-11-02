export type EventFilterType = 'all' | 'featured' | 'coming' | 'past';

export function isPastEvent(event: { date?: string; status?: string }): boolean {
  if (event.status === 'Completed') return true;
  if (!event.date) return false;
  const normalized = event.date.trim().toLowerCase();
  if (normalized.includes('upcoming') || normalized.includes('ongoing')) return false;

  const timestamp = Date.parse(event.date);
  if (!isNaN(timestamp)) {
    return timestamp < Date.now();
  }

  const monthYearMatch = event.date.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i,
  );
  if (monthYearMatch) {
    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];
    const monthIndex = monthNames.indexOf(monthYearMatch[1].toLowerCase());
    const year = parseInt(monthYearMatch[2], 10);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59);
    return endOfMonth.getTime() < Date.now();
  }

  return false;
}

export function isComingEvent(event: { date?: string; status?: string }): boolean {
  if (event.status === 'Upcoming') return true;
  return !isPastEvent(event);
}

