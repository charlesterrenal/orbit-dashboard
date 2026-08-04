/**
 * Very basic .ics parser for standard Google Calendar / Apple Calendar links.
 * Extracts VEVENT summaries and start dates.
 */

export const parseICS = (icsString) => {
  const events = [];
  const lines = icsString.split(/\r\n|\n|\r/);
  let currentEvent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.title && currentEvent.start) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.title = line.substring(8).trim();
      } else if (line.startsWith('DTSTART')) {
        // DTSTART:20231024T183000Z or DTSTART;TZID=America/Los_Angeles:20231024T113000
        const value = line.split(':')[1];
        if (value) {
          currentEvent.start = parseIcsDate(value);
        }
      } else if (line.startsWith('DTEND')) {
        const value = line.split(':')[1];
        if (value) {
          currentEvent.end = parseIcsDate(value);
        }
      }
    }
  }
  
  return events.sort((a, b) => a.start - b.start);
};

const parseIcsDate = (dateString) => {
  // Format: 20231024T183000Z or 20231024
  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1;
  const day = parseInt(dateString.substring(6, 8), 10);
  
  if (dateString.length > 8 && dateString.includes('T')) {
    const timePart = dateString.split('T')[1];
    const hour = parseInt(timePart.substring(0, 2), 10);
    const minute = parseInt(timePart.substring(2, 4), 10);
    const second = parseInt(timePart.substring(4, 6), 10);
    
    // If Z is present, it's UTC
    if (dateString.endsWith('Z')) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
    // Otherwise assume local time of the calendar (approximation)
    return new Date(year, month, day, hour, minute, second);
  }
  
  // All day event
  return new Date(year, month, day);
};

export const fetchCalendarEvents = async (url) => {
  if (!url) return [];
  try {
    // We use allorigins as a simple CORS proxy
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error('Failed to fetch calendar');
    const text = await res.text();
    return parseICS(text);
  } catch (error) {
    console.error("Error fetching calendar:", error);
    return [];
  }
};
