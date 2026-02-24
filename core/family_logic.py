import json
from datetime import datetime
from pathlib import Path
CONFIG_PATH = Path(__file__).parent.parent / "config" / "rules.json"
STATE_PATH = Path(__file__).parent.parent / "memory" / "state.json"
def load_rules():
    with open(CONFIG_PATH) as f: return json.load(f)
def load_state():
    with open(STATE_PATH) as f: return json.load(f)
def save_state(state):
    with open(STATE_PATH, "w") as f: json.dump(state, f, indent=2)
def detect_elizabeth_week():
    anchor = datetime(2025,2,23,18,0)
    days_since = (datetime.now()-anchor).days
    is_ew = (days_since//7)%2==0
    s = load_state(); s["family"]["elizabeth_week"]=is_ew; save_state(s)
    return is_ew
def check_birthdays():
    today=datetime.now(); rules=load_rules(); alerts=[]
    for role,info in rules["family"].items():
        m,d=int(info["birthday"].split("-")[0]),int(info["birthday"].split("-")[1])
        diff=(today.replace(month=m,day=d,hour=0,minute=0,second=0,microsecond=0)-today).days
        if -7<=diff<=7:
            if diff==0: alerts.append(f"TODAY is {info['name']}'s birthday!")
            elif diff>0: alerts.append(f"{info['name']}'s birthday in {diff} day(s).")
            else: alerts.append(f"{info['name']}'s birthday was {abs(diff)} day(s) ago.")
    return alerts
