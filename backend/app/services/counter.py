# -*- coding: utf-8 -*-
"""클릭 카운터 서비스"""
import json
from pathlib import Path

COUNTER_DIR  = Path(__file__).resolve().parents[3] / "data"
COUNTER_PATH = COUNTER_DIR / "click_count.json"


def get_click_count() -> dict:
    try:
        if COUNTER_PATH.exists():
            with open(COUNTER_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {
                    "total":        int(data.get("total", 0)),
                    "severance":    int(data.get("severance", 0)),
                    "unemployment": int(data.get("unemployment", 0)),
                }
    except (json.JSONDecodeError, IOError):
        pass
    return {"total": 0, "severance": 0, "unemployment": 0}


def increment_click_count(service: str) -> dict:
    try:
        COUNTER_DIR.mkdir(parents=True, exist_ok=True)
        data = get_click_count()
        data["total"] += 1
        if service == "severance":
            data["severance"] += 1
        elif service == "unemployment":
            data["unemployment"] += 1
        with open(COUNTER_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        return data
    except IOError:
        return get_click_count()
