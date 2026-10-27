import { NextResponse } from "next/server";
import { INITIAL_CASES } from "@/lib/caseData";

// Keep in-memory cases stored in globalThis for Next.js hot dev persistence
if (!globalThis.__LEGAL_CASES__) {
  globalThis.__LEGAL_CASES__ = JSON.parse(JSON.stringify(INITIAL_CASES));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lawyerId = searchParams.get("lawyer_id") || "lw_001";
    const stage = searchParams.get("stage");
    const search = searchParams.get("search");
    const priority = searchParams.get("priority");

    let cases = globalThis.__LEGAL_CASES__ || [];

    // Filter by lawyer if specified
    if (lawyerId) {
      cases = cases.filter((c) => c.lawyer_id === lawyerId);
    }

    // Filter by stage
    if (stage && stage !== "All") {
      cases = cases.filter((c) => c.stage.toLowerCase() === stage.toLowerCase());
    }

    // Filter by priority
    if (priority && priority !== "All") {
      cases = cases.filter((c) => c.priority.toLowerCase() === priority.toLowerCase());
    }

    // Search query
    if (search) {
      const q = search.toLowerCase();
      cases = cases.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.suit_number.toLowerCase().includes(q) ||
          c.client_name.toLowerCase().includes(q) ||
          c.court.toLowerCase().includes(q) ||
          c.practice_area.toLowerCase().includes(q)
      );
    }

    // Sort by next court date ascending
    cases.sort((a, b) => new Date(a.next_court_date) - new Date(b.next_court_date));

    // Calculate lawyer caseload stats
    const totalCases = cases.length;
    const upcomingThisMonth = cases.filter((c) => {
      const d = new Date(c.next_court_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const totalRetainerValue = cases.reduce((sum, c) => sum + (c.retainer_agreed_ngn || 0), 0);
    const totalRetainerCollected = cases.reduce((sum, c) => sum + (c.retainer_paid_ngn || 0), 0);
    const pendingTasks = cases.reduce(
      (sum, c) => sum + (c.tasks ? c.tasks.filter((t) => !t.done).length : 0),
      0
    );

    return NextResponse.json({
      status: "success",
      cases,
      metrics: {
        totalCases,
        upcomingThisMonth,
        totalRetainerValue,
        totalRetainerCollected,
        pendingTasks
      }
    });
  } catch (error) {
    console.error("Error fetching cases:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to retrieve case management data" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      lawyer_id = "lw_001",
      suit_number,
      title,
      client_name,
      client_phone = "",
      client_email = "",
      court,
      presiding_judge = "Hon. Presiding Judge",
      practice_area,
      stage = "Pleadings & Filing",
      priority = "Normal",
      next_court_date,
      next_action = "First Mention / Pre-Trial Conference",
      retainer_agreed_ngn = 500000,
      initial_task = ""
    } = body;

    if (!title || !client_name || !court) {
      return NextResponse.json(
        { status: "error", message: "Title, Client Name, and Court are required fields." },
        { status: 400 }
      );
    }

    const newCase = {
      id: `case_${Date.now()}`,
      lawyer_id,
      suit_number: suit_number || `SUIT/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
      title,
      client_name,
      client_phone,
      client_email,
      court,
      presiding_judge,
      practice_area: practice_area || "General Litigation",
      stage,
      priority,
      filing_date: new Date().toISOString().split("T")[0],
      next_court_date: next_court_date || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      next_action,
      retainer_agreed_ngn: Number(retainer_agreed_ngn) || 500000,
      retainer_paid_ngn: Math.round((Number(retainer_agreed_ngn) || 500000) * 0.5),
      escrow_status: "Intake Retainer Deposited",
      tasks: [
        {
          id: `t_${Date.now()}_1`,
          text: initial_task || "File Letter of Engagement & Rule 10 Retainer",
          done: false,
          due_date: next_court_date || new Date().toISOString().split("T")[0]
        },
        {
          id: `t_${Date.now()}_2`,
          text: "Conduct comprehensive client intake interview & compile document bundle",
          done: true,
          due_date: new Date().toISOString().split("T")[0]
        }
      ],
      notes: [
        {
          id: `n_${Date.now()}`,
          author: "Learned Counsel",
          date: new Date().toISOString().split("T")[0],
          text: `Matter formally onboarded to Wigally Practice Management. Initial retainer agreed at ₦${(Number(retainer_agreed_ngn) || 500000).toLocaleString()}.`
        }
      ]
    };

    globalThis.__LEGAL_CASES__.unshift(newCase);

    return NextResponse.json({
      status: "success",
      message: "New legal matter successfully created and docketed",
      case: newCase
    });
  } catch (error) {
    console.error("Error creating case:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to create new case" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { case_id, action, stage, note_text, author_name, task_id, task_text, task_due_date, next_court_date, next_action } = body;

    const caseItem = globalThis.__LEGAL_CASES__.find((c) => c.id === case_id);
    if (!caseItem) {
      return NextResponse.json(
        { status: "error", message: "Case not found" },
        { status: 404 }
      );
    }

    if (action === "update_stage" && stage) {
      caseItem.stage = stage;
      caseItem.notes.unshift({
        id: `n_${Date.now()}`,
        author: author_name || "Counsel",
        date: new Date().toISOString().split("T")[0],
        text: `Matter stage progressed to: ${stage}`
      });
    } else if (action === "toggle_task" && task_id) {
      const task = caseItem.tasks.find((t) => t.id === task_id);
      if (task) {
        task.done = !task.done;
      }
    } else if (action === "add_task" && task_text) {
      caseItem.tasks.push({
        id: `t_${Date.now()}`,
        text: task_text,
        done: false,
        due_date: task_due_date || new Date().toISOString().split("T")[0]
      });
    } else if (action === "add_note" && note_text) {
      caseItem.notes.unshift({
        id: `n_${Date.now()}`,
        author: author_name || "Counsel Amaka Okonkwo",
        date: new Date().toISOString().split("T")[0],
        text: note_text
      });
    } else if (action === "update_hearing") {
      if (next_court_date) caseItem.next_court_date = next_court_date;
      if (next_action) caseItem.next_action = next_action;
      caseItem.notes.unshift({
        id: `n_${Date.now()}`,
        author: author_name || "Counsel",
        date: new Date().toISOString().split("T")[0],
        text: `Adjourned date updated: ${next_court_date}. Action: ${next_action}`
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Case docket successfully updated",
      case: caseItem
    });
  } catch (error) {
    console.error("Error updating case:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to update case docket" },
      { status: 500 }
    );
  }
}
