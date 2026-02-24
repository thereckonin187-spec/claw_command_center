import json
from datetime import datetime
from pathlib import Path
STATE_PATH = Path(__file__).parent.parent / "memory" / "state.json"
def load_state():
    with open(STATE_PATH) as f: return json.load(f)
def save_state(state):
    with open(STATE_PATH, "w") as f: json.dump(state, f, indent=2)
def log_weight(w):
    s=load_state(); s["health"]["weight_log"].append({"date":datetime.now().isoformat(),"weight":w}); save_state(s)
def log_macros(p,c,f,cal=None):
    s=load_state(); s["health"]["macro_log"].append({"date":datetime.now().isoformat(),"protein":p,"carbs":c,"fat":f,"calories":cal or (p*4+c*4+f*9)}); save_state(s)
def log_strength(ex,w,r,sets):
    s=load_state(); s["health"]["strength_log"].append({"date":datetime.now().isoformat(),"exercise":ex,"weight":w,"reps":r,"sets":sets}); save_state(s)
def get_trend_summary():
    s=load_state(); wl=s["health"]["weight_log"]
    if len(wl)>=2: d=wl[-1]["weight"]-wl[-2]["weight"]; return f"Weight trend: {'up' if d>0 else 'down' if d<0 else 'flat'} ({d:+.1f} lbs)"
    return "Not enough data for trend."
