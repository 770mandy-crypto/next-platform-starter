import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Generate smart reminders based on study load and upcoming events
 * GET /api/reminders?exams=[...]&tasks=[...]
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { exams = [], tasks = [] } = body;

    const reminders = generateSmartReminders(exams, tasks);

    return NextResponse.json({
      success: true,
      reminders: reminders,
      count: reminders.length,
    });
  } catch (error) {
    console.error('Reminders error:', error);
    return NextResponse.json(
      { error: 'Failed to generate reminders', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate smart reminders based on AI analysis
 */
function generateSmartReminders(exams, tasks) {
  const reminders = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Exam load analysis
  const examsNextWeek = exams.filter(e => {
    const examDate = new Date(e.date);
    const daysAway = Math.floor((examDate - today) / (1000 * 60 * 60 * 24));
    return daysAway >= 0 && daysAway <= 7;
  });

  if (examsNextWeek.length >= 3) {
    reminders.push({
      id: 'heavy-load',
      type: 'WARNING',
      priority: 'HIGH',
      emoji: '🔴',
      title: 'עומס בחינות קרוב!',
      message: `${examsNextWeek.length} בחינות בשבוע הקרוב`,
      action: 'generateStudyPlan',
      suggestion: generateStudyPlan(examsNextWeek, tasks),
    });
  }

  // 2. Exam tomorrow
  const tomorrowExams = exams.filter(e => {
    const examDate = new Date(e.date);
    const daysAway = Math.floor((examDate - today) / (1000 * 60 * 60 * 24));
    return daysAway === 1;
  });

  if (tomorrowExams.length > 0) {
    reminders.push({
      id: 'exam-tomorrow',
      type: 'URGENT',
      priority: 'CRITICAL',
      emoji: '🔥',
      title: 'בחינה מחר!',
      subjects: tomorrowExams.map(e => e.subject).join(', '),
      actionItems: [
        '✅ בדוק שהבנת את כל החומר העיקרי',
        '✅ פתור דוגמאות מבחנים',
        '✅ ישן לפחות 7 שעות הלילה',
        '✅ תן לעצמך זמן להירגע לפני הבחינה',
      ],
    });
  }

  // 3. Exam today
  const todayExams = exams.filter(e => {
    const examDate = new Date(e.date);
    return examDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];
  });

  if (todayExams.length > 0) {
    reminders.push({
      id: 'exam-today',
      type: 'INFO',
      priority: 'CRITICAL',
      emoji: '📝',
      title: 'בחינה היום!',
      exams: todayExams.map(e => ({
        subject: e.subject,
        time: e.time,
        room: e.room,
      })),
      tips: [
        'בוא לבחינה 10 דקות לפני',
        'קרא בעיון את ההוראות',
        'תן לעצמך זמן לתשובה המלאה',
      ],
    });
  }

  // 4. Overdue homework
  const overdueTasks = tasks.filter(t => {
    if (t.completed) return false;
    const dueDate = new Date(t.dueDate);
    return dueDate < today;
  });

  if (overdueTasks.length > 0) {
    reminders.push({
      id: 'overdue-tasks',
      type: 'ERROR',
      priority: 'HIGH',
      emoji: '⚠️',
      title: 'משימות בעיכוב!',
      count: overdueTasks.length,
      message: `${overdueTasks.length} משימות שלא סגרות`,
      tasks: overdueTasks.slice(0, 3).map(t => t.title),
    });
  }

  // 5. Homework due tomorrow
  const tomorrowTasks = tasks.filter(t => {
    if (t.completed) return false;
    const dueDate = new Date(t.dueDate);
    const daysAway = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
    return daysAway === 1;
  });

  if (tomorrowTasks.length > 0) {
    reminders.push({
      id: 'homework-tomorrow',
      type: 'WARNING',
      priority: 'MEDIUM',
      emoji: '📚',
      title: 'משימות להגשה מחר',
      count: tomorrowTasks.length,
      tasks: tomorrowTasks.map(t => t.title),
    });
  }

  // 6. Study load analysis
  const totalWeight = exams
    .filter(e => {
      const examDate = new Date(e.date);
      const daysAway = Math.floor((examDate - today) / (1000 * 60 * 60 * 24));
      return daysAway >= 0 && daysAway <= 14;
    })
    .reduce((sum, e) => sum + (e.weight || 25), 0);

  if (totalWeight > 200) {
    reminders.push({
      id: 'high-study-load',
      type: 'INFO',
      priority: 'MEDIUM',
      emoji: '📊',
      title: 'עומס למידה גבוה',
      message: `סך הכל ${totalWeight} נקודות בבחינות ב-14 הימים הקרובים`,
      suggestion: 'קדם את לוח הזמנים שלך - התחל עכשיו',
    });
  }

  // 7. Study plan recommendation
  if (reminders.length === 0) {
    reminders.push({
      id: 'all-good',
      type: 'SUCCESS',
      priority: 'LOW',
      emoji: '✅',
      title: 'כל זה טוב!',
      message: 'אין בחינות או משימות דחופות בקרוב',
      suggestion: 'המשך כך!',
    });
  }

  return reminders;
}

/**
 * Generate a personalized study plan
 */
function generateStudyPlan(exams, tasks = []) {
  const planByDay = {};
  const today = new Date();

  // Group exams by subject
  const subjects = {};
  exams.forEach(exam => {
    if (!subjects[exam.subject]) {
      subjects[exam.subject] = [];
    }
    subjects[exam.subject].push(exam);
  });

  // Create daily plan
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];

    planByDay[dateKey] = {
      dayOfWeek: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][date.getDay()],
      focus: [],
      hours: 0,
    };

    // Prioritize based on exam dates
    for (const [subject, subjectExams] of Object.entries(subjects)) {
      const nextExam = subjectExams.find(e => new Date(e.date) >= date);
      if (nextExam) {
        const daysToExam = Math.floor((new Date(nextExam.date) - date) / (1000 * 60 * 60 * 24));
        const hoursToStudy = Math.max(1, 4 - daysToExam); // More hours as exam gets closer
        planByDay[dateKey].focus.push({
          subject: subject,
          hours: hoursToStudy,
          exam: new Date(nextExam.date).toISOString().split('T')[0],
          type: 'review',
        });
        planByDay[dateKey].hours += hoursToStudy;
      }
    }
  }

  return {
    summary: 'תוכנית למידה מומלצת ל-14 הימים',
    subjects: Object.keys(subjects).length,
    exams: exams.length,
    dailyPlan: planByDay,
    tips: [
      'לומד קטן כל יום טוב יותר מלומד ארוך סופי שבוע',
      'תרגול פתרון בעיות חשוב מקריאה',
      'תן לעצמך הפסקות של 10 דקות כל 50 דקות',
      'ישן במשך 7-8 שעות בלילה',
    ],
  };
}
