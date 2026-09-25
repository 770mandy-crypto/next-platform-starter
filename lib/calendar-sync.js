// Google Calendar synchronization
// Sync exams and tasks to Google Calendar

import { google } from 'googleapis';

/**
 * Get Google Calendar client
 */
function getCalendarClient(accessToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google/callback`
  );

  oauth2Client.setCredentials({ access_token: accessToken });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Sync exams to Google Calendar
 */
export async function syncExamsToCalendar(exams, accessToken) {
  if (!accessToken) {
    return { error: 'No Google access token' };
  }

  try {
    const calendar = getCalendarClient(accessToken);
    const results = [];

    for (const exam of exams) {
      const event = {
        summary: `בחינה - ${exam.subject}`,
        description: `
חדר: ${exam.room || 'לא צוין'}
רמת קושי: ${exam.difficulty || 'בינונית'}
משקל: ${exam.weight || 25} נקודות
${exam.notes ? `הערות: ${exam.notes}` : ''}
        `,
        start: {
          dateTime: `${exam.date}T${exam.time || '08:00'}:00`,
          timeZone: 'Asia/Jerusalem',
        },
        end: {
          dateTime: `${exam.date}T${exam.time ? addHours(exam.time, 2) : '10:00'}:00`,
          timeZone: 'Asia/Jerusalem',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'notification', minutes: 1440 }, // 1 day before
            { method: 'notification', minutes: 120 },  // 2 hours before
            { method: 'notification', minutes: 15 },   // 15 min before
          ],
        },
        colorId: '11', // Tomato (red)
      };

      try {
        const result = await calendar.events.insert({
          calendarId: 'primary',
          resource: event,
        });
        results.push({ exam: exam.subject, eventId: result.data.id, status: 'success' });
      } catch (error) {
        results.push({ exam: exam.subject, status: 'error', error: error.message });
      }
    }

    return { synced: results };
  } catch (error) {
    console.error('Calendar sync error:', error);
    return { error: 'Failed to sync to calendar' };
  }
}

/**
 * Sync tasks to Google Calendar
 */
export async function syncTasksToCalendar(tasks, accessToken) {
  if (!accessToken) {
    return { error: 'No Google access token' };
  }

  try {
    const calendar = getCalendarClient(accessToken);
    const results = [];

    for (const task of tasks) {
      if (task.completed) continue; // Skip completed tasks

      const event = {
        summary: `📝 ${task.title}`,
        description: `
נושא: ${task.subject}
עדיפות: ${['נמוכה', 'בינונית', 'גבוהה'][task.priority - 1]}
${task.description ? `תיאור: ${task.description}` : ''}
        `,
        start: {
          date: task.dueDate, // All-day event
        },
        end: {
          date: addDays(task.dueDate, 1),
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'notification', minutes: 1440 }, // 1 day before
            { method: 'notification', minutes: 180 },  // 3 hours before
          ],
        },
        colorId: task.priority === 3 ? '1' : '2', // Red for high priority, orange for others
      };

      try {
        const result = await calendar.events.insert({
          calendarId: 'primary',
          resource: event,
        });
        results.push({ task: task.title, eventId: result.data.id, status: 'success' });
      } catch (error) {
        results.push({ task: task.title, status: 'error', error: error.message });
      }
    }

    return { synced: results };
  } catch (error) {
    console.error('Tasks sync error:', error);
    return { error: 'Failed to sync tasks to calendar' };
  }
}

/**
 * Get events from Google Calendar (bi-directional sync)
 */
export async function getCalendarEvents(accessToken, daysAhead = 30) {
  if (!accessToken) {
    return { error: 'No Google access token' };
  }

  try {
    const calendar = getCalendarClient(accessToken);
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    return {
      events: response.data.items || [],
      count: response.data.items?.length || 0,
    };
  } catch (error) {
    console.error('Get calendar events error:', error);
    return { error: 'Failed to fetch calendar events' };
  }
}

/**
 * Helper: Add hours to time string (HH:MM)
 */
function addHours(timeStr, hours) {
  const [h, m] = timeStr.split(':').map(Number);
  const newHour = (h + hours) % 24;
  return `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Helper: Add days to date string (YYYY-MM-DD)
 */
function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Export to Apple Calendar (iCal format)
 */
export function exportToICalFormat(exams, tasks) {
  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SchoolPilot//NONSGML Events//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:SchoolPilot
X-WR-TIMEZONE:Asia/Jerusalem
X-WR-CALDESC:טוקן שעות וביחינות מ-SchoolPilot
`;

  // Add exams
  for (const exam of exams) {
    const dtstart = exam.date.replace(/-/g, '') + 'T' + (exam.time || '080000').replace(/:/g, '');
    const dtend = exam.date.replace(/-/g, '') + 'T' + (exam.time ? addHours(exam.time, 2) : '100000').replace(/:/g, '');

    ical += `BEGIN:VEVENT
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:בחינה - ${exam.subject}
DESCRIPTION:חדר ${exam.room}
LOCATION:${exam.room}
UID:exam-${exam.id}@schoolpilot.local
END:VEVENT
`;
  }

  // Add tasks
  for (const task of tasks) {
    if (task.completed) continue;

    const dtstart = task.dueDate.replace(/-/g, '');
    ical += `BEGIN:VEVENT
DTSTART;VALUE=DATE:${dtstart}
SUMMARY:${task.title}
DESCRIPTION:${task.subject} - ${['נמוכה', 'בינונית', 'גבוהה'][task.priority - 1]}
UID:task-${task.id}@schoolpilot.local
END:VEVENT
`;
  }

  ical += 'END:VCALENDAR';

  return ical;
}
