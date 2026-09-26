"""Run `python -m api.db migrate` then `python -m api.db seed`. Never overwrites data."""
import argparse
import os
from pathlib import Path

from api.state import State
from api.storage import snapshot


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["migrate", "seed"])
    args = parser.parse_args()
    url = os.getenv("DATABASE_URL")
    if not url:
        parser.error("Set the server-side DATABASE_URL first")
    import psycopg
    from psycopg.types.json import Jsonb
    with psycopg.connect(url, prepare_threshold=None) as conn:
        if args.command == "migrate":
            conn.execute((Path(__file__).resolve().parent.parent / "migrations/001_operational_state.sql").read_text())
        else:
            conn.execute("INSERT INTO northlink.operational_state (id, payload) VALUES (1, %s) ON CONFLICT (id) DO NOTHING",
                         (Jsonb(snapshot(State())),))
    print(f"{args.command} complete")


if __name__ == "__main__":
    main()
