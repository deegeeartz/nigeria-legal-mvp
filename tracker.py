from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

TRACKER_PATH = Path(__file__).parent / "implementation_tracker.json"
IMPLEMENTATION_LOG_PATH = Path(__file__).parent / "IMPLEMENTATION_LOG.md"
VALID_STATUSES = {"todo", "in-progress", "completed", "blocked"}


def _today() -> str:
    return str(date.today())


def ensure_tracker_shape(payload: dict[str, Any]) -> dict[str, Any]:
    payload.setdefault("project", "Unnamed Project")
    payload.setdefault("last_updated", _today())
    payload.setdefault("phases", [])
    continuity = payload.setdefault("continuity", {})
    continuity.setdefault("project_context", "")
    continuity.setdefault("timeline", [])
    continuity.setdefault("decisions", [])
    continuity.setdefault("assumptions", [])
    continuity.setdefault("next_focus", [])
    return payload


def load_tracker() -> dict[str, Any]:
    with TRACKER_PATH.open("r", encoding="utf-8") as file:
        payload = json.load(file)
    return ensure_tracker_shape(payload)


def save_tracker(payload: dict[str, Any]) -> None:
    payload = ensure_tracker_shape(payload)
    payload["last_updated"] = _today()
    with TRACKER_PATH.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2)
        file.write("\n")


def append_timeline(payload: dict[str, Any], entry_type: str, summary: str, refs: list[str] | None = None) -> None:
    continuity = payload["continuity"]
    timeline = continuity.setdefault("timeline", [])
    timeline.append(
        {
            "date": _today(),
            "type": entry_type,
            "summary": summary,
            "refs": refs or [],
        }
    )


def find_item(payload: dict[str, Any], item_id: str) -> tuple[dict[str, Any], str] | None:
    for phase in payload.get("phases", []):
        for feature in phase.get("features", []):
            if feature.get("id") == item_id:
                return feature, "feature"
        for task in phase.get("tasks", []):
            if task.get("id") == item_id:
                return task, "task"
    return None


def list_items(payload: dict[str, Any]) -> None:
    print(f"Project: {payload.get('project')}")
    print(f"Last updated: {payload.get('last_updated')}\n")

    for phase in payload.get("phases", []):
        print(f"[{phase.get('id')}] {phase.get('name')} - {phase.get('status')}")
        print("  Features:")
        for feature in phase.get("features", []):
            print(f"    - {feature.get('id')}: {feature.get('name')} [{feature.get('status')}]")
        print("  Tasks:")
        for task in phase.get("tasks", []):
            print(f"    - {task.get('id')}: {task.get('title')} [{task.get('status')}] owner={task.get('owner')}")
        print()


def show_handoff(payload: dict[str, Any]) -> None:
    continuity = payload.get("continuity", {})
    timeline = continuity.get("timeline", [])
    decisions = continuity.get("decisions", [])

    print(f"Project: {payload.get('project')}")
    context = continuity.get("project_context") or "No project context set yet."
    print(f"Context: {context}\n")

    in_progress_tasks: list[dict[str, Any]] = []
    blocked_tasks: list[dict[str, Any]] = []
    todo_tasks: list[dict[str, Any]] = []
    for phase in payload.get("phases", []):
        for task in phase.get("tasks", []):
            status = task.get("status")
            if status == "in-progress":
                in_progress_tasks.append(task)
            elif status == "blocked":
                blocked_tasks.append(task)
            elif status == "todo":
                todo_tasks.append(task)

    print("Current execution")
    if in_progress_tasks:
        for task in in_progress_tasks:
            print(f"  - IN PROGRESS: {task.get('id')} {task.get('title')} (owner={task.get('owner')})")
    else:
        print("  - No task is currently in-progress")

    if blocked_tasks:
        for task in blocked_tasks:
            print(f"  - BLOCKED: {task.get('id')} {task.get('title')}")

    print("\nRecent timeline")
    for item in timeline[-5:]:
        refs = f" refs={','.join(item.get('refs', []))}" if item.get("refs") else ""
        print(f"  - {item.get('date')} [{item.get('type')}] {item.get('summary')}{refs}")
    if not timeline:
        print("  - No timeline entries yet")

    print("\nRecent decisions")
    for decision in decisions[-3:]:
        print(f"  - {decision.get('date')}: {decision.get('title')} -> {decision.get('decision')}")
    if not decisions:
        print("  - No decisions logged yet")

    print("\nNext suggested tasks")
    for task in todo_tasks[:3]:
        print(f"  - {task.get('id')} {task.get('title')}")
    if not todo_tasks:
        print("  - No pending tasks")


def add_decision(
    payload: dict[str, Any],
    title: str,
    decision_text: str,
    context: str,
    impact: str,
    owner: str,
) -> None:
    decision = {
        "date": _today(),
        "title": title,
        "context": context,
        "decision": decision_text,
        "impact": impact,
        "owner": owner,
    }
    payload["continuity"].setdefault("decisions", []).append(decision)
    append_timeline(payload, "decision", f"{title}: {decision_text}")


def add_note(payload: dict[str, Any], summary: str, refs: list[str] | None = None) -> None:
    append_timeline(payload, "note", summary, refs=refs)


def set_context(payload: dict[str, Any], context: str) -> None:
    payload["continuity"]["project_context"] = context
    append_timeline(payload, "context", "Updated project context")


def update_status(payload: dict[str, Any], item_id: str, status: str, note: str | None) -> None:
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Use one of: {', '.join(sorted(VALID_STATUSES))}")

    found = find_item(payload, item_id)
    if found is None:
        raise ValueError(f"No task/feature found for id '{item_id}'")

    item, item_type = found
    item["status"] = status
    if note:
        item["notes"] = note
    if item_type == "task":
        item["updated_on"] = _today()
    append_timeline(payload, "status_change", f"{item_id} -> {status}", refs=[item_id])


def add_task(payload: dict[str, Any], phase_id: str, title: str, owner: str) -> None:
    phase = next((entry for entry in payload.get("phases", []) if entry.get("id") == phase_id), None)
    if phase is None:
        raise ValueError(f"Phase '{phase_id}' not found")

    tasks = phase.setdefault("tasks", [])
    existing_ids = [task.get("id", "") for task in tasks]
    numbers = [int(item.split("-")[1]) for item in existing_ids if item.startswith("task-") and item.split("-")[1].isdigit()]
    next_id = max(numbers, default=0) + 1
    task_id = f"task-{next_id:03d}"

    tasks.append(
        {
            "id": task_id,
            "title": title,
            "status": "todo",
            "owner": owner,
            "updated_on": _today(),
        }
    )
    append_timeline(payload, "task_added", f"Added {task_id}: {title}", refs=[task_id, phase_id])


def _markdown_bullets(items: list[str]) -> str:
    if not items:
        return "- N/A\n"
    return "".join(f"- {item}\n" for item in items)


def append_implementation_log_entry(
    title: str,
    summary: str,
    implemented: list[str],
    validation: list[str],
    decision: str | None,
    refs: list[str],
) -> None:
    entry = (
        f"\n### {_today()} — {title}\n\n"
        f"**Summary**\n"
        f"- {summary}\n\n"
        f"**Implemented**\n"
        f"{_markdown_bullets(implemented)}\n"
        f"**Validation**\n"
        f"{_markdown_bullets(validation)}"
    )

    if decision:
        entry += f"\n**Decision Logged**\n- {decision}\n"

    if refs:
        refs_text = ", ".join(refs)
        entry += f"\n**Related Tracker Items**\n- {refs_text}\n"

    with IMPLEMENTATION_LOG_PATH.open("a", encoding="utf-8") as file:
        file.write(entry)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Project implementation tracker utility")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="List all phases, features and tasks")

    update = sub.add_parser("update", help="Update status for a task or feature")
    update.add_argument("item_id", help="task-xxx or feat-xxx")
    update.add_argument("status", help="todo | in-progress | completed | blocked")
    update.add_argument("--note", help="Optional note to attach")

    add = sub.add_parser("add-task", help="Add a new task to a phase")
    add.add_argument("phase_id", help="Phase id, e.g. phase-1")
    add.add_argument("title", help="Task title")
    add.add_argument("--owner", default="unassigned", help="Task owner")

    decision = sub.add_parser("log-decision", help="Log a product/implementation decision")
    decision.add_argument("title", help="Decision title")
    decision.add_argument("decision", help="Final decision statement")
    decision.add_argument("--context", default="", help="Why this decision was needed")
    decision.add_argument("--impact", default="", help="Expected impact")
    decision.add_argument("--owner", default="copilot", help="Decision owner")

    note = sub.add_parser("log-note", help="Append a timeline note")
    note.add_argument("summary", help="Note summary")
    note.add_argument("--refs", nargs="*", default=[], help="Related item ids")

    ctx = sub.add_parser("set-context", help="Set persistent project context for continuity")
    ctx.add_argument("context", help="High-level project context")

    impl = sub.add_parser("log-implementation", help="Append a structured entry to IMPLEMENTATION_LOG.md")
    impl.add_argument("title", help="Implementation milestone title")
    impl.add_argument("--summary", default="Implementation milestone completed", help="One-line summary")
    impl.add_argument("--implemented", nargs="*", default=[], help="Implemented bullet points")
    impl.add_argument("--validation", nargs="*", default=[], help="Validation/testing bullet points")
    impl.add_argument("--decision", help="Optional decision note")
    impl.add_argument("--refs", nargs="*", default=[], help="Related tracker task/feature ids")

    sub.add_parser("handoff", help="Print continuity summary for next session")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    payload = load_tracker()

    if args.command == "list":
        list_items(payload)
        return

    if args.command == "update":
        update_status(payload, args.item_id, args.status, args.note)
        save_tracker(payload)
        print(f"Updated {args.item_id} to {args.status}")
        return

    if args.command == "add-task":
        add_task(payload, args.phase_id, args.title, args.owner)
        save_tracker(payload)
        print("Task added")
        return

    if args.command == "log-decision":
        add_decision(payload, args.title, args.decision, args.context, args.impact, args.owner)
        save_tracker(payload)
        print("Decision logged")
        return

    if args.command == "log-note":
        add_note(payload, args.summary, refs=args.refs)
        save_tracker(payload)
        print("Note logged")
        return

    if args.command == "set-context":
        set_context(payload, args.context)
        save_tracker(payload)
        print("Context updated")
        return

    if args.command == "log-implementation":
        append_implementation_log_entry(
            title=args.title,
            summary=args.summary,
            implemented=args.implemented,
            validation=args.validation,
            decision=args.decision,
            refs=args.refs,
        )
        add_note(payload, f"Implementation log entry added: {args.title}", refs=args.refs)
        save_tracker(payload)
        print("Implementation log entry appended")
        return

    if args.command == "handoff":
        show_handoff(payload)
        return


if __name__ == "__main__":
    main()
