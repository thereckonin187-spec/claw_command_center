import { useState, useEffect, useCallback, useRef } from "react";
import "./ElizabethApp.css";

// ─── Constants ────────────────────────────────────────────────
const WEATHER_CODES = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Foggy", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rainy", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snowy", 75: "Heavy snow", 77: "Snow",
  80: "Light showers", 81: "Showers", 82: "Heavy showers",
  85: "Snow showers", 86: "Snow showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
};

function kidWeatherIcon(code) {
  if (code <= 1) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌧️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

function kidWeatherWord(code) {
  return WEATHER_CODES[code] || "nice out";
}

const DEFAULT_TASKS = [
  { name: "Read 20 min", emoji: "📚" },
  { name: "Clean room", emoji: "🧹" },
  { name: "Brush teeth AM", emoji: "🦷" },
  { name: "Brush teeth PM", emoji: "🦷" },
  { name: "Be kind", emoji: "💕" },
];

const BADGES = [
  { stars: 10, name: "Bronze Unicorn", icon: "🥉🦄" },
  { stars: 25, name: "Silver Unicorn", icon: "🥈🦄" },
  { stars: 50, name: "Gold Unicorn", icon: "🥇🦄" },
  { stars: 100, name: "Rainbow Unicorn", icon: "🌈🦄" },
];

const FUN_FACTS = [
  "A group of flamingos is called a flamboyance! 🦩",
  "Octopuses have three hearts and blue blood! 🐙",
  "Honey never spoils — archaeologists found 3000 year old honey! 🍯",
  "A day on Venus is longer than a year on Venus! 🪐",
  "Sea otters hold hands when they sleep so they don't drift apart! 🦦",
  "Butterflies taste with their feet! 🦋",
  "The heart of a shrimp is in its head! 🦐",
  "Cows have best friends and get stressed when separated! 🐄",
  "Dolphins have names for each other! 🐬",
  "A cat has 32 muscles in each ear! 🐱",
  "Sloths can hold their breath longer than dolphins! 🦥",
  "Elephants are the only animals that can't jump! 🐘",
  "A group of pugs is called a grumble! 🐶",
  "Stars twinkle because of Earth's atmosphere! ⭐",
  "There are more trees on Earth than stars in the Milky Way! 🌳",
  "Wombat poop is cube-shaped! 💩",
  "Hummingbirds can fly backwards! 🐦",
  "The ocean is home to 95% of all life on Earth! 🌊",
  "Bananas glow blue under black lights! 🍌",
  "Cats spend 70% of their lives sleeping! 😺",
];

const ENCOURAGEMENTS = [
  "You're doing amazing! Keep going! ✨",
  "Every star you earn shows how awesome you are! 🌟",
  "Dad is so proud of you! 💕",
  "You're a real-life unicorn — one of a kind! 🦄",
  "Keep being the incredible kid you are! 🌈",
  "You make the world a brighter place! ☀️",
  "Nothing can stop you! 💪",
];

const FLOATER_EMOJIS = ["🦄", "⭐", "🐱", "🌸", "✨", "🌈", "💖", "🦋", "🐾", "🌙"];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const TAB_CONFIG = [
  { id: "home", label: "Home", emoji: "🏠", colorClass: "home" },
  { id: "tasks", label: "Tasks", emoji: "✅", colorClass: "tasks" },
  { id: "calendar", label: "Calendar", emoji: "📅", colorClass: "calendar" },
  { id: "notes", label: "Notes", emoji: "💌", colorClass: "notes" },
  { id: "rewards", label: "Rewards", emoji: "⭐", colorClass: "rewards" },
];

// ─── Helpers ──────────────────────────────────────────────────
function loadStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) return JSON.parse(stored);
  } catch { /* ignore */ }
  return fallback;
}

function detectElizabethWeek() {
  const today = new Date();
  const anchor = new Date(2026, 2, 1, 18, 0); // Sunday March 1, 2026 6PM
  const diffDays = (today - anchor) / (1000 * 60 * 60 * 24);
  const cycleDay = ((diffDays % 14) + 14) % 14;
  const active = cycleDay < 7;
  const daysUntilNext = active ? null : Math.ceil(14 - cycleDay);
  return { active, daysUntilNext };
}

function isElizabethWeekOnDate(date) {
  const anchor = new Date(2026, 2, 1, 18, 0);
  const diffDays = (date - anchor) / (1000 * 60 * 60 * 24);
  const cycleDay = ((diffDays % 14) + 14) % 14;
  return cycleDay < 7;
}

function getLocalDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────
export default function ElizabethApp() {
  const today = new Date();
  const localDate = getLocalDate();

  // State
  const [activeTab, setActiveTab] = useState("home");
  const [tasks, setTasks] = useState(() => {
    const saved = loadStorage("elizabeth_tasks", null);
    const savedDate = loadStorage("elizabeth_tasks_date", null);
    // Reset tasks daily but keep custom task list
    if (saved && savedDate === localDate) return saved;
    // Preserve any custom tasks from parent, reset done state
    const customNames = loadStorage("elizabeth_custom_tasks", null);
    const taskList = customNames || DEFAULT_TASKS;
    return taskList.map(t => ({ name: t.name, emoji: t.emoji, done: false, earnedStar: false }));
  });
  const [notes, setNotes] = useState(() => loadStorage("elizabeth_notes", []));
  const [stars, setStars] = useState(() => loadStorage("elizabeth_rewards", 0));
  const [completedDates, setCompletedDates] = useState(() => loadStorage("elizabeth_completed_dates", {}));
  const [parentMode, setParentMode] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [sparkles, setSparkles] = useState([]);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [funFactIndex, setFunFactIndex] = useState(() => Math.floor(Math.random() * FUN_FACTS.length));
  const [parentNewTask, setParentNewTask] = useState("");
  const [parentNewNote, setParentNewNote] = useState("");

  const headerTapCount = useRef(0);
  const headerTapTimer = useRef(null);

  // Elizabeth week
  const { active: elizabethWeek, daysUntilNext } = detectElizabethWeek();

  // ─── Persist to localStorage ────────────────────────────────
  useEffect(() => {
    localStorage.setItem("elizabeth_tasks", JSON.stringify(tasks));
    localStorage.setItem("elizabeth_tasks_date", JSON.stringify(localDate));
  }, [tasks, localDate]);

  useEffect(() => { localStorage.setItem("elizabeth_notes", JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem("elizabeth_rewards", JSON.stringify(stars)); }, [stars]);
  useEffect(() => { localStorage.setItem("elizabeth_completed_dates", JSON.stringify(completedDates)); }, [completedDates]);

  // ─── Weather fetch (Milton) ─────────────────────────────────
  const fetchWeather = useCallback(async () => {
    try {
      const url = "https://api.open-meteo.com/v1/forecast?latitude=47.2487&longitude=-122.3154&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America/Los_Angeles";
      const res = await fetch(url);
      const data = await res.json();
      setWeatherData(data.current);
    } catch (err) {
      console.error("Weather fetch failed:", err);
    }
  }, []);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  // ─── Rotate fun fact every 30 seconds ───────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setFunFactIndex(prev => (prev + 1) % FUN_FACTS.length);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // ─── Sparkle burst ──────────────────────────────────────────
  const triggerSparkles = useCallback((x, y) => {
    const newSparkles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x,
      y,
      emoji: ["✨", "⭐", "💫", "🌟"][Math.floor(Math.random() * 4)],
      dx: (Math.random() - 0.5) * 120,
      dy: (Math.random() - 0.5) * 120,
    }));
    setSparkles(prev => [...prev, ...newSparkles]);
    setTimeout(() => {
      setSparkles(prev => prev.filter(s => !newSparkles.find(ns => ns.id === s.id)));
    }, 800);
  }, []);

  // ─── Floating hearts ───────────────────────────────────────
  const triggerHearts = useCallback((x, y) => {
    const newHearts = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 60,
      y,
      emoji: ["❤️", "💕", "💖", "💗"][Math.floor(Math.random() * 4)],
    }));
    setFloatingHearts(prev => [...prev, ...newHearts]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => !newHearts.find(nh => nh.id === h.id)));
    }, 2000);
  }, []);

  // ─── Task toggle ────────────────────────────────────────────
  const toggleTask = useCallback((index, e) => {
    setTasks(prev => {
      const next = [...prev];
      const task = { ...next[index] };
      if (!task.done) {
        task.done = true;
        task.earnedStar = true;
        setStars(s => s + 1);
        if (e) triggerSparkles(e.clientX, e.clientY);
      } else {
        if (task.earnedStar) {
          setStars(s => Math.max(0, s - 1));
        }
        task.done = false;
        task.earnedStar = false;
      }
      next[index] = task;

      // Track completion for calendar
      const doneCount = next.filter(t => t.done).length;
      if (doneCount === next.length) {
        setCompletedDates(prev2 => ({ ...prev2, [localDate]: true }));
      }

      return next;
    });
  }, [localDate, triggerSparkles]);

  // ─── Header triple-tap for parent mode ──────────────────────
  const handleHeaderTap = useCallback(() => {
    headerTapCount.current += 1;
    if (headerTapTimer.current) clearTimeout(headerTapTimer.current);
    if (headerTapCount.current >= 3) {
      headerTapCount.current = 0;
      setShowPinEntry(true);
      setPinInput("");
      setPinError(false);
    } else {
      headerTapTimer.current = setTimeout(() => { headerTapCount.current = 0; }, 600);
    }
  }, []);

  const handlePinSubmit = useCallback(() => {
    if (pinInput === "1234") {
      setParentMode(true);
      setShowPinEntry(false);
      setPinInput("");
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput("");
    }
  }, [pinInput]);

  // ─── Parent: add task ───────────────────────────────────────
  const parentAddTask = useCallback(() => {
    if (!parentNewTask.trim()) return;
    const newTask = { name: parentNewTask.trim(), emoji: "📋" };
    setTasks(prev => [...prev, { name: newTask.name, emoji: newTask.emoji, done: false, earnedStar: false }]);
    // Also save to custom tasks
    const customTasks = loadStorage("elizabeth_custom_tasks", DEFAULT_TASKS);
    const updated = [...customTasks, newTask];
    localStorage.setItem("elizabeth_custom_tasks", JSON.stringify(updated));
    setParentNewTask("");
  }, [parentNewTask]);

  // ─── Parent: remove task ────────────────────────────────────
  const parentRemoveTask = useCallback((index) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
    const customTasks = loadStorage("elizabeth_custom_tasks", DEFAULT_TASKS);
    const updated = customTasks.filter((_, i) => i !== index);
    localStorage.setItem("elizabeth_custom_tasks", JSON.stringify(updated));
  }, []);

  // ─── Parent: add note ───────────────────────────────────────
  const parentAddNote = useCallback(() => {
    if (!parentNewNote.trim()) return;
    const newNote = { text: parentNewNote.trim(), date: localDate, hearted: false };
    setNotes(prev => [newNote, ...prev]);
    setParentNewNote("");
  }, [parentNewNote, localDate]);

  // ─── Calendar helpers ───────────────────────────────────────
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calFirstDay = new Date(calYear, calMonth, 1).getDay();

  const calPrev = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const calNext = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  // ─── Floating background ────────────────────────────────────
  const floaters = FLOATER_EMOJIS.map((emoji, i) => ({
    emoji,
    left: `${(i * 10) + Math.random() * 5}%`,
    duration: 15 + Math.random() * 20,
    delay: Math.random() * 10,
    size: 1.2 + Math.random() * 1.5,
  }));

  // ─── Render ─────────────────────────────────────────────────
  const doneCount = tasks.filter(t => t.done).length;
  const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0;

  return (
    <div className={`elizabeth-app${parentMode ? " parent-mode" : ""}`}>
      {/* Floating background */}
      {!parentMode && (
        <div className="ek-bg-floaters">
          {floaters.map((f, i) => (
            <div key={i} className="ek-floater"
              style={{
                left: f.left,
                fontSize: `${f.size}rem`,
                animationDuration: `${f.duration}s`,
                animationDelay: `${f.delay}s`,
              }}>
              {f.emoji}
            </div>
          ))}
        </div>
      )}

      {/* Sparkle effects */}
      <div className="ek-sparkle-container">
        {sparkles.map(s => (
          <div key={s.id} className="ek-sparkle"
            style={{ left: s.x, top: s.y, "--dx": `${s.dx}px`, "--dy": `${s.dy}px` }}>
            {s.emoji}
          </div>
        ))}
      </div>

      {/* Floating hearts */}
      <div className="ek-floating-hearts">
        {floatingHearts.map(h => (
          <div key={h.id} className="ek-floating-heart" style={{ left: h.x, top: h.y }}>
            {h.emoji}
          </div>
        ))}
      </div>

      {/* Parent mode bar */}
      {parentMode && (
        <div className="ek-parent-bar">
          <span>PARENT MODE — COMMAND CENTER</span>
          <button onClick={() => setParentMode(false)}>EXIT</button>
        </div>
      )}

      {/* Header */}
      <div className="ek-header" onClick={handleHeaderTap}>
        <h1>Elizabeth's Magic Kingdom 🦄✨</h1>
        <div className="ek-header-subtitle">
          {parentMode ? "// Parent Controls Active" : "A magical place just for you!"}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="ek-tabs">
        {TAB_CONFIG.map(tab => (
          <button key={tab.id}
            className={`ek-tab-btn ${tab.colorClass}${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="ek-content">
        {/* ═══ HOME TAB ═══ */}
        {activeTab === "home" && (
          <div>
            <div className="ek-greeting">Hi Elizabeth! 🦄✨</div>

            {/* Elizabeth Week status */}
            <div className={`ek-status-card ${elizabethWeek ? "active" : "inactive"}`}>
              {elizabethWeek ? (
                <>
                  <h3>💖 Dad's Week! 💖</h3>
                  <p>You're with Dad right now!</p>
                  <p>Let's make it an amazing week! 🎉</p>
                </>
              ) : (
                <>
                  <h3>🌙 Missing You!</h3>
                  <p>Dad can't wait to see you!</p>
                  {daysUntilNext != null && (
                    <p>{daysUntilNext} day{daysUntilNext !== 1 ? "s" : ""} until Dad's week! 💫</p>
                  )}
                </>
              )}
            </div>

            {/* Weather */}
            {weatherData && (
              <div className="ek-weather-card">
                <div className="ek-weather-icon">{kidWeatherIcon(weatherData.weather_code)}</div>
                <div className="ek-weather-temp">{Math.round(weatherData.temperature_2m)}°</div>
                <div className="ek-weather-desc">
                  It's {kidWeatherWord(weatherData.weather_code).toLowerCase()} and {Math.round(weatherData.temperature_2m)} degrees outside!
                </div>
              </div>
            )}

            {/* Fun fact */}
            <div className="ek-funfact">
              <div className="ek-funfact-label">✨ DID YOU KNOW? ✨</div>
              {FUN_FACTS[funFactIndex]}
            </div>

            {/* Today's progress */}
            <div className="ek-card" style={{ marginTop: 16, textAlign: "center" }}>
              <div className="ek-card-title">Today's Progress</div>
              <div className="ek-progress-bar">
                <div className="ek-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div style={{ fontSize: "0.9rem", color: "var(--ek-text-light)", marginTop: 4 }}>
                {doneCount} of {tasks.length} tasks done! {doneCount === tasks.length && tasks.length > 0 ? "🎉" : ""}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TASKS TAB ═══ */}
        {activeTab === "tasks" && (
          <div>
            <div className="ek-tasks-progress">
              {doneCount === tasks.length && tasks.length > 0
                ? "All done! You're a superstar! 🌟"
                : `${tasks.length - doneCount} task${tasks.length - doneCount !== 1 ? "s" : ""} left today`
              }
              <div className="ek-progress-bar">
                <div className="ek-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {tasks.map((task, i) => (
              <div key={i}
                className={`ek-task-item${task.done ? " done" : ""}`}
                onClick={(e) => toggleTask(i, e)}>
                <div className="ek-task-checkbox">
                  {task.done ? "✓" : ""}
                </div>
                <span className="ek-task-emoji">{task.emoji}</span>
                <span className="ek-task-name">{task.name}</span>
                <span className="ek-task-star">{task.done ? "⭐" : "☆"}</span>
              </div>
            ))}

            {/* Parent mode: manage tasks */}
            {parentMode && (
              <div className="ek-card" style={{ marginTop: 20 }}>
                <div className="ek-card-title" style={{ color: "#18ff6d" }}>Manage Tasks</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="ek-parent-input" style={{ flex: 1 }}
                    placeholder="New task name..."
                    value={parentNewTask}
                    onChange={e => setParentNewTask(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && parentAddTask()} />
                  <button className="ek-parent-btn" onClick={parentAddTask}>ADD</button>
                </div>
                <div className="ek-parent-task-list">
                  {tasks.map((task, i) => (
                    <div key={i} className="ek-parent-task-row">
                      <span>{task.emoji} {task.name}</span>
                      <button onClick={() => parentRemoveTask(i)}>REMOVE</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ CALENDAR TAB ═══ */}
        {activeTab === "calendar" && (
          <div>
            <div className="ek-card">
              <div className="ek-cal-header">
                <button className="ek-cal-nav" onClick={calPrev}>◀</button>
                <div className="ek-cal-title">{MONTH_NAMES[calMonth]} {calYear}</div>
                <button className="ek-cal-nav" onClick={calNext}>▶</button>
              </div>

              <div className="ek-cal-grid">
                {DAY_NAMES.map(d => (
                  <div key={d} className="ek-cal-day-header">{d}</div>
                ))}

                {/* Empty cells before first day */}
                {Array.from({ length: calFirstDay }, (_, i) => (
                  <div key={`e${i}`} className="ek-cal-day empty" />
                ))}

                {/* Day cells */}
                {Array.from({ length: calDaysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const date = new Date(calYear, calMonth, dayNum, 12, 0);
                  const isToday = dayNum === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                  const isEW = isElizabethWeekOnDate(date);
                  const isBirthday = calMonth === 0 && dayNum === 27; // Jan 27
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const completed = completedDates[dateStr];

                  let classes = "ek-cal-day";
                  if (isToday) classes += " today";
                  else if (isBirthday) classes += " birthday";
                  else if (isEW) classes += " elizabeth-week";

                  return (
                    <div key={dayNum} className={classes}>
                      {dayNum}
                      {isBirthday && <span className="ek-cal-marker">🎂🦄</span>}
                      {isEW && !isBirthday && !isToday && <span className="ek-cal-marker">💖</span>}
                      {completed && <span className="ek-cal-marker">⭐</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ek-card" style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--ek-text-light)" }}>
              <span style={{ color: "var(--ek-pink)" }}>●</span> = Dad's week &nbsp;
              <span>🎂</span> = Birthday &nbsp;
              <span>⭐</span> = All tasks done!
            </div>
          </div>
        )}

        {/* ═══ NOTES TAB ═══ */}
        {activeTab === "notes" && (
          <div>
            {notes.length === 0 ? (
              <div className="ek-empty-notes">
                <div style={{ fontSize: "3rem", marginBottom: 12 }}>💌</div>
                No notes from Dad yet!<br />Check back soon! 🦄
              </div>
            ) : (
              notes.map((note, i) => {
                const decorEmojis = ["🦄", "🐱", "🌸", "⭐", "🌈", "💖"];
                const decor = decorEmojis[i % decorEmojis.length];
                return (
                  <div key={i} className="ek-note-card">
                    <div className="ek-note-decor">{decor}</div>
                    <div className="ek-note-text">{note.text}</div>
                    <div className="ek-note-date">{note.date}</div>
                    <button
                      className={`ek-note-heart-btn${note.hearted ? " hearted" : ""}`}
                      onClick={(e) => {
                        triggerHearts(e.clientX, e.clientY);
                        setNotes(prev => prev.map((n, j) => j === i ? { ...n, hearted: true } : n));
                      }}>
                      {note.hearted ? "💖 Loved!" : "❤️ Love it!"}
                    </button>
                  </div>
                );
              })
            )}

            {/* Parent mode: add note */}
            {parentMode && (
              <div className="ek-card" style={{ marginTop: 20 }}>
                <div className="ek-card-title" style={{ color: "#18ff6d" }}>Write a Note</div>
                <textarea className="ek-parent-input"
                  style={{ minHeight: 80, resize: "vertical" }}
                  placeholder="Write a note to Elizabeth..."
                  value={parentNewNote}
                  onChange={e => setParentNewNote(e.target.value)} />
                <button className="ek-parent-btn" onClick={parentAddNote}>SEND NOTE 💌</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ REWARDS TAB ═══ */}
        {activeTab === "rewards" && (
          <div>
            <div className="ek-star-counter">
              <div className="ek-star-number">⭐ {stars}</div>
              <div className="ek-star-label">Stars Earned!</div>
            </div>

            {/* Badges */}
            {BADGES.map((badge, i) => {
              const earned = stars >= badge.stars;
              return (
                <div key={i} className={`ek-badge ${earned ? "earned" : "locked"}`}>
                  <div className="ek-badge-icon">{badge.icon}</div>
                  <div className="ek-badge-info">
                    <div className="ek-badge-name">{badge.name}</div>
                    <div className="ek-badge-req">
                      {earned ? "Earned! 🎉" : `${badge.stars - stars} more stars to go!`}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Encouragement */}
            <div className="ek-encourage">
              {ENCOURAGEMENTS[Math.floor(Date.now() / 60000) % ENCOURAGEMENTS.length]}
            </div>

            {/* Parent mode: adjust stars */}
            {parentMode && (
              <div className="ek-card" style={{ marginTop: 20 }}>
                <div className="ek-card-title" style={{ color: "#18ff6d", textAlign: "center" }}>Adjust Stars</div>
                <div className="ek-star-adjust">
                  <button onClick={() => setStars(s => Math.max(0, s - 1))}>−</button>
                  <span>{stars}</span>
                  <button onClick={() => setStars(s => s + 1)}>+</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Animated cat */}
      {!parentMode && <div className="ek-cat">🐱</div>}

      {/* Back to Command Center link */}
      <a href="/" className="ek-back-link">
        {parentMode ? "← BACK TO COMMAND CENTER" : "← Back to Dad's app"}
      </a>

      {/* PIN entry overlay */}
      {showPinEntry && (
        <div className="ek-pin-overlay" onClick={() => setShowPinEntry(false)}>
          <div className="ek-pin-box" onClick={e => e.stopPropagation()}>
            <h3>🔒 Parent Access</h3>
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={e => { setPinInput(e.target.value); setPinError(false); }}
              onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
              autoFocus
              placeholder="····"
            />
            {pinError && <div className="ek-pin-error">Wrong PIN</div>}
            <button onClick={handlePinSubmit}>ENTER</button>
          </div>
        </div>
      )}
    </div>
  );
}
