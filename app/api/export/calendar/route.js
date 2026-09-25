import { NextResponse } from 'next/server';
import { exportToICalFormat } from 'lib/calendar-sync';

export const dynamic = 'force-dynamic';

/**
 * Export calendar in iCal format for Apple Calendar, Outlook, etc.
 * POST /api/export/calendar
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { exams = [], tasks = [] } = body;

    const icalContent = exportToICalFormat(exams, tasks);

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="schoolpilot.ics"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export calendar' },
      { status: 500 }
    );
  }
}

/**
 * Export as JSON for backup
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const exams = JSON.parse(searchParams.get('exams') || '[]');
    const tasks = JSON.parse(searchParams.get('tasks') || '[]');

    if (format === 'ical') {
      const icalContent = exportToICalFormat(exams, tasks);
      return new NextResponse(icalContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="schoolpilot.ics"',
        },
      });
    }

    // Default JSON export
    const data = {
      exportedAt: new Date().toISOString(),
      exams: exams,
      tasks: tasks,
      stats: {
        totalExams: exams.length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.completed).length,
      },
    };

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="schoolpilot-backup.json"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
