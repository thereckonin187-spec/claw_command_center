import json
from datetime import datetime
from pathlib import Path
STATE_PATH = Path(__file__).parent.parent / "memory" / "state.json"
TASK_DB_PATH = Path(__file__).parent.parent / "memory" / "task_db.json"
def load_state():
    with open(STATE_PATH) as f: return json.load(f)
def save_state(state):
    with open(STATE_PATH, "w") as f: json.dump(state, f, indent=2)
def load_task_db():
    with open(TASK_DB_PATH) as f: return json.load(f)
def save_task_db(db):
    with open(TASK_DB_PATH, "w") as f: json.dump(db, f, indent=2)
def get_todays_tasks():
    s=load_state(); t=[]; t.extend(s["tasks"]["daily"]); t.extend(s["tasks"]["weekly"]); t.extend(s.get("carryover_tasks",[])); return t
def complete_task(name):
    db=load_task_db(); db["completed"].append({"task":name,"completed_at":datetime.now().isoformat()}); db["carried_forward"]=[t for t in db["carried_forward"] if t!=name]; save_task_db(db)
def add_task(name,layer="projects"):
    s=load_state(); s["tasks"][layer].append(name); save_state(s)
