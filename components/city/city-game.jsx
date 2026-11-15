'use client';

import { useEffect, useRef, useState } from 'react';
import { createGame } from './engine';
import { greeting, replyFor } from './dialog';

const WEATHER_OPTIONS = [
    ['clear', 'בהיר'],
    ['cloudy', 'מעונן'],
    ['rain', 'גשום'],
    ['fog', 'ערפל']
];

function formatHour(hour) {
    const h = Math.floor(hour) % 24;
    const m = Math.floor((hour % 1) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function Joystick({ onMove }) {
    const knob = useRef(null);
    const active = useRef(null);
    const update = (e) => {
        const box = e.currentTarget.getBoundingClientRect();
        let x = e.clientX - (box.left + box.width / 2);
        let y = e.clientY - (box.top + box.height / 2);
        const len = Math.hypot(x, y);
        const max = 34;
        if (len > max) {
            x = (x / len) * max;
            y = (y / len) * max;
        }
        knob.current.style.transform = `translate(${x}px, ${y}px)`;
        onMove(x / max, -y / max);
    };
    const release = (e) => {
        if (e.pointerId !== active.current) return;
        active.current = null;
        knob.current.style.transform = '';
        onMove(0, 0);
    };
    return (
        <div
            className="joy"
            aria-label="ג׳ויסטיק תנועה"
            onPointerDown={(e) => {
                active.current = e.pointerId;
                e.currentTarget.setPointerCapture(e.pointerId);
                update(e);
            }}
            onPointerMove={(e) => e.pointerId === active.current && update(e)}
            onPointerUp={release}
            onPointerCancel={release}
        >
            <span className="joy-direction up">▲</span>
            <span className="joy-direction right">▶</span>
            <span className="joy-direction down">▼</span>
            <span className="joy-direction left">◀</span>
            <div className="joy-knob" ref={knob} />
        </div>
    );
}

function HoldButton({ className, label, onHold }) {
    return (
        <button
            type="button"
            className={className}
            onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                onHold(true);
            }}
            onPointerUp={() => onHold(false)}
            onPointerCancel={() => onHold(false)}
            onContextMenu={(e) => e.preventDefault()}
        >
            {label}
        </button>
    );
}

export function CityGame() {
    const canvasRef = useRef(null);
    const bubblesRef = useRef(null);
    const gameRef = useRef(null);
    const chatEndRef = useRef(null);
    const [error, setError] = useState(null);
    const [started, setStarted] = useState(false);
    const [location, setLocation] = useState('מרכז העיר');
    const [prompt, setPrompt] = useState(null);
    const [hud, setHud] = useState(null);
    const [hour, setHour] = useState(10);
    const [weather, setWeather] = useState('clear');
    const [cycle, setCycle] = useState(true);
    const [helpOpen, setHelpOpen] = useState(true);
    const [chat, setChat] = useState(null);
    const [draft, setDraft] = useState('');

    useEffect(() => {
        let game;
        try {
            game = createGame(canvasRef.current, bubblesRef.current, {
                onLocation: setLocation,
                onPrompt: setPrompt,
                onHud: setHud,
                onHour: setHour,
                onChat: (citizen) => {
                    game.setChat(citizen.id);
                    setChat({ citizen, messages: [{ from: 'npc', text: greeting(citizen) }] });
                }
            });
        } catch (err) {
            console.error('City game failed to start:', err);
            setError(String(err?.message || err));
            return undefined;
        }
        gameRef.current = game;
        window.__cityGame = game;
        return () => {
            game.dispose();
            gameRef.current = null;
            delete window.__cityGame;
        };
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ block: 'end' });
    }, [chat]);

    const game = () => gameRef.current;
    const closeChat = () => {
        game()?.setChat(null);
        setChat(null);
        setDraft('');
    };
    const send = (e) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text || !chat) return;
        setChat({
            ...chat,
            messages: [...chat.messages, { from: 'player', text }, { from: 'npc', text: replyFor(chat.citizen, text) }]
        });
        setDraft('');
    };

    if (error) {
        return (
            <div className="city-game game-root" dir="rtl" lang="he">
                <div className="start-overlay">
                    <div className="start-card">
                        <h1>המשחק לא הצליח לעלות</h1>
                        <p>ייתכן שהדפדפן חסם רכיב תלת־ממדי (WebGL). נסו לרענן את הדף או לפתוח אותו בדפדפן אחר.</p>
                        <pre className="start-error">{error}</pre>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="city-game game-root" dir="rtl" lang="he">
            <div className="game-canvas" ref={canvasRef} />
            <div className="bubble-layer" ref={bubblesRef} />

            {started && (
                <>
                    <div className="hud-panel hud-loc" role="status">
                        <span className="hud-dot" />
                        <span className="hud-loc-text">{location}</span>
                    </div>

                    <div className="climate-panel">
                        <div className="climate-heading">
                            <span>אקלים וזמן</span>
                            <span className="climate-status">{cycle ? 'מחזור פעיל' : 'זמן קפוא'}</span>
                        </div>
                        <label className="climate-field">
                            <span>מזג אוויר</span>
                            <select
                                value={weather}
                                onChange={(e) => {
                                    setWeather(e.target.value);
                                    game()?.setWeather(e.target.value);
                                }}
                            >
                                {WEATHER_OPTIONS.map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="climate-time-row">
                            <span>שעה</span>
                            <strong>{formatHour(hour)}</strong>
                        </div>
                        <input
                            className="climate-range"
                            type="range"
                            min="0"
                            max="23.75"
                            step="0.25"
                            value={hour}
                            aria-label="שעה ביום"
                            onChange={(e) => {
                                const value = Number(e.target.value);
                                setHour(value);
                                game()?.setHour(value);
                            }}
                        />
                        <button
                            type="button"
                            className="climate-cycle"
                            onClick={() => {
                                game()?.setCycle(!cycle);
                                setCycle(!cycle);
                            }}
                        >
                            {cycle ? 'עצירת מחזור יום ולילה' : 'הפעלת מחזור יום ולילה'}
                        </button>
                    </div>

                    <div className="hud-panel hud-help">
                        <button type="button" className="hud-btn" onClick={() => setHelpOpen(!helpOpen)}>
                            {helpOpen ? 'הסתר' : 'הצג'}
                        </button>
                        <strong>פקדים</strong>
                        {helpOpen && (
                            <ul>
                                <li><b>W A S D</b> — תנועה ונהיגה</li>
                                <li><b>גרירת עכבר</b> — סיבוב המבט · <b>גלגלת</b> — זום</li>
                                <li><b>רווח</b> — קפיצה / המראה</li>
                                <li><b>Shift</b> — ריצה / הנמכה</li>
                                <li><b>E</b> — כניסה, יציאה ושיחה</li>
                            </ul>
                        )}
                    </div>

                    {hud && (
                        <div className="hud-panel vehicle-hud">
                            {hud.mode === 'car' ? (
                                <><b>רכב</b> · {hud.speed} קמ״ש</>
                            ) : (
                                <><b>מסוק</b> · גובה {hud.alt} מ׳ · רווח להמראה, Shift להנמכה</>
                            )}
                        </div>
                    )}

                    {prompt && !chat && (
                        <button type="button" className="hud-panel interaction-prompt" onClick={() => game()?.interact()}>
                            {prompt} <span className="prompt-key">E</span>
                        </button>
                    )}

                    {!chat && (
                        <>
                            <Joystick onMove={(x, y) => game()?.setMove(x, y)} />
                            <HoldButton className="jump-btn" label={hud?.mode === 'heli' ? 'עלה' : 'קפוץ'} onHold={(v) => game()?.setJump(v)} />
                            {hud?.mode === 'heli' && <HoldButton className="vehicle-down-btn" label="רד" onHold={(v) => game()?.setDown(v)} />}
                        </>
                    )}

                    {chat && (
                        <div className="hud-panel npc-chat-panel">
                            <div className="npc-chat-header">
                                <div>
                                    <strong>{chat.citizen.name}</strong>
                                    <span>{chat.citizen.role} · שיחה מקומית</span>
                                </div>
                                <button type="button" className="npc-chat-close" onClick={closeChat}>
                                    סגור
                                </button>
                            </div>
                            <div className="npc-chat-messages">
                                {chat.messages.map((m, n) => (
                                    <div key={n} className={`npc-chat-bubble ${m.from}`}>
                                        <small>{m.from === 'npc' ? chat.citizen.name : 'אני'}</small>
                                        <p>{m.text}</p>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <form className="npc-chat-form" onSubmit={send}>
                                <input
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    placeholder="כתבו משהו…"
                                    maxLength={120}
                                    aria-label="הודעה"
                                />
                                <button type="submit" disabled={!draft.trim()}>
                                    שלח
                                </button>
                            </form>
                        </div>
                    )}
                </>
            )}

            {!started && (
                <div className="start-overlay">
                    <div className="start-card">
                        <div className="start-kicker">עיר פתוחה · תלת־ממד</div>
                        <h1>עיר המעלות</h1>
                        <p>
                            עיר שלמה שמחכה לכם: טפסו בגרמי המדרגות עד הגגות, כבשו את גבעת המדרגות שבמרכז, נהגו ברחובות,
                            הטיסו מסוק ופגשו את התושבים.
                        </p>
                        <ul className="start-features">
                            <li>מדרגות וגגות</li>
                            <li>רכבים ומסוק</li>
                            <li>יום, לילה ומזג אוויר</li>
                            <li>תושבים ושיחות</li>
                        </ul>
                        <button
                            type="button"
                            className="start-btn"
                            onClick={() => {
                                game()?.start();
                                setStarted(true);
                            }}
                        >
                            התחילו לחקור
                        </button>
                        <div className="privacy-note">בלי חשבון ובלי מעקב — הכול רץ אצלכם בדפדפן.</div>
                    </div>
                </div>
            )}
        </div>
    );
}
