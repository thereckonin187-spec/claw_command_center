import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─── DATA LAYER ───────────────────────────────────────────────
const USER = { name: "Courier 6", role: "Hospital Construction" };

const FAMILY = {
  partner: { name: "Autumn", birthday: "01-10" },
  daughter: { name: "Elizabeth", birthday: "01-27" },
};

const TRAINING_DAYS = ["Monday", "Tuesday", "Thursday", "Friday"];
const DAILY_HEALTH = ["100 Push-ups", "Take Vitamins"];
const WEEKLY_TASKS = [
  "Shop light",
  "Pick up Medication",
  "Brake job",
  "Covered area built for tractor",
  "Build Elizabeth Tablet App",
];

const NEWS_SCOPE = ["US Politics", "Major World Events", "Economic Events", "Breaking News"];

const EXPENSE_CATEGORIES = ["Housing", "Food", "Transport", "Health", "Entertainment", "Bills", "Other"];
const EVENT_CATEGORIES = ["work", "personal", "health", "family"];
const EVENT_COLORS = { work: "#18ff6d", personal: "#ffb631", health: "#18d6ff", family: "#ff69b4" };
const PRIORITY_COLORS = { high: "#ff4444", med: "#ffb631", low: "#18ff6d" };
const TASK_CATEGORIES = ["daily", "weekly", "monthly", "annual", "project"];
const MED_CATEGORIES = ["vitamin", "supplement", "prescription", "pre-workout"];
const MED_FREQUENCIES = ["daily", "2x daily", "weekly", "training days"];
const MED_TIMES = ["morning", "evening", "both", "pre-workout"];
const WATER_TARGET = 128; // oz per day
const MED_TYPE_COLORS = { vitamin: "#18ff6d", supplement: "#18d6ff", prescription: "#ffb631", "pre-workout": "#ff69b4" };

const DEFAULT_MEDS = [
  { id: 1, name: "One A Day Men's Multivitamin", category: "vitamin", dosage: "1 tablet", frequency: "daily", timeOfDay: "morning", notes: "Take with food for better absorption" },
  { id: 2, name: "Vitamin D3 5,000 IU", category: "vitamin", dosage: "1 softgel", frequency: "daily", timeOfDay: "morning", notes: "Fat-soluble. Take with a meal containing fat." },
  { id: 3, name: "Sports Research D3 + K2", category: "vitamin", dosage: "1 softgel", frequency: "daily", timeOfDay: "morning", notes: "Plant-based. K2 helps direct calcium to bones. Don't double up with standalone D3 — alternate or pick one." },
  { id: 4, name: "NAC 600mg", category: "supplement", dosage: "1 capsule", frequency: "daily", timeOfDay: "morning", notes: "N-Acetyl Cysteine. Supports liver, antioxidant. Take on empty stomach for best absorption." },
  { id: 5, name: "Turkesterone 1000mg", category: "supplement", dosage: "1 capsule", frequency: "daily", timeOfDay: "morning", notes: "Ecdysteroid for muscle protein synthesis. Take with food." },
  { id: 6, name: "B-12 500mcg", category: "vitamin", dosage: "1 tablet", frequency: "daily", timeOfDay: "morning", notes: "Energy and nerve function. Safe to take anytime." },
  { id: 7, name: "Iron 65mg (Ferrous Sulfate)", category: "supplement", dosage: "1 tablet", frequency: "daily", timeOfDay: "morning", notes: "Take on empty stomach. Vitamin C boosts absorption. AVOID taking with calcium, dairy, coffee, or tea. Space 2 hours from multivitamin." },
  { id: 8, name: "Jacked Factory N.O. XT", category: "pre-workout", dosage: "3 capsules", frequency: "training days only", timeOfDay: "pre-workout", notes: "Nitric oxide booster. Take 30 min before training. Contains L-Arginine Silicate and Pycnogenol." },
  { id: 9, name: "Sertraline (Zoloft)", category: "prescription", dosage: "as prescribed", frequency: "daily", timeOfDay: "morning", notes: "SSRI antidepressant. Take at same time every day. Do not skip. Do not stop abruptly without doctor guidance." },
  { id: 10, name: "TRT Injection (Testosterone)", category: "prescription", dosage: "as prescribed", frequency: "every 6 days", timeOfDay: "any", notes: "Injection cycle." },
];

const API_KEYS = {
  NEWS: "82cdb4be7cf54aeba162d89f541ab96b",
  OURA: "4O6YTLVG2ATT6EN72QHRQM6P7SFD5VTI",
  GOOGLE: "1379c67aa70bee92d7cfa5bb5c26e3c7324e13ef5d6cd821077aa7fd236539ed",
  ANTHROPIC: "sk-ant-api03-UXNfSHnAU_LbtJyz7FsEmcX4suPakQ712P-czJWS5Z0XiVB53MjZQlc0W7xKE8DlcuHWZHOoR_SA4viTVd6j6Q-EP7LWwA",
};

const AI_SYSTEM_PROMPT = "You are the Command Center AI assistant. You speak with military-grade clarity like a Fallout Mr. Handy robot butler. You help Courier 6 manage tasks, schedule, health, and daily operations. Keep responses concise and actionable. Address the user as Courier 6.";
const PROXY_URL = "http://localhost:5111";
const PROXY_FALLBACK = "http://localhost:5112";
const IS_LOCAL = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

// ─── HELPERS ──────────────────────────────────────────────────
const today = new Date();
const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
const dateStr = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const hour = today.getHours();
const isTrainingDay = TRAINING_DAYS.includes(dayName);
const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

function detectElizabethWeek() {
  // Anchor: Sunday March 1, 2026 6PM — known start of Elizabeth Week
  // Cycle: 14 days (7 days on, 7 days off)
  const anchor = new Date(2026, 2, 1, 18, 0);
  const diffDays = (today - anchor) / (1000 * 60 * 60 * 24);
  const cycleDay = ((diffDays % 14) + 14) % 14;
  const active = cycleDay < 7;
  const daysUntilNext = active ? null : Math.ceil(14 - cycleDay);
  return { active, daysUntilNext };
}

function checkBirthdays() {
  const alerts = [];
  Object.entries(FAMILY).forEach(([, info]) => {
    const [m, d] = info.birthday.split("-").map(Number);
    const bday = new Date(today.getFullYear(), m - 1, d);
    const diff = Math.round((bday - today) / (1000 * 60 * 60 * 24));
    if (Math.abs(diff) <= 7) {
      if (diff === 0) alerts.push(`TODAY is ${info.name}'s birthday!`);
      else if (diff > 0) alerts.push(`${info.name}'s birthday in ${diff} day(s)`);
      else alerts.push(`${info.name}'s birthday was ${Math.abs(diff)} day(s) ago`);
    }
  });
  return alerts;
}

function loadStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) return JSON.parse(stored);
  } catch { /* ignore */ }
  return fallback;
}

// Migrate localStorage keys from ccc_ to cc_ (one-time, preserves all data)
(function migrateStorageKeys() {
  const suffixes = ["last_reset","tasks","weights","strength","macros","news",
    "trt_last","oura","calendar","finances","chat","daily_reports",
    "daily_activity","meds","meds_taken","med_analysis","wellness_log","water","wellness_last"];
  suffixes.forEach((s) => {
    const old = localStorage.getItem(`ccc_${s}`);
    if (old !== null && localStorage.getItem(`cc_${s}`) === null) {
      localStorage.setItem(`cc_${s}`, old);
      localStorage.removeItem(`ccc_${s}`);
    }
  });
})();

function timeAgo(dateString) {
  const now = new Date();
  const then = new Date(dateString);
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDuration(seconds) {
  if (!seconds) return "N/A";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const ws = new Date(d);
  ws.setDate(diff);
  return `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
}

function migrateTasks(tasks) {
  return tasks.map((t) => ({
    name: t.name,
    category: (t.category || "project").toLowerCase(),
    done: t.done || false,
    dueDate: t.dueDate || null,
    priority: t.priority || "med",
    completedAt: t.completedAt || null,
  }));
}

// ─── WORKOUT ANIMATION DATA ─────────────────────────────────
const EXERCISE_ANIM_MAP = {
  "barbell bench press": "bench", "bench press": "bench", "dumbbell bench": "bench", "incline dumbbell press": "bench",
  "barbell squat": "squat", "goblet squat": "squat",
  "front squat": "frontsquat",
  "deadlift": "deadlift", "conventional deadlift": "deadlift",
  "overhead press": "ohp", "ohp": "ohp", "military press": "ohp",
  "barbell row": "row", "seated cable row": "row", "dumbbell row": "row",
  "pull-ups": "pullup", "pullups": "pullup", "chin-ups": "pullup", "lat pulldown": "pullup",
  "leg press": "legpress",
  "walking lunges": "lunge", "lunges": "lunge",
  "barbell curl": "curl", "dumbbell curl": "curl", "hammer curl": "curl",
  "lateral raises": "lateral", "lateral raise": "lateral",
  "cable flyes": "flyes", "dumbbell flyes": "flyes", "chest flyes": "flyes",
  "romanian deadlift": "rdl", "rdl": "rdl",
  "leg curl": "legcurl", "hamstring curl": "legcurl",
  "calf raises": "calves", "calf raise": "calves",
  "face pulls": "facepull", "face pull": "facepull",
  "dips": "dip", "tricep dips": "dip",
  "hip thrust": "hipthrust", "barbell hip thrust": "hipthrust",
  "ab wheel": "abwheel", "hanging leg raise": "abwheel",
  "farmer's walk": "farmerwalk", "farmer walk": "farmerwalk",
  "bulgarian split squat": "bulgariansplitsquat",
};

const FORM_CUES = {
  bench: { cues: ["Retract scapula, arch upper back", "Bar path: slight diagonal to chest", "Drive feet into floor"], muscles: { primary: ["Chest", "Triceps"], secondary: ["Front Delts"] }, mistakes: ["Flared elbows past 75\u00B0", "Bouncing bar off chest"] },
  squat: { cues: ["Brace core, chest up", "Knees track over toes", "Break at hips and knees together"], muscles: { primary: ["Quads", "Glutes"], secondary: ["Hamstrings", "Core"] }, mistakes: ["Heels rising off floor", "Knees caving inward"] },
  deadlift: { cues: ["Neutral spine, engage lats", "Push floor away with legs", "Lock hips at top"], muscles: { primary: ["Posterior Chain", "Back"], secondary: ["Grip", "Core"] }, mistakes: ["Rounding lower back", "Jerking off the floor"] },
  ohp: { cues: ["Squeeze glutes, brace core", "Press bar in straight line", "Full lockout overhead"], muscles: { primary: ["Shoulders", "Triceps"], secondary: ["Upper Chest", "Core"] }, mistakes: ["Excessive back lean", "Not locking out"] },
  row: { cues: ["Squeeze shoulder blades together", "Pull to lower chest", "Control the negative"], muscles: { primary: ["Lats", "Rhomboids"], secondary: ["Biceps", "Rear Delts"] }, mistakes: ["Using momentum", "Pulling too high"] },
  pullup: { cues: ["Dead hang start, full ROM", "Drive elbows down and back", "Chin over bar at top"], muscles: { primary: ["Lats", "Biceps"], secondary: ["Rear Delts", "Core"] }, mistakes: ["Kipping/swinging", "Half reps"] },
  legpress: { cues: ["Full range of motion", "Don't lock knees at top", "Controlled descent"], muscles: { primary: ["Quads", "Glutes"], secondary: ["Hamstrings"] }, mistakes: ["Locking knees at top", "Lifting butt off pad"] },
  lunge: { cues: ["Keep torso upright", "Front knee tracks over ankle", "Step far enough for 90\u00B0"], muscles: { primary: ["Quads", "Glutes"], secondary: ["Hamstrings", "Core"] }, mistakes: ["Knee past toes", "Leaning forward"] },
  curl: { cues: ["Keep elbows pinned at sides", "Full extension at bottom", "Squeeze at peak"], muscles: { primary: ["Biceps"], secondary: ["Brachialis", "Forearms"] }, mistakes: ["Swinging body", "Moving elbows forward"] },
  lateral: { cues: ["Slight bend in elbows", "Lead with elbows, not hands", "Control the descent"], muscles: { primary: ["Lateral Delts"], secondary: ["Traps"] }, mistakes: ["Shrugging traps", "Using momentum"] },
  flyes: { cues: ["Slight elbow bend throughout", "Squeeze chest at top", "Feel stretch at bottom"], muscles: { primary: ["Chest"], secondary: ["Front Delts"] }, mistakes: ["Straightening arms", "Going too deep"] },
  rdl: { cues: ["Hinge at hips, soft knees", "Bar stays close to legs", "Stretch hamstrings, squeeze glutes"], muscles: { primary: ["Hamstrings", "Glutes"], secondary: ["Erectors", "Grip"] }, mistakes: ["Rounding lower back", "Bar drifting away"] },
  legcurl: { cues: ["Full range of motion", "Squeeze hamstrings at peak", "Slow negative"], muscles: { primary: ["Hamstrings"], secondary: ["Calves"] }, mistakes: ["Lifting hips off pad", "Partial ROM"] },
  calves: { cues: ["Full stretch at bottom", "Pause at top contraction", "Controlled tempo"], muscles: { primary: ["Gastrocnemius", "Soleus"], secondary: [] }, mistakes: ["Bouncing at bottom", "Partial range"] },
  facepull: { cues: ["Pull to face level", "Externally rotate at end", "Squeeze rear delts"], muscles: { primary: ["Rear Delts", "Rotator Cuff"], secondary: ["Traps", "Rhomboids"] }, mistakes: ["Pulling too low", "No external rotation"] },
  dip: { cues: ["Lean slightly forward for chest", "Elbows to 90\u00B0", "Full lockout at top"], muscles: { primary: ["Chest", "Triceps"], secondary: ["Front Delts"] }, mistakes: ["Going too deep", "Not full lockout"] },
  hipthrust: { cues: ["Drive through heels", "Squeeze glutes at top", "Chin tucked, don't hyperextend"], muscles: { primary: ["Glutes"], secondary: ["Hamstrings", "Core"] }, mistakes: ["Hyperextending lower back", "Not pausing at top"] },
  abwheel: { cues: ["Brace core tight", "Control the rollout", "Don't let hips sag"], muscles: { primary: ["Core", "Abs"], secondary: ["Lats", "Shoulders"] }, mistakes: ["Hips sagging", "Going too far out"] },
  frontsquat: { cues: ["Elbows high, upper back tight", "Sit straight down", "Drive knees out"], muscles: { primary: ["Quads", "Core"], secondary: ["Glutes", "Upper Back"] }, mistakes: ["Elbows dropping", "Rounding upper back"] },
  bulgariansplitsquat: { cues: ["Rear foot elevated, laces down", "Front shin vertical", "Control the descent"], muscles: { primary: ["Quads", "Glutes"], secondary: ["Hamstrings", "Core"] }, mistakes: ["Rear foot too close", "Leaning forward"] },
  farmerwalk: { cues: ["Shoulders back and down", "Tight core, tall posture", "Short quick steps"], muscles: { primary: ["Grip", "Traps", "Core"], secondary: ["Shoulders", "Legs"] }, mistakes: ["Slouching forward", "Steps too long"] },
  generic: { cues: ["Focus on form over weight", "Control the movement", "Full range of motion"], muscles: { primary: ["Full Body"], secondary: [] }, mistakes: ["Ego lifting", "Partial reps"] },
};

function getAnimationKey(name) {
  const lower = name.toLowerCase().trim();
  if (EXERCISE_ANIM_MAP[lower]) return EXERCISE_ANIM_MAP[lower];
  for (const [pattern, key] of Object.entries(EXERCISE_ANIM_MAP)) {
    if (lower.includes(pattern) || pattern.includes(lower)) return key;
  }
  return "generic";
}

function parseSets(setsStr) {
  if (!setsStr) return { numSets: 3, reps: "8", isVariable: false };
  const match = setsStr.match(/^(\d+)x(.+)$/i);
  if (!match) return { numSets: 3, reps: setsStr, isVariable: true };
  return { numSets: parseInt(match[1]), reps: match[2], isVariable: /amrap|\/leg|m$/i.test(match[2]) };
}

const _G = "#18ff6d", _D = "#0a9e3a", _B = "#063d18";
const _muscDef = `<defs><radialGradient id="mg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${_G}" stop-opacity=".25"/><stop offset="100%" stop-color="${_G}" stop-opacity="0"/></radialGradient></defs>`;
const EXERCISE_SVGS = {
  bench: `<svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">${_muscDef}<rect x="35" y="135" width="130" height="8" rx="3" fill="${_D}"/><rect x="60" y="143" width="8" height="40" fill="${_D}"/><rect x="132" y="143" width="8" height="40" fill="${_D}"/><!-- body on bench --><ellipse cx="100" cy="120" rx="12" ry="10" fill="none" stroke="${_G}" stroke-width="2"/><path d="M82,125 Q80,135 82,155 L100,160 L118,155 Q120,135 118,125 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M92,132 Q100,138 108,132" fill="none" stroke="${_G}" stroke-width=".8" opacity=".5"/><path d="M100,160 L88,200 L85,230" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M100,160 L112,200 L115,230" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><g class="anim-bench-arms"><path d="M84,128 Q70,115 60,95 L55,80" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M116,128 Q130,115 140,95 L145,80" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><rect x="35" y="76" width="130" height="6" rx="2" fill="${_G}"/><rect x="25" y="73" width="16" height="12" rx="3" fill="${_D}"/><rect x="159" y="73" width="16" height="12" rx="3" fill="${_D}"/><line x1="55" y1="72" x2="50" y2="68" stroke="${_G}" stroke-width="1" opacity=".4"/><line x1="145" y1="72" x2="150" y2="68" stroke="${_G}" stroke-width="1" opacity=".4"/></g></svg>`,
  squat: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<g class="anim-squat"><ellipse cx="100" cy="28" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="100" y1="42" x2="100" y2="52" stroke="${_G}" stroke-width="2.5"/><path d="M82,52 Q78,72 80,100 L85,130 L100,135 L115,130 L120,100 Q122,72 118,52 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M90,65 Q100,72 110,65" fill="none" stroke="${_G}" stroke-width=".8" opacity=".5"/><path d="M92,85 L92,110" fill="none" stroke="${_G}" stroke-width=".6" opacity=".4"/><path d="M108,85 L108,110" fill="none" stroke="${_G}" stroke-width=".6" opacity=".4"/><path d="M82,55 Q70,60 65,75 L68,90" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M118,55 Q130,60 135,75 L132,90" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M90,132 Q80,160 76,190" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M76,190 Q74,215 72,245" fill="none" stroke="${_G}" stroke-width="2.4" stroke-linecap="round"/><path d="M72,245 L65,260 L80,260" fill="none" stroke="${_G}" stroke-width="1.8"/><path d="M110,132 Q120,160 124,190" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M124,190 Q126,215 128,245" fill="none" stroke="${_G}" stroke-width="2.4" stroke-linecap="round"/><path d="M128,245 L135,260 L120,260" fill="none" stroke="${_G}" stroke-width="1.8"/></g><line x1="48" y1="48" x2="152" y2="48" stroke="${_G}" stroke-width="3.5" stroke-linecap="round"/><rect x="35" y="42" width="18" height="12" rx="3" fill="${_D}"/><rect x="147" y="42" width="18" height="12" rx="3" fill="${_D}"/></svg>`,
  deadlift: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<g class="anim-deadlift"><ellipse cx="100" cy="30" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="100" y1="44" x2="100" y2="54" stroke="${_G}" stroke-width="2.5"/><path d="M82,54 Q78,74 80,100 L85,130 L100,135 L115,130 L120,100 Q122,74 118,54 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M82,56 Q72,65 65,85 L62,110" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M62,110 L65,135 L70,140" fill="none" stroke="${_G}" stroke-width="2" stroke-linecap="round"/><path d="M118,56 Q128,65 135,85 L138,110" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M138,110 L135,135 L130,140" fill="none" stroke="${_G}" stroke-width="2" stroke-linecap="round"/><path d="M90,132 Q82,158 78,190" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M78,190 L75,220 L73,248" fill="none" stroke="${_G}" stroke-width="2.4" stroke-linecap="round"/><path d="M73,248 L66,262 L80,262" fill="none" stroke="${_G}" stroke-width="1.8"/><path d="M110,132 Q118,158 122,190" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M122,190 L125,220 L127,248" fill="none" stroke="${_G}" stroke-width="2.4" stroke-linecap="round"/><path d="M127,248 L134,262 L120,262" fill="none" stroke="${_G}" stroke-width="1.8"/></g><line x1="42" y1="140" x2="158" y2="140" stroke="${_G}" stroke-width="3.5" stroke-linecap="round"/><rect x="28" y="134" width="20" height="12" rx="3" fill="${_D}"/><rect x="152" y="134" width="20" height="12" rx="3" fill="${_D}"/></svg>`,
  ohp: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<ellipse cx="100" cy="50" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="100" y1="64" x2="100" y2="74" stroke="${_G}" stroke-width="2.5"/><path d="M82,74 Q78,94 80,120 L85,150 L100,155 L115,150 L120,120 Q122,94 118,74 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M100,155 L88,200 L85,245 L78,262 L92,262" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M100,155 L112,200 L115,245 L122,262 L108,262" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><g class="anim-ohp"><path d="M82,76 Q68,72 60,55 L58,35" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M58,35 L55,18" fill="none" stroke="${_G}" stroke-width="2" stroke-linecap="round"/><path d="M118,76 Q132,72 140,55 L142,35" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M142,35 L145,18" fill="none" stroke="${_G}" stroke-width="2" stroke-linecap="round"/><line x1="38" y1="16" x2="162" y2="16" stroke="${_G}" stroke-width="3.5" stroke-linecap="round"/><rect x="25" y="10" width="18" height="12" rx="3" fill="${_D}"/><rect x="157" y="10" width="18" height="12" rx="3" fill="${_D}"/></g></svg>`,
  row: `<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">${_muscDef}<ellipse cx="80" cy="40" rx="11" ry="13" fill="none" stroke="${_G}" stroke-width="2"/><path d="M80,53 L100,110" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M68,60 Q62,80 64,110 L68,130 L80,135 L92,130 L96,110 Q98,80 92,60 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.5" transform="rotate(25,80,95)"/><path d="M100,110 L88,160 L82,210 L78,240" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M100,110 L108,160 L112,210 L115,240" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><g class="anim-row"><path d="M85,75 Q70,85 55,105 L50,120" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M92,75 Q110,80 125,90 L130,105" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/></g><line x1="35" y1="155" x2="155" y2="155" stroke="${_G}" stroke-width="3" stroke-linecap="round"/><rect x="22" y="149" width="18" height="12" rx="3" fill="${_D}"/><rect x="150" y="149" width="18" height="12" rx="3" fill="${_D}"/></svg>`,
  pullup: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<line x1="30" y1="18" x2="170" y2="18" stroke="${_D}" stroke-width="5" stroke-linecap="round"/><rect x="26" y="12" width="6" height="268" fill="${_B}"/><rect x="168" y="12" width="6" height="268" fill="${_B}"/><g class="anim-pullup"><ellipse cx="100" cy="55" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="100" y1="69" x2="100" y2="79" stroke="${_G}" stroke-width="2.5"/><path d="M82,79 Q78,99 80,125 L85,155 L100,160 L115,155 L120,125 Q122,99 118,79 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M82,82 Q65,65 55,30 L54,22" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M118,82 Q135,65 145,30 L146,22" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M100,160 L90,205 L85,250" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M100,160 L110,205 L115,250" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/></g></svg>`,
  legpress: `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">${_muscDef}<rect x="120" y="20" width="60" height="180" rx="4" fill="none" stroke="${_D}" stroke-width="2.5"/><line x1="150" y1="20" x2="150" y2="200" stroke="${_D}" stroke-width="1" opacity=".3"/><ellipse cx="65" cy="80" rx="11" ry="13" fill="none" stroke="${_G}" stroke-width="2"/><path d="M55,93 L55,140" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M48,95 Q44,110 46,130 L50,150 L65,155 L80,150 L84,130 Q86,110 82,95 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.5"/><g class="anim-legpress"><path d="M65,150 Q80,130 95,115 L120,105" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M65,155 Q82,148 98,135 L120,130" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/></g></svg>`,
  lunge: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<ellipse cx="100" cy="28" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="100" y1="42" x2="100" y2="52" stroke="${_G}" stroke-width="2.5"/><path d="M84,52 Q80,72 82,100 L86,128 L100,133 L114,128 L118,100 Q120,72 116,52 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M84,55 L68,72 L60,82" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M116,55 L132,72 L140,82" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><g class="anim-lunge"><path d="M92,130 Q75,158 62,190 L55,220 L50,255" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M50,255 L42,268 L58,268" fill="none" stroke="${_G}" stroke-width="1.8"/><path d="M108,130 Q125,158 135,190 L138,220 L140,255" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M140,255 L148,268 L132,268" fill="none" stroke="${_G}" stroke-width="1.8"/></g></svg>`,
  curl: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<ellipse cx="100" cy="28" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="100" y1="42" x2="100" y2="52" stroke="${_G}" stroke-width="2.5"/><path d="M84,52 Q80,72 82,100 L86,128 L100,133 L114,128 L118,100 Q120,72 116,52 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M100,133 L90,180 L86,230 L80,258 L92,258" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M100,133 L110,180 L114,230 L120,258 L108,258" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M116,55 L132,70 L138,95 L135,115" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><rect x="130" y="112" width="12" height="8" rx="3" fill="${_D}"/><g class="anim-curl"><path d="M84,55 L68,65 L62,80 L60,95" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M60,95 L62,75 L68,60" fill="none" stroke="${_G}" stroke-width="2" stroke-linecap="round"/><rect x="58" y="55" width="14" height="8" rx="3" fill="${_D}"/></g></svg>`,
  lateral: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<ellipse cx="100" cy="28" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="100" y1="42" x2="100" y2="52" stroke="${_G}" stroke-width="2.5"/><path d="M84,52 Q80,72 82,100 L86,128 L100,133 L114,128 L118,100 Q120,72 116,52 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M100,133 L90,180 L86,230 L80,258 L92,258" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M100,133 L110,180 L114,230 L120,258 L108,258" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><g class="anim-lateral"><path d="M84,56 L55,52 L35,55" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M116,56 L145,52 L165,55" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><rect x="25" y="50" width="12" height="8" rx="3" fill="${_D}"/><rect x="163" y="50" width="12" height="8" rx="3" fill="${_D}"/></g></svg>`,
  flyes: `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">${_muscDef}<rect x="35" y="120" width="130" height="8" rx="3" fill="${_D}"/><ellipse cx="100" cy="108" rx="12" ry="10" fill="none" stroke="${_G}" stroke-width="2"/><path d="M82,112 Q80,122 82,140 L100,148 L118,140 Q120,122 118,112 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.5"/><path d="M100,148 L88,180 L85,210" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M100,148 L112,180 L115,210" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><g class="anim-flyes"><path d="M84,114 Q65,100 45,80 L35,68" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M116,114 Q135,100 155,80 L165,68" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><rect x="28" y="63" width="12" height="8" rx="3" fill="${_D}"/><rect x="160" y="63" width="12" height="8" rx="3" fill="${_D}"/></g></svg>`,
  rdl: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<g class="anim-rdl"><ellipse cx="85" cy="35" rx="11" ry="13" fill="none" stroke="${_G}" stroke-width="2"/><path d="M85,48 L105,105" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M75,55 Q70,75 72,100 L76,125 L88,130 L100,125 L104,100 Q106,75 101,55 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.5" transform="rotate(20,88,90)"/><path d="M90,70 Q75,80 62,100 L55,120" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M98,70 Q115,75 130,85 L135,100" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/></g><path d="M105,105 L95,160 L90,210 L86,250" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M105,105 L115,160 L118,210 L120,250" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><line x1="35" y1="120" x2="165" y2="120" stroke="${_G}" stroke-width="3" stroke-linecap="round"/><rect x="22" y="114" width="18" height="12" rx="3" fill="${_D}"/><rect x="160" y="114" width="18" height="12" rx="3" fill="${_D}"/></svg>`,
  legcurl: `<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">${_muscDef}<rect x="20" y="60" width="160" height="10" rx="4" fill="${_D}"/><ellipse cx="55" cy="48" rx="10" ry="12" fill="none" stroke="${_G}" stroke-width="2"/><path d="M65,52 Q70,58 70,70 L115,70 L115,55 Q115,52 112,50 L68,50 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.5"/><g class="anim-legcurl"><path d="M115,58 Q135,60 148,72 L155,90" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M155,90 L145,115 L130,130" fill="none" stroke="${_G}" stroke-width="2.4" stroke-linecap="round"/></g></svg>`,
  calves: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<ellipse cx="100" cy="28" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="100" y1="42" x2="100" y2="52" stroke="${_G}" stroke-width="2.5"/><path d="M84,52 Q80,72 82,100 L86,128 L100,133 L114,128 L118,100 Q120,72 116,52 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M84,55 L68,70 L60,80" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M116,55 L132,70 L140,80" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M92,130 L86,170 L82,200" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M108,130 L114,170 L118,200" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><g class="anim-calves"><path d="M82,200 Q80,220 78,242" fill="none" stroke="${_G}" stroke-width="2.4" stroke-linecap="round"/><path d="M118,200 Q120,220 122,242" fill="none" stroke="${_G}" stroke-width="2.4" stroke-linecap="round"/><path d="M78,242 L72,258 L88,258" fill="none" stroke="${_G}" stroke-width="1.8"/><path d="M122,242 L128,258 L112,258" fill="none" stroke="${_G}" stroke-width="1.8"/></g><rect x="60" y="256" width="80" height="6" rx="2" fill="${_D}"/></svg>`,
  facepull: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<rect x="168" y="10" width="10" height="260" rx="3" fill="${_B}"/><line x1="173" y1="80" x2="150" y2="80" stroke="${_D}" stroke-width="2.5"/><ellipse cx="80" cy="40" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="80" y1="54" x2="80" y2="64" stroke="${_G}" stroke-width="2.5"/><path d="M64,64 Q60,84 62,110 L66,138 L80,143 L94,138 L98,110 Q100,84 96,64 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M80,143 L70,190 L66,240 L60,262 L76,262" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M80,143 L90,190 L94,240 L100,262 L84,262" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><g class="anim-facepull"><path d="M96,68 L115,55 L135,48 L148,50" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M96,74 L115,65 L135,60 L148,62" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/></g></svg>`,
  dip: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<line x1="20" y1="85" x2="75" y2="85" stroke="${_D}" stroke-width="5" stroke-linecap="round"/><line x1="125" y1="85" x2="180" y2="85" stroke="${_D}" stroke-width="5" stroke-linecap="round"/><g class="anim-dip"><ellipse cx="100" cy="55" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="100" y1="69" x2="100" y2="79" stroke="${_G}" stroke-width="2.5"/><path d="M84,79 Q80,99 82,125 L86,153 L100,158 L114,153 L118,125 Q120,99 116,79 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M84,82 Q70,82 62,85 L58,85" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M116,82 Q130,82 138,85 L142,85" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M100,158 L90,205 L85,250" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M100,158 L110,205 L115,250" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/></g></svg>`,
  hipthrust: `<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">${_muscDef}<rect x="10" y="80" width="50" height="40" rx="4" fill="${_D}"/><ellipse cx="52" cy="65" rx="10" ry="12" fill="none" stroke="${_G}" stroke-width="2"/><g class="anim-hipthrust"><path d="M55,77 Q70,72 90,65 L110,60" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M50,80 Q60,82 75,80 L110,65" fill="url(#mg)" stroke="${_G}" stroke-width="1.5"/><path d="M110,60 Q125,70 135,88 L138,110 L132,140" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M110,65 Q130,78 142,95 L148,118 L145,148" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/></g></svg>`,
  abwheel: `<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">${_muscDef}<circle cx="130" cy="135" r="18" fill="none" stroke="${_D}" stroke-width="4"/><line x1="118" y1="135" x2="142" y2="135" stroke="${_G}" stroke-width="2.5"/><g class="anim-abwheel"><ellipse cx="60" cy="60" rx="11" ry="13" fill="none" stroke="${_G}" stroke-width="2"/><path d="M60,73 L80,110 L110,130" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M52,70 Q46,85 48,105 L52,125 L65,130 L78,125 L82,105 Q84,85 78,70 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.3" transform="rotate(30,65,100)"/><path d="M60,73 L78,90 L112,128" fill="none" stroke="${_G}" stroke-width="2" stroke-linecap="round"/><path d="M80,110 L65,145 L58,160" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M80,110 L85,145 L88,160" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/></g></svg>`,
  frontsquat: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<g class="anim-frontsquat"><ellipse cx="100" cy="28" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="100" y1="42" x2="100" y2="52" stroke="${_G}" stroke-width="2.5"/><path d="M82,52 Q78,72 80,100 L85,130 L100,135 L115,130 L120,100 Q122,72 118,52 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M82,55 Q68,60 62,72 L60,82" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M118,55 Q132,60 138,72 L140,82" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M90,132 Q80,160 76,190 L74,220 L72,248" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M72,248 L65,262 L80,262" fill="none" stroke="${_G}" stroke-width="1.8"/><path d="M110,132 Q120,160 124,190 L126,220 L128,248" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M128,248 L135,262 L120,262" fill="none" stroke="${_G}" stroke-width="1.8"/></g><line x1="50" y1="68" x2="150" y2="68" stroke="${_G}" stroke-width="3.5" stroke-linecap="round"/><rect x="37" y="62" width="18" height="12" rx="3" fill="${_D}"/><rect x="145" y="62" width="18" height="12" rx="3" fill="${_D}"/></svg>`,
  bulgariansplitsquat: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<rect x="140" y="170" width="45" height="30" rx="4" fill="${_D}"/><ellipse cx="90" cy="28" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="90" y1="42" x2="90" y2="52" stroke="${_G}" stroke-width="2.5"/><path d="M74,52 Q70,72 72,100 L76,128 L90,133 L104,128 L108,100 Q110,72 106,52 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M74,55 L58,70 L52,82" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M106,55 L122,70 L128,82" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><g class="anim-bulgariansplitsquat"><path d="M82,130 Q68,160 58,195 L52,230 L48,258" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M48,258 L40,270 L56,270" fill="none" stroke="${_G}" stroke-width="1.8"/><path d="M98,130 Q115,150 130,168 L142,175" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/></g></svg>`,
  farmerwalk: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<g class="anim-farmerwalk"><ellipse cx="100" cy="28" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="100" y1="42" x2="100" y2="52" stroke="${_G}" stroke-width="2.5"/><path d="M84,52 Q80,72 82,100 L86,128 L100,133 L114,128 L118,100 Q120,72 116,52 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M84,55 L68,70 L58,95 L55,120 L55,145" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M116,55 L132,70 L142,95 L145,120 L145,145" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><rect x="48" y="142" width="16" height="10" rx="3" fill="${_D}"/><rect x="138" y="142" width="16" height="10" rx="3" fill="${_D}"/><path d="M92,130 Q82,160 78,195 L75,230 L72,255" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M72,255 L65,268 L80,268" fill="none" stroke="${_G}" stroke-width="1.8"/><path d="M108,130 Q118,160 122,195 L125,230 L128,255" fill="none" stroke="${_G}" stroke-width="2.8" stroke-linecap="round"/><path d="M128,255 L135,268 L120,268" fill="none" stroke="${_G}" stroke-width="1.8"/></g></svg>`,
  generic: `<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">${_muscDef}<ellipse cx="100" cy="28" rx="12" ry="14" fill="none" stroke="${_G}" stroke-width="2"/><line x1="100" y1="42" x2="100" y2="52" stroke="${_G}" stroke-width="2.5"/><g class="anim-generic"><path d="M84,52 Q80,72 82,100 L86,128 L100,133 L114,128 L118,100 Q120,72 116,52 Z" fill="url(#mg)" stroke="${_G}" stroke-width="1.8"/><path d="M84,55 L62,70 L50,85" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M116,55 L138,70 L150,85" fill="none" stroke="${_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M92,130 Q82,160 78,195 L75,230 L72,255" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M72,255 L65,268 L80,268" fill="none" stroke="${_G}" stroke-width="1.8"/><path d="M108,130 Q118,160 122,195 L125,230 L128,255" fill="none" stroke="${_G}" stroke-width="2.5" stroke-linecap="round"/><path d="M128,255 L135,268 L120,268" fill="none" stroke="${_G}" stroke-width="1.8"/></g></svg>`,
};

function autoResetTasks(tasks) {
  const lastReset = loadStorage("cc_last_reset", null);
  const todayStr = localDate;
  const thisWeek = getWeekStart(today);
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  let updated = [...tasks];
  if (lastReset) {
    if (lastReset.day !== todayStr) updated = updated.map((t) => t.category === "daily" ? { ...t, done: false } : t);
    if (lastReset.week !== thisWeek) updated = updated.map((t) => t.category === "weekly" ? { ...t, done: false } : t);
    if (lastReset.month !== thisMonth) updated = updated.map((t) => t.category === "monthly" ? { ...t, done: false } : t);
  }
  localStorage.setItem("cc_last_reset", JSON.stringify({ day: todayStr, week: thisWeek, month: thisMonth }));
  return updated;
}

const { active: elizabethWeek, daysUntilNext: ewDaysUntil } = detectElizabethWeek();
const birthdays = checkBirthdays();

const DEFAULT_TASKS = [
  ...DAILY_HEALTH.map((t) => ({ name: t, category: "daily", done: false, dueDate: null, priority: "med" })),
  ...WEEKLY_TASKS.map((t) => ({ name: t, category: "weekly", done: false, dueDate: null, priority: "med" })),
];

// ─── VAULT BOY SVG (watermark) ──────────────────────────────
const VAULT_BOY_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 240"><circle cx="60" cy="32" r="22" fill="%2318ff6d"/><ellipse cx="60" cy="95" rx="22" ry="38" fill="%2318ff6d"/><line x1="60" y1="133" x2="45" y2="200" stroke="%2318ff6d" stroke-width="11" stroke-linecap="round"/><line x1="60" y1="133" x2="75" y2="200" stroke="%2318ff6d" stroke-width="11" stroke-linecap="round"/><line x1="38" y1="72" x2="12" y2="105" stroke="%2318ff6d" stroke-width="9" stroke-linecap="round"/><line x1="82" y1="68" x2="100" y2="32" stroke="%2318ff6d" stroke-width="9" stroke-linecap="round"/><circle cx="100" cy="24" r="9" fill="%2318ff6d"/></svg>')}`;

// ─── VAULT-TEC LOGO SVG (gear with VT) ─────────────────────
const VAULT_TEC_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><style>.gear{fill:none;stroke:%2318ff6d;stroke-width:3}</style></defs><circle cx="100" cy="100" r="60" class="gear"/><circle cx="100" cy="100" r="50" class="gear"/><g class="gear"><path d="M100 30 L105 10 L95 10Z"/><path d="M100 170 L105 190 L95 190Z"/><path d="M30 100 L10 105 L10 95Z"/><path d="M170 100 L190 105 L190 95Z"/><path d="M50.5 50.5 L36 36 L43 29Z"/><path d="M149.5 149.5 L164 164 L157 171Z"/><path d="M149.5 50.5 L164 36 L157 29Z"/><path d="M50.5 149.5 L36 164 L43 171Z"/></g><text x="100" y="112" text-anchor="middle" font-family="monospace" font-size="36" font-weight="bold" fill="%2318ff6d">VT</text></svg>')}`;

// ─── RADIATION TREFOIL SVG ──────────────────────────────────
const RADIATION_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="8" fill="%2318ff6d"/><path d="M50 42 C50 42 35 18 22 26 C9 34 20 58 20 58 L38 48 C36 44 38 40 42 38Z" fill="%2318ff6d"/><path d="M56 44 C58 40 62 38 66 38 L78 26 C65 18 50 18 50 42Z" fill="%2318ff6d" transform="rotate(120 50 50)"/><path d="M56 44 C58 40 62 38 66 38 L78 26 C65 18 50 18 50 42Z" fill="%2318ff6d" transform="rotate(240 50 50)"/></svg>')}`;

// ─── CSS ────────────────────────────────────────────────────
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --pip-green: #18ff6d; --pip-green-dim: #0a9e3a; --pip-green-dark: #063d18;
    --pip-amber: #ffb631; --pip-bg: #0a0f0a;
    --pip-panel: rgba(10, 40, 15, 0.6); --pip-border: rgba(24, 255, 109, 0.25);
    --pip-glow: 0 0 10px rgba(24, 255, 109, 0.3), 0 0 40px rgba(24, 255, 109, 0.1);
    --pip-text-glow: 0 0 8px rgba(24, 255, 109, 0.6);
    --frame-color: #2a2e2a; --frame-highlight: #3d423d; --frame-shadow: #1a1d1a;
  }
  body { background: #050805; font-family: 'Share Tech Mono', monospace; color: var(--pip-green); overflow-x: hidden; min-height: 100vh; }

  @keyframes flicker { 0%{opacity:.97}5%{opacity:.95}10%{opacity:.98}15%{opacity:.96}20%{opacity:.99}50%{opacity:.96}80%{opacity:.98}100%{opacity:.97} }
  @keyframes scanline { 0%{transform:translateY(-100%)}100%{transform:translateY(100vh)} }
  @keyframes bootUp { 0%{opacity:0;transform:scale(.95);filter:brightness(3)}30%{opacity:1;filter:brightness(1.5)}100%{opacity:1;transform:scale(1);filter:brightness(1)} }
  @keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
  @keyframes pulseGlow { 0%,100%{text-shadow:0 0 8px rgba(24,255,109,.6)}50%{text-shadow:0 0 20px rgba(24,255,109,.9),0 0 40px rgba(24,255,109,.3)} }
  @keyframes tickerScroll { 0%{transform:translateX(0)}100%{transform:translateX(-50%)} }
  @keyframes buttonFlash { 0%{filter:brightness(1)}15%{filter:brightness(2.5);box-shadow:0 0 20px rgba(24,255,109,.8)}100%{filter:brightness(1)} }
  @keyframes tabGlitch { 0%{opacity:1;transform:translate(0)}20%{opacity:.4;transform:translate(-2px,1px)}40%{opacity:.8;transform:translate(1px,-1px)}60%{opacity:.3;transform:translate(2px,0)}80%{opacity:.9;transform:translate(-1px,1px)}100%{opacity:1;transform:translate(0)} }
  @keyframes taskFlashGreen { 0%{background:rgba(24,255,109,.4);box-shadow:0 0 15px rgba(24,255,109,.5)}100%{background:rgba(10,30,15,.4);box-shadow:none} }
  @keyframes screenFlicker { 0%{opacity:1}50%{opacity:.85}100%{opacity:1} }
  @keyframes buttonGlowPulse { 0%,100%{box-shadow:0 0 6px rgba(24,255,109,.2)}50%{box-shadow:0 0 18px rgba(24,255,109,.5),0 0 30px rgba(24,255,109,.15)} }
  @keyframes alertPulse { 0%,100%{box-shadow:none;opacity:1}50%{box-shadow:0 0 12px rgba(255,182,49,.4);opacity:.85} }
  @keyframes activeTabGlow { 0%,100%{box-shadow:0 2px 4px rgba(24,255,109,.2)}50%{box-shadow:0 2px 12px rgba(24,255,109,.5),0 4px 20px rgba(24,255,109,.15)} }
  @keyframes phosphorFlash { 0%{opacity:0}50%{opacity:.06}100%{opacity:0} }

  /* CRT overlay with chromatic aberration */
  .crt-overlay { position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:9999;
    background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0px,rgba(0,0,0,.22) 1px,transparent 1px,transparent 3px); }
  .crt-overlay::after { content:'';position:fixed;top:0;left:0;right:0;height:6px;background:rgba(24,255,109,.1);animation:scanline 6s linear infinite;z-index:10000; }
  .crt-overlay::before { content:'';position:fixed;top:0;left:0;right:0;bottom:0;
    background:radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,.35) 100%);z-index:10001; }

  /* Chromatic aberration on text — subtle RGB split */
  .pip-container { text-shadow: -0.5px 0 0 rgba(255,0,0,.06), 0.5px 0 0 rgba(0,80,255,.06); }
  .pip-header h1 { text-shadow: -1px 0 0 rgba(255,0,0,.1), 1px 0 0 rgba(0,80,255,.1), var(--pip-text-glow); }

  /* Screen flicker class — applied via JS randomly */
  .screen-flicker { animation: screenFlicker 150ms ease-in-out; }

  /* Watermarks */
  .vault-boy-watermark { position:fixed;bottom:60px;right:20px;width:180px;height:280px;opacity:0.03;pointer-events:none;z-index:1;
    background:url("${VAULT_BOY_SVG}") no-repeat center/contain; }
  .vault-tec-watermark { position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;opacity:0.015;pointer-events:none;z-index:1;
    background:url("${VAULT_TEC_SVG}") no-repeat center/contain; }
  .radiation-decor { position:fixed;top:20px;left:20px;width:50px;height:50px;opacity:0.04;pointer-events:none;z-index:1;
    background:url("${RADIATION_SVG}") no-repeat center/contain; }

  /* ═══ PIP-BOY DEVICE FRAME ═══ */
  .pipboy-device { position:relative;max-width:960px;margin:0 auto;padding:18px;min-height:100vh; }

  .pipboy-frame { position:relative;border-radius:20px;border:3px solid #3a3e3a;
    background:linear-gradient(145deg, #3d423d 0%, #2a2e2a 25%, #1a1d1a 60%, #0f110f 100%);
    box-shadow: 0 0 0 1px rgba(24,255,109,.06), inset 0 0 0 1px rgba(255,255,255,.04), inset 0 2px 0 rgba(255,255,255,.06),
      0 6px 40px rgba(0,0,0,.7), 0 0 80px rgba(24,255,109,.04), 0 20px 60px rgba(0,0,0,.4);
    padding:8px 6px 6px; overflow:hidden; }

  /* RobCo Industries etched label */
  .pipboy-frame-label { text-align:center;font-family:'Share Tech Mono',monospace;font-size:.5rem;letter-spacing:5px;text-transform:uppercase;
    color:rgba(24,255,109,.15);padding:4px 0 6px;pointer-events:none;
    text-shadow:0 1px 0 rgba(0,0,0,.5),0 -1px 0 rgba(255,255,255,.03); }

  /* Corner rivets */
  .pipboy-rivet { position:absolute;width:12px;height:12px;border-radius:50%;z-index:6;
    background:radial-gradient(circle at 30% 30%, #7a7e7a, #4a4e4a 40%, #2a2e2a 70%, #1a1d1a);
    box-shadow:inset 0 1px 2px rgba(255,255,255,.2), inset 0 -1px 1px rgba(0,0,0,.3), 0 1px 3px rgba(0,0,0,.6);
    border:1px solid rgba(255,255,255,.05); }
  .pipboy-rivet.tl { top:8px;left:8px; }
  .pipboy-rivet.tr { top:8px;right:8px; }
  .pipboy-rivet.bl { bottom:8px;left:8px; }
  .pipboy-rivet.br { bottom:8px;right:8px; }

  /* Screen inset / bezel with phosphor edge glow */
  .pipboy-screen { background:var(--pip-bg);border-radius:12px;overflow:hidden;position:relative;
    box-shadow:inset 0 0 40px rgba(0,0,0,.9), inset 0 0 15px rgba(24,255,109,.06),
      inset 0 0 80px rgba(0,0,0,.4), inset 0 2px 4px rgba(0,0,0,.7); }
  .pipboy-screen::after { content:'';position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:3;
    box-shadow:inset 0 0 60px rgba(24,255,109,.04);
    background:radial-gradient(ellipse at center,transparent 55%,rgba(24,255,109,.02) 100%); }

  /* ═══ KNOBS ═══ */
  .pipboy-knobs { display:flex;justify-content:space-around;align-items:flex-start;padding:8px 40px 4px;position:relative;z-index:6; }
  .pipboy-knob-group { display:flex;flex-direction:column;align-items:center;gap:4px; }
  .pipboy-knob { border-radius:50%;
    background:radial-gradient(circle at 35% 30%, #7a7e7a, #4a4e4a 40%, #2a2e2a 70%, #1a1d1a);
    border:2px solid #4a4e4a;
    box-shadow:0 3px 6px rgba(0,0,0,.6), inset 0 1px 2px rgba(255,255,255,.15), 0 1px 0 rgba(255,255,255,.05);
    position:relative; }
  .pipboy-knob.small { width:22px;height:22px; }
  .pipboy-knob.large { width:30px;height:30px; }
  .pipboy-knob::after { content:'';position:absolute;top:3px;left:50%;transform:translateX(-50%);
    width:2px;height:40%;background:rgba(24,255,109,.25);border-radius:1px; }
  .knob-label { font-family:'Share Tech Mono',monospace;font-size:.45rem;letter-spacing:3px;text-transform:uppercase;
    color:rgba(24,255,109,.18);pointer-events:none; }

  /* ═══ ANTENNA STRIP ═══ */
  .pipboy-antenna { position:absolute;left:-12px;top:50%;transform:translateY(-50%);width:8px;height:180px;
    background:linear-gradient(180deg, #2a2e2a, #1a1d1a);border-radius:3px 0 0 3px;z-index:5;
    box-shadow:-2px 0 4px rgba(0,0,0,.4);display:flex;flex-direction:column;justify-content:space-evenly;align-items:center;padding:6px 0; }
  .antenna-tick { width:4px;height:1px;background:rgba(24,255,109,.12); }

  /* Scrollable content area inside the frame */
  .pipboy-screen-inner { max-height:calc(100vh - 130px);overflow-y:auto;overflow-x:hidden; }
  .pipboy-screen-inner::-webkit-scrollbar { width:4px; }
  .pipboy-screen-inner::-webkit-scrollbar-track { background:transparent; }
  .pipboy-screen-inner::-webkit-scrollbar-thumb { background:var(--pip-green-dim);border-radius:2px; }

  .pip-container { animation:bootUp 1.5s ease-out;max-width:100%;margin:0;padding:0;position:relative;z-index:2; }
  .pip-header { border:1px solid var(--pip-border);background:var(--pip-panel);padding:16px 20px;margin-bottom:2px;text-align:center;position:relative;overflow:hidden; }
  .pip-header::before { content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at center,rgba(24,255,109,.05) 0%,transparent 70%); }
  .pip-header h1 { font-size:1.4rem;letter-spacing:6px;text-transform:uppercase;animation:pulseGlow 4s ease-in-out infinite;position:relative; }
  .pip-header .subtitle { font-size:.7rem;color:var(--pip-green-dim);letter-spacing:3px;margin-top:4px; }

  .pip-tabs { display:flex;border-left:1px solid var(--pip-border);border-right:1px solid var(--pip-border);background:rgba(5,20,8,.8);overflow-x:auto;-webkit-overflow-scrolling:touch; }
  .pip-tabs::-webkit-scrollbar { display:none; }
  .pip-tab { flex:1;min-width:0;padding:10px 4px;text-align:center;font-family:'Share Tech Mono',monospace;font-size:.6rem;letter-spacing:1px;text-transform:uppercase;
    color:var(--pip-green-dim);background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer;transition:all .2s;white-space:nowrap; }
  .pip-tab:hover { color:var(--pip-green);background:rgba(24,255,109,.05); }
  .pip-tab.active { color:var(--pip-green);border-bottom:2px solid var(--pip-green);background:rgba(24,255,109,.08);text-shadow:var(--pip-text-glow);
    animation:activeTabGlow 3s ease-in-out infinite; }
  .pip-tab-icon { margin-right:3px;font-size:.7rem; }

  .pip-body { border:1px solid var(--pip-border);border-top:none;background:var(--pip-panel);min-height:60vh;padding:20px;position:relative;animation:flicker 4s infinite; }
  .pip-body::before { content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 50% 0%,rgba(24,255,109,.03) 0%,transparent 60%);pointer-events:none; }
  .pip-body.tab-switching { animation:tabGlitch 150ms ease-out; }

  .section-title { font-size:.85rem;letter-spacing:4px;text-transform:uppercase;color:var(--pip-green);text-shadow:var(--pip-text-glow);
    border-bottom:1px solid var(--pip-border);border-left:3px solid var(--pip-green);padding-bottom:8px;padding-left:10px;margin-bottom:16px; }
  .stat-row { display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(24,255,109,.08);font-size:.8rem; }
  .stat-label { color:var(--pip-green-dim);letter-spacing:1px; }
  .stat-value { color:var(--pip-green);text-shadow:var(--pip-text-glow); }
  .stat-value.amber { color:var(--pip-amber);text-shadow:0 0 8px rgba(255,182,49,.6); }
  .stat-value.active { color:var(--pip-green); }
  .stat-value.inactive { color:#555; }

  .task-item { display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:4px;border:1px solid rgba(24,255,109,.1);background:rgba(10,30,15,.4);cursor:pointer;transition:all .15s;font-size:.8rem; }
  .task-item:hover { background:rgba(24,255,109,.08);border-color:rgba(24,255,109,.3); }
  .task-item.completed { opacity:.4;text-decoration:line-through; }
  .task-item.task-flash { animation:taskFlashGreen .6s ease-out; }
  .task-checkbox { width:16px;height:16px;border:1px solid var(--pip-green-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.7rem; }
  .task-checkbox.checked { border-color:var(--pip-green);color:var(--pip-bg);background:var(--pip-green);text-shadow:none;
    box-shadow:0 0 6px rgba(24,255,109,.4);transition:background .2s,box-shadow .2s; }
  .task-category { font-size:.55rem;letter-spacing:2px;text-transform:uppercase;margin-left:auto;padding:2px 6px;border:1px solid rgba(24,255,109,.15); }
  .task-priority { width:4px;height:100%;min-height:20px;flex-shrink:0;border-radius:2px; }
  .task-due { font-size:.55rem;color:var(--pip-green-dark);letter-spacing:1px; }

  .briefing-block { border:1px solid var(--pip-border);background:rgba(5,20,10,.5);padding:16px;margin-bottom:12px; }
  .briefing-block h3 { font-size:.75rem;letter-spacing:3px;text-transform:uppercase;color:var(--pip-green);text-shadow:var(--pip-text-glow);margin-bottom:10px; }
  .briefing-line { font-size:.78rem;padding:4px 0;color:var(--pip-green-dim);line-height:1.5; }
  .briefing-line strong { color:var(--pip-green); }

  .health-bar-container { margin:12px 0; }
  .health-bar-label { display:flex;justify-content:space-between;font-size:.7rem;margin-bottom:4px; }
  .health-bar-track { height:12px;background:rgba(24,255,109,.08);border:1px solid var(--pip-border);overflow:hidden; }
  .health-bar-fill { height:100%;background:var(--pip-green);box-shadow:0 0 10px rgba(24,255,109,.5);transition:width 1s ease-out; }

  .news-item { padding:12px;border:1px solid rgba(24,255,109,.1);margin-bottom:6px;background:rgba(10,30,15,.3); }
  .news-item:hover { background:rgba(24,255,109,.06);border-color:rgba(24,255,109,.3); }
  .news-category { font-size:.6rem;color:var(--pip-amber);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px; }
  .news-headline { font-size:.8rem;color:var(--pip-green);line-height:1.4; }
  .news-link { color:var(--pip-green);text-decoration:none;transition:all .15s; }
  .news-link:hover { color:var(--pip-amber);text-shadow:0 0 8px rgba(255,182,49,.6); }
  .news-time { font-size:.6rem;color:var(--pip-green-dark);margin-top:4px;letter-spacing:1px; }

  .family-card { border:1px solid var(--pip-border);background:rgba(5,20,10,.5);padding:16px;margin-bottom:12px; }
  .family-name { font-size:.9rem;color:var(--pip-green);text-shadow:var(--pip-text-glow);letter-spacing:2px; }
  .family-detail { font-size:.75rem;color:var(--pip-green-dim);margin-top:6px; }
  .elizabeth-status { display:inline-block;padding:6px 16px;margin-top:12px;font-size:.75rem;letter-spacing:3px;text-transform:uppercase;border:1px solid; }
  .elizabeth-status.active { border-color:var(--pip-green);color:var(--pip-green);text-shadow:var(--pip-text-glow);box-shadow:var(--pip-glow); }
  .elizabeth-status.inactive { border-color:#444;color:#555; }

  .training-exercise { padding:10px 12px;border:1px solid rgba(24,255,109,.1);margin-bottom:4px;background:rgba(10,30,15,.3);font-size:.78rem; }
  .training-exercise .name { color:var(--pip-green); }
  .training-exercise .detail { color:var(--pip-green-dim);font-size:.7rem;margin-top:4px; }

  .pip-footer { border:1px solid var(--pip-border);border-top:1px solid rgba(24,255,109,.1);background:rgba(5,20,8,.8);padding:8px 20px;display:flex;justify-content:space-between;font-size:.6rem;color:var(--pip-green-dark);letter-spacing:1px;flex-wrap:wrap;gap:4px;
    box-shadow:inset 0 1px 0 rgba(24,255,109,.05); }
  .cursor-blink::after { content:'\\2588';animation:blink 1s step-end infinite; }

  .glide-day { display:flex;gap:6px;margin:16px 0; }
  .glide-pip { flex:1;height:24px;border:1px solid var(--pip-border);display:flex;align-items:center;justify-content:center;font-size:.6rem;transition:all .3s; }
  .glide-pip.current { background:var(--pip-green);color:var(--pip-bg);border-color:var(--pip-green);box-shadow:var(--pip-glow);font-weight:bold; }
  .glide-pip.past { background:rgba(24,255,109,.15);color:var(--pip-green-dim); }

  .input-row { display:flex;gap:8px;margin-top:12px; }
  .pip-input { flex:1;background:rgba(10,30,15,.6);border:1px solid var(--pip-border);color:var(--pip-green);font-family:'Share Tech Mono',monospace;font-size:.78rem;padding:8px 12px;outline:none; }
  .pip-input:focus { border-color:var(--pip-green);box-shadow:0 0 10px rgba(24,255,109,.2); }
  .pip-input::placeholder { color:var(--pip-green-dark); }
  .pip-select { background:rgba(10,30,15,.6);border:1px solid var(--pip-border);color:var(--pip-green);font-family:'Share Tech Mono',monospace;font-size:.7rem;padding:8px;outline:none; }
  .pip-select:focus { border-color:var(--pip-green); }

  /* Buttons with flash animation */
  .pip-btn { background:rgba(24,255,109,.1);border:1px solid var(--pip-green-dim);color:var(--pip-green);font-family:'Share Tech Mono',monospace;font-size:.7rem;letter-spacing:2px;text-transform:uppercase;padding:8px 16px;cursor:pointer;transition:all .15s;position:relative; }
  .pip-btn:hover { background:rgba(24,255,109,.2);border-color:var(--pip-green);text-shadow:var(--pip-text-glow);animation:buttonGlowPulse 1.5s ease-in-out infinite; }
  .pip-btn:active { animation:buttonFlash .35s ease-out;transform:translateY(1px); }
  .pip-btn:disabled { opacity:.4;cursor:not-allowed; }
  .pip-btn:disabled:active { animation:none; }
  .pip-btn.small { padding:4px 10px;font-size:.6rem;letter-spacing:1px; }
  .pip-btn.active-filter { background:rgba(24,255,109,.25);border-color:var(--pip-green);text-shadow:var(--pip-text-glow); }
  .empty-state { text-align:center;padding:40px 20px;color:var(--pip-green-dark);font-size:.8rem;letter-spacing:2px; }

  .oura-score-row { display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap; }
  .oura-score-card { flex:1;min-width:100px;border:1px solid var(--pip-border);background:rgba(5,20,10,.5);padding:16px;text-align:center; }
  .oura-score-card .score-label { font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:var(--pip-green-dim);margin-bottom:8px; }
  .oura-score-card .score-value { font-size:1.6rem;color:var(--pip-green);text-shadow:var(--pip-text-glow); }
  .oura-score-card .score-value.good { color:var(--pip-green); }
  .oura-score-card .score-value.warn { color:var(--pip-amber);text-shadow:0 0 8px rgba(255,182,49,.6); }
  .oura-score-card .score-value.low { color:#ff4444;text-shadow:0 0 8px rgba(255,68,68,.6); }

  /* Calendar */
  .cal-nav { display:flex;justify-content:space-between;align-items:center;margin-bottom:12px; }
  .cal-grid { display:grid;grid-template-columns:repeat(7,1fr);gap:2px; }
  .cal-header { text-align:center;font-size:.6rem;color:var(--pip-green-dim);padding:6px 0;letter-spacing:1px; }
  .cal-cell { min-height:60px;border:1px solid rgba(24,255,109,.08);background:rgba(10,30,15,.2);padding:4px;font-size:.65rem;cursor:pointer;transition:all .15s;position:relative; }
  .cal-cell:hover { background:rgba(24,255,109,.08);border-color:rgba(24,255,109,.3); }
  .cal-cell.today { border-color:var(--pip-green);background:rgba(24,255,109,.1); }
  .cal-cell.selected { border-color:var(--pip-amber);background:rgba(255,182,49,.08); }
  .cal-cell.empty { background:transparent;border-color:transparent;cursor:default; }
  .cal-cell.empty:hover { background:transparent; }
  .cal-day-num { font-size:.7rem;color:var(--pip-green);margin-bottom:2px; }
  .cal-event-dot { width:6px;height:6px;border-radius:50%;display:inline-block;margin:1px; }
  .cal-event-form { border:1px solid var(--pip-border);background:rgba(5,20,10,.5);padding:16px;margin-top:12px; }

  /* Finance */
  .fin-bar-row { display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:.75rem; }
  .fin-bar-label { width:100px;color:var(--pip-green-dim);text-align:right;letter-spacing:1px;font-size:.65rem; }
  .fin-bar-track { flex:1;height:16px;background:rgba(24,255,109,.05);border:1px solid var(--pip-border);overflow:hidden; }
  .fin-bar-fill { height:100%;background:var(--pip-green);box-shadow:0 0 6px rgba(24,255,109,.4);transition:width .6s; }
  .fin-bar-amount { width:80px;color:var(--pip-green);font-size:.7rem; }
  .fin-summary { display:flex;gap:12px;margin-bottom:16px; }
  .fin-summary-card { flex:1;border:1px solid var(--pip-border);background:rgba(5,20,10,.5);padding:12px;text-align:center; }
  .fin-summary-card .label { font-size:.6rem;letter-spacing:2px;color:var(--pip-green-dim);margin-bottom:6px; }
  .fin-summary-card .value { font-size:1.2rem;text-shadow:var(--pip-text-glow); }

  /* Chat */
  .chat-container { display:flex;flex-direction:column;height:55vh; }
  .chat-messages { flex:1;overflow-y:auto;padding:8px;border:1px solid var(--pip-border);background:rgba(5,15,8,.6);margin-bottom:8px; }
  .chat-messages::-webkit-scrollbar { width:4px; }
  .chat-messages::-webkit-scrollbar-thumb { background:var(--pip-green-dim); }
  .chat-bubble { padding:10px 14px;margin-bottom:8px;font-size:.78rem;line-height:1.5;max-width:85%;word-wrap:break-word;white-space:pre-wrap; }
  .chat-bubble.user { background:rgba(24,255,109,.1);border:1px solid var(--pip-border);margin-left:auto;color:var(--pip-green); }
  .chat-bubble.assistant { background:rgba(255,182,49,.05);border:1px solid rgba(255,182,49,.15);color:var(--pip-amber); }
  .chat-bubble .role-tag { font-size:.55rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;opacity:.6; }

  /* Ticker */
  .status-ticker { border:1px solid var(--pip-border);border-top:none;background:rgba(5,20,8,.95);overflow:hidden;height:22px;display:flex;align-items:center;
    box-shadow:inset 0 1px 3px rgba(0,0,0,.4); }
  .ticker-content { display:inline-block;white-space:nowrap;animation:tickerScroll 35s linear infinite;font-size:.6rem;color:var(--pip-green-dim);letter-spacing:1px; }
  .ticker-content span { margin-right:32px; }

  /* Workout Mode */
  .workout-mode { position:relative; }
  .workout-exercise-display { text-align:center;padding:16px;border:1px solid var(--pip-border);background:rgba(5,20,10,.5);margin-bottom:16px; }
  .workout-exercise-name { font-size:1.1rem;letter-spacing:3px;text-transform:uppercase;color:var(--pip-green);text-shadow:var(--pip-text-glow);margin-bottom:8px; }
  .workout-set-info { font-size:.75rem;color:var(--pip-green-dim);letter-spacing:2px;margin-bottom:12px; }
  .workout-animation { display:flex;justify-content:center;margin:16px 0; }
  .workout-animation svg { width:200px;height:250px; }
  .workout-cues { border:1px solid rgba(24,255,109,.1);background:rgba(10,30,15,.3);padding:12px;margin-bottom:16px; }
  .workout-cue-item { font-size:.7rem;color:var(--pip-green-dim);padding:3px 0;letter-spacing:1px; }
  .workout-cue-item::before { content:'> ';color:var(--pip-green); }
  .workout-weight-input { display:flex;gap:8px;align-items:center;justify-content:center;margin-bottom:16px; }
  .workout-weight-input label { font-size:.7rem;color:var(--pip-green-dim);letter-spacing:2px; }
  .workout-progress-bar { display:flex;gap:4px;margin-bottom:16px;justify-content:center; }
  .workout-progress-pip { width:28px;height:28px;border:1px solid var(--pip-border);display:flex;align-items:center;justify-content:center;font-size:.6rem;color:var(--pip-green-dark);transition:all .3s; }
  .workout-progress-pip.done { background:var(--pip-green);color:var(--pip-bg);border-color:var(--pip-green);box-shadow:0 0 8px rgba(24,255,109,.4); }
  .workout-progress-pip.current { border-color:var(--pip-amber);color:var(--pip-amber);box-shadow:0 0 8px rgba(255,182,49,.4); }
  .workout-actions { display:flex;gap:8px;justify-content:center;flex-wrap:wrap; }
  .workout-btn { background:rgba(24,255,109,.1);border:1px solid var(--pip-green-dim);color:var(--pip-green);font-family:'Share Tech Mono',monospace;font-size:.7rem;letter-spacing:2px;text-transform:uppercase;padding:10px 20px;cursor:pointer;transition:all .15s; }
  .workout-btn:hover { background:rgba(24,255,109,.2);border-color:var(--pip-green);text-shadow:var(--pip-text-glow); }
  .workout-btn:active { animation:buttonFlash .35s ease-out; }
  .workout-btn.primary { background:rgba(24,255,109,.2);border-color:var(--pip-green);text-shadow:var(--pip-text-glow); }
  .workout-btn.danger { border-color:#ff4444;color:#ff4444; }
  .workout-btn.danger:hover { background:rgba(255,68,68,.15);text-shadow:0 0 8px rgba(255,68,68,.6); }

  .rest-timer-overlay { position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:50; }
  .rest-timer-value { font-size:4rem;color:var(--pip-amber);text-shadow:0 0 30px rgba(255,182,49,.6);font-family:'Share Tech Mono',monospace;letter-spacing:6px; }
  .rest-timer-label { font-size:.8rem;color:var(--pip-green-dim);letter-spacing:4px;margin-top:12px;text-transform:uppercase; }
  .rest-timer-circle { width:180px;height:180px;position:relative;margin-bottom:16px; }
  .rest-timer-circle svg { width:180px;height:180px;transform:rotate(-90deg); }
  .rest-timer-circle circle { fill:none;stroke-width:4; }
  .rest-timer-circle .track { stroke:rgba(24,255,109,.1); }
  .rest-timer-circle .progress { stroke:var(--pip-amber);stroke-linecap:round;filter:drop-shadow(0 0 6px rgba(255,182,49,.5));transition:stroke-dashoffset 1s linear; }
  .rest-timer-circle .timer-text { position:absolute;top:50%;left:50%;transform:translate(-50%,-50%); }

  /* Report Modal */
  .report-modal-overlay { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.88);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px; }
  .report-modal { max-width:700px;width:100%;max-height:85vh;overflow-y:auto;border:2px solid var(--pip-green);background:var(--pip-bg);padding:24px;box-shadow:0 0 40px rgba(24,255,109,.2); }
  .report-modal::-webkit-scrollbar { width:4px; }
  .report-modal::-webkit-scrollbar-thumb { background:var(--pip-green-dim); }
  .report-modal-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--pip-border);padding-bottom:12px; }
  .report-modal-title { font-size:1rem;letter-spacing:4px;text-transform:uppercase;color:var(--pip-green);text-shadow:var(--pip-text-glow); }
  .report-section { border:1px solid rgba(24,255,109,.1);background:rgba(5,20,10,.4);padding:12px;margin-bottom:10px; }
  .report-section h4 { font-size:.7rem;letter-spacing:3px;text-transform:uppercase;color:var(--pip-amber);margin-bottom:8px; }
  .report-section .report-line { font-size:.75rem;color:var(--pip-green-dim);padding:2px 0;line-height:1.5; }
  .report-section .report-line strong { color:var(--pip-green); }

  /* Streak badge */
  .streak-badge { display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid var(--pip-amber);color:var(--pip-amber);font-size:.75rem;letter-spacing:2px;text-shadow:0 0 8px rgba(255,182,49,.6);margin:8px 0; }

  /* Alert pulsing for warnings */
  .alert-pulse { animation:alertPulse 2.5s ease-in-out infinite; }
  .briefing-line.alert { border-left:2px solid var(--pip-amber);padding-left:8px;animation:alertPulse 3s ease-in-out infinite; }

  /* Report history list */
  .report-history-item { padding:10px 12px;border:1px solid rgba(24,255,109,.1);margin-bottom:4px;background:rgba(10,30,15,.3);cursor:pointer;font-size:.78rem;display:flex;justify-content:space-between;transition:all .15s; }
  .report-history-item:hover { background:rgba(24,255,109,.08);border-color:rgba(24,255,109,.3); }

  /* Workout animations */
  /* Enhanced multi-step workout keyframes */
  @keyframes benchArms { 0%{transform:translateY(0)}10%{transform:translateY(2px)}45%{transform:translateY(-22px)}55%{transform:translateY(-22px)}90%{transform:translateY(-2px)}100%{transform:translateY(0)} }
  @keyframes squatDown { 0%{transform:translateY(0) scaleY(1)}10%{transform:translateY(2px)}40%{transform:translateY(28px) scaleY(.88)}52%{transform:translateY(28px) scaleY(.88)}85%{transform:translateY(3px)}100%{transform:translateY(0) scaleY(1)} }
  @keyframes deadliftPull { 0%{transform:translateY(0) rotate(0)}10%{transform:translateY(1px)}48%{transform:translateY(-16px) rotate(-7deg)}58%{transform:translateY(-16px) rotate(-7deg)}90%{transform:translateY(-2px) rotate(-1deg)}100%{transform:translateY(0) rotate(0)} }
  @keyframes ohpArms { 0%{transform:translateY(0)}10%{transform:translateY(1px)}42%{transform:translateY(-18px)}54%{transform:translateY(-18px)}88%{transform:translateY(-2px)}100%{transform:translateY(0)} }
  @keyframes rowPull { 0%{transform:translateX(0)}10%{transform:translateX(1px)}42%{transform:translateX(-14px)}54%{transform:translateX(-14px)}88%{transform:translateX(-2px)}100%{transform:translateX(0)} }
  @keyframes pullupBody { 0%{transform:translateY(0)}10%{transform:translateY(1px)}45%{transform:translateY(-22px)}55%{transform:translateY(-22px)}88%{transform:translateY(-2px)}100%{transform:translateY(0)} }
  @keyframes legpressLegs { 0%{transform:translateX(0)}10%{transform:translateX(1px)}42%{transform:translateX(12px)}54%{transform:translateX(12px)}88%{transform:translateX(1px)}100%{transform:translateX(0)} }
  @keyframes lungeDown { 0%{transform:translateY(0)}10%{transform:translateY(2px)}42%{transform:translateY(18px)}54%{transform:translateY(18px)}88%{transform:translateY(2px)}100%{transform:translateY(0)} }
  @keyframes curlArm { 0%{transform:rotate(0)}10%{transform:rotate(-2deg)}42%{transform:rotate(-25deg)}54%{transform:rotate(-25deg)}88%{transform:rotate(-2deg)}100%{transform:rotate(0)} }
  @keyframes lateralRaise { 0%{transform:translateY(0)}10%{transform:translateY(1px)}42%{transform:translateY(-15px)}54%{transform:translateY(-15px)}88%{transform:translateY(-1px)}100%{transform:translateY(0)} }
  @keyframes flyesArms { 0%{transform:rotate(0)}10%{transform:rotate(2deg)}42%{transform:rotate(18deg)}54%{transform:rotate(18deg)}88%{transform:rotate(2deg)}100%{transform:rotate(0)} }
  @keyframes rdlHinge { 0%{transform:rotate(0)}10%{transform:rotate(1deg)}45%{transform:rotate(18deg)}55%{transform:rotate(18deg)}88%{transform:rotate(2deg)}100%{transform:rotate(0)} }
  @keyframes legcurlBend { 0%{transform:rotate(0)}10%{transform:rotate(-2deg)}42%{transform:rotate(-35deg)}54%{transform:rotate(-35deg)}88%{transform:rotate(-2deg)}100%{transform:rotate(0)} }
  @keyframes calvesRaise { 0%{transform:translateY(0)}12%{transform:translateY(1px)}40%{transform:translateY(-10px)}55%{transform:translateY(-10px)}85%{transform:translateY(-1px)}100%{transform:translateY(0)} }
  @keyframes facepullArms { 0%{transform:translateX(0)}10%{transform:translateX(1px)}42%{transform:translateX(-16px)}54%{transform:translateX(-16px)}88%{transform:translateX(-2px)}100%{transform:translateX(0)} }
  @keyframes dipBody { 0%{transform:translateY(0)}10%{transform:translateY(2px)}45%{transform:translateY(18px)}55%{transform:translateY(18px)}88%{transform:translateY(2px)}100%{transform:translateY(0)} }
  @keyframes hipThrustUp { 0%{transform:translateY(0)}10%{transform:translateY(1px)}42%{transform:translateY(-12px)}54%{transform:translateY(-12px)}88%{transform:translateY(-1px)}100%{transform:translateY(0)} }
  @keyframes abwheelRoll { 0%{transform:translateX(0)}10%{transform:translateX(2px)}45%{transform:translateX(18px)}55%{transform:translateX(18px)}88%{transform:translateX(2px)}100%{transform:translateX(0)} }
  @keyframes frontSquatDown { 0%{transform:translateY(0) scaleY(1)}10%{transform:translateY(2px)}40%{transform:translateY(25px) scaleY(.9)}52%{transform:translateY(25px) scaleY(.9)}85%{transform:translateY(3px)}100%{transform:translateY(0) scaleY(1)} }
  @keyframes bulgarianSplitDown { 0%{transform:translateY(0)}10%{transform:translateY(2px)}42%{transform:translateY(22px)}54%{transform:translateY(22px)}88%{transform:translateY(2px)}100%{transform:translateY(0)} }
  @keyframes farmerStep { 0%{transform:translateX(0) translateY(0)}25%{transform:translateX(5px) translateY(-4px)}50%{transform:translateX(10px) translateY(0)}75%{transform:translateX(5px) translateY(-4px)}100%{transform:translateX(0) translateY(0)} }
  @keyframes genericMove { 0%{transform:translateY(0)}10%{transform:translateY(1px)}42%{transform:translateY(-10px)}54%{transform:translateY(-10px)}88%{transform:translateY(-1px)}100%{transform:translateY(0)} }

  .anim-bench-arms { animation:benchArms 3.5s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center; }
  .anim-squat { animation:squatDown 3.5s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center top; }
  .anim-deadlift { animation:deadliftPull 3.8s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center bottom; }
  .anim-ohp { animation:ohpArms 3.2s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center; }
  .anim-row { animation:rowPull 3s cubic-bezier(.4,0,.2,1) infinite; transform-origin:right center; }
  .anim-pullup { animation:pullupBody 3.5s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center top; }
  .anim-legpress { animation:legpressLegs 3s cubic-bezier(.4,0,.2,1) infinite; transform-origin:left center; }
  .anim-lunge { animation:lungeDown 3.5s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center top; }
  .anim-curl { animation:curlArm 3s cubic-bezier(.4,0,.2,1) infinite; transform-origin:100px 140px; }
  .anim-lateral { animation:lateralRaise 3s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center; }
  .anim-flyes { animation:flyesArms 3.2s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center; }
  .anim-rdl { animation:rdlHinge 3.8s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center bottom; }
  .anim-legcurl { animation:legcurlBend 3s cubic-bezier(.4,0,.2,1) infinite; transform-origin:120px 80px; }
  .anim-calves { animation:calvesRaise 2.5s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center bottom; }
  .anim-facepull { animation:facepullArms 3s cubic-bezier(.4,0,.2,1) infinite; transform-origin:right center; }
  .anim-dip { animation:dipBody 3.5s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center top; }
  .anim-hipthrust { animation:hipThrustUp 3s cubic-bezier(.4,0,.2,1) infinite; transform-origin:left center; }
  .anim-abwheel { animation:abwheelRoll 3.5s cubic-bezier(.4,0,.2,1) infinite; transform-origin:left center; }
  .anim-frontsquat { animation:frontSquatDown 3.5s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center top; }
  .anim-bulgariansplitsquat { animation:bulgarianSplitDown 3.5s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center top; }
  .anim-farmerwalk { animation:farmerStep 2.5s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center; }
  .anim-generic { animation:genericMove 3s cubic-bezier(.4,0,.2,1) infinite; transform-origin:center; }

  /* SYS tab notice */
  .sys-notice { border:1px solid rgba(255,182,49,.3);background:rgba(255,182,49,.05);padding:12px;margin:12px 0;font-size:.72rem;color:var(--pip-amber);letter-spacing:1px; }

  @media (max-width:600px) {
    .pipboy-device { padding:4px; }
    .pipboy-frame { border-radius:12px;border-width:2px;padding:3px 3px 4px; }
    .pipboy-frame-label { font-size:.4rem;letter-spacing:2px;padding:2px 0 4px; }
    .pipboy-rivet { width:8px;height:8px; }
    .pipboy-rivet.tl { top:5px;left:5px; }
    .pipboy-rivet.tr { top:5px;right:5px; }
    .pipboy-rivet.bl { bottom:5px;left:5px; }
    .pipboy-rivet.br { bottom:5px;right:5px; }
    .pipboy-knob.small { width:16px;height:16px; }
    .pipboy-knob.large { width:22px;height:22px; }
    .pipboy-knobs { padding:6px 20px 2px; }
    .knob-label { font-size:.35rem;letter-spacing:2px; }
    .pipboy-antenna { display:none; }
    .pipboy-screen { border-radius:8px; }
    .pip-container { padding:0; }
    .pip-header h1 { font-size:1rem;letter-spacing:3px; }
    .pip-tab { font-size:.5rem;padding:8px 2px;letter-spacing:0; }
    .pip-body { padding:12px; }
    .stat-row { font-size:.72rem; }
    .oura-score-row { flex-direction:column; }
    .cal-cell { min-height:40px; }
    .fin-summary { flex-direction:column; }
  }
`;

// ─── TAB DEFINITIONS ──────────────────────────────────────────
const TABS = [
  { id: "stat", label: "STAT", icon: "\u25C6" },
  { id: "tasks", label: "TASKS", icon: "\u2610" },
  { id: "training", label: "TRAIN", icon: "\u2666" },
  { id: "health", label: "HEALTH", icon: "\u2665" },
  { id: "meds", label: "MEDS", icon: "\u271A" },
  { id: "calendar", label: "CAL", icon: "\u25C8" },
  { id: "finance", label: "FIN", icon: "$" },
  { id: "family", label: "FAM", icon: "\u2605" },
  { id: "news", label: "NEWS", icon: "\u25CE" },
  { id: "assist", label: "ASSIST", icon: "\u25A3" },
  { id: "sys", label: "SYS", icon: "\u2699" },
];

// ─── TRAINING PROGRAMS ──────────────────────────────────────
const WEEK_A = {
  Monday: [
    { name: "Barbell Bench Press", sets: "4x8" },
    { name: "Incline Dumbbell Press", sets: "3x10" },
    { name: "Cable Flyes", sets: "3x12" },
    { name: "Overhead Press", sets: "4x6" },
    { name: "Lateral Raises", sets: "3x15" },
  ],
  Tuesday: [
    { name: "Barbell Squat", sets: "4x6" },
    { name: "Romanian Deadlift", sets: "3x10" },
    { name: "Leg Press", sets: "3x12" },
    { name: "Leg Curl", sets: "3x12" },
    { name: "Calf Raises", sets: "4x15" },
  ],
  Thursday: [
    { name: "Barbell Row", sets: "4x8" },
    { name: "Pull-ups", sets: "3xAMRAP" },
    { name: "Seated Cable Row", sets: "3x12" },
    { name: "Face Pulls", sets: "3x15" },
    { name: "Barbell Curl", sets: "3x10" },
  ],
  Friday: [
    { name: "Deadlift", sets: "4x5" },
    { name: "Front Squat", sets: "3x8" },
    { name: "Walking Lunges", sets: "3x12/leg" },
    { name: "Hanging Leg Raise", sets: "3x12" },
    { name: "Farmer's Walk", sets: "3x40m" },
  ],
};

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState("stat");
  const [booted, setBooted] = useState(false);
  const [bootText, setBootText] = useState("");

  // ─── Tasks (upgraded, localStorage-backed with auto-reset) ──
  const [tasks, setTasks] = useState(() => {
    const raw = loadStorage("cc_tasks", null);
    if (raw) return autoResetTasks(migrateTasks(raw));
    return DEFAULT_TASKS;
  });
  const [taskFilter, setTaskFilter] = useState("all");
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskCat, setNewTaskCat] = useState("project");
  const [newTaskPriority, setNewTaskPriority] = useState("med");
  const [newTaskDue, setNewTaskDue] = useState("");

  // ─── Health / Weight / Macros / Strength ────────────────────
  const [weights, setWeights] = useState(() => loadStorage("cc_weights", []));
  const [strengthLog, setStrengthLog] = useState(() => loadStorage("cc_strength", []));
  const [macros, setMacros] = useState(() => loadStorage("cc_macros", []));
  const [weightInput, setWeightInput] = useState("");
  const [macroP, setMacroP] = useState("");
  const [macroC, setMacroC] = useState("");
  const [macroF, setMacroF] = useState("");
  const [strengthExercise, setStrengthExercise] = useState("");
  const [strengthWeight, setStrengthWeight] = useState("");
  const [strengthReps, setStrengthReps] = useState("");
  const [strengthSets, setStrengthSets] = useState("");

  // ─── News ───────────────────────────────────────────────────
  const [newsArticles, setNewsArticles] = useState(() => loadStorage("cc_news", []));
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(null);

  // ─── TRT Injection Tracking ─────────────────────────────────
  const [trtLastDate, setTrtLastDate] = useState(() => loadStorage("cc_trt_last", "2026-02-22"));

  // ─── Oura ───────────────────────────────────────────────────
  const [ouraData, setOuraData] = useState(() => loadStorage("cc_oura", null));
  const [ouraLoading, setOuraLoading] = useState(false);

  // ─── Calendar ───────────────────────────────────────────────
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calEvents, setCalEvents] = useState(() => loadStorage("cc_calendar", []));
  const [selectedDay, setSelectedDay] = useState(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventCat, setEventCat] = useState("work");

  // ─── Finance ────────────────────────────────────────────────
  const [transactions, setTransactions] = useState(() => loadStorage("cc_finances", []));
  const [finType, setFinType] = useState("expense");
  const [finAmount, setFinAmount] = useState("");
  const [finCat, setFinCat] = useState("Other");
  const [finDesc, setFinDesc] = useState("");
  const [finMonth, setFinMonth] = useState(today.getMonth());
  const [finYear, setFinYear] = useState(today.getFullYear());

  // ─── AI Chat ────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState(() => loadStorage("cc_chat", []));
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // ─── Workout Mode ────────────────────────────────────────
  const [workoutActive, setWorkoutActive] = useState(false);
  const [workoutExerciseIdx, setWorkoutExerciseIdx] = useState(0);
  const [workoutCurrentSet, setWorkoutCurrentSet] = useState(0);
  const [workoutLog, setWorkoutLog] = useState([]);
  const [workoutWeightInput, setWorkoutWeightInput] = useState("");
  const [restTimer, setRestTimer] = useState(0);
  const [resting, setResting] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState(null);

  // ─── Daily Reports ──────────────────────────────────────
  const [dailyReports, setDailyReports] = useState(() => loadStorage("cc_daily_reports", {}));
  const [reportModal, setReportModal] = useState(null);
  const [reportViewDate, setReportViewDate] = useState(null);
  const [reportSpeaking, setReportSpeaking] = useState(false);
  const [dailyActivityLog, setDailyActivityLog] = useState(() => loadStorage("cc_daily_activity", {}));

  const [glideDay] = useState(((today.getDay() || 7)) % 7 || 7);
  const [speaking, setSpeaking] = useState(false);
  const [tabSwitching, setTabSwitching] = useState(false);
  const [flashingTaskIdx, setFlashingTaskIdx] = useState(null);
  const [navInput, setNavInput] = useState("");
  const screenRef = useRef(null);

  // ─── Meds / Vitamins ──────────────────────────────────────
  const [meds, setMeds] = useState(() => {
    const stored = loadStorage("cc_meds", null);
    return stored && stored.length > 0 ? stored : DEFAULT_MEDS;
  });
  const [medsTakenToday, setMedsTakenToday] = useState(() => {
    const stored = loadStorage("cc_meds_taken", {});
    return stored[localDate] || {};
  });
  const [newMedName, setNewMedName] = useState("");
  const [newMedDosage, setNewMedDosage] = useState("");
  const [newMedFreq, setNewMedFreq] = useState("daily");
  const [newMedTime, setNewMedTime] = useState("morning");
  const [newMedCat, setNewMedCat] = useState("vitamin");
  const [medAnalysis, setMedAnalysis] = useState(() => loadStorage("cc_med_analysis", null));
  const [medAnalysisLoading, setMedAnalysisLoading] = useState(false);

  // ─── Wellness Check ───────────────────────────────────────
  const [wellnessLog, setWellnessLog] = useState(() => loadStorage("cc_wellness_log", {}));
  const [showWellnessModal, setShowWellnessModal] = useState(false);
  const [wellnessFeeling, setWellnessFeeling] = useState(3);
  const [wellnessSideEffects, setWellnessSideEffects] = useState("");
  const [wellnessEnergy, setWellnessEnergy] = useState(3);
  const [wellnessSleep, setWellnessSleep] = useState(3);

  // ─── Meal Photo Macro Estimation ──────────────────────────
  const [mealPhoto, setMealPhoto] = useState(null);
  const [mealEstimate, setMealEstimate] = useState(null);
  const [mealEstLoading, setMealEstLoading] = useState(false);
  const mealInputRef = useRef(null);

  // ─── Water Tracking ───────────────────────────────────────
  const [waterOz, setWaterOz] = useState(() => {
    const stored = loadStorage("cc_water", {});
    return stored[localDate] || 0;
  });
  const [customWater, setCustomWater] = useState("");

  // ─── localStorage persistence ───────────────────────────────
  useEffect(() => { localStorage.setItem("cc_tasks", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem("cc_weights", JSON.stringify(weights)); }, [weights]);
  useEffect(() => { localStorage.setItem("cc_strength", JSON.stringify(strengthLog)); }, [strengthLog]);
  useEffect(() => { localStorage.setItem("cc_macros", JSON.stringify(macros)); }, [macros]);
  useEffect(() => { localStorage.setItem("cc_calendar", JSON.stringify(calEvents)); }, [calEvents]);
  useEffect(() => { localStorage.setItem("cc_finances", JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem("cc_chat", JSON.stringify(chatMessages)); }, [chatMessages]);
  useEffect(() => { localStorage.setItem("cc_daily_reports", JSON.stringify(dailyReports)); }, [dailyReports]);
  useEffect(() => { localStorage.setItem("cc_daily_activity", JSON.stringify(dailyActivityLog)); }, [dailyActivityLog]);
  useEffect(() => { localStorage.setItem("cc_meds", JSON.stringify(meds)); }, [meds]);
  useEffect(() => { localStorage.setItem("cc_trt_last", JSON.stringify(trtLastDate)); }, [trtLastDate]);
  useEffect(() => {
    const stored = loadStorage("cc_meds_taken", {});
    stored[localDate] = medsTakenToday;
    localStorage.setItem("cc_meds_taken", JSON.stringify(stored));
  }, [medsTakenToday]);
  useEffect(() => { if (medAnalysis) localStorage.setItem("cc_med_analysis", JSON.stringify(medAnalysis)); }, [medAnalysis]);
  useEffect(() => { localStorage.setItem("cc_wellness_log", JSON.stringify(wellnessLog)); }, [wellnessLog]);
  useEffect(() => {
    const stored = loadStorage("cc_water", {});
    stored[localDate] = waterOz;
    localStorage.setItem("cc_water", JSON.stringify(stored));
  }, [waterOz]);

  // ─── Show wellness check once per day ─────────────────────
  useEffect(() => {
    if (!wellnessLog[localDate] && meds.length > 0) {
      const lastCheck = loadStorage("cc_wellness_last", null);
      if (lastCheck !== localDate) {
        setTimeout(() => setShowWellnessModal(true), 3000);
      }
    }
  }, []);

  // ─── Rest timer countdown ──────────────────────────────────
  useEffect(() => {
    if (!resting || restTimer <= 0) return;
    const id = setInterval(() => {
      setRestTimer((prev) => {
        if (prev <= 1) {
          setResting(false);
          try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = "square"; osc.frequency.value = 880; osc.connect(ctx.destination); osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, 300); } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [resting, restTimer]);

  // ─── Auto-scroll chat ──────────────────────────────────────
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // ─── Random screen flicker (every 10-30s) ─────────────────
  useEffect(() => {
    const scheduleFlicker = () => {
      const delay = 10000 + Math.random() * 20000;
      return setTimeout(() => {
        if (screenRef.current) {
          screenRef.current.classList.add("screen-flicker");
          setTimeout(() => screenRef.current?.classList.remove("screen-flicker"), 150);
        }
        timerId = scheduleFlicker();
      }, delay);
    };
    let timerId = scheduleFlicker();
    return () => clearTimeout(timerId);
  }, []);

  // ─── News fetch ─────────────────────────────────────────────
  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      // NewsAPI free tier blocks browser requests in production (CORS).
      // Works in local dev only. Cached articles persist via localStorage.
      const res = await fetch(`https://newsapi.org/v2/top-headlines?country=us&pageSize=10&apiKey=${API_KEYS.NEWS}`);
      if (!res.ok) throw new Error(res.status === 426 || res.status === 403 ? "NewsAPI requires local dev or paid plan for browser requests" : `HTTP ${res.status}`);
      const data = await res.json();
      setNewsArticles(data.articles || []);
      localStorage.setItem("cc_news", JSON.stringify(data.articles || []));
    } catch (err) {
      setNewsError(err.message);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  // ─── Oura fetch (via proxy — all 4 endpoints) ──────────────
  const [proxyAvailable, setProxyAvailable] = useState(IS_LOCAL);

  const fetchOura = useCallback(async () => {
    if (!IS_LOCAL) { setOuraLoading(false); return; }
    setOuraLoading(true);
    try {
      // Always fetch a 5-day range to catch the most recent data
      const endDate = localDate;
      const startD = new Date(today);
      startD.setDate(startD.getDate() - 5);
      const startDate = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, "0")}-${String(startD.getDate()).padStart(2, "0")}`;

      let base = PROXY_URL;
      const rangeParams = `?start_date=${startDate}&end_date=${endDate}`;

      let sleepJson;
      // Quick check if primary proxy is up
      try {
        const t = await fetch(`${base}/oura/sleep${rangeParams}`);
        if (!t.ok) throw new Error();
        sleepJson = await t.json();
      } catch {
        base = PROXY_FALLBACK;
        sleepJson = await (await fetch(`${base}/oura/sleep${rangeParams}`)).json();
      }

      const [readinessJson, activityJson, hrJson] = await Promise.all([
        fetch(`${base}/oura/readiness${rangeParams}`).then((r) => r.json()),
        fetch(`${base}/oura/activity${rangeParams}`).then((r) => r.json()).catch(() => ({ data: [] })),
        fetch(`${base}/oura/heartrate?start_datetime=${startDate}T00:00:00&end_datetime=${endDate}T23:59:59`).then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      // Use the MOST RECENT entry (last item) from each response
      const sleepData = sleepJson.data || [];
      const readinessData = readinessJson.data || [];
      const activityData = activityJson.data || [];

      const sleepEntry = sleepData.length > 0 ? sleepData[sleepData.length - 1] : null;
      const readinessEntry = readinessData.length > 0 ? readinessData[readinessData.length - 1] : null;
      const activityEntry = activityData.length > 0 ? activityData[activityData.length - 1] : null;

      // Calculate resting HR from heart rate data
      const hrReadings = (hrJson.data || []).filter((r) => r.source === "rest");
      const restingHR = hrReadings.length > 0 ? Math.round(hrReadings.reduce((s, r) => s + r.bpm, 0) / hrReadings.length) : null;

      // Format display date label from the most recent activity or sleep entry
      const useDate = activityEntry?.day || sleepEntry?.day || endDate;
      const dd = new Date(useDate + "T12:00:00");
      const dataDateLabel = dd.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const ewd = activityEntry?.equivalent_walking_distance ?? null;

      const result = {
        sleepScore: sleepEntry?.score ?? null,
        sleepDuration: sleepEntry?.contributors?.total_sleep ?? null,
        readinessScore: readinessEntry?.score ?? null,
        hrvBalance: readinessEntry?.contributors?.hrv_balance ?? null,
        bodyTemp: readinessEntry?.contributors?.body_temperature ?? null,
        restingHRScore: readinessEntry?.contributors?.resting_heart_rate ?? null,
        activityScore: activityEntry?.score ?? null,
        steps: activityEntry?.steps ?? null,
        activeCalories: activityEntry?.active_calories ?? null,
        totalCalories: activityEntry?.total_calories ?? null,
        distanceMiles: ewd != null ? +(ewd / 1609).toFixed(1) : null,
        walkingDistance: ewd,
        highActivity: activityEntry?.high_activity_time ?? null,
        medActivity: activityEntry?.medium_activity_time ?? null,
        restingHR,
        dataDate: useDate,
        dataDateLabel,
        fetchedAt: new Date().toISOString(),
      };
      setOuraData(result);
      localStorage.setItem("cc_oura", JSON.stringify(result));
    } catch (err) {
      console.error("Oura fetch failed:", err);
      setProxyAvailable(false);
    } finally {
      setOuraLoading(false);
    }
  }, []);

  // ─── Fetch on mount ─────────────────────────────────────────
  useEffect(() => { fetchNews(); fetchOura(); }, [fetchNews, fetchOura]);
  useEffect(() => { if (activeTab === "news") fetchNews(); }, [activeTab, fetchNews]);

  // ─── Boot sequence ──────────────────────────────────────────
  useEffect(() => {
    const lines = [
      "    ╔══════════════════════════════════╗",
      "    ║   ██╗   ██╗████████╗            ║",
      "    ║   ██║   ██║╚══██╔══╝            ║",
      "    ║   ██║   ██║   ██║   VAULT-TEC   ║",
      "    ║   ╚██╗ ██╔╝   ██║   INDUSTRIES  ║",
      "    ║    ╚████╔╝    ██║               ║",
      "    ║     ╚═══╝     ╚═╝               ║",
      "    ╚══════════════════════════════════╝",
      "",
      "> INITIALIZING COMMAND CENTER v3.0...",
      "> LOADING STATE FILES...",
      "> DETECTING ELIZABETH WEEK...",
      "> SCANNING TASK ENGINE...",
      "> CONNECTING OURA RING...",
      "> SYNCING CALENDAR...",
      "> LOADING FINANCE LEDGER...",
      "> INITIALIZING AI ASSISTANT...",
      "> FETCHING NEWS FEED...",
      "> ALL SYSTEMS ONLINE.",
      "",
      "COMMAND CENTER v3.0 — PIP-BOY EDITION — ONLINE",
      `Ready for orders, ${USER.name}.`,
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < lines.length) { setBootText((prev) => prev + lines[i] + "\n"); i++; }
      else { clearInterval(interval); setTimeout(() => setBooted(true), 600); }
    }, 180);
    return () => clearInterval(interval);
  }, []);

  // ─── Task actions ───────────────────────────────────────────
  const toggleTask = (idx) => {
    const task = tasks[idx];
    const wasUndone = task && !task.done;
    setTasks((prev) => prev.map((t, i) => {
      if (i !== idx) return t;
      const nowDone = !t.done;
      return { ...t, done: nowDone, completedAt: nowDone ? new Date().toISOString() : null };
    }));
    // Flash the completed task row
    if (wasUndone) {
      setFlashingTaskIdx(idx);
      setTimeout(() => setFlashingTaskIdx(null), 600);
    }
    // Log activity
    if (wasUndone) {
      setDailyActivityLog((prev) => {
        const todayLog = prev[localDate] || [];
        return { ...prev, [localDate]: [...todayLog, { type: "task_complete", name: task.name, time: new Date().toISOString() }] };
      });
    }
  };

  const addTask = () => {
    if (!newTaskName.trim()) return;
    setTasks((prev) => [...prev, { name: newTaskName.trim(), category: newTaskCat, done: false, dueDate: newTaskDue || null, priority: newTaskPriority }]);
    setNewTaskName("");
    setNewTaskDue("");
  };

  const deleteTask = (idx) => setTasks((prev) => prev.filter((_, i) => i !== idx));

  const filteredTasks = taskFilter === "all" ? tasks : tasks.filter((t) => t.category === taskFilter);

  // ─── Weight / Macros / Strength ─────────────────────────────
  const logWeight = () => { const w = parseFloat(weightInput); if (!w) return; setWeights((prev) => [...prev, { date: new Date().toLocaleDateString(), weight: w }]); setWeightInput(""); };
  const logMacros = () => { const p = parseFloat(macroP), c = parseFloat(macroC), f = parseFloat(macroF); if (isNaN(p) || isNaN(c) || isNaN(f)) return; setMacros((prev) => [...prev, { date: new Date().toLocaleDateString(), protein: p, carbs: c, fat: f }]); setMacroP(""); setMacroC(""); setMacroF(""); };
  const logStrength = () => { if (!strengthExercise.trim()) return; setStrengthLog((prev) => [...prev, { date: new Date().toLocaleDateString(), exercise: strengthExercise.trim(), weight: strengthWeight || "BW", reps: strengthReps || "-", sets: strengthSets || "-" }]); setStrengthExercise(""); setStrengthWeight(""); setStrengthReps(""); setStrengthSets(""); };

  // ─── Calendar actions ───────────────────────────────────────
  const addCalEvent = () => {
    if (!eventTitle.trim() || selectedDay === null) return;
    const dateString = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    setCalEvents((prev) => [...prev, { id: Date.now(), date: dateString, title: eventTitle.trim(), time: eventTime, category: eventCat }]);
    setEventTitle("");
    setEventTime("");
  };

  const deleteCalEvent = (id) => setCalEvents((prev) => prev.filter((e) => e.id !== id));

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); setSelectedDay(null); };

  // ─── Finance actions ────────────────────────────────────────
  const addTransaction = () => {
    const amt = parseFloat(finAmount);
    if (!amt || amt <= 0) return;
    setTransactions((prev) => [...prev, { id: Date.now(), type: finType, amount: amt, category: finType === "expense" ? finCat : "Income", description: finType === "expense" ? finDesc : finDesc || "Income", date: localDate }]);
    setFinAmount("");
    setFinDesc("");
  };

  // ─── AI Chat ────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const input = chatInput.trim();
    // Navigation intent detection
    const navMatch = input.match(/^(?:navigate to|directions to|take me to|go to)\s+(.+)$/i);
    if (navMatch) {
      const dest = navMatch[1];
      setChatMessages((prev) => [...prev, { role: "user", content: input }, { role: "assistant", content: `Opening navigation to: ${dest}` }]);
      setChatInput("");
      navigateTo(dest);
      return;
    }
    const userMsg = { role: "user", content: input };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`${PROXY_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: AI_SYSTEM_PROMPT, messages: newMessages }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const assistantText = data.content?.[0]?.text || "No response.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: `[ERROR] ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const clearChat = () => { setChatMessages([]); localStorage.removeItem("cc_chat"); };

  // ─── Meds functions ───────────────────────────────────────
  const addMed = () => {
    if (!newMedName.trim()) return;
    setMeds((prev) => [...prev, { id: Date.now(), name: newMedName.trim(), dosage: newMedDosage.trim(), frequency: newMedFreq, timeOfDay: newMedTime, category: newMedCat }]);
    setNewMedName(""); setNewMedDosage("");
  };
  const deleteMed = (id) => setMeds((prev) => prev.filter((m) => m.id !== id));
  const toggleMedTaken = (id) => setMedsTakenToday((prev) => ({ ...prev, [id]: !prev[id] }));

  // ─── TRT Injection Logic ────────────────────────────────────
  const trtNextD = new Date(trtLastDate + "T12:00:00");
  trtNextD.setDate(trtNextD.getDate() + 6);
  const trtNextDate = `${trtNextD.getFullYear()}-${String(trtNextD.getMonth() + 1).padStart(2, "0")}-${String(trtNextD.getDate()).padStart(2, "0")}`;
  const trtNextLabel = trtNextD.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const trtLastLabel = new Date(trtLastDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const trtDaysUntil = Math.round((trtNextD - new Date(localDate + "T12:00:00")) / (1000 * 60 * 60 * 24));
  const trtColor = trtDaysUntil >= 3 ? "var(--pip-green)" : trtDaysUntil >= 1 ? "var(--pip-amber)" : "#ff4444";
  const trtStatusText = trtDaysUntil > 0 ? `${trtDaysUntil} DAY${trtDaysUntil !== 1 ? "S" : ""}` : trtDaysUntil === 0 ? "TODAY" : `OVERDUE ${Math.abs(trtDaysUntil)}d`;
  const markTrtTaken = () => setTrtLastDate(localDate);

  const analyzeMeds = async () => {
    if (meds.length === 0) return;
    setMedAnalysisLoading(true);
    const medList = meds.map((m) => `${m.name} ${m.dosage} (${m.category}, ${m.frequency}, ${m.timeOfDay})`).join(", ");
    try {
      const res = await fetch(`${PROXY_URL}/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "You are a supplement and medication advisor for the Command Center. Analyze this supplement stack for a male doing heavy strength training 4x/week with a goal of weight gain and muscle building. Provide: 1) Any interactions or warnings between these supplements and the prescription medication 2) Optimal timing schedule (what to take when) 3) Recommendations to improve the stack based on his goals 4) Anything redundant. Be concise and direct.",
          messages: [{ role: "user", content: `Full supplement/medication stack:\n${medList}` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "Analysis unavailable.";
      setMedAnalysis({ text, analyzedAt: new Date().toISOString(), medCount: meds.length });
    } catch (err) {
      setMedAnalysis({ text: `[ERROR] ${err.message}`, analyzedAt: new Date().toISOString(), medCount: meds.length });
    } finally {
      setMedAnalysisLoading(false);
    }
  };

  // ─── Wellness check submit ────────────────────────────────
  const submitWellness = () => {
    const entry = { feeling: wellnessFeeling, sideEffects: wellnessSideEffects, energy: wellnessEnergy, sleepQuality: wellnessSleep, date: localDate, time: new Date().toISOString() };
    setWellnessLog((prev) => ({ ...prev, [localDate]: entry }));
    localStorage.setItem("cc_wellness_last", JSON.stringify(localDate));
    setShowWellnessModal(false);
    setWellnessSideEffects("");
  };

  // ─── Meal photo macro estimation ──────────────────────────
  const handleMealPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMealEstLoading(true);
    setMealEstimate(null);
    // Convert to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];
      const mediaType = file.type || "image/jpeg";
      setMealPhoto(reader.result);
      try {
        const res = await fetch(`${PROXY_URL}/ai/chat`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            max_tokens: 512,
            messages: [{ role: "user", content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: 'Estimate the macronutrients in this meal. Return ONLY a JSON object: {"protein": number, "carbs": number, "fat": number, "calories": number, "description": "brief meal description"}. Be reasonable with portions.' },
            ] }],
          }),
        });
        const data = await res.json();
        const text = data.content?.[0]?.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          setMealEstimate(JSON.parse(jsonMatch[0]));
        } else {
          setMealEstimate({ error: text });
        }
      } catch (err) {
        setMealEstimate({ error: err.message });
      } finally {
        setMealEstLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const logMealEstimate = () => {
    if (!mealEstimate || mealEstimate.error) return;
    setMacros((prev) => [...prev, { date: new Date().toLocaleDateString(), protein: mealEstimate.protein, carbs: mealEstimate.carbs, fat: mealEstimate.fat }]);
    setMealEstimate(null);
    setMealPhoto(null);
  };

  // ─── Water tracking ───────────────────────────────────────
  const addWater = (oz) => setWaterOz((prev) => prev + oz);
  const addCustomWater = () => { const oz = parseInt(customWater); if (oz > 0) { addWater(oz); setCustomWater(""); } };

  // ─── Navigation command ────────────────────────────────────
  const navigateTo = (destination) => {
    if (!destination || !destination.trim()) return;
    const encoded = encodeURIComponent(destination.trim());
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, "_blank");
  };

  const handleNavPrompt = () => {
    const dest = prompt("ENTER DESTINATION:");
    if (dest) navigateTo(dest);
  };

  // ─── Voice briefing ────────────────────────────────────────
  const speakBriefing = async () => {
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Afternoon" : "Evening";
    const ouraText = ouraData ? `Sleep score ${ouraData.sleepScore ?? "unknown"}. Readiness score ${ouraData.readinessScore ?? "unknown"}. Activity score ${ouraData.activityScore ?? "unknown"}. Steps: ${ouraData.steps?.toLocaleString() ?? "unknown"}. Active calories: ${ouraData.activeCalories ?? "unknown"}.` : "";
    const trtText = trtDaysUntil <= 2 ? `TRT injection ${trtDaysUntil === 0 ? "is due today" : trtDaysUntil < 0 ? "is overdue" : `due in ${trtDaysUntil} day${trtDaysUntil !== 1 ? "s" : ""}`}.` : "";
    const text = [
      `${greeting}, ${USER.name}.`,
      `Today is ${dateStr}.`,
      elizabethWeek ? "Elizabeth week is active." : ewDaysUntil != null && ewDaysUntil <= 3 ? `Elizabeth week starts in ${ewDaysUntil} day${ewDaysUntil !== 1 ? "s" : ""}.` : "Elizabeth week is inactive.",
      `Training today: ${isTrainingDay ? `Yes, ${dayName}` : "Rest day"}.`,
      `Glide path day ${glideDay} of 7. ${glideDay <= 3 ? "Build Phase" : glideDay <= 5 ? "Push Phase" : "Finish Strong"}.`,
      `Tasks: ${tasks.filter((t) => t.done).length} of ${tasks.length} complete.`,
      `Water intake: ${waterOz} of ${WATER_TARGET} ounces.`,
      ouraText, trtText, ...birthdays,
    ].join(" ");
    setSpeaking(true);
    try {
      const res = await fetch(PROXY_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.play();
    } catch {
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const british = voices.find((v) => v.lang.startsWith("en-GB") && /male|daniel|james/i.test(v.name)) || voices.find((v) => v.lang.startsWith("en-GB")) || voices[0];
      if (british) utter.voice = british;
      utter.rate = 0.95;
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      synth.speak(utter);
    }
  };

  // ─── Workout Mode Functions ──────────────────────────────
  const todayExercises = isTrainingDay && WEEK_A[dayName] ? WEEK_A[dayName] : [];

  const startWorkout = () => {
    setWorkoutActive(true);
    setWorkoutExerciseIdx(0);
    setWorkoutCurrentSet(0);
    setWorkoutLog([]);
    setWorkoutWeightInput("");
    setRestTimer(0);
    setResting(false);
    setWorkoutStartTime(Date.now());
  };

  const completeSet = () => {
    const ex = todayExercises[workoutExerciseIdx];
    if (!ex) return;
    const parsed = parseSets(ex.sets);
    const weight = workoutWeightInput || "BW";
    setWorkoutLog((prev) => [...prev, { exercise: ex.name, set: workoutCurrentSet + 1, weight, reps: parsed.reps, time: new Date().toISOString() }]);
    setDailyActivityLog((prev) => {
      const todayLog = prev[localDate] || [];
      return { ...prev, [localDate]: [...todayLog, { type: "set_complete", exercise: ex.name, set: workoutCurrentSet + 1, weight, time: new Date().toISOString() }] };
    });
    if (workoutCurrentSet + 1 < parsed.numSets) {
      setWorkoutCurrentSet((prev) => prev + 1);
      setRestTimer(90);
      setResting(true);
    } else {
      setWorkoutCurrentSet(0);
      setWorkoutWeightInput("");
      if (workoutExerciseIdx + 1 < todayExercises.length) {
        setRestTimer(90);
        setResting(true);
      }
    }
  };

  const nextExercise = () => {
    if (workoutExerciseIdx + 1 < todayExercises.length) {
      setWorkoutExerciseIdx((prev) => prev + 1);
      setWorkoutCurrentSet(0);
      setWorkoutWeightInput("");
      setResting(false);
      setRestTimer(0);
    }
  };

  const endWorkout = () => {
    // Batch convert workout log into strength log entries
    const exerciseMap = {};
    workoutLog.forEach((entry) => {
      if (!exerciseMap[entry.exercise]) exerciseMap[entry.exercise] = { weight: entry.weight, sets: 0, reps: entry.reps };
      exerciseMap[entry.exercise].sets++;
      exerciseMap[entry.exercise].weight = entry.weight;
    });
    const newEntries = Object.entries(exerciseMap).map(([exercise, data]) => ({
      date: new Date().toLocaleDateString(), exercise, weight: data.weight, reps: data.reps, sets: String(data.sets),
    }));
    setStrengthLog((prev) => [...prev, ...newEntries]);
    // Log workout completion
    const elapsed = workoutStartTime ? Math.round((Date.now() - workoutStartTime) / 60000) : 0;
    setDailyActivityLog((prev) => {
      const todayLog = prev[localDate] || [];
      return { ...prev, [localDate]: [...todayLog, { type: "workout_complete", duration: elapsed, exercises: Object.keys(exerciseMap).length, sets: workoutLog.length, time: new Date().toISOString() }] };
    });
    setWorkoutActive(false);
    setWorkoutLog([]);
    setResting(false);
    setRestTimer(0);
  };

  // ─── Daily Report Functions ─────────────────────────────
  const generateDailyReport = () => {
    const tasksDone = tasks.filter((t) => t.done);
    const tasksRemaining = tasks.filter((t) => !t.done);
    const todayStrength = strengthLog.filter((s) => s.date === new Date().toLocaleDateString());
    const todayWeight = weights.length > 0 ? weights[weights.length - 1] : null;
    const todayMacros = macros.length > 0 ? macros[macros.length - 1] : null;
    const todayEvents = calEvents.filter((e) => e.date === localDate);
    const todayTxns = transactions.filter((t) => t.date === localDate);
    const activityToday = dailyActivityLog[localDate] || [];

    const report = {
      date: localDate,
      generatedAt: new Date().toISOString(),
      tasks: { completed: tasksDone.map((t) => t.name), remaining: tasksRemaining.map((t) => t.name), completionPct: totalTasks > 0 ? Math.round((tasksDone.length / totalTasks) * 100) : 0 },
      training: { isTrainingDay, exercises: todayStrength, dayName: isTrainingDay ? dayName : "Rest Day" },
      health: { oura: ouraData, weight: todayWeight, macros: todayMacros, waterOz },
      calendar: { events: todayEvents },
      finance: { transactions: todayTxns, balance: totalBalance },
      family: { elizabethWeek },
      meds: { taken: medsTakenCount, total: medsTotal, complete: allMedsTaken },
      activityLog: activityToday,
    };

    setDailyReports((prev) => ({ ...prev, [localDate]: report }));
    setReportViewDate(localDate);
    setReportModal("view");
  };

  const speakReport = async (report) => {
    if (!report) return;
    const lines = [
      `Daily report for ${report.date}.`,
      `Tasks: ${report.tasks.completed.length} completed, ${report.tasks.remaining.length} remaining. ${report.tasks.completionPct}% completion.`,
      report.training.isTrainingDay ? `Training day: ${report.training.dayName}. ${report.training.exercises.length} exercises logged.` : "Rest day.",
      report.health.oura ? `Sleep score ${report.health.oura.sleepScore ?? "unknown"}. Readiness ${report.health.oura.readinessScore ?? "unknown"}.` : "",
      report.health.weight ? `Weight: ${report.health.weight.weight} pounds.` : "",
      `Elizabeth week: ${report.family.elizabethWeek ? "active" : "inactive"}.`,
      `Balance: $${report.finance.balance.toFixed(0)}.`,
    ].filter(Boolean).join(" ");

    setReportSpeaking(true);
    try {
      const res = await fetch(PROXY_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: lines }) });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { setReportSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setReportSpeaking(false); URL.revokeObjectURL(url); };
      audio.play();
    } catch {
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(lines);
      utter.rate = 0.95;
      utter.onend = () => setReportSpeaking(false);
      utter.onerror = () => setReportSpeaking(false);
      synth.speak(utter);
    }
  };

  // ─── Computed values ────────────────────────────────────────
  const completedCount = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;
  const completionPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Meds completion (excludes TRT)
  const dailyMeds = meds.filter((m) => m.id !== 10);
  const medsTakenCount = dailyMeds.filter((m) => medsTakenToday[m.id]).length;
  const medsTotal = dailyMeds.length;
  const allMedsTaken = medsTotal > 0 && medsTakenCount === medsTotal;
  const medsCompletedAt = allMedsTaken ? new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;

  // ─── Sync "Take Vitamins" task with meds completion ────────
  useEffect(() => {
    const vitIdx = tasks.findIndex((t) => t.name === "Take Vitamins");
    if (vitIdx === -1) return;
    if (allMedsTaken && !tasks[vitIdx].done) {
      setTasks((prev) => prev.map((t, i) => i === vitIdx ? { ...t, done: true, completedAt: new Date().toISOString() } : t));
    } else if (!allMedsTaken && tasks[vitIdx].done) {
      setTasks((prev) => prev.map((t, i) => i === vitIdx ? { ...t, done: false, completedAt: null } : t));
    }
  }, [allMedsTaken]);

  function scoreClass(score) { if (score == null) return ""; return score >= 70 ? "good" : score >= 50 ? "warn" : "low"; }

  // Report streak
  const reportStreak = useMemo(() => {
    let streak = 0;
    const d = new Date(today);
    while (true) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (dailyReports[key]) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }, [dailyReports]);

  // Finance computations for current view month
  const monthTransactions = useMemo(() => transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === finMonth && d.getFullYear() === finYear;
  }), [transactions, finMonth, finYear]);

  const monthIncome = useMemo(() => monthTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [monthTransactions]);
  const monthExpenses = useMemo(() => monthTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [monthTransactions]);
  const totalBalance = useMemo(() => transactions.reduce((s, t) => t.type === "income" ? s + t.amount : s - t.amount, 0), [transactions]);

  const expenseByCategory = useMemo(() => {
    const cats = {};
    monthTransactions.filter((t) => t.type === "expense").forEach((t) => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
    return cats;
  }, [monthTransactions]);
  const maxCatExpense = useMemo(() => Math.max(...Object.values(expenseByCategory), 1), [expenseByCategory]);

  // Calendar events for selected month
  const monthEvents = useMemo(() => calEvents.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === calMonth && d.getFullYear() === calYear;
  }), [calEvents, calMonth, calYear]);

  // Upcoming events for briefing
  const upcomingEvents = useMemo(() => calEvents.filter((e) => e.date >= localDate).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3), [calEvents]);

  // Ticker items
  const tickerItems = useMemo(() => {
    const items = [];
    const dueTasks = tasks.filter((t) => !t.done && t.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (dueTasks.length) items.push(`NEXT DUE: ${dueTasks[0].name} (${dueTasks[0].dueDate})`);
    if (upcomingEvents.length) items.push(`NEXT EVENT: ${upcomingEvents[0].title} (${upcomingEvents[0].date})`);
    if (weights.length >= 2) {
      const diff = (weights[weights.length - 1].weight - weights[weights.length - 2].weight).toFixed(1);
      items.push(`WEIGHT: ${weights[weights.length - 1].weight} lbs (${diff > 0 ? "+" : ""}${diff})`);
    } else if (weights.length === 1) {
      items.push(`WEIGHT: ${weights[0].weight} lbs`);
    }
    if (ouraData?.readinessScore) items.push(`READINESS: ${ouraData.readinessScore}/100`);
    if (ouraData?.activityScore) items.push(`ACTIVITY: ${ouraData.activityScore}/100`);
    items.push(`EW: ${elizabethWeek ? "ACTIVE" : "OFF"}`);
    items.push(`TASKS: ${completedCount}/${totalTasks}`);
    items.push(allMedsTaken ? "MEDS: COMPLETE" : `MEDS: ${medsTakenCount}/${medsTotal}`);
    if (items.length === 0) items.push("ALL SYSTEMS NOMINAL");
    return items;
  }, [tasks, upcomingEvents, weights, ouraData, completedCount, totalTasks, allMedsTaken, medsTakenCount, medsTotal]);

  // ─── BOOT SCREEN ─────────────────────────────────────────
  if (!booted) {
    return (
      <>
        <style>{globalCSS}</style>
        <div className="crt-overlay" />
        <div className="pipboy-device">
          <div className="pipboy-frame">
            <div className="pipboy-rivet tl" />
            <div className="pipboy-rivet tr" />
            <div className="pipboy-rivet bl" />
            <div className="pipboy-rivet br" />
            <div className="pipboy-knob" />
            <div className="pipboy-screen">
              <div style={{ padding: "40px 20px", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <pre style={{ color: "var(--pip-green)", fontSize: "0.75rem", lineHeight: 1.7, textShadow: "var(--pip-text-glow)", whiteSpace: "pre-wrap", fontFamily: "'Share Tech Mono', monospace" }}>
                  {bootText}<span className="cursor-blink" />
                </pre>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── WORKOUT MODE RENDERER ──────────────────────────────
  const renderWorkoutMode = () => {
    const ex = todayExercises[workoutExerciseIdx];
    if (!ex) return null;
    const parsed = parseSets(ex.sets);
    const animKey = getAnimationKey(ex.name);
    const cueData = FORM_CUES[animKey] || FORM_CUES.generic;
    const cues = cueData.cues || [];
    const muscles = cueData.muscles;
    const mistakes = cueData.mistakes;
    const svgHtml = EXERCISE_SVGS[animKey] || EXERCISE_SVGS.generic;
    const circumference = 2 * Math.PI * 85;

    return (
      <div className="workout-mode">
        {resting && restTimer > 0 && (
          <div className="rest-timer-overlay">
            <div className="rest-timer-circle">
              <svg viewBox="0 0 180 180">
                <circle className="track" cx="90" cy="90" r="85" />
                <circle className="progress" cx="90" cy="90" r="85"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - restTimer / 90)} />
              </svg>
              <div className="timer-text">
                <div className="rest-timer-value">{Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, "0")}</div>
              </div>
            </div>
            <div className="rest-timer-label">Rest Period</div>
            <button className="workout-btn" style={{ marginTop: 20 }} onClick={() => { setResting(false); setRestTimer(0); }}>SKIP REST</button>
          </div>
        )}

        <div style={{ fontSize: ".65rem", color: "var(--pip-green-dark)", letterSpacing: 2, marginBottom: 12, textAlign: "center" }}>
          EXERCISE {workoutExerciseIdx + 1} OF {todayExercises.length}
        </div>

        <div className="workout-exercise-display">
          <div className="workout-exercise-name">{ex.name}</div>
          <div className="workout-set-info">{ex.sets} — Set {workoutCurrentSet + 1} of {parsed.numSets}</div>
          <div className="workout-animation" dangerouslySetInnerHTML={{ __html: svgHtml }} />
        </div>

        <div className="workout-cues">
          <div style={{ fontSize: ".6rem", letterSpacing: 2, color: "var(--pip-amber)", marginBottom: 6 }}>FORM CUES</div>
          {cues.map((cue, i) => <div key={i} className="workout-cue-item">{cue}</div>)}
          {muscles && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: ".55rem", letterSpacing: 2, color: "var(--pip-green-dim)", marginBottom: 4 }}>MUSCLES</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {muscles.primary.map((m, i) => <span key={i} style={{ fontSize: ".6rem", padding: "2px 8px", border: "1px solid var(--pip-green)", color: "var(--pip-green)", letterSpacing: 1 }}>{m}</span>)}
                {muscles.secondary.map((m, i) => <span key={`s${i}`} style={{ fontSize: ".6rem", padding: "2px 8px", border: "1px solid var(--pip-green-dim)", color: "var(--pip-green-dim)", letterSpacing: 1 }}>{m}</span>)}
              </div>
            </div>
          )}
          {mistakes && mistakes.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: ".55rem", letterSpacing: 2, color: "#ff4444", marginBottom: 4 }}>AVOID</div>
              {mistakes.map((m, i) => <div key={i} style={{ fontSize: ".65rem", color: "rgba(255,68,68,.7)", padding: "2px 0", letterSpacing: 1 }}>! {m}</div>)}
            </div>
          )}
        </div>

        <div className="workout-weight-input">
          <label>WEIGHT:</label>
          <input type="text" className="pip-input" style={{ maxWidth: 100 }} placeholder="lbs/BW" value={workoutWeightInput} onChange={(e) => setWorkoutWeightInput(e.target.value)} />
        </div>

        <div className="workout-progress-bar">
          {Array.from({ length: parsed.numSets }, (_, i) => (
            <div key={i} className={`workout-progress-pip ${i < workoutCurrentSet ? "done" : i === workoutCurrentSet ? "current" : ""}`}>{i + 1}</div>
          ))}
        </div>

        <div className="workout-actions">
          <button className="workout-btn primary" onClick={completeSet}>COMPLETE SET</button>
          {workoutExerciseIdx + 1 < todayExercises.length && (
            <button className="workout-btn" onClick={nextExercise}>NEXT EXERCISE</button>
          )}
          <button className="workout-btn danger" onClick={endWorkout}>END WORKOUT</button>
        </div>

        {workoutLog.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--pip-border)", paddingTop: 12 }}>
            <div style={{ fontSize: ".6rem", letterSpacing: 2, color: "var(--pip-green-dim)", marginBottom: 6 }}>WORKOUT LOG ({workoutLog.length} SETS)</div>
            {workoutLog.slice(-5).map((entry, i) => (
              <div key={i} className="stat-row">
                <span className="stat-label">{entry.exercise} — Set {entry.set}</span>
                <span className="stat-value">{entry.weight} x {entry.reps}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── REPORT MODAL RENDERER ─────────────────────────────
  const renderReportModal = () => {
    if (!reportModal) return null;

    if (reportModal === "history") {
      const dates = Object.keys(dailyReports).sort().reverse();
      return (
        <div className="report-modal-overlay" onClick={() => setReportModal(null)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <div className="report-modal-title">Report History</div>
              <button className="pip-btn small" onClick={() => setReportModal(null)}>CLOSE</button>
            </div>
            {dates.length === 0 ? (
              <div className="empty-state">NO REPORTS GENERATED YET</div>
            ) : dates.map((date) => (
              <div key={date} className="report-history-item" onClick={() => { setReportViewDate(date); setReportModal("view"); }}>
                <span>{date}</span>
                <span style={{ color: "var(--pip-green-dim)" }}>{dailyReports[date].tasks?.completionPct ?? 0}% tasks</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const report = dailyReports[reportViewDate];
    if (!report) return null;

    return (
      <div className="report-modal-overlay" onClick={() => setReportModal(null)}>
        <div className="report-modal" onClick={(e) => e.stopPropagation()}>
          <div className="report-modal-header">
            <div className="report-modal-title">Daily Report — {report.date}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="pip-btn small" onClick={() => setReportModal("history")}>HISTORY</button>
              <button className="pip-btn small" onClick={() => setReportModal(null)}>CLOSE</button>
            </div>
          </div>

          <div className="report-section">
            <h4>Tasks</h4>
            <div className="report-line"><strong>Completion:</strong> {report.tasks.completionPct}%</div>
            <div className="report-line"><strong>Completed ({report.tasks.completed.length}):</strong> {report.tasks.completed.join(", ") || "None"}</div>
            <div className="report-line"><strong>Remaining ({report.tasks.remaining.length}):</strong> {report.tasks.remaining.join(", ") || "All done!"}</div>
          </div>

          <div className="report-section">
            <h4>Training</h4>
            <div className="report-line"><strong>Day:</strong> {report.training.dayName}</div>
            {report.training.exercises.length > 0 ? report.training.exercises.map((ex, i) => (
              <div key={i} className="report-line">{ex.exercise}: {ex.weight} x {ex.reps} x {ex.sets}</div>
            )) : <div className="report-line">No exercises logged</div>}
          </div>

          <div className="report-section">
            <h4>Health</h4>
            {report.health.oura ? (
              <>
                <div className="report-line"><strong>Sleep:</strong> {report.health.oura.sleepScore ?? "—"}/100</div>
                <div className="report-line"><strong>Readiness:</strong> {report.health.oura.readinessScore ?? "—"}/100</div>
                <div className="report-line"><strong>Activity:</strong> {report.health.oura.activityScore ?? "—"}/100</div>
                <div className="report-line"><strong>Steps:</strong> {report.health.oura.steps?.toLocaleString() ?? "—"}</div>
              </>
            ) : <div className="report-line">No Oura data</div>}
            {report.health.weight && <div className="report-line"><strong>Weight:</strong> {report.health.weight.weight} lbs</div>}
            {report.health.macros && <div className="report-line"><strong>Macros:</strong> P:{report.health.macros.protein}g C:{report.health.macros.carbs}g F:{report.health.macros.fat}g</div>}
          </div>

          <div className="report-section">
            <h4>Calendar</h4>
            {report.calendar.events.length > 0 ? report.calendar.events.map((e, i) => (
              <div key={i} className="report-line">{e.time || "All day"} — {e.title}</div>
            )) : <div className="report-line">No events</div>}
          </div>

          <div className="report-section">
            <h4>Finance</h4>
            <div className="report-line"><strong>Balance:</strong> ${report.finance.balance.toFixed(2)}</div>
            {report.finance.transactions.length > 0 ? report.finance.transactions.map((t, i) => (
              <div key={i} className="report-line">{t.type === "income" ? "+" : "-"}${t.amount.toFixed(2)} — {t.description || t.category}</div>
            )) : <div className="report-line">No transactions today</div>}
          </div>

          <div className="report-section">
            <h4>Family</h4>
            <div className="report-line"><strong>Elizabeth Week:</strong> {report.family.elizabethWeek ? "ACTIVE" : "INACTIVE"}</div>
          </div>

          <button className="pip-btn" style={{ width: "100%", marginTop: 12, padding: "10px 16px" }} onClick={() => speakReport(report)} disabled={reportSpeaking}>
            {reportSpeaking ? "SPEAKING..." : "SPEAK REPORT"}
          </button>
        </div>
      </div>
    );
  };

  // ─── TAB CONTENT ──────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {

      // ════════════════════════════════════════════════════════
      // STAT TAB
      // ════════════════════════════════════════════════════════
      case "stat":
        return (
          <div>
            <div className="section-title">// Morning Briefing</div>
            <div className="briefing-block">
              <h3>{hour < 12 ? "Good Morning" : hour < 17 ? "Afternoon" : "Evening"}, {USER.name}</h3>
              <div className="briefing-line"><strong>Date:</strong> {dateStr}</div>
              <div className="briefing-line"><strong>Role:</strong> {USER.role}</div>
              {elizabethWeek ? (
                <div style={{ background: "rgba(24,255,109,.08)", border: "1px solid var(--pip-green)", padding: "8px 12px", margin: "8px 0", textAlign: "center", textShadow: "var(--pip-text-glow)", letterSpacing: 2, fontSize: ".8rem", color: "var(--pip-green)" }}>
                  ELIZABETH WEEK — ACTIVE
                </div>
              ) : (
                <div className="briefing-line"><strong>Elizabeth Week:</strong>{" "}<span className="stat-value inactive">INACTIVE</span></div>
              )}
              <div className="briefing-line"><strong>Training Today:</strong>{" "}<span className={`stat-value ${isTrainingDay ? "active" : "inactive"}`}>{isTrainingDay ? "YES \u2014 " + dayName.toUpperCase() : "REST DAY"}</span></div>
            </div>

            <div className="briefing-block">
              <h3>Oura Ring {ouraData?.dataDateLabel ? `\u2014 ${ouraData.dataDateLabel}` : "\u2014 Today"}</h3>
              {ouraLoading && !ouraData ? (
                <div className="briefing-line">Fetching Oura data...</div>
              ) : ouraData ? (
                <>
                  <div className="oura-score-row">
                    <div className="oura-score-card"><div className="score-label">Sleep</div><div className={`score-value ${scoreClass(ouraData.sleepScore)}`}>{ouraData.sleepScore ?? "\u2014"}</div></div>
                    <div className="oura-score-card"><div className="score-label">Readiness</div><div className={`score-value ${scoreClass(ouraData.readinessScore)}`}>{ouraData.readinessScore ?? "\u2014"}</div></div>
                    <div className="oura-score-card"><div className="score-label">Activity</div><div className={`score-value ${scoreClass(ouraData.activityScore)}`}>{ouraData.activityScore ?? "\u2014"}</div></div>
                    <div className="oura-score-card"><div className="score-label">Duration</div><div className="score-value">{formatDuration(ouraData.sleepDuration)}</div></div>
                  </div>
                  <div className="oura-score-row">
                    <div className="oura-score-card"><div className="score-label">Steps</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{ouraData.steps?.toLocaleString() ?? "\u2014"}</div></div>
                    <div className="oura-score-card"><div className="score-label">Active Cal</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{ouraData.activeCalories ?? "\u2014"}</div></div>
                  </div>
                </>
              ) : (
                <div className="briefing-line" style={{ color: "var(--pip-green-dark)" }}>No Oura data available</div>
              )}
            </div>

            <div className="briefing-block">
              <h3>7-Day Glide Path</h3>
              <div className="glide-day">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <div key={d} className={`glide-pip ${d === glideDay ? "current" : d < glideDay ? "past" : ""}`}>{d}</div>
                ))}
              </div>
              <div className="briefing-line" style={{ textAlign: "center" }}>Day {glideDay} of 7 \u2014 {glideDay <= 3 ? "Build Phase" : glideDay <= 5 ? "Push Phase" : "Finish Strong"}</div>
            </div>

            <div className="briefing-block">
              <h3>Execution Status</h3>
              <div className="health-bar-container">
                <div className="health-bar-label"><span>TASKS COMPLETE</span><span>{completedCount}/{totalTasks} ({completionPct}%)</span></div>
                <div className="health-bar-track"><div className="health-bar-fill" style={{ width: `${completionPct}%` }} /></div>
              </div>
              <div className="briefing-line" style={{ marginTop: 8 }}>
                <strong>Vitamins:</strong>{" "}
                {allMedsTaken ? (
                  <span style={{ color: "var(--pip-green)", fontWeight: "bold" }}>{"\u2713"} COMPLETE</span>
                ) : (
                  <span style={{ color: "var(--pip-amber)" }}>{medsTakenCount}/{medsTotal} TAKEN</span>
                )}
              </div>
            </div>

            {reportStreak > 0 && (
              <div className="briefing-block">
                <h3>Report Streak</h3>
                <div className="streak-badge">{"\u2605"} {reportStreak} DAY{reportStreak !== 1 ? "S" : ""} STREAK</div>
              </div>
            )}

            {upcomingEvents.length > 0 && (
              <div className="briefing-block">
                <h3>Upcoming Events</h3>
                {upcomingEvents.map((e) => (
                  <div key={e.id} className="briefing-line">
                    <span style={{ color: EVENT_COLORS[e.category] }}>{"\u25CF"} </span>
                    <strong>{e.date}</strong> {e.time && `@ ${e.time}`} \u2014 {e.title}
                  </div>
                ))}
              </div>
            )}

            {(birthdays.length > 0 || trtDaysUntil <= 2 || (ewDaysUntil != null && ewDaysUntil <= 3)) && (
              <div className="briefing-block alert-pulse">
                <h3>Alerts</h3>
                {ewDaysUntil != null && ewDaysUntil <= 3 && (
                  <div className="briefing-line alert" style={{ color: "var(--pip-amber)", fontWeight: "bold" }}>
                    ELIZABETH WEEK STARTS IN {ewDaysUntil} DAY{ewDaysUntil !== 1 ? "S" : ""}
                  </div>
                )}
                {trtDaysUntil <= 2 && (
                  <div className="briefing-line alert" style={{ color: trtColor, fontWeight: "bold" }}>
                    TRT INJECTION: {trtStatusText} — due {trtNextLabel}
                  </div>
                )}
                {birthdays.map((b, i) => <div key={i} className="briefing-line alert" style={{ color: "var(--pip-amber)" }}>{b}</div>)}
              </div>
            )}

            <button className="pip-btn" style={{ width: "100%", marginTop: 16, padding: "12px 16px" }} onClick={speakBriefing} disabled={speaking}>
              {speaking ? "SPEAKING..." : "SPEAK BRIEFING"}
            </button>

            <button className="pip-btn" style={{ width: "100%", marginTop: 8, padding: "12px 16px" }} onClick={generateDailyReport}>
              GENERATE DAILY REPORT
            </button>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {dailyReports[localDate] && (
                <button className="pip-btn" style={{ flex: 1, padding: "10px 16px" }} onClick={() => { setReportViewDate(localDate); setReportModal("view"); }}>
                  VIEW TODAY'S REPORT
                </button>
              )}
              <button className="pip-btn" style={{ flex: 1, padding: "10px 16px" }} onClick={() => setReportModal("history")}>
                REPORT HISTORY
              </button>
            </div>

            <button className="pip-btn" style={{ width: "100%", marginTop: 8, padding: "12px 16px" }} onClick={handleNavPrompt}>
              NAVIGATE
            </button>
          </div>
        );

      // ════════════════════════════════════════════════════════
      // TASKS TAB (Upgraded)
      // ════════════════════════════════════════════════════════
      case "tasks":
        return (
          <div>
            <div className="section-title">// Task Engine v2</div>

            {/* Filter buttons */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
              {["all", ...TASK_CATEGORIES].map((cat) => (
                <button key={cat} className={`pip-btn small ${taskFilter === cat ? "active-filter" : ""}`} onClick={() => setTaskFilter(cat)}>
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Task list */}
            {filteredTasks.map((t, i) => {
              const realIdx = tasks.indexOf(t);
              return (
                <div key={i} className={`task-item ${t.done ? "completed" : ""} ${flashingTaskIdx === realIdx ? "task-flash" : ""}`}>
                  <div className="task-priority" style={{ background: PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.med }} />
                  <div className={`task-checkbox ${t.done ? "checked" : ""}`} onClick={() => toggleTask(realIdx)}>
                    {t.done ? "\u2713" : ""}
                  </div>
                  <span onClick={() => toggleTask(realIdx)} style={{ flex: 1, cursor: "pointer" }}>{t.name}</span>
                  {t.dueDate && <span className="task-due">{t.dueDate}</span>}
                  <span className="task-category" style={{ borderColor: `${PRIORITY_COLORS[t.priority]}44` }}>{t.category}</span>
                  <button className="pip-btn small" onClick={() => deleteTask(realIdx)} style={{ padding: "2px 6px", fontSize: ".55rem" }}>X</button>
                </div>
              );
            })}

            {/* Add task */}
            <div style={{ marginTop: 16, border: "1px solid var(--pip-border)", padding: 12, background: "rgba(5,20,10,.3)" }}>
              <div style={{ fontSize: ".7rem", letterSpacing: 2, marginBottom: 8, color: "var(--pip-green-dim)" }}>ADD TASK</div>
              <div className="input-row">
                <input type="text" className="pip-input" placeholder="Task name..." value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} />
              </div>
              <div className="input-row">
                <select className="pip-select" value={newTaskCat} onChange={(e) => setNewTaskCat(e.target.value)}>
                  {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
                <select className="pip-select" value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)}>
                  <option value="high">HIGH</option>
                  <option value="med">MED</option>
                  <option value="low">LOW</option>
                </select>
                <input type="date" className="pip-input" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} style={{ maxWidth: 160 }} />
                <button className="pip-btn" onClick={addTask}>ADD</button>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="health-bar-container">
                <div className="health-bar-label"><span>COMPLETION</span><span>{completionPct}%</span></div>
                <div className="health-bar-track"><div className="health-bar-fill" style={{ width: `${completionPct}%` }} /></div>
              </div>
            </div>
          </div>
        );

      // ════════════════════════════════════════════════════════
      // TRAINING TAB
      // ════════════════════════════════════════════════════════
      case "training":
        if (workoutActive) return renderWorkoutMode();
        return (
          <div>
            <div className="section-title">// Training System</div>
            <div className="stat-row"><span className="stat-label">Training Day</span><span className={`stat-value ${isTrainingDay ? "active" : "inactive"}`}>{isTrainingDay ? "ACTIVE" : "REST DAY"}</span></div>
            <div className="stat-row"><span className="stat-label">Week Type</span><span className="stat-value">WEEK A</span></div>
            <div className="stat-row"><span className="stat-label">Deload</span><span className="stat-value inactive">NO</span></div>

            {isTrainingDay && WEEK_A[dayName] && (
              <>
                <div style={{ marginTop: 20 }}>
                  <div className="section-title">// Today's Program \u2014 {dayName.toUpperCase()}</div>
                  {WEEK_A[dayName].map((ex, i) => <div key={i} className="training-exercise"><span className="name">{ex.name}</span><div className="detail">{ex.sets}</div></div>)}
                </div>
                <button className="pip-btn" style={{ width: "100%", marginTop: 16, padding: "12px 16px", background: "rgba(24,255,109,.2)", borderColor: "var(--pip-green)" }} onClick={startWorkout}>
                  START WORKOUT
                </button>
              </>
            )}

            <div style={{ marginTop: 20 }}>
              <div className="section-title">// Daily Requirements</div>
              {DAILY_HEALTH.map((h, i) => <div key={i} className="training-exercise"><span className="name">{h}</span><div className="detail">Every day \u2014 no exceptions</div></div>)}
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="section-title">// Strength Log</div>
              {strengthLog.length === 0 ? <div className="empty-state">NO ENTRIES \u2014 LOG YOUR LIFTS BELOW</div> : strengthLog.slice(-8).map((s, i) => (
                <div key={i} className="stat-row"><span className="stat-label">{s.date} \u2014 {s.exercise}</span><span className="stat-value">{s.weight} x {s.reps} x {s.sets}</span></div>
              ))}
              <div className="input-row">
                <input type="text" className="pip-input" placeholder="Exercise" value={strengthExercise} onChange={(e) => setStrengthExercise(e.target.value)} />
                <input type="text" className="pip-input" style={{ maxWidth: 80 }} placeholder="Wt" value={strengthWeight} onChange={(e) => setStrengthWeight(e.target.value)} />
                <input type="text" className="pip-input" style={{ maxWidth: 60 }} placeholder="Reps" value={strengthReps} onChange={(e) => setStrengthReps(e.target.value)} />
                <input type="text" className="pip-input" style={{ maxWidth: 60 }} placeholder="Sets" value={strengthSets} onChange={(e) => setStrengthSets(e.target.value)} onKeyDown={(e) => e.key === "Enter" && logStrength()} />
                <button className="pip-btn" onClick={logStrength}>LOG</button>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="section-title">// Weight Log</div>
              {weights.length === 0 ? <div className="empty-state">NO ENTRIES</div> : weights.slice(-5).map((w, i) => (
                <div key={i} className="stat-row"><span className="stat-label">{w.date}</span><span className="stat-value">{w.weight} lbs</span></div>
              ))}
              <div className="input-row">
                <input type="number" className="pip-input" placeholder="Weight in lbs..." value={weightInput} onChange={(e) => setWeightInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && logWeight()} />
                <button className="pip-btn" onClick={logWeight}>LOG</button>
              </div>
            </div>
          </div>
        );

      // ════════════════════════════════════════════════════════
      // HEALTH TAB (Extended Oura)
      // ════════════════════════════════════════════════════════
      case "health":
        return (
          <div>
            <div className="section-title">// Health Systems</div>

            <div className="briefing-block">
              <h3>Oura Ring \u2014 {ouraData?.dataDateLabel || localDate}</h3>
              {ouraLoading && !ouraData ? (
                <div className="briefing-line">Fetching Oura data...</div>
              ) : ouraData ? (
                <>
                  <div className="oura-score-row">
                    <div className="oura-score-card"><div className="score-label">Sleep</div><div className={`score-value ${scoreClass(ouraData.sleepScore)}`}>{ouraData.sleepScore ?? "\u2014"}</div></div>
                    <div className="oura-score-card"><div className="score-label">Readiness</div><div className={`score-value ${scoreClass(ouraData.readinessScore)}`}>{ouraData.readinessScore ?? "\u2014"}</div></div>
                    <div className="oura-score-card"><div className="score-label">Activity</div><div className={`score-value ${scoreClass(ouraData.activityScore)}`}>{ouraData.activityScore ?? "\u2014"}</div></div>
                  </div>
                  <div className="oura-score-row">
                    <div className="oura-score-card"><div className="score-label">Sleep Duration</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{formatDuration(ouraData.sleepDuration)}</div></div>
                    <div className="oura-score-card"><div className="score-label">HRV Balance</div><div className={`score-value ${scoreClass(ouraData.hrvBalance)}`} style={{ fontSize: "1.2rem" }}>{ouraData.hrvBalance ?? "\u2014"}</div></div>
                    <div className="oura-score-card"><div className="score-label">Resting HR</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{ouraData.restingHR ? `${ouraData.restingHR} bpm` : "\u2014"}</div></div>
                  </div>
                  <div className="oura-score-row">
                    <div className="oura-score-card"><div className="score-label">Body Temp</div><div className={`score-value ${scoreClass(ouraData.bodyTemp)}`} style={{ fontSize: "1.2rem" }}>{ouraData.bodyTemp ?? "\u2014"}</div></div>
                    <div className="oura-score-card"><div className="score-label">Steps</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{ouraData.steps?.toLocaleString() ?? "\u2014"}</div></div>
                    <div className="oura-score-card"><div className="score-label">Active Cal</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{ouraData.activeCalories ?? "\u2014"}</div></div>
                  </div>
                  <div className="oura-score-row">
                    <div className="oura-score-card"><div className="score-label">Total Cal Burned</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{ouraData.totalCalories?.toLocaleString() ?? "\u2014"}</div></div>
                    <div className="oura-score-card"><div className="score-label">Distance</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{ouraData.distanceMiles != null ? `${ouraData.distanceMiles} mi` : "\u2014"}</div></div>
                    <div className="oura-score-card"><div className="score-label">High Activity</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{ouraData.highActivity ? `${Math.round(ouraData.highActivity / 60)}m` : "\u2014"}</div></div>
                  </div>
                  {ouraData.fetchedAt && <div className="briefing-line" style={{ fontSize: ".65rem", color: "var(--pip-green-dark)" }}>Last synced: {new Date(ouraData.fetchedAt).toLocaleTimeString()}</div>}
                  <button className="pip-btn" style={{ marginTop: 8 }} onClick={fetchOura} disabled={ouraLoading}>{ouraLoading ? "SYNCING..." : "REFRESH OURA"}</button>
                </>
              ) : (
                <div className="empty-state">{IS_LOCAL ? "NO OURA DATA \u2014 START PROXY SERVER TO SYNC" : "CONNECT LOCAL SERVER FOR OURA DATA"}</div>
              )}
            </div>

            <div className="briefing-block">
              <h3>Weight Log</h3>
              {weights.length === 0 ? <div className="empty-state">NO ENTRIES</div> : weights.slice(-5).map((w, i) => (
                <div key={i} className="stat-row"><span className="stat-label">{w.date}</span><span className="stat-value">{w.weight} lbs</span></div>
              ))}
              <div className="input-row">
                <input type="number" className="pip-input" placeholder="Weight in lbs..." value={weightInput} onChange={(e) => setWeightInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && logWeight()} />
                <button className="pip-btn" onClick={logWeight}>LOG</button>
              </div>
            </div>

            <div className="briefing-block">
              <h3>Macros Log</h3>
              {macros.length === 0 ? <div className="empty-state">NO ENTRIES</div> : macros.slice(-5).map((m, i) => (
                <div key={i} className="stat-row"><span className="stat-label">{m.date}</span><span className="stat-value">P:{m.protein}g C:{m.carbs}g F:{m.fat}g</span></div>
              ))}
              <div className="input-row">
                <input type="number" className="pip-input" placeholder="Protein (g)" value={macroP} onChange={(e) => setMacroP(e.target.value)} />
                <input type="number" className="pip-input" placeholder="Carbs (g)" value={macroC} onChange={(e) => setMacroC(e.target.value)} />
                <input type="number" className="pip-input" placeholder="Fat (g)" value={macroF} onChange={(e) => setMacroF(e.target.value)} onKeyDown={(e) => e.key === "Enter" && logMacros()} />
                <button className="pip-btn" onClick={logMacros}>LOG</button>
              </div>
            </div>

            {/* Snap Meal Macro Estimation */}
            <div className="briefing-block">
              <h3>Snap Meal \u2014 AI Macro Estimation</h3>
              <input type="file" accept="image/*" capture="environment" ref={mealInputRef} style={{ display: "none" }} onChange={handleMealPhoto} />
              <button className="pip-btn" style={{ width: "100%", padding: "12px 16px" }} onClick={() => mealInputRef.current?.click()} disabled={mealEstLoading}>
                {mealEstLoading ? "ANALYZING..." : "SNAP MEAL"}
              </button>
              {mealPhoto && (
                <div style={{ marginTop: 12, textAlign: "center" }}>
                  <img src={mealPhoto} alt="meal" style={{ maxWidth: "100%", maxHeight: 200, border: "1px solid var(--pip-border)", opacity: 0.9 }} />
                </div>
              )}
              {mealEstimate && !mealEstimate.error && (
                <div style={{ marginTop: 12 }}>
                  <div className="stat-row"><span className="stat-label">Meal</span><span className="stat-value">{mealEstimate.description}</span></div>
                  <div className="oura-score-row" style={{ marginTop: 8 }}>
                    <div className="oura-score-card"><div className="score-label">Protein</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{mealEstimate.protein}g</div></div>
                    <div className="oura-score-card"><div className="score-label">Carbs</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{mealEstimate.carbs}g</div></div>
                    <div className="oura-score-card"><div className="score-label">Fat</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{mealEstimate.fat}g</div></div>
                    <div className="oura-score-card"><div className="score-label">Calories</div><div className="score-value" style={{ fontSize: "1.2rem" }}>{mealEstimate.calories}</div></div>
                  </div>
                  <button className="pip-btn" style={{ width: "100%", marginTop: 8, padding: "10px 16px" }} onClick={logMealEstimate}>LOG THESE MACROS</button>
                </div>
              )}
              {mealEstimate?.error && <div className="briefing-line" style={{ color: "var(--pip-amber)", marginTop: 8 }}>ERROR: {mealEstimate.error}</div>}
            </div>

            {/* Water Tracking */}
            <div className="briefing-block">
              <h3>Water Intake \u2014 {waterOz}oz / {WATER_TARGET}oz</h3>
              <div className="health-bar-container">
                <div className="health-bar-label"><span>HYDRATION</span><span>{Math.min(Math.round((waterOz / WATER_TARGET) * 100), 100)}%</span></div>
                <div className="health-bar-track"><div className="health-bar-fill" style={{ width: `${Math.min((waterOz / WATER_TARGET) * 100, 100)}%`, background: waterOz >= WATER_TARGET ? "var(--pip-green)" : "var(--pip-amber)" }} /></div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <button className="pip-btn" onClick={() => addWater(8)}>+8oz GLASS</button>
                <button className="pip-btn" onClick={() => addWater(16)}>+16oz BOTTLE</button>
                <button className="pip-btn" onClick={() => addWater(32)}>+32oz LARGE</button>
              </div>
              <div className="input-row">
                <input type="number" className="pip-input" placeholder="Custom oz..." value={customWater} onChange={(e) => setCustomWater(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomWater()} />
                <button className="pip-btn" onClick={addCustomWater}>ADD</button>
                <button className="pip-btn small" onClick={() => setWaterOz(0)} style={{ fontSize: ".55rem" }}>RESET</button>
              </div>
            </div>
          </div>
        );

      // ════════════════════════════════════════════════════════
      // MEDS TAB
      // ════════════════════════════════════════════════════════
      case "meds": {
        const medsPct = medsTotal > 0 ? Math.round((medsTakenCount / medsTotal) * 100) : 0;

        // 7-day wellness trend
        const wellnessTrend = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
          wellnessTrend.push({ date: key, label: dayLabel, data: wellnessLog[key] || null });
        }

        return (
          <div>
            <div className="section-title">// Vitamins & Medications</div>

            {allMedsTaken && (
              <div style={{ background: "rgba(24,255,109,.08)", border: "1px solid var(--pip-green)", padding: "10px 16px", marginBottom: 16, textAlign: "center", textShadow: "var(--pip-text-glow)", letterSpacing: 2, fontSize: ".8rem", color: "var(--pip-green)" }}>
                {"\u2713"} ALL MEDS TAKEN — {medsCompletedAt}
              </div>
            )}

            {/* TRT Injection Card */}
            <div className="briefing-block" style={{ border: `1px solid ${trtColor}44`, padding: 16, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: ".7rem", letterSpacing: 3, color: "var(--pip-green-dim)", marginBottom: 8 }}>TRT INJECTION</div>
              <div style={{ fontSize: "2.2rem", fontWeight: "bold", color: trtColor, textShadow: `0 0 12px ${trtColor}88` }}>
                {trtStatusText}
              </div>
              <div style={{ fontSize: ".65rem", color: "var(--pip-green-dim)", marginTop: 8 }}>
                LAST SHOT: {trtLastLabel} &nbsp;|&nbsp; NEXT DUE: {trtNextLabel}
              </div>
              <button className="pip-btn" style={{ marginTop: 12, padding: "8px 24px" }} onClick={markTrtTaken}>
                MARK TAKEN
              </button>
            </div>

            {/* Type legend */}
            <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              {Object.entries(MED_TYPE_COLORS).map(([type, color]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, background: color, borderRadius: 1 }} />
                  <span style={{ fontSize: ".55rem", color, letterSpacing: 1, textTransform: "uppercase" }}>{type}</span>
                </div>
              ))}
            </div>

            {/* Completion bar */}
            <div className="health-bar-container">
              <div className="health-bar-label"><span>MEDS TAKEN TODAY</span><span>{medsTakenCount}/{medsTotal} ({medsPct}%)</span></div>
              <div className="health-bar-track"><div className="health-bar-fill" style={{ width: `${medsPct}%` }} /></div>
            </div>

            {/* Med list (excludes TRT — shown in its own card above) */}
            {dailyMeds.length === 0 ? (
              <div className="empty-state">NO MEDICATIONS ADDED \u2014 ADD BELOW</div>
            ) : dailyMeds.map((m) => {
              const typeColor = MED_TYPE_COLORS[m.category] || "var(--pip-green)";
              return (
                <div key={m.id} className={`task-item ${medsTakenToday[m.id] ? "completed" : ""}`} style={{ borderLeftColor: typeColor, borderLeftWidth: 3 }}>
                  <div className={`task-checkbox ${medsTakenToday[m.id] ? "checked" : ""}`} onClick={() => toggleMedTaken(m.id)}>
                    {medsTakenToday[m.id] ? "\u2713" : ""}
                  </div>
                  <div style={{ flex: 1 }} onClick={() => toggleMedTaken(m.id)}>
                    <div style={{ color: typeColor }}>{m.name} {m.dosage && `\u2014 ${m.dosage}`}</div>
                    <div style={{ fontSize: ".6rem", color: "var(--pip-green-dim)", marginTop: 2, letterSpacing: 1 }}>
                      {m.frequency.toUpperCase()} / {m.timeOfDay.toUpperCase()}
                    </div>
                    {m.notes && <div style={{ fontSize: ".55rem", color: "var(--pip-green-dark)", marginTop: 2, fontStyle: "italic" }}>{m.notes}</div>}
                  </div>
                  <span className="task-category" style={{ borderColor: `${typeColor}44`, color: typeColor, fontSize: ".5rem" }}>{m.category.toUpperCase()}</span>
                  <button className="pip-btn small" onClick={() => deleteMed(m.id)} style={{ padding: "2px 6px", fontSize: ".55rem" }}>X</button>
                </div>
              );
            })}

            {/* Add med form */}
            <div style={{ marginTop: 16, border: "1px solid var(--pip-border)", padding: 12, background: "rgba(5,20,10,.3)" }}>
              <div style={{ fontSize: ".7rem", letterSpacing: 2, marginBottom: 8, color: "var(--pip-green-dim)" }}>ADD MEDICATION</div>
              <div className="input-row">
                <input type="text" className="pip-input" placeholder="Name..." value={newMedName} onChange={(e) => setNewMedName(e.target.value)} />
                <input type="text" className="pip-input" placeholder="Dosage..." value={newMedDosage} onChange={(e) => setNewMedDosage(e.target.value)} style={{ maxWidth: 120 }} />
              </div>
              <div className="input-row">
                <select className="pip-select" value={newMedFreq} onChange={(e) => setNewMedFreq(e.target.value)}>
                  {MED_FREQUENCIES.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                </select>
                <select className="pip-select" value={newMedTime} onChange={(e) => setNewMedTime(e.target.value)}>
                  {MED_TIMES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
                <select className="pip-select" value={newMedCat} onChange={(e) => setNewMedCat(e.target.value)}>
                  {MED_CATEGORIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
                <button className="pip-btn" onClick={addMed}>ADD</button>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="briefing-block" style={{ marginTop: 16 }}>
              <h3>Molt Bot Analysis</h3>
              {medAnalysis ? (
                <>
                  <div className="briefing-line" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{medAnalysis.text}</div>
                  <div className="briefing-line" style={{ fontSize: ".6rem", color: "var(--pip-green-dark)", marginTop: 8 }}>
                    Analyzed {medAnalysis.medCount} items \u2014 {new Date(medAnalysis.analyzedAt).toLocaleString()}
                  </div>
                </>
              ) : (
                <div className="briefing-line" style={{ color: "var(--pip-green-dark)" }}>No analysis yet. Add meds and press RE-ANALYZE.</div>
              )}
              <button className="pip-btn" style={{ marginTop: 8, width: "100%" }} onClick={analyzeMeds} disabled={medAnalysisLoading || meds.length === 0}>
                {medAnalysisLoading ? "ANALYZING..." : "RE-ANALYZE"}
              </button>
            </div>

            {/* 7-Day Wellness Trend */}
            <div className="briefing-block" style={{ marginTop: 16 }}>
              <h3>7-Day Wellness Trend</h3>
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 100, marginBottom: 8 }}>
                {wellnessTrend.map((day, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                    {day.data ? (
                      <div style={{ width: "100%", background: day.data.feeling >= 4 ? "var(--pip-green)" : day.data.feeling >= 3 ? "var(--pip-amber)" : "#ff4444",
                        height: `${(day.data.feeling / 5) * 100}%`, minHeight: 4, transition: "height .3s",
                        boxShadow: day.data.feeling >= 4 ? "0 0 6px rgba(24,255,109,.4)" : "none" }} />
                    ) : (
                      <div style={{ width: "100%", height: 4, background: "rgba(24,255,109,.1)" }} />
                    )}
                    <div style={{ fontSize: ".5rem", color: "var(--pip-green-dim)", marginTop: 4, letterSpacing: 1 }}>{day.label}</div>
                  </div>
                ))}
              </div>
              <button className="pip-btn small" onClick={() => setShowWellnessModal(true)}>LOG WELLNESS CHECK</button>
            </div>
          </div>
        );
      }

      // ════════════════════════════════════════════════════════
      // CALENDAR TAB
      // ════════════════════════════════════════════════════════
      case "calendar": {
        const daysInMonth = getDaysInMonth(calYear, calMonth);
        const firstDay = getFirstDayOfWeek(calYear, calMonth);
        const monthName = new Date(calYear, calMonth).toLocaleString("default", { month: "long", year: "numeric" });
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);

        const selectedDateStr = selectedDay ? `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}` : null;
        const selectedEvents = selectedDateStr ? calEvents.filter((e) => e.date === selectedDateStr) : [];

        return (
          <div>
            <div className="section-title">// Calendar</div>

            <div className="cal-nav">
              <button className="pip-btn small" onClick={prevMonth}>&lt; PREV</button>
              <span style={{ fontSize: ".85rem", letterSpacing: 3, textShadow: "var(--pip-text-glow)" }}>{monthName.toUpperCase()}</span>
              <button className="pip-btn small" onClick={nextMonth}>NEXT &gt;</button>
            </div>

            <div className="cal-grid">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => <div key={d} className="cal-header">{d}</div>)}
              {cells.map((day, i) => {
                if (day === null) return <div key={`e${i}`} className="cal-cell empty" />;
                const dateStr2 = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = monthEvents.filter((e) => e.date === dateStr2);
                const isToday = dateStr2 === localDate;
                const isSelected = day === selectedDay;
                return (
                  <div key={day} className={`cal-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`} onClick={() => setSelectedDay(day === selectedDay ? null : day)}>
                    <div className="cal-day-num">{day}</div>
                    <div>{dayEvents.map((e) => <span key={e.id} className="cal-event-dot" style={{ background: EVENT_COLORS[e.category] }} title={e.title} />)}</div>
                  </div>
                );
              })}
            </div>

            {selectedDay !== null && (
              <div className="cal-event-form">
                <h3 style={{ fontSize: ".7rem", letterSpacing: 2, color: "var(--pip-green)", marginBottom: 8 }}>
                  {selectedDateStr} \u2014 {selectedEvents.length} EVENT(S)
                </h3>
                {selectedEvents.map((e) => (
                  <div key={e.id} className="stat-row">
                    <span style={{ color: EVENT_COLORS[e.category] }}>{"\u25CF"} </span>
                    <span className="stat-label">{e.time || "ALL DAY"} \u2014 {e.title}</span>
                    <span className="task-category">{e.category}</span>
                    <button className="pip-btn small" onClick={() => deleteCalEvent(e.id)} style={{ padding: "2px 6px", fontSize: ".55rem" }}>X</button>
                  </div>
                ))}
                <div className="input-row">
                  <input type="text" className="pip-input" placeholder="Event title..." value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCalEvent()} />
                  <input type="time" className="pip-input" style={{ maxWidth: 120 }} value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
                  <select className="pip-select" value={eventCat} onChange={(e) => setEventCat(e.target.value)}>
                    {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                  <button className="pip-btn" onClick={addCalEvent}>ADD</button>
                </div>
              </div>
            )}
          </div>
        );
      }

      // ════════════════════════════════════════════════════════
      // FINANCE TAB
      // ════════════════════════════════════════════════════════
      case "finance": {
        const finMonthName = new Date(finYear, finMonth).toLocaleString("default", { month: "long", year: "numeric" });
        return (
          <div>
            <div className="section-title">// Finance Ledger</div>

            <div className="cal-nav">
              <button className="pip-btn small" onClick={() => { if (finMonth === 0) { setFinMonth(11); setFinYear((y) => y - 1); } else setFinMonth((m) => m - 1); }}>&lt; PREV</button>
              <span style={{ fontSize: ".85rem", letterSpacing: 3, textShadow: "var(--pip-text-glow)" }}>{finMonthName.toUpperCase()}</span>
              <button className="pip-btn small" onClick={() => { if (finMonth === 11) { setFinMonth(0); setFinYear((y) => y + 1); } else setFinMonth((m) => m + 1); }}>NEXT &gt;</button>
            </div>

            {/* Summary cards */}
            <div className="fin-summary">
              <div className="fin-summary-card"><div className="label">INCOME</div><div className="value" style={{ color: "var(--pip-green)" }}>${monthIncome.toFixed(2)}</div></div>
              <div className="fin-summary-card"><div className="label">EXPENSES</div><div className="value" style={{ color: "#ff4444" }}>${monthExpenses.toFixed(2)}</div></div>
              <div className="fin-summary-card"><div className="label">NET</div><div className="value" style={{ color: monthIncome - monthExpenses >= 0 ? "var(--pip-green)" : "#ff4444" }}>${(monthIncome - monthExpenses).toFixed(2)}</div></div>
              <div className="fin-summary-card"><div className="label">BALANCE</div><div className="value" style={{ color: totalBalance >= 0 ? "var(--pip-green)" : "#ff4444" }}>${totalBalance.toFixed(2)}</div></div>
            </div>

            {/* Spending by category chart */}
            {Object.keys(expenseByCategory).length > 0 && (
              <div className="briefing-block">
                <h3>Spending by Category</h3>
                {Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
                  <div key={cat} className="fin-bar-row">
                    <div className="fin-bar-label">{cat}</div>
                    <div className="fin-bar-track"><div className="fin-bar-fill" style={{ width: `${(total / maxCatExpense) * 100}%` }} /></div>
                    <div className="fin-bar-amount">${total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent transactions */}
            <div className="briefing-block">
              <h3>Transactions</h3>
              {monthTransactions.length === 0 ? (
                <div className="empty-state">NO TRANSACTIONS THIS MONTH</div>
              ) : (
                monthTransactions.slice().reverse().slice(0, 15).map((t) => (
                  <div key={t.id} className="stat-row">
                    <span className="stat-label">{t.date} \u2014 {t.description || t.category}</span>
                    <span className="stat-value" style={{ color: t.type === "income" ? "var(--pip-green)" : "#ff4444" }}>
                      {t.type === "income" ? "+" : "-"}${t.amount.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Add transaction */}
            <div style={{ border: "1px solid var(--pip-border)", padding: 12, background: "rgba(5,20,10,.3)" }}>
              <div style={{ fontSize: ".7rem", letterSpacing: 2, marginBottom: 8, color: "var(--pip-green-dim)" }}>LOG TRANSACTION</div>
              <div className="input-row">
                <select className="pip-select" value={finType} onChange={(e) => setFinType(e.target.value)}>
                  <option value="expense">EXPENSE</option>
                  <option value="income">INCOME</option>
                </select>
                <input type="number" className="pip-input" placeholder="Amount" value={finAmount} onChange={(e) => setFinAmount(e.target.value)} style={{ maxWidth: 120 }} />
                {finType === "expense" && (
                  <select className="pip-select" value={finCat} onChange={(e) => setFinCat(e.target.value)}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                <input type="text" className="pip-input" placeholder="Description..." value={finDesc} onChange={(e) => setFinDesc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTransaction()} />
                <button className="pip-btn" onClick={addTransaction}>LOG</button>
              </div>
            </div>
          </div>
        );
      }

      // ════════════════════════════════════════════════════════
      // FAMILY TAB
      // ════════════════════════════════════════════════════════
      case "family":
        return (
          <div>
            <div className="section-title">// Family System</div>
            <div className="family-card">
              <div className="family-name">ELIZABETH</div>
              <div className="family-detail">Daughter</div>
              <div className="family-detail">Birthday: January 27</div>
              <div className="family-detail">Schedule: Sunday 6PM \u2192 Sunday 6PM (alternating)</div>
              <div style={{ marginTop: 12 }}><span className={`elizabeth-status ${elizabethWeek ? "active" : "inactive"}`}>{elizabethWeek ? "ELIZABETH WEEK \u2014 ACTIVE" : "ELIZABETH WEEK \u2014 INACTIVE"}</span></div>
            </div>
            <div className="family-card">
              <div className="family-name">AUTUMN</div>
              <div className="family-detail">Partner</div>
              <div className="family-detail">Birthday: January 10</div>
            </div>
            {birthdays.length > 0 && (
              <div className="briefing-block" style={{ marginTop: 16 }}>
                <h3>Birthday Alerts</h3>
                {birthdays.map((b, i) => <div key={i} className="briefing-line" style={{ color: "var(--pip-amber)" }}>{b}</div>)}
              </div>
            )}
          </div>
        );

      // ════════════════════════════════════════════════════════
      // NEWS TAB
      // ════════════════════════════════════════════════════════
      case "news":
        return (
          <div>
            <div className="section-title">// Live News Feed</div>
            <div className="briefing-line" style={{ marginBottom: 12, color: "var(--pip-green-dim)" }}>Monitoring: {NEWS_SCOPE.join(" / ")}</div>
            <button className="pip-btn" style={{ marginBottom: 16 }} onClick={fetchNews} disabled={newsLoading}>{newsLoading ? "FETCHING..." : "REFRESH"}</button>
            {newsError && <div className="briefing-line" style={{ color: "var(--pip-amber)", marginBottom: 12 }}>FEED ERROR: {newsError}</div>}
            {newsArticles.length === 0 && !newsLoading ? (
              <div className="empty-state">NO ARTICLES AVAILABLE</div>
            ) : (
              newsArticles.map((article, i) => (
                <div key={i} className="news-item">
                  <div className="news-category">{article.source?.name || "UNKNOWN"}</div>
                  <div className="news-headline"><a className="news-link" href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a></div>
                  {article.publishedAt && <div className="news-time">{timeAgo(article.publishedAt)}</div>}
                </div>
              ))
            )}
          </div>
        );

      // ════════════════════════════════════════════════════════
      // AI ASSIST TAB
      // ════════════════════════════════════════════════════════
      case "assist":
        return (
          <div>
            <div className="section-title">// AI Assistant</div>
            <div style={{ fontSize: ".65rem", color: "var(--pip-green-dark)", marginBottom: 8, letterSpacing: 1 }}>
              POWERED BY CLAUDE \u2014 SPEAK FREELY, COURIER 6.
            </div>

            <div className="chat-container">
              <div className="chat-messages">
                {chatMessages.length === 0 && (
                  <div className="empty-state" style={{ padding: "20px 10px" }}>NO MESSAGES \u2014 START A CONVERSATION</div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`chat-bubble ${msg.role}`}>
                    <div className="role-tag">{msg.role === "user" ? "COURIER 6" : "COMMAND CENTER"}</div>
                    {msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-bubble assistant">
                    <div className="role-tag">COMMAND CENTER</div>
                    <span className="cursor-blink">Processing</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="input-row">
                <input type="text" className="pip-input" placeholder="Enter command..." value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                />
                <button className="pip-btn" onClick={sendChat} disabled={chatLoading}>{chatLoading ? "..." : "SEND"}</button>
                <button className="pip-btn" onClick={clearChat} style={{ fontSize: ".6rem" }}>CLR</button>
              </div>
            </div>
          </div>
        );

      // ════════════════════════════════════════════════════════
      // SYS TAB
      // ════════════════════════════════════════════════════════
      case "sys":
        return (
          <div>
            <div className="section-title">// System Status</div>
            <div className="briefing-block">
              <h3>System Info</h3>
              <div className="stat-row"><span className="stat-label">Version</span><span className="stat-value">v3.0 — Pip-Boy Edition</span></div>
              <div className="stat-row"><span className="stat-label">Platform</span><span className="stat-value">PWA (Installable)</span></div>
              <div className="stat-row"><span className="stat-label">Voice Server</span><span className="stat-value amber">LOCAL ONLY</span></div>
              <div className="stat-row"><span className="stat-label">Oura Proxy</span><span className="stat-value amber">LOCAL ONLY</span></div>
              <div className="stat-row"><span className="stat-label">AI Chat</span><span className="stat-value amber">PROXY REQUIRED</span></div>
              <div className="stat-row"><span className="stat-label">News API</span><span className="stat-value">ACTIVE</span></div>
            </div>
            <div className="sys-notice">
              NOTE: Voice server (Piper TTS) and Oura Ring proxy require the local proxy server running on localhost:5111.
              When deployed remotely (e.g., Vercel), voice falls back to browser SpeechSynthesis automatically.
              Oura data will not sync when deployed — only cached data will be shown.
              AI chat requires the local proxy to relay to Anthropic API.
            </div>
            <div className="briefing-block">
              <h3>Storage</h3>
              <div className="stat-row"><span className="stat-label">Tasks</span><span className="stat-value">{tasks.length} items</span></div>
              <div className="stat-row"><span className="stat-label">Weight Entries</span><span className="stat-value">{weights.length}</span></div>
              <div className="stat-row"><span className="stat-label">Strength Entries</span><span className="stat-value">{strengthLog.length}</span></div>
              <div className="stat-row"><span className="stat-label">Calendar Events</span><span className="stat-value">{calEvents.length}</span></div>
              <div className="stat-row"><span className="stat-label">Transactions</span><span className="stat-value">{transactions.length}</span></div>
              <div className="stat-row"><span className="stat-label">Chat Messages</span><span className="stat-value">{chatMessages.length}</span></div>
              <div className="stat-row"><span className="stat-label">Medications</span><span className="stat-value">{meds.length}</span></div>
              <div className="stat-row"><span className="stat-label">Water Today</span><span className="stat-value">{waterOz}oz / {WATER_TARGET}oz</span></div>
              <div className="stat-row"><span className="stat-label">Daily Reports</span><span className="stat-value">{Object.keys(dailyReports).length}</span></div>
            </div>
            <button className="pip-btn" style={{ width: "100%", marginTop: 8, padding: "12px 16px" }} onClick={() => { if (window.confirm("Clear ALL localStorage data? This cannot be undone.")) { localStorage.clear(); window.location.reload(); } }}>
              FACTORY RESET
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── MAIN RENDER ──────────────────────────────────────────
  return (
    <>
      <style>{globalCSS}</style>
      <div className="crt-overlay" />
      {renderReportModal()}

      {/* Wellness Check Modal */}
      {showWellnessModal && (
        <div className="report-modal-overlay" onClick={() => setShowWellnessModal(false)}>
          <div className="report-modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <div className="report-modal-title">Daily Wellness Check</div>
              <button className="pip-btn small" onClick={() => setShowWellnessModal(false)}>CLOSE</button>
            </div>
            <div className="report-section">
              <h4>How are you feeling today?</h4>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[{ v: 1, l: "TERRIBLE" }, { v: 2, l: "POOR" }, { v: 3, l: "OKAY" }, { v: 4, l: "GOOD" }, { v: 5, l: "GREAT" }].map((opt) => (
                  <button key={opt.v} className={`pip-btn small ${wellnessFeeling === opt.v ? "active-filter" : ""}`}
                    onClick={() => setWellnessFeeling(opt.v)}>{opt.l}</button>
                ))}
              </div>
            </div>
            <div className="report-section">
              <h4>Energy Level?</h4>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} className={`pip-btn small ${wellnessEnergy === v ? "active-filter" : ""}`}
                    onClick={() => setWellnessEnergy(v)} style={{ flex: 1 }}>{v}</button>
                ))}
              </div>
            </div>
            <div className="report-section">
              <h4>Sleep Quality Feel?</h4>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} className={`pip-btn small ${wellnessSleep === v ? "active-filter" : ""}`}
                    onClick={() => setWellnessSleep(v)} style={{ flex: 1 }}>{v}</button>
                ))}
              </div>
            </div>
            <div className="report-section">
              <h4>Any Side Effects Noticed?</h4>
              <input type="text" className="pip-input" style={{ width: "100%", marginTop: 8 }} placeholder="None, headache, nausea, etc..."
                value={wellnessSideEffects} onChange={(e) => setWellnessSideEffects(e.target.value)} />
            </div>
            <button className="pip-btn" style={{ width: "100%", marginTop: 12, padding: "12px 16px" }} onClick={submitWellness}>
              SUBMIT WELLNESS CHECK
            </button>
          </div>
        </div>
      )}

      <div className="vault-boy-watermark" />
      <div className="vault-tec-watermark" />
      <div className="radiation-decor" />

      <div className="pipboy-device" ref={screenRef}>
        <div className="pipboy-frame">
          <div className="pipboy-rivet tl" />
          <div className="pipboy-rivet tr" />
          <div className="pipboy-rivet bl" />
          <div className="pipboy-rivet br" />
          <div className="pipboy-antenna">{[...Array(8)].map((_, i) => <div key={i} className="antenna-tick" />)}</div>
          <div className="pipboy-frame-label">RobCo Industries (TM) Termlink</div>

          <div className="pipboy-screen">
            <div className="pipboy-screen-inner">
              <div className="pip-container">
                <div className="pip-header">
                  <h1>{"\u2622"} COMMAND CENTER</h1>
                  <div className="subtitle">RobCo Industries (TM) Personal Operating System</div>
                </div>

                <div className="pip-tabs">
                  {TABS.map((tab) => (
                    <button key={tab.id} className={`pip-tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => {
                      if (tab.id !== activeTab) { setTabSwitching(true); setTimeout(() => setTabSwitching(false), 150); }
                      setActiveTab(tab.id);
                    }}>
                      <span className="pip-tab-icon">{tab.icon}</span>{tab.label}
                    </button>
                  ))}
                </div>

                <div className={`pip-body ${tabSwitching ? "tab-switching" : ""}`}>{renderTab()}</div>

                {/* Scrolling status ticker */}
                <div className="status-ticker">
                  <div className="ticker-content">
                    {tickerItems.map((item, i) => <span key={i}>{"\u25C6"} {item}</span>)}
                    {tickerItems.map((item, i) => <span key={`d${i}`}>{"\u25C6"} {item}</span>)}
                  </div>
                </div>

                <div className="pip-footer">
                  <span>SYS: NOMINAL</span>
                  <span>EW: {elizabethWeek ? "ON" : "OFF"}</span>
                  <span>TASKS: {completedCount}/{totalTasks}</span>
                  <span style={{ color: allMedsTaken ? "var(--pip-green)" : medsTakenCount > 0 ? "var(--pip-amber)" : undefined }}>MEDS: {allMedsTaken ? "\u2713" : `${medsTakenCount}/${medsTotal}`}</span>
                  <span>OURA: {ouraData?.readinessScore ?? "--"}</span>
                  <span>BAL: ${totalBalance.toFixed(0)}</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="pipboy-knobs">
            <div className="pipboy-knob-group"><div className="pipboy-knob small" /><div className="knob-label">TUNE</div></div>
            <div className="pipboy-knob-group"><div className="pipboy-knob large" /><div className="knob-label">STAT</div></div>
            <div className="pipboy-knob-group"><div className="pipboy-knob small" /><div className="knob-label">VOL</div></div>
          </div>
        </div>
      </div>
    </>
  );
}
