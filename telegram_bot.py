#!/usr/bin/env python3
"""
COMMAND CENTER — Telegram Bot
Personal Operations Officer for Courier 6
"""

import json
import os
import logging
from datetime import datetime, timedelta
from pathlib import Path

import httpx
from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# ─── CONFIG ──────────────────────────────────────────────────
BOT_TOKEN = "1379c67aa70bee92d7cfa5bb5c26e3c7324e13ef5d6cd821077aa7fd236539ed"
ANTHROPIC_KEY = "sk-ant-api03-UXNfSHnAU_LbtJyz7FsEmcX4suPakQ712P-czJWS5Z0XiVB53MjZQlc0W7xKE8DlcuHWZHOoR_SA4viTVd6j6Q-EP7LWwA"
STATE_FILE = Path(__file__).parent / "memory" / "shared_state.json"
TZ = "America/Los_Angeles"

AI_SYSTEM_PROMPT = (
    "You are the Command Center AI assistant. You speak with military-grade clarity "
    "like a Fallout Mr. Handy robot butler. You help Courier 6 manage tasks, schedule, "
    "health, and daily operations. Keep responses concise and actionable. "
    "Address the user as Courier 6."
)

WEATHER_LOCATIONS = [
    {"key": "olympia", "label": "OLYMPIA (HOME)", "lat": 47.0379, "lng": -122.9007},
    {"key": "milton", "label": "MILTON (MOM'S)", "lat": 47.2487, "lng": -122.3154},
]

WEATHER_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Heavy freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Light showers", 81: "Showers", 82: "Heavy showers",
    85: "Light snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ heavy hail",
}

FAMILY = {
    "partner": {"name": "Autumn", "birthday": "01-10"},
    "daughter": {"name": "Elizabeth", "birthday": "01-27"},
}

TRAINING_DAYS = ["Monday", "Tuesday", "Thursday", "Friday"]
DAILY_HEALTH = ["100 Push-ups", "Take Vitamins"]

logging.basicConfig(format="%(asctime)s [CC-BOT] %(message)s", level=logging.INFO)
log = logging.getLogger("cc-bot")

# ─── STATE HELPERS ───────────────────────────────────────────
def load_state():
    try:
        return json.loads(STATE_FILE.read_text())
    except Exception:
        return {
            "tasks": [], "health": {"weight_log": [], "macro_log": [], "strength_log": []},
            "meds_taken_today": [], "trt_last_date": "2026-02-22",
            "oura": None, "weather": None, "chat_id": None, "last_sync": None,
        }

def save_state(state):
    state["last_sync"] = datetime.now().isoformat()
    STATE_FILE.write_text(json.dumps(state, indent=2))

def detect_elizabeth_week():
    anchor = datetime(2026, 3, 1, 18, 0)
    now = datetime.now()
    diff_days = (now - anchor).total_seconds() / 86400
    cycle_day = diff_days % 14
    if cycle_day < 0:
        cycle_day += 14
    active = cycle_day < 7
    days_until = None if active else int(14 - cycle_day) + 1
    return active, days_until

def trt_status(state):
    last = state.get("trt_last_date", "2026-02-22")
    last_dt = datetime.strptime(last, "%Y-%m-%d")
    next_dt = last_dt + timedelta(days=6)
    days_until = (next_dt - datetime.now()).days
    return days_until, next_dt.strftime("%Y-%m-%d")

def check_birthdays():
    alerts = []
    now = datetime.now()
    for key, info in FAMILY.items():
        m, d = map(int, info["birthday"].split("-"))
        bday = datetime(now.year, m, d)
        diff = (bday - now).days
        if abs(diff) <= 7:
            if diff == 0:
                alerts.append(f"TODAY is {info['name']}'s birthday!")
            elif diff > 0:
                alerts.append(f"{info['name']}'s birthday in {diff} day(s)")
            else:
                alerts.append(f"{info['name']}'s birthday was {abs(diff)} day(s) ago")
    return alerts

async def fetch_weather():
    results = {}
    async with httpx.AsyncClient(timeout=15) as client:
        for loc in WEATHER_LOCATIONS:
            url = (
                f"https://api.open-meteo.com/v1/forecast?"
                f"latitude={loc['lat']}&longitude={loc['lng']}"
                f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation"
                f"&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max"
                f"&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch"
                f"&timezone=America/Los_Angeles&forecast_days=7"
            )
            try:
                resp = await client.get(url)
                results[loc["key"]] = resp.json()
            except Exception as e:
                log.error(f"Weather fetch failed for {loc['label']}: {e}")
    return results

async def ask_claude(message: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1024,
                "system": AI_SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": message}],
            },
        )
        data = resp.json()
        return data.get("content", [{}])[0].get("text", "No response from AI.")

def format_weather(data, key):
    if not data or key not in data:
        return "No weather data available."
    loc = data[key]
    cur = loc.get("current", {})
    code = cur.get("weather_code", 0)
    cond = WEATHER_CODES.get(code, "Unknown")
    temp = round(cur.get("temperature_2m", 0))
    hum = cur.get("relative_humidity_2m", 0)
    wind = round(cur.get("wind_speed_10m", 0))
    precip = cur.get("precipitation", 0)
    label = "OLYMPIA (HOME)" if key == "olympia" else "MILTON (MOM'S)"
    lines = [
        f"📍 {label}",
        f"🌡 {temp}°F — {cond}",
        f"💧 Humidity: {hum}% | 💨 Wind: {wind} mph | 🌧 Precip: {precip}\"",
    ]
    # 7-day forecast
    daily = loc.get("daily", {})
    if daily and daily.get("time"):
        lines.append("\n📅 7-DAY FORECAST:")
        for i, day in enumerate(daily["time"][:7]):
            dt = datetime.strptime(day, "%Y-%m-%d")
            day_name = dt.strftime("%a").upper()
            hi = round(daily["temperature_2m_max"][i])
            lo = round(daily["temperature_2m_min"][i])
            dc = WEATHER_CODES.get(daily["weather_code"][i], "?")
            pr = daily["precipitation_sum"][i]
            lines.append(f"  {day_name}: {hi}°/{lo}° {dc} | {pr}\"")
    return "\n".join(lines)

# ─── BRIEFING BUILDER ────────────────────────────────────────
async def build_briefing():
    state = load_state()
    now = datetime.now()
    greeting = "Good Morning" if now.hour < 12 else "Afternoon" if now.hour < 17 else "Evening"
    day_name = now.strftime("%A")
    date_str = now.strftime("%A, %B %d, %Y")
    is_training = day_name in TRAINING_DAYS
    ew_active, ew_days = detect_elizabeth_week()
    trt_days, trt_next = trt_status(state)
    birthdays = check_birthdays()
    weather = await fetch_weather()

    tasks = state.get("tasks", [])
    done = sum(1 for t in tasks if t.get("done"))
    total = len(tasks)

    lines = [
        f"☢️ COMMAND CENTER — {greeting}, Courier 6.",
        f"📅 {date_str}",
        "",
        f"👧 Elizabeth Week: {'ACTIVE' if ew_active else f'INACTIVE' + (f' — starts in {ew_days} day(s)' if ew_days and ew_days <= 7 else '')}",
        f"🏋️ Training: {'YES — ' + day_name.upper() if is_training else 'REST DAY'}",
        f"✅ Tasks: {done}/{total} complete",
    ]

    # TRT
    if trt_days <= 2:
        status = "DUE TODAY" if trt_days == 0 else "OVERDUE" if trt_days < 0 else f"Due in {trt_days} day(s)"
        lines.append(f"💉 TRT: {status} (next: {trt_next})")

    # Weather
    if weather:
        oly = weather.get("olympia", {}).get("current", {})
        mil = weather.get("milton", {}).get("current", {})
        if oly:
            temp = round(oly.get("temperature_2m", 0))
            cond = WEATHER_CODES.get(oly.get("weather_code", 0), "?")
            lines.append(f"🌤 Olympia: {temp}°F — {cond}")
        if mil:
            temp = round(mil.get("temperature_2m", 0))
            cond = WEATHER_CODES.get(mil.get("weather_code", 0), "?")
            lines.append(f"🌤 Milton: {temp}°F — {cond}")

    # Birthdays
    for b in birthdays:
        lines.append(f"🎂 {b}")

    return "\n".join(lines)

# ─── COMMAND HANDLERS ────────────────────────────────────────
async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    state = load_state()
    state["chat_id"] = update.effective_chat.id
    save_state(state)
    await update.message.reply_text(
        "☢️ Command Center Telegram Link — ONLINE.\n"
        "Ready for orders, Courier 6.\n\n"
        "Type /help for available commands."
    )

async def cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "☢️ COMMAND CENTER — AVAILABLE COMMANDS\n\n"
        "/briefing — Morning/evening briefing\n"
        "/tasks — Active tasks with status\n"
        "/complete [name] — Mark task complete\n"
        "/addtask [name] — Add new task\n"
        "/meds — Meds checklist\n"
        "/trt — TRT countdown\n"
        "/weight [number] — Log weight\n"
        "/macros [P] [C] [F] — Log macros\n"
        "/oura — Latest Oura data\n"
        "/elizabeth — Elizabeth Week status\n"
        "/weather — Weather for both locations\n"
        "/status — Full system status\n"
        "/help — This list\n\n"
        "Any other message → AI assistant (Claude)"
    )

async def cmd_briefing(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    text = await build_briefing()
    await update.message.reply_text(text)

async def cmd_tasks(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    state = load_state()
    tasks = state.get("tasks", [])
    if not tasks:
        await update.message.reply_text("📋 No tasks in system. Add with /addtask [name]")
        return
    lines = ["☢️ TASK STATUS\n"]
    for t in tasks:
        check = "✅" if t.get("done") else "⬜"
        pri = t.get("priority", "med").upper()
        cat = t.get("category", "").upper()
        outdoor = " 🌧" if t.get("outdoor") else ""
        lines.append(f"{check} [{pri}] {t['name']} ({cat}){outdoor}")
    done = sum(1 for t in tasks if t.get("done"))
    lines.append(f"\n{done}/{len(tasks)} complete")
    await update.message.reply_text("\n".join(lines))

async def cmd_complete(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text("Usage: /complete [task name]")
        return
    name = " ".join(ctx.args).lower()
    state = load_state()
    found = False
    for t in state.get("tasks", []):
        if name in t["name"].lower():
            t["done"] = True
            t["completedAt"] = datetime.now().isoformat()
            found = True
            await update.message.reply_text(f"✅ Task marked complete: {t['name']}")
            break
    if not found:
        await update.message.reply_text(f"❌ No task matching: {name}")
    else:
        save_state(state)

async def cmd_addtask(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text("Usage: /addtask [task name]")
        return
    name = " ".join(ctx.args)
    state = load_state()
    state.setdefault("tasks", []).append({
        "name": name,
        "category": "project",
        "done": False,
        "dueDate": None,
        "priority": "med",
        "outdoor": False,
    })
    save_state(state)
    await update.message.reply_text(f"➕ Task added: {name}")

async def cmd_meds(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    meds = [
        "One A Day Men's Multivitamin", "Vitamin D3 5,000 IU",
        "Sports Research D3 + K2", "NAC 600mg", "Turkesterone 1000mg",
        "B-12 500mcg", "Iron 65mg", "Sertraline (Zoloft)",
    ]
    state = load_state()
    taken = state.get("meds_taken_today", [])
    lines = ["💊 MEDS CHECKLIST\n"]
    for m in meds:
        check = "✅" if m in taken else "⬜"
        lines.append(f"{check} {m}")
    lines.append(f"\n{len(taken)}/{len(meds)} taken")
    await update.message.reply_text("\n".join(lines))

async def cmd_trt(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    state = load_state()
    days, next_date = trt_status(state)
    if days < 0:
        status = f"⚠️ OVERDUE by {abs(days)} day(s)"
    elif days == 0:
        status = "💉 DUE TODAY"
    elif days == 1:
        status = "💉 DUE TOMORROW"
    else:
        status = f"💉 Due in {days} days"
    await update.message.reply_text(
        f"☢️ TRT STATUS\n\n"
        f"Last injection: {state.get('trt_last_date', 'unknown')}\n"
        f"Next due: {next_date}\n"
        f"Status: {status}\n"
        f"Cycle: Every 6 days"
    )

async def cmd_weight(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text("Usage: /weight [number]")
        return
    try:
        w = float(ctx.args[0])
    except ValueError:
        await update.message.reply_text("❌ Invalid number.")
        return
    state = load_state()
    state["health"]["weight_log"].append({
        "date": datetime.now().strftime("%m/%d/%Y"),
        "weight": w,
    })
    save_state(state)
    await update.message.reply_text(f"⚖️ Weight logged: {w} lbs")

async def cmd_macros(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if len(ctx.args) < 3:
        await update.message.reply_text("Usage: /macros [protein] [carbs] [fat]")
        return
    try:
        p, c, f = float(ctx.args[0]), float(ctx.args[1]), float(ctx.args[2])
    except ValueError:
        await update.message.reply_text("❌ Invalid numbers.")
        return
    state = load_state()
    state["health"]["macro_log"].append({
        "date": datetime.now().strftime("%m/%d/%Y"),
        "protein": p, "carbs": c, "fat": f,
    })
    save_state(state)
    total_cal = (p * 4) + (c * 4) + (f * 9)
    await update.message.reply_text(
        f"🍽 Macros logged: P:{p}g C:{c}g F:{f}g\n"
        f"Total: {total_cal:.0f} cal"
    )

async def cmd_oura(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    state = load_state()
    oura = state.get("oura")
    if not oura:
        await update.message.reply_text("💍 No Oura data synced yet. Check web app.")
        return
    await update.message.reply_text(
        f"💍 OURA RING DATA\n\n"
        f"Sleep Score: {oura.get('sleepScore', '—')}\n"
        f"Readiness: {oura.get('readinessScore', '—')}\n"
        f"Activity: {oura.get('activityScore', '—')}\n"
        f"Steps: {oura.get('steps', '—')}\n"
        f"Active Cal: {oura.get('activeCalories', '—')}\n"
        f"Resting HR: {oura.get('restingHR', '—')} bpm"
    )

async def cmd_elizabeth(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    active, days = detect_elizabeth_week()
    if active:
        await update.message.reply_text("👧 ELIZABETH WEEK — ACTIVE\nEnjoy your time, Courier 6.")
    else:
        msg = f"👧 Elizabeth Week — INACTIVE"
        if days and days <= 14:
            msg += f"\nStarts in {days} day(s)"
        await update.message.reply_text(msg)

async def cmd_weather(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    weather = await fetch_weather()
    if not weather:
        await update.message.reply_text("🌧 Weather fetch failed.")
        return
    text = "☢️ WEATHER INTEL\n\n"
    text += format_weather(weather, "olympia")
    text += "\n\n"
    text += format_weather(weather, "milton")
    # Save to state
    state = load_state()
    state["weather"] = weather
    save_state(state)
    await update.message.reply_text(text)

async def cmd_status(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    text = await build_briefing()
    state = load_state()
    lines = [text, "\n─── SYSTEM ───"]
    lines.append(f"State file: {'OK' if STATE_FILE.exists() else 'MISSING'}")
    lines.append(f"Last sync: {state.get('last_sync', 'never')}")
    lines.append("Bot: ONLINE")
    await update.message.reply_text("\n".join(lines))

# ─── NATURAL LANGUAGE (Claude) ───────────────────────────────
async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if not text:
        return
    try:
        response = await ask_claude(text)
        await update.message.reply_text(response)
    except Exception as e:
        log.error(f"Claude API error: {e}")
        await update.message.reply_text(f"⚠️ AI error: {e}")

# ─── SCHEDULED REMINDERS ─────────────────────────────────────
async def send_reminder(app, text):
    state = load_state()
    chat_id = state.get("chat_id")
    if not chat_id:
        log.warning("No chat_id stored — cannot send reminder")
        return
    try:
        await app.bot.send_message(chat_id=chat_id, text=text)
    except Exception as e:
        log.error(f"Failed to send reminder: {e}")

async def morning_briefing_job(app):
    text = await build_briefing()
    await send_reminder(app, f"☀️ MORNING BRIEFING\n\n{text}")

async def evening_briefing_job(app):
    text = await build_briefing()
    await send_reminder(app, f"🌙 EVENING BRIEFING\n\n{text}")

async def meds_reminder_job(app):
    await send_reminder(app, "💊 Meds reminder — have you taken your vitamins, Courier 6?")

async def trt_check_job(app):
    state = load_state()
    days, next_date = trt_status(state)
    if days == 1:
        await send_reminder(app, f"💉 TRT INJECTION DUE TOMORROW ({next_date})")
    elif days < 0:
        await send_reminder(app, f"⚠️ TRT INJECTION OVERDUE by {abs(days)} day(s)!")

async def elizabeth_check_job(app):
    _, days = detect_elizabeth_week()
    if days == 2:
        await send_reminder(app, "👧 Elizabeth Week starts in 2 days — prepare accordingly, Courier 6.")

async def rain_check_job(app):
    weather = await fetch_weather()
    if not weather:
        return
    oly = weather.get("olympia", {})
    daily_codes = oly.get("daily", {}).get("weather_code", [])
    if len(daily_codes) > 1:
        tomorrow_code = daily_codes[1]
        if 51 <= tomorrow_code <= 82:
            cond = WEATHER_CODES.get(tomorrow_code, "precipitation")
            await send_reminder(app, f"🌧 Rain expected tomorrow: {cond}\nPlan accordingly, Courier 6.")

# ─── MAIN ────────────────────────────────────────────────────
def main():
    log.info("Command Center Telegram Bot starting...")
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    # Register command handlers
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("briefing", cmd_briefing))
    app.add_handler(CommandHandler("tasks", cmd_tasks))
    app.add_handler(CommandHandler("complete", cmd_complete))
    app.add_handler(CommandHandler("addtask", cmd_addtask))
    app.add_handler(CommandHandler("meds", cmd_meds))
    app.add_handler(CommandHandler("trt", cmd_trt))
    app.add_handler(CommandHandler("weight", cmd_weight))
    app.add_handler(CommandHandler("macros", cmd_macros))
    app.add_handler(CommandHandler("oura", cmd_oura))
    app.add_handler(CommandHandler("elizabeth", cmd_elizabeth))
    app.add_handler(CommandHandler("weather", cmd_weather))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Scheduled reminders
    scheduler = AsyncIOScheduler(timezone=TZ)
    scheduler.add_job(lambda: morning_briefing_job(app), CronTrigger(hour=7, minute=0, timezone=TZ))
    scheduler.add_job(lambda: meds_reminder_job(app), CronTrigger(hour=8, minute=0, timezone=TZ))
    scheduler.add_job(lambda: evening_briefing_job(app), CronTrigger(hour=21, minute=0, timezone=TZ))
    scheduler.add_job(lambda: trt_check_job(app), CronTrigger(hour=7, minute=30, timezone=TZ))
    scheduler.add_job(lambda: elizabeth_check_job(app), CronTrigger(hour=7, minute=15, timezone=TZ))
    scheduler.add_job(lambda: rain_check_job(app), CronTrigger(hour=20, minute=0, timezone=TZ))
    scheduler.start()
    log.info("Scheduler started — reminders active")

    log.info("Bot polling started")
    app.run_polling(drop_pending_updates=True)

if __name__ == "__main__":
    main()
