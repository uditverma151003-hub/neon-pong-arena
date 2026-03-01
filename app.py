from __future__ import annotations
import sqlite3
from pathlib import Path
from typing import Any
from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "leaderboard.db"

app = Flask(__name__)

def init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL,
                score INTEGER NOT NULL CHECK(score >= 0),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()

def get_top_scores(limit: int = 10) -> list[dict[str, Any]]:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT player_name, score, created_at
            FROM leaderboard
            ORDER BY score DESC, created_at ASC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]

@app.get("/")
def index() -> str:
    return render_template("index.html", leaderboard=get_top_scores())

@app.get("/api/leaderboard")
def leaderboard() -> Any:
    return jsonify(get_top_scores())

@app.post("/api/score")
def save_score() -> Any:
    payload = request.get_json(silent=True) or {}
    player_name = str(payload.get("name", "")).strip()
    score = payload.get("score", 0)

    if not player_name:
        return jsonify({"error": "Name is required."}), 400
    if len(player_name) > 24:
        return jsonify({"error": "Name must be 24 characters or fewer."}), 400
    if not isinstance(score, int) or score < 0:
        return jsonify({"error": "Score must be a non-negative integer."}), 400

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO leaderboard (player_name, score) VALUES (?, ?)",
            (player_name, score),
        )
        conn.commit()

    return jsonify({"ok": True, "leaderboard": get_top_scores()})

if __name__ == "__main__":
    init_db()
    app.run(debug=True)