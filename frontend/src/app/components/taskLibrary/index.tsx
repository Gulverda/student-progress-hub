"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import api from "@/lib/api";
import {
  BookMarked,
  Plus,
  Trash2,
  X,
  Layers,
  ChevronRight,
} from "lucide-react";

type Level = "beginner" | "intermediate" | "advanced";

interface TaskTemplate {
  id: number;
  title: string;
  description: string;
  level: Level;
  max_score: number;
  created_by_name: string;
  created_at: string;
}

const LEVELS: {
  value: Level | "all";
  label: string;
  color: string;
  dot: string;
}[] = [
  {
    value: "all",
    label: "ყველა",
    color: "bg-slate-700 text-slate-300",
    dot: "bg-slate-400",
  },
  {
    value: "beginner",
    label: "I",
    color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    dot: "bg-emerald-400",
  },
  {
    value: "intermediate",
    label: "II",
    color: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    dot: "bg-amber-400",
  },
  {
    value: "advanced",
    label: "III",
    color: "bg-rose-500/15 text-rose-400 border border-rose-500/25",
    dot: "bg-rose-400",
  },
];

const levelMeta = (level: Level) => LEVELS.find((l) => l.value === level)!;

export default function TaskLibraryPage() {
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Level | "all">("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    level: "beginner" as Level,
    max_score: 100,
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setRole(user.role ?? "teacher");
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get("/task-templates");
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/task-templates", form);
      setShowModal(false);
      setForm({
        title: "",
        description: "",
        level: "beginner",
        max_score: 100,
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("დარწმუნებული ხართ, რომ გსურთ წაშლა?")) return;
    setDeleting(id);
    try {
      await api.delete(`/task-templates/${id}`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = tasks.filter((t) => {
    const matchLevel = filter === "all" || t.level === filter;
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  const counts = {
    all: tasks.length,
    beginner: tasks.filter((t) => t.level === "beginner").length,
    intermediate: tasks.filter((t) => t.level === "intermediate").length,
    advanced: tasks.filter((t) => t.level === "advanced").length,
  };

  return (
    <div className="flex h-screen bg-[#0b1623] overflow-hidden">
      <Sidebar role={role} activePath="/task-library" />

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0b1623]/80 backdrop-blur border-b border-slate-800 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center">
              <BookMarked size={18} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">
                დავალებების ბიბლიოთეკა
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                {tasks.length} შაბლონი სულ
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus size={16} /> ახალი შაბლონი
          </button>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {LEVELS.map((lvl) => (
              <button
                key={lvl.value}
                onClick={() => setFilter(lvl.value)}
                className={`rounded-2xl p-4 border text-left transition-all ${filter === lvl.value ? "bg-slate-800 border-indigo-500/50 shadow-lg shadow-indigo-500/10" : "bg-slate-900/50 border-slate-800 hover:border-slate-600"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${lvl.dot}`} />
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
                    {lvl.label}
                  </span>
                </div>
                <p className="text-white text-2xl font-black">
                  {counts[lvl.value as keyof typeof counts]}
                </p>
              </button>
            ))}
          </div>

          {/* Search + filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              {/* <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              /> */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="დავალების ძებნა..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500/60 text-white placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  onClick={() => setFilter(lvl.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === lvl.value ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-40 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Layers size={40} className="text-slate-700" />
              <p className="text-slate-500 font-semibold">
                შაბლონი ვერ მოიძებნა
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="text-indigo-400 text-sm hover:text-indigo-300 flex items-center gap-1 mt-1"
              >
                შექმენი პირველი <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((task) => {
                const meta = levelMeta(task.level);
                return (
                  <div
                    key={task.id}
                    className="group relative bg-slate-900/60 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 flex flex-col gap-3 transition-all hover:shadow-xl hover:shadow-black/30"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-slate-500 text-xs font-semibold">
                        {task.max_score} ქულა
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-base leading-snug">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-slate-500 text-sm mt-1.5 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <span className="text-slate-600 text-xs truncate max-w-[60%]">
                        {task.created_by_name}
                      </span>
                      <button
                        onClick={() => handleDelete(task.id)}
                        disabled={deleting === task.id}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-[#111d2e] border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">ახალი შაბლონი</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                  სათაური *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="მაგ: ალგორითმების შესავალი"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                  აღწერა
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="დავალების მოკლე აღწერა..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl text-sm outline-none transition-all resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                    დონე
                  </label>
                  {/* I / II / III buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { v: "beginner", l: "I" },
                      { v: "intermediate", l: "II" },
                      { v: "advanced", l: "III" },
                    ].map((lvl) => (
                      <button
                        key={lvl.v}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, level: lvl.v as Level })
                        }
                        className={`py-2 rounded-lg text-xs font-black tracking-widest transition-all border ${form.level === lvl.v ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-500/50"}`}
                      >
                        {lvl.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                    მაქს. ქულა
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_score}
                    onChange={(e) =>
                      setForm({ ...form, max_score: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-semibold transition-all"
              >
                გაუქმება
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/20"
              >
                {saving ? "ინახება..." : "შენახვა"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
