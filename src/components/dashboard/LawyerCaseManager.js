"use client";

import { useState, useEffect } from "react";
import {
  Briefcase,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  AlertCircle,
  FileText,
  Scale,
  DollarSign,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Mail,
  Send,
  MessageSquare,
  ArrowRight,
  Sparkles,
  BookOpen
} from "lucide-react";
import { CASE_STAGES, NIGERIAN_COURTS } from "@/lib/caseData";

export function LawyerCaseManager({ lawyerId = "lw_001", lawyerName = "Barr. Amaka Okonkwo" }) {
  const [cases, setCases] = useState([]);
  const [metrics, setMetrics] = useState({
    totalCases: 0,
    upcomingThisMonth: 0,
    totalRetainerValue: 0,
    totalRetainerCollected: 0,
    pendingTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCaseId, setExpandedCaseId] = useState(null);

  // New Matter Intake Modal
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);
  const [intakeForm, setIntakeForm] = useState({
    suit_number: "",
    title: "",
    client_name: "",
    client_phone: "",
    client_email: "",
    court: NIGERIAN_COURTS[0],
    presiding_judge: "",
    practice_area: "Corporate & Commercial",
    stage: "Pleadings & Filing",
    priority: "High",
    next_court_date: "",
    next_action: "",
    retainer_agreed_ngn: "1500000",
    initial_task: ""
  });

  // Inline note / task state per expanded case
  const [newNoteText, setNewNoteText] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("lawyer_id", lawyerId);
      if (selectedStage && selectedStage !== "All") params.set("stage", selectedStage);
      if (selectedPriority && selectedPriority !== "All") params.set("priority", selectedPriority);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/cases?${params.toString()}`);
      const data = await res.json();
      if (data.status === "success") {
        setCases(data.cases || []);
        if (data.metrics) setMetrics(data.metrics);
        if (data.cases?.length > 0 && !expandedCaseId) {
          setExpandedCaseId(data.cases[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load cases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [selectedStage, selectedPriority]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCases();
  };

  const handleToggleTask = async (caseId, taskId) => {
    // Optimistic update
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
          };
        }
        return c;
      })
    );

    try {
      await fetch("/api/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          action: "toggle_task",
          task_id: taskId
        })
      });
      showToast("Case task status updated");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (caseId) => {
    if (!newTaskText.trim()) return;
    try {
      const res = await fetch("/api/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          action: "add_task",
          task_text: newTaskText.trim(),
          task_due_date: newTaskDueDate || new Date().toISOString().split("T")[0]
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setCases((prev) => prev.map((c) => (c.id === caseId ? data.case : c)));
        setNewTaskText("");
        setNewTaskDueDate("");
        showToast("New milestone task added to docket");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async (caseId) => {
    if (!newNoteText.trim()) return;
    try {
      const res = await fetch("/api/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          action: "add_note",
          note_text: newNoteText.trim(),
          author_name: lawyerName
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setCases((prev) => prev.map((c) => (c.id === caseId ? data.case : c)));
        setNewNoteText("");
        showToast("Court proceedings note logged");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStage = async (caseId, newStage) => {
    try {
      const res = await fetch("/api/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          action: "update_stage",
          stage: newStage,
          author_name: lawyerName
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setCases((prev) => prev.map((c) => (c.id === caseId ? data.case : c)));
        showToast(`Matter stage updated to ${newStage}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    setIsSubmittingIntake(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyer_id: lawyerId,
          ...intakeForm
        })
      });
      const data = await res.json();
      if (data.status === "success" && data.case) {
        setCases((prev) => [data.case, ...prev]);
        setExpandedCaseId(data.case.id);
        setIsIntakeModalOpen(false);
        showToast("✓ Legal matter docketed successfully!");
        setIntakeForm({
          suit_number: "",
          title: "",
          client_name: "",
          client_phone: "",
          client_email: "",
          court: NIGERIAN_COURTS[0],
          presiding_judge: "",
          practice_area: "Corporate & Commercial",
          stage: "Pleadings & Filing",
          priority: "High",
          next_court_date: "",
          next_action: "",
          retainer_agreed_ngn: "1500000",
          initial_task: ""
        });
      }
    } catch (err) {
      console.error(err);
      showToast("Error creating case");
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-stone-900 text-amber-300 border border-stone-700 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Case Management Header & Quick Action */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
              Active Docket System
            </span>
            <span className="text-xs text-stone-400">• High Court & Appellate Practice</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 font-serif">
            Practice Matter & Case Management
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Track Nigerian court cause lists, hearing dates, client retainers, and filing milestones in real time.
          </p>
        </div>

        <button
          onClick={() => setIsIntakeModalOpen(true)}
          className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 shrink-0"
        >
          <Plus size={16} />
          <span>Docket New Matter</span>
        </button>
      </div>

      {/* Caseload Stat Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            Total Open Dockets
          </span>
          <p className="text-2xl font-black text-stone-900 mt-1 font-serif">
            {metrics.totalCases || cases.length}
          </p>
          <span className="text-[11px] font-semibold text-emerald-700 mt-0.5 inline-block">
            Across 4 Nigerian Jurisdictions
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            Hearings This Month
          </span>
          <p className="text-2xl font-black text-stone-900 mt-1 font-serif">
            {metrics.upcomingThisMonth || 3}
          </p>
          <span className="text-[11px] font-semibold text-amber-700 mt-0.5 inline-block">
            Next on Cause List: Aug 12
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            Active Retainers
          </span>
          <p className="text-2xl font-black text-stone-900 mt-1 font-serif">
            ₦{(metrics.totalRetainerValue || 9600000).toLocaleString()}
          </p>
          <span className="text-[11px] font-semibold text-emerald-700 mt-0.5 inline-block">
            Rule 10 Escrow Protected
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            Pending Tasks
          </span>
          <p className="text-2xl font-black text-stone-900 mt-1 font-serif">
            {metrics.pendingTasks || 5}
          </p>
          <span className="text-[11px] font-semibold text-stone-500 mt-0.5 inline-block">
            Filings & Subpoenas
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suit no, matter title, client or court..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-stone-900"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Stage:</span>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-800"
            >
              <option value="All">All Stages</option>
              {CASE_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-800"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Medium">Medium</option>
            </select>
          </div>
        </div>
      </div>

      {/* Case Dockets List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center">
            <div className="w-8 h-8 border-3 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-stone-500 font-medium">Loading active court dockets...</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center mx-auto">
              <Briefcase size={22} />
            </div>
            <h4 className="text-sm font-black text-stone-900">No Matters Found</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No cases matched the current search or stage filter. Docket a new client matter to begin tracking.
            </p>
            <button
              onClick={() => setIsIntakeModalOpen(true)}
              className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Docket New Matter
            </button>
          </div>
        ) : (
          cases.map((c) => {
            const isExpanded = expandedCaseId === c.id;
            const completedTasks = c.tasks?.filter((t) => t.done).length || 0;
            const totalTasks = c.tasks?.length || 0;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-3xl border transition-all overflow-hidden ${
                  isExpanded
                    ? "border-amber-400 shadow-md ring-1 ring-amber-400/30"
                    : "border-stone-200 hover:border-stone-300 shadow-2xs"
                }`}
              >
                {/* Summary Card Header (Click to expand) */}
                <div
                  onClick={() => setExpandedCaseId(isExpanded ? null : c.id)}
                  className="p-5 sm:p-6 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-stone-50/40 hover:bg-stone-50/80 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-stone-900 text-amber-300">
                        {c.suit_number}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900">
                        {c.stage}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.priority === "Urgent"
                            ? "bg-rose-100 text-rose-800"
                            : c.priority === "High"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {c.priority} Priority
                      </span>
                      <span className="text-[11px] text-stone-400 font-medium">
                        {c.practice_area}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-stone-900 font-serif leading-snug">
                      {c.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 font-medium">
                      <span className="flex items-center gap-1 text-stone-700">
                        <User size={13} className="text-stone-400" /> Client: <strong>{c.client_name}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Scale size={13} className="text-stone-400" /> {c.court}
                      </span>
                    </div>
                  </div>

                  {/* Right Status Block */}
                  <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-200">
                    <div className="text-left lg:text-right">
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-900">
                        <Calendar size={13} className="text-amber-600" />
                        <span>Next Date: {c.next_court_date}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 truncate max-w-xs mt-0.5">
                        {c.next_action}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-mono font-bold text-emerald-700 block">
                          ₦{(c.retainer_paid_ngn || 0).toLocaleString()} / ₦{(c.retainer_agreed_ngn || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-stone-400 font-medium">
                          {c.escrow_status}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Docket Workpane */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 border-t border-stone-200 space-y-6 bg-white animate-in slide-in-from-top-1 duration-150">
                    {/* Docket Quick Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs">
                      <div>
                        <span className="font-bold uppercase tracking-wider text-stone-400 text-[10px] block mb-1">
                          Presiding Judge & Forum
                        </span>
                        <p className="font-bold text-stone-900">{c.presiding_judge || "Judge In Chambers"}</p>
                        <p className="text-stone-500 text-[11px]">{c.court}</p>
                      </div>

                      <div>
                        <span className="font-bold uppercase tracking-wider text-stone-400 text-[10px] block mb-1">
                          Client Communication
                        </span>
                        <p className="font-bold text-stone-900">{c.client_name}</p>
                        <p className="text-stone-500 text-[11px] font-mono">{c.client_phone || "No phone recorded"}</p>
                      </div>

                      <div>
                        <span className="font-bold uppercase tracking-wider text-stone-400 text-[10px] block mb-1">
                          Progress Stage
                        </span>
                        <select
                          value={c.stage}
                          onChange={(e) => handleUpdateStage(c.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 bg-white"
                        >
                          {CASE_STAGES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Two-Column Section: Tasks/Milestones & Court Proceedings Notes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Tasks & Checklist */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                          <h4 className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            Milestone Tasks ({completedTasks}/{totalTasks})
                          </h4>
                          <span className="text-[11px] font-mono text-stone-400">
                            {Math.round((completedTasks / (totalTasks || 1)) * 100)}% Complete
                          </span>
                        </div>

                        {/* Task items list */}
                        <div className="space-y-2">
                          {c.tasks?.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => handleToggleTask(c.id, t.id)}
                              className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-colors ${
                                t.done
                                  ? "bg-emerald-50/60 border-emerald-200 text-stone-500 line-through"
                                  : "bg-white border-stone-200 text-stone-900 hover:border-stone-300"
                              }`}
                            >
                              <div className="mt-0.5 shrink-0 text-emerald-600">
                                {t.done ? <CheckCircle2 size={16} /> : <Circle size={16} className="text-stone-300" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{t.text}</p>
                                {t.due_date && (
                                  <span className="text-[10px] text-stone-400 font-mono">
                                    Due: {t.due_date}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Quick Add Task */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            placeholder="Add task (e.g. File Statement of Defence)..."
                            className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 text-xs placeholder:text-stone-400"
                          />
                          <input
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            className="px-2 py-1.5 rounded-xl border border-stone-200 text-[11px] text-stone-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddTask(c.id)}
                            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Right: Court Proceedings Notes */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                          <h4 className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                            <FileText size={14} className="text-amber-700" />
                            Bench Rulings & Court Notes
                          </h4>
                          <span className="text-[11px] text-stone-400 font-mono">
                            {c.notes?.length || 0} entries
                          </span>
                        </div>

                        {/* Notes list */}
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {c.notes?.map((n) => (
                            <div
                              key={n.id}
                              className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                                <span className="font-bold text-stone-700">{n.author}</span>
                                <span>{n.date}</span>
                              </div>
                              <p className="text-stone-800 font-medium leading-relaxed">{n.text}</p>
                            </div>
                          ))}
                        </div>

                        {/* Add Note Input */}
                        <div className="flex items-start gap-2 pt-1">
                          <textarea
                            rows={2}
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            placeholder="Log bench remark, ruling, or adjournment reason..."
                            className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-xs placeholder:text-stone-400 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddNote(c.id)}
                            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                          >
                            <Send size={12} /> Log
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Matter Docket Intake Modal */}
      {isIntakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div
            className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold">
                  <Scale size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 font-serif">Docket New Legal Matter</h3>
                  <p className="text-xs text-stone-500 font-medium">Onboard new court matter or commercial advisory brief</p>
                </div>
              </div>
              <button
                onClick={() => setIsIntakeModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Suit / Cause Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={intakeForm.suit_number}
                    onChange={(e) => setIntakeForm({ ...intakeForm, suit_number: e.target.value })}
                    placeholder="e.g. FHC/L/CS/1042/2026"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Practice Area
                  </label>
                  <input
                    type="text"
                    value={intakeForm.practice_area}
                    onChange={(e) => setIntakeForm({ ...intakeForm, practice_area: e.target.value })}
                    placeholder="Corporate, Tenancy, Labour, IP"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                  Matter Title / Parties *
                </label>
                <input
                  type="text"
                  required
                  value={intakeForm.title}
                  onChange={(e) => setIntakeForm({ ...intakeForm, title: e.target.value })}
                  placeholder="e.g. Zenith Global Ltd v. Standard Shipping Corp"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-serif font-bold text-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={intakeForm.client_name}
                    onChange={(e) => setIntakeForm({ ...intakeForm, client_name: e.target.value })}
                    placeholder="Client or Company"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Client Phone
                  </label>
                  <input
                    type="tel"
                    value={intakeForm.client_phone}
                    onChange={(e) => setIntakeForm({ ...intakeForm, client_phone: e.target.value })}
                    placeholder="+234 800 000 0000"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Client Email
                  </label>
                  <input
                    type="email"
                    value={intakeForm.client_email}
                    onChange={(e) => setIntakeForm({ ...intakeForm, client_email: e.target.value })}
                    placeholder="client@mail.com"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Court / Division *
                  </label>
                  <select
                    value={intakeForm.court}
                    onChange={(e) => setIntakeForm({ ...intakeForm, court: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-medium"
                  >
                    {NIGERIAN_COURTS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Presiding Judge / Chamber
                  </label>
                  <input
                    type="text"
                    value={intakeForm.presiding_judge}
                    onChange={(e) => setIntakeForm({ ...intakeForm, presiding_judge: e.target.value })}
                    placeholder="Hon. Justice ..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Matter Stage
                  </label>
                  <select
                    value={intakeForm.stage}
                    onChange={(e) => setIntakeForm({ ...intakeForm, stage: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                  >
                    {CASE_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Priority
                  </label>
                  <select
                    value={intakeForm.priority}
                    onChange={(e) => setIntakeForm({ ...intakeForm, priority: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Agreed Retainer (NGN)
                  </label>
                  <input
                    type="number"
                    value={intakeForm.retainer_agreed_ngn}
                    onChange={(e) => setIntakeForm({ ...intakeForm, retainer_agreed_ngn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Next Court Date
                  </label>
                  <input
                    type="date"
                    value={intakeForm.next_court_date}
                    onChange={(e) => setIntakeForm({ ...intakeForm, next_court_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                    Next Action on Cause List
                  </label>
                  <input
                    type="text"
                    value={intakeForm.next_action}
                    onChange={(e) => setIntakeForm({ ...intakeForm, next_action: e.target.value })}
                    placeholder="e.g. Pre-Trial Conference / Plea / Adoption"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1">
                  Initial Filing Task
                </label>
                <input
                  type="text"
                  value={intakeForm.initial_task}
                  onChange={(e) => setIntakeForm({ ...intakeForm, initial_task: e.target.value })}
                  placeholder="e.g. Serve Originating Summons on 1st Defendant"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsIntakeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIntake}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {isSubmittingIntake ? "Docketing..." : "Docket Legal Matter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
