import ICAL from 'ical.js';

export const fetchCalendarEvents = async (url) => {
  if (!url) return [];
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error('Failed to fetch calendar');
    const text = await res.text();
    
    const jcalData = ICAL.parse(text);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');
    
    const events = vevents.map(vevent => {
      const event = new ICAL.Event(vevent);
      return {
        title: event.summary,
        start: event.startDate ? event.startDate.toJSDate() : null,
        end: event.endDate ? event.endDate.toJSDate() : null,
        location: event.location,
        description: event.description
      };
    }).filter(e => e.start); // ensure it has a start time
    
    return events.sort((a, b) => a.start - b.start);
  } catch (error) {
    console.error("Error fetching calendar:", error);
    return [];
  }
};
