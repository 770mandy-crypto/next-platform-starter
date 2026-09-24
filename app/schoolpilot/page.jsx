'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from 'components/card';

const SUBJECTS = [
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

export default function SchoolPilotPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [exams, setExams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newExamForm, setNewExamForm] = useState({
    subject: '',
    date: '',
    time: '',
    room: '',
    difficulty: 'medium',
  });
  const [newTaskForm, setNewTaskForm] = useState({
    subject: '',
    title: '',
    dueDate: '',
    priority: '2',
  });

  // Load data from localStorage (simulating backend)
  useEffect(() => {
    const savedExams = localStorage.getItem('schoolpilot-exams');
    const savedTasks = localStorage.getItem('schoolpilot-tasks');
    if (savedExams) setExams(JSON.parse(savedExams));
    if (savedTasks) setTasks(JSON.parse(savedTasks));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('schoolpilot-exams', JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    localStorage.setItem('schoolpilot-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addExam = () => {
    if (!newExamForm.subject || !newExamForm.date) {
      alert('אנא מלא את הפרטים החובה');
      return;
    }
    const exam = {
      id: Date.now(),
      ...newExamForm,
      createdAt: new Date().toISOString(),
      completed: false,
    };
    setExams([...exams, exam]);
    setNewExamForm({ subject: '', date: '', time: '', room: '', difficulty: 'medium' });
  };

  const addTask = () => {
    if (!newTaskForm.subject || !newTaskForm.title || !newTaskForm.dueDate) {
      alert('אנא מלא את הפרטים החובה');
      return;
    }
    const task = {
      id: Date.now(),
      ...newTaskForm,
      priority: parseInt(newTaskForm.priority),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks([...tasks, task]);
    setNewTaskForm({ subject: '', title: '', dueDate: '', priority: '2' });
  };

  const completeTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: true } : t));
  };

  const deleteExam = (id) => {
    setExams(exams.filter(e => e.id !== id));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // Get upcoming exams (next 14 days)
  const upcomingExams = exams
    .filter(e => {
      const examDate = new Date(e.date);
      const today = new Date();
      const daysAhead = Math.floor((examDate - today) / (1000 * 60 * 60 * 24));
      return daysAhead >= 0 && daysAhead <= 14;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Get upcoming tasks (next 7 days, not completed)
  const upcomingTasks = tasks
    .filter(t => {
      if (t.completed) return false;
      const dueDate = new Date(t.dueDate);
      const today = new Date();
      const daysAhead = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
      return daysAhead >= 0 && daysAhead <= 7;
    })
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate))
    .sort((a, b) => b.priority - a.priority);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL');
  };

  const daysUntil = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const days = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'היום';
    if (days === 1) return 'מחר';
    return `בעוד ${days} ימים`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">🎓 SchoolPilot</h1>
          <p className="text-gray-600">מתכנן הלימודים שלך האישי בעברית</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'dashboard', label: '📊 לוח בקרה' },
            { id: 'exams', label: '📝 בחינות' },
            { id: 'tasks', label: '✓ משימות' },
            { id: 'study', label: '🤖 עזרה בלימודים' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <Card title="📊 סטטיסטיקות">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>בחינות קרובות (14 ימים)</span>
                  <span className="font-bold text-lg">{upcomingExams.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>משימות פתוחות</span>
                  <span className="font-bold text-lg">{tasks.filter(t => !t.completed).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>משימות סגורות</span>
                  <span className="font-bold text-lg">{tasks.filter(t => t.completed).length}</span>
                </div>
              </div>
            </Card>

            {/* Upcoming Exams Preview */}
            <Card title="📅 בחינות קרובות">
              {upcomingExams.length === 0 ? (
                <p className="text-gray-500">אין בחינות קרובות - תנוח!</p>
              ) : (
                <div className="space-y-2">
                  {upcomingExams.slice(0, 3).map(exam => (
                    <div key={exam.id} className="text-sm bg-orange-50 p-2 rounded">
                      <div className="font-semibold">{exam.subject}</div>
                      <div className="text-gray-600">{formatDate(exam.date)} - {daysUntil(exam.date)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Upcoming Tasks Preview */}
            <Card title="✓ משימות קרובות">
              {upcomingTasks.length === 0 ? (
                <p className="text-gray-500">אין משימות פתוחות - מעולה!</p>
              ) : (
                <div className="space-y-2">
                  {upcomingTasks.slice(0, 3).map(task => (
                    <div key={task.id} className="text-sm bg-blue-50 p-2 rounded">
                      <div className="font-semibold">{task.title}</div>
                      <div className="text-gray-600">{task.subject} • {daysUntil(task.dueDate)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick Add */}
            <Card title="➕ הוסף במהירות">
              <button
                onClick={() => setActiveTab('exams')}
                className="w-full mb-2 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg"
              >
                הוסף בחינה
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg"
              >
                הוסף משימה
              </button>
            </Card>
          </div>
        )}

        {/* Exams Tab */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            <Card title="📝 הוסף בחינה חדשה">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">נושא</label>
                  <select
                    value={newExamForm.subject}
                    onChange={(e) => setNewExamForm({ ...newExamForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">בחר נושא</option>
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך</label>
                  <input
                    type="date"
                    value={newExamForm.date}
                    onChange={(e) => setNewExamForm({ ...newExamForm, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">שעה</label>
                  <input
                    type="time"
                    value={newExamForm.time}
                    onChange={(e) => setNewExamForm({ ...newExamForm, time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">חדר</label>
                  <input
                    type="text"
                    value={newExamForm.room}
                    onChange={(e) => setNewExamForm({ ...newExamForm, room: e.target.value })}
                    placeholder="חדר 305"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">רמת קושי</label>
                  <select
                    value={newExamForm.difficulty}
                    onChange={(e) => setNewExamForm({ ...newExamForm, difficulty: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="easy">קל</option>
                    <option value="medium">בינוני</option>
                    <option value="hard">קשה</option>
                  </select>
                </div>
              </div>
              <button
                onClick={addExam}
                className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg w-full"
              >
                הוסף בחינה
              </button>
            </Card>

            <Card title={`📋 הבחינות שלי (${exams.length})`}>
              {exams.length === 0 ? (
                <p className="text-gray-500">אין בחינות עדיין</p>
              ) : (
                <div className="space-y-3">
                  {[...exams].sort((a, b) => new Date(a.date) - new Date(b.date)).map(exam => (
                    <div key={exam.id} className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{exam.subject}</div>
                          <div className="text-sm text-gray-600">
                            📅 {formatDate(exam.date)} {exam.time ? `⏰ ${exam.time}` : ''} {exam.room ? `🚪 ${exam.room}` : ''}
                          </div>
                          <div className="text-xs mt-1">
                            {exam.difficulty === 'easy' && '✅ קל'}
                            {exam.difficulty === 'medium' && '🟡 בינוני'}
                            {exam.difficulty === 'hard' && '🔴 קשה'}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteExam(exam.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <Card title="✏️ הוסף משימה חדשה">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">נושא</label>
                  <select
                    value={newTaskForm.subject}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">בחר נושא</option>
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">כותרת</label>
                  <input
                    type="text"
                    value={newTaskForm.title}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                    placeholder="קרא פרקים 3-5"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך הגשה</label>
                  <input
                    type="date"
                    value={newTaskForm.dueDate}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">עדיפות</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="1">🟢 נמוכה</option>
                    <option value="2">🟡 בינונית</option>
                    <option value="3">🔴 גבוהה</option>
                  </select>
                </div>
              </div>
              <button
                onClick={addTask}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg w-full"
              >
                הוסף משימה
              </button>
            </Card>

            <Card title={`📋 המשימות שלי (${tasks.length})`}>
              {tasks.length === 0 ? (
                <p className="text-gray-500">אין משימות</p>
              ) : (
                <div className="space-y-2">
                  {tasks
                    .filter(t => !t.completed)
                    .sort((a, b) => b.priority - a.priority)
                    .map(task => (
                      <div key={task.id} className="bg-blue-50 p-3 rounded flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold">{task.title}</div>
                          <div className="text-sm text-gray-600">
                            {task.subject} • {daysUntil(task.dueDate)}
                            {task.priority === 3 && ' 🔴'}
                            {task.priority === 2 && ' 🟡'}
                            {task.priority === 1 && ' 🟢'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => completeTask(task.id)}
                            className="text-green-500 hover:text-green-700"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  {tasks.filter(t => t.completed).length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="font-semibold text-gray-600 mb-2">משימות סגורות:</div>
                      {tasks.filter(t => t.completed).map(task => (
                        <div key={task.id} className="text-sm text-gray-400 line-through">
                          {task.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Study Help Tab */}
        {activeTab === 'study' && (
          <StudyHelpPage />
        )}
      </div>
    </div>
  );
}

// Study Help Component
function StudyHelpPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('כללי');

  const SUBJECTS = [
    'כללי',
    'מתמטיקה',
    'עברית',
    'אנגלית',
    'היסטוריה',
    'גיאוגרפיה',
    'ביולוגיה',
    'כימיה',
    'פיזיקה',
  ];

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/study-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          subject: subject,
          context: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'שגיאה בשרת');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `❌ שגיאה: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="🤖 עזרה בלימודים עם AI">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">בחר נושא:</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {SUBJECTS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg h-64 overflow-y-auto border">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p className="mb-2">👋 שלום! אני כאן כדי לעזור לך בלימודים</p>
              <p className="text-sm">שאל אותי כל שאלה בנושא {subject}</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-right'}`}>
              <div className={`inline-block max-w-xs p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-right text-gray-500 italic">
              🤖 המורה חושב...
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
            placeholder="שאל שאלה..."
            className="flex-1 px-3 py-2 border rounded-lg"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
          >
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </Card>
  );
}
