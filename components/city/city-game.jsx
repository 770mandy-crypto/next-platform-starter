'use client';

import { useEffect, useRef, useState } from 'react';
import { createGame } from './engine';
import { greeting, replyFor } from './dialog';
import { WEAPONS } from './combat';

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
                onHold(true);
                try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                    // Synthetic or already-released pointers cannot be captured.
                }
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
    const toastTimer = useRef(null);
    const flashTimer = useRef(null);
    const [error, setError] = useState(null);
    const [started, setStarted] = useState(false);
    const [location, setLocation] = useState('מרכז העיר');
    const [prompt, setPrompt] = useState(null);
    const [hud, setHud] = useState(null);
    const [hour, setHour] = useState(10);
    const [weather, setWeather] = useState('clear');
    const [cycle, setCycle] = useState(true);
    const [helpOpen, setHelpOpen] = useState(true);
    const [climateOpen, setClimateOpen] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [chat, setChat] = useState(null);
    const [draft, setDraft] = useState('');
    const [status, setStatus] = useState(null);
    const [stage, setStage] = useState(null);
    const [toast, setToast] = useState(null);
    const [elevator, setElevator] = useState(null);
    const [flash, setFlash] = useState(null);

    useEffect(() => {
        let game;
        const pulse = (kind) => {
            setFlash(kind);
            clearTimeout(flashTimer.current);
            flashTimer.current = setTimeout(() => setFlash(null), 220);
        };
        try {
            game = createGame(canvasRef.current, bubblesRef.current, {
                onLocation: setLocation,
                onPrompt: setPrompt,
                onHud: setHud,
                onHour: setHour,
                onStatus: setStatus,
                onStage: setStage,
                onToast: (text) => {
                    setToast(text);
                    clearTimeout(toastTimer.current);
                    toastTimer.current = setTimeout(() => setToast(null), 3200);
                },
                onHurt: () => pulse('hurt'),
                onHit: (kill) => pulse(kill ? 'kill' : 'hit'),
                onElevator: (info) => {
                    game.releasePointer();
                    setElevator(info);
                },
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
        if (window.matchMedia('(max-width: 700px)').matches) setClimateOpen(false);
        return () => {
            clearTimeout(toastTimer.current);
            clearTimeout(flashTimer.current);
            game.dispose();
            gameRef.current = null;
            delete window.__cityGame;
        };
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ block: 'end' });
    }, [chat]);

    const game = () => gameRef.current;
    const begin = (bots) => {
        game()?.start({ bots });
        setStarted(true);
    };
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

    const armed = status?.armed && !status?.dead;
    const dialogOpen = Boolean(chat || elevator || menuOpen);

    return (
        <div className={`city-game game-root${flash === 'hurt' ? ' is-hurt' : ''}`} dir="rtl" lang="he">
            <div className="game-canvas" ref={canvasRef} />
            <div className="bubble-layer" ref={bubblesRef} />

            {started && (
                <>
                    {armed && !dialogOpen && <div className={`crosshair${flash === 'hit' ? ' hit' : flash === 'kill' ? ' kill' : ''}`} aria-hidden="true" />}

                    <div className="hud-panel hud-loc" role="status">
                        <span className="hud-dot" />
                        <span className="hud-loc-text">{location}</span>
                    </div>

                    {status?.wanted > 0 && (
                        <div className={`wanted${status.searching ? ' searching' : ''}`} role="status" aria-label={`רמת חיפוש ${status.wanted}`}>
                            <span className="wanted-stars">
                                {Array.from({ length: 5 }, (_, n) => (
                                    <span key={n} className={n < status.wanted ? 'on' : ''}>★</span>
                                ))}
                            </span>
                            <span className="wanted-text">
                                {status.searching ? `מסתתרים מהמשטרה… ${Math.round(status.searching * 100)}%` : 'המשטרה רואה אתכם!'}
                            </span>
                        </div>
                    )}

                    {status?.heist && (
                        <div className="hud-panel heist-panel" role="status">
                            <span>פורצים את הכספת · {status.heist.name}</span>
                            <div className="stage-bar"><span style={{ width: `${status.heist.pct}%` }} /><em>{status.heist.pct}%</em></div>
                        </div>
                    )}

                    <div className={`climate-panel${climateOpen ? '' : ' collapsed'}`}>
                        <div className="climate-heading">
                            <span>אקלים וזמן</span>
                            <button type="button" className="hud-btn climate-toggle" onClick={() => setClimateOpen(!climateOpen)}>
                                {climateOpen ? 'הסתר' : formatHour(hour)}
                            </button>
                        </div>
                        {climateOpen && (
                            <>
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
                            </>
                        )}
                    </div>

                    <div className="hud-side">
                        <div className="hud-panel hud-help">
                            <button type="button" className="hud-btn" onClick={() => setHelpOpen(!helpOpen)}>
                                {helpOpen ? 'הסתר' : 'הצג'}
                            </button>
                            <strong>פקדים</strong>
                            {helpOpen && (
                                <ul>
                                    <li><b>W A S D</b> — תנועה, נהיגה ושיט</li>
                                    <li><b>לחיצה על המסך</b> — כיוון בעכבר · <b>Esc</b> — שחרור</li>
                                    <li><b>לחיצה / F</b> — ירי · <b>R</b> — טעינה · <b>Q, 1–5</b> — נשק</li>
                                    <li><b>רווח</b> — קפיצה / המראה · <b>Shift</b> — ריצה / הנמכה</li>
                                    <li><b>E</b> — כניסה, יציאה, מעלית, שיחה ופריצת כספת</li>
                                </ul>
                            )}
                        </div>

                        {stage && (
                            <div className="hud-panel stage-panel">
                                <div className="stage-head">
                                    <span>{stage.done ? 'המשימות' : `שלב ${stage.index} מתוך ${stage.total}`}</span>
                                    {!stage.done && <span className="stage-reward">פרס: {stage.reward}</span>}
                                </div>
                                <div className="stage-title">{stage.title}</div>
                                {stage.need > 0 && (
                                    <div className="stage-bar" role="progressbar" aria-valuemin={0} aria-valuemax={stage.need} aria-valuenow={stage.progress}>
                                        <span style={{ width: `${(stage.progress / stage.need) * 100}%` }} />
                                        <em>{stage.progress} / {stage.need}</em>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {status && (
                        <div className="hud-panel status-panel">
                            <div className="status-row">
                                <div className="hp-bar" role="progressbar" aria-label="בריאות" aria-valuemin={0} aria-valuemax={100} aria-valuenow={status.hp}>
                                    <span style={{ width: `${status.hp}%` }} className={status.hp < 35 ? 'low' : ''} />
                                    <em>{status.hp}</em>
                                </div>
                                <button type="button" className="hud-btn menu-btn" onClick={() => { game()?.releasePointer(); setMenuOpen(!menuOpen); }}>
                                    תפריט
                                </button>
                            </div>
                            <div className="cash-row">
                                <span>כסף</span>
                                <strong>{status.cash.toLocaleString('he-IL')} ₪</strong>
                            </div>
                            <div className="weapon-row">
                                <strong>{status.weaponName}</strong>
                                <span className="ammo">{status.reloading ? 'טוען…' : `${status.mag} / ${status.reserve}`}</span>
                            </div>
                            <div className="weapon-slots">
                                {status.owned.map((id, n) => (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`weapon-slot${id === status.weapon ? ' active' : ''}`}
                                        onClick={() => game()?.setWeapon(id)}
                                        title={WEAPONS[id].name}
                                    >
                                        <span>{n + 1}</span> {WEAPONS[id].name}
                                    </button>
                                ))}
                            </div>
                            {status.bots && (
                                <div className="score-row">
                                    <span>ניצחונות <b>{status.kills}</b></span>
                                    <span>נפילות <b>{status.deaths}</b></span>
                                </div>
                            )}
                        </div>
                    )}

                    {menuOpen && status && (
                        <div className="hud-panel game-menu" role="dialog" aria-label="תפריט">
                            <h3>תפריט</h3>
                            <p>{status.bots ? 'עולם פתוח עם בוטים שמשחקים נגדכם.' : 'עולם פתוח שקט, בלי בוטים.'}</p>
                            <button type="button" className="menu-action bots-toggle" onClick={() => game()?.setBots(!status.bots)}>
                                {status.bots ? 'כיבוי הבוטים' : 'הפעלת הבוטים'}
                            </button>
                            <button type="button" className="menu-action police-toggle" onClick={() => game()?.setPolice(!status.police)}>
                                {status.police ? 'כיבוי המשטרה' : 'הפעלת המשטרה'}
                            </button>
                            <button type="button" className="menu-action reset-progress" onClick={() => game()?.resetProgress()}>
                                איפוס ההתקדמות והשלבים
                            </button>
                            <button type="button" className="menu-action menu-close" onClick={() => setMenuOpen(false)}>
                                חזרה למשחק
                            </button>
                        </div>
                    )}

                    {toast && <div className="hud-panel game-toast" role="status">{toast}</div>}
                    {status?.dead && <div className="death-note">נפלתם · חוזרים מיד…</div>}

                    {hud && (
                        <div className="hud-panel vehicle-hud">
                            {hud.mode === 'heli' ? (
                                <><b>מסוק</b> · גובה {hud.alt} מ׳ · רווח להמראה, Shift להנמכה</>
                            ) : (
                                <><b>{hud.label}</b> · {hud.speed} קמ״ש</>
                            )}
                        </div>
                    )}

                    {prompt && !dialogOpen && (
                        <button type="button" className="hud-panel interaction-prompt" onClick={() => game()?.interact()}>
                            {prompt} <span className="prompt-key">E</span>
                        </button>
                    )}

                    {!dialogOpen && (
                        <>
                            <Joystick onMove={(x, y) => game()?.setMove(x, y)} />
                            <HoldButton className="jump-btn" label={hud?.mode === 'heli' ? 'עלה' : 'קפוץ'} onHold={(v) => game()?.setJump(v)} />
                            {hud?.mode === 'heli' && <HoldButton className="vehicle-down-btn" label="רד" onHold={(v) => game()?.setDown(v)} />}
                            {armed && (
                                <>
                                    <HoldButton className="fire-btn" label="אש" onHold={(v) => game()?.setFire(v)} />
                                    <button type="button" className="touch-btn reload-btn" onClick={() => game()?.reload()}>טען</button>
                                    <button type="button" className="touch-btn switch-btn" onClick={() => game()?.nextWeapon()}>נשק</button>
                                </>
                            )}
                        </>
                    )}

                    {elevator && (
                        <div className="elevator-dialog" role="dialog" aria-label="מעלית">
                            <h3>מעלית · {elevator.name}</h3>
                            <p>לאיזו קומה? (הבניין בן {elevator.floors} קומות)</p>
                            <div className="elevator-floor-grid">
                                {Array.from({ length: elevator.floors + 1 }, (_, k) => elevator.floors - k).map((k) => (
                                    <button
                                        key={k}
                                        type="button"
                                        className={k === elevator.level ? 'selected' : ''}
                                        disabled={k === elevator.level}
                                        onClick={() => {
                                            game()?.rideTo(k);
                                            setElevator(null);
                                        }}
                                    >
                                        {k === elevator.floors ? 'גג' : k === 0 ? 'קרקע' : k}
                                    </button>
                                ))}
                            </div>
                            <button type="button" className="elevator-cancel" onClick={() => setElevator(null)}>
                                ביטול
                            </button>
                        </div>
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
                            עיר שלמה שמחכה לכם: היכנסו לבניינים ועלו במעלית עד קומה 20, אספו נשקים בכל קומה, פרצו כספות
                            בעסקים וברחו מהמשטרה, השלימו שלבים כדי לזכות במכוניות ובסירות, והתמודדו מול בוטים — או טיילו בשקט.
                        </p>
                        <ul className="start-features">
                            <li>בניינים ומעליות</li>
                            <li>נשקים ושלבים</li>
                            <li>כספות ומשטרה</li>
                            <li>מכוניות, סירות ומסוק</li>
                            <li>יום, לילה ומזג אוויר</li>
                        </ul>
                        <div className="start-actions">
                            <button type="button" className="start-btn start-bots" onClick={() => begin(true)}>
                                עולם פתוח עם בוטים
                            </button>
                            <button type="button" className="start-btn start-peace" onClick={() => begin(false)}>
                                עולם פתוח בלי בוטים
                            </button>
                        </div>
                        <div className="privacy-note">בלי חשבון ובלי מעקב — הכול רץ אצלכם בדפדפן. אפשר להחליף מצב בכל רגע בתפריט.</div>
                    </div>
                </div>
            )}
        </div>
    );
}
