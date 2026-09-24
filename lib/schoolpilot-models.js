// SchoolPilot data models and utilities

export const SUBJECTS = [
  'מתמטיקה',
  'עברית',
  'אנגלית',
  'היסטוריה',
  'גיאוגרפיה',
  'ביולוגיה',
  'כימיה',
  'פיזיקה',
  'קומפיוטר',
  'תנ"ך',
  'לימודי חברה',
  'אומנות',
  'ספורט',
  'אחר'
];

export const EXAM_DIFFICULTY = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
};

export const EXAM_WEIGHT = {
  QUIZ: 5,
  TEST: 25,
  MIDTERM: 50,
  FINAL: 100,
};

/**
 * Exam model
 */
export class Exam {
  constructor(data = {}) {
    this.id = data.id || crypto.randomUUID();
    this.subject = data.subject || '';
    this.date = data.date; // ISO string: YYYY-MM-DD
    this.time = data.time; // HH:MM
    this.room = data.room || '';
    this.difficulty = data.difficulty || EXAM_DIFFICULTY.MEDIUM;
    this.weight = data.weight || EXAM_WEIGHT.TEST;
    this.notes = data.notes || '';
    this.resources = data.resources || []; // file paths/URLs
    this.createdAt = data.createdAt || new Date().toISOString();
    this.completed = data.completed || false;
  }

  // Days until exam
  daysUntil() {
    const examDate = new Date(this.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((examDate - today) / (1000 * 60 * 60 * 24));
    return diff;
  }

  // Urgency score (0-100, higher = more urgent)
  urgencyScore() {
    const daysLeft = this.daysUntil();
    if (daysLeft < 0) return 0;
    if (daysLeft === 0) return 100;
    if (daysLeft <= 3) return 80;
    if (daysLeft <= 7) return 60;
    if (daysLeft <= 14) return 40;
    return 20;
  }

  toJSON() {
    return {
      id: this.id,
      subject: this.subject,
      date: this.date,
      time: this.time,
      room: this.room,
      difficulty: this.difficulty,
      weight: this.weight,
      notes: this.notes,
      resources: this.resources,
      createdAt: this.createdAt,
      completed: this.completed,
    };
  }
}

/**
 * Task/Homework model
 */
export class Task {
  constructor(data = {}) {
    this.id = data.id || crypto.randomUUID();
    this.subject = data.subject || '';
    this.title = data.title || '';
    this.description = data.description || '';
    this.dueDate = data.dueDate; // ISO string: YYYY-MM-DD
    this.priority = data.priority || 2; // 1-3 (1 = low, 3 = high)
    this.completed = data.completed || false;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.completedAt = data.completedAt || null;
  }

  complete() {
    this.completed = true;
    this.completedAt = new Date().toISOString();
  }

  daysUntil() {
    if (!this.dueDate) return null;
    const dueDate = new Date(this.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
  }

  toJSON() {
    return {
      id: this.id,
      subject: this.subject,
      title: this.title,
      description: this.description,
      dueDate: this.dueDate,
      priority: this.priority,
      completed: this.completed,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
    };
  }
}

/**
 * Schedule (class) model
 */
export class ScheduleClass {
  constructor(data = {}) {
    this.id = data.id || crypto.randomUUID();
    this.subject = data.subject || '';
    this.dayOfWeek = data.dayOfWeek; // 0-6 (Sunday-Saturday)
    this.startTime = data.startTime; // HH:MM
    this.endTime = data.endTime; // HH:MM
    this.room = data.room || '';
    this.teacher = data.teacher || '';
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      subject: this.subject,
      dayOfWeek: this.dayOfWeek,
      startTime: this.startTime,
      endTime: this.endTime,
      room: this.room,
      teacher: this.teacher,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Dashboard data aggregator
 */
export class SchoolPilotDashboard {
  constructor(exams = [], tasks = [], schedule = []) {
    this.exams = exams.map(e => e instanceof Exam ? e : new Exam(e));
    this.tasks = tasks.map(t => t instanceof Task ? t : new Task(t));
    this.schedule = schedule.map(s => s instanceof ScheduleClass ? s : new ScheduleClass(s));
  }

  // Today's schedule
  getTodaySchedule() {
    const today = new Date().getDay();
    return this.schedule.filter(cls => cls.dayOfWeek === today);
  }

  // Exams in next 14 days, sorted by urgency
  getUpcomingExams(daysAhead = 14) {
    return this.exams
      .filter(exam => {
        const days = exam.daysUntil();
        return days >= 0 && days <= daysAhead;
      })
      .sort((a, b) => b.urgencyScore() - a.urgencyScore());
  }

  // Tasks due in next 7 days
  getUpcomingTasks(daysAhead = 7) {
    return this.tasks
      .filter(task => {
        if (task.completed) return false;
        const days = task.daysUntil();
        return days !== null && days >= 0 && days <= daysAhead;
      })
      .sort((a, b) => {
        const daysDiff = (a.daysUntil() || 0) - (b.daysUntil() || 0);
        if (daysDiff !== 0) return daysDiff;
        return b.priority - a.priority;
      });
  }

  // Exam load heat (how many exams per day in next 30 days)
  getExamLoad30Days() {
    const load = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      load[dateStr] = this.exams.filter(e => e.date === dateStr).length;
    }
    return load;
  }

  // Exams by subject
  getExamsBySubject() {
    const bySubject = {};
    this.exams.forEach(exam => {
      if (!bySubject[exam.subject]) {
        bySubject[exam.subject] = [];
      }
      bySubject[exam.subject].push(exam);
    });
    return bySubject;
  }

  // Total study load (weighted sum of upcoming exams + tasks)
  getStudyLoad() {
    let load = 0;
    this.getUpcomingExams(14).forEach(exam => {
      load += exam.weight;
    });
    return load;
  }
}

/**
 * Utility to format Hebrew date
 */
export function formatHebrewDate(dateStr) {
  const date = new Date(dateStr);
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                   'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
