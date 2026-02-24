import json
from datetime import datetime
from pathlib import Path
STATE_PATH = Path(__file__).parent.parent / "memory" / "state.json"
CONFIG_PATH = Path(__file__).parent.parent / "config" / "rules.json"
def load_state():
    with open(STATE_PATH) as f: return json.load(f)
def save_state(state):
    with open(STATE_PATH, "w") as f: json.dump(state, f, indent=2)
def load_rules():
    with open(CONFIG_PATH) as f: return json.load(f)
def is_training_day():
    return datetime.now().strftime("%A") in load_rules()["training_days"]
def get_week_type():
    s = load_state()
    return s["training"]["current_week_type"], s["training"]["deload_week"]
def advance_week():
    s = load_state()
    wn = s["training"].get("week_number",1)+1
    s["training"]["week_number"] = wn
    if wn%4==0: s["training"]["deload_week"]=True; s["training"]["current_week_type"]="deload"
    else: s["training"]["deload_week"]=False; s["training"]["current_week_type"]="A" if wn%2==1 else "B"
    save_state(s)
    return s["training"]
