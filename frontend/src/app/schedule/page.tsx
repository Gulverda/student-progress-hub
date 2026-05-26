"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Sidebar from "@/app/components/Sidebar";
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Plus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import PageHeader from "../components/PageHeader/inedx";

const DAYS = ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ"];
const DAYS_FULL = [
  "ორშაბათი",
  "სამშაბათი",
  "ოთხშაბათი",
  "ხუთშაბათი",
  "პარასკევი",
  "შაბათი",
];

const COLOR_OPTIONS = [
  {
    label: "Indigo",
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
  },
  {
    label: "Emerald",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    label: "Amber",
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  {
    label: "Rose",
    bg: "bg-rose-100",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  {
    label: "Sky",
    bg: "bg-sky-100",
    text: "text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-500",
  },
  {
    label: "Purple",
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
];

interface ScheduleEntry {
  id: number;
  course_id: number;
  course_title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
  lecturer_name: string;
  color_index: number;
}

interface NewEntry {
  course_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
  color_index: number;
}

export default function SchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Mobile: which day tab is selected
  const todayIndex = new Date().getDay() - 1; // 0=Mon, -1=Sun → clamp
  const [activeDay, setActiveDay] = useState(Math.max(0, todayIndex));

  const [form, setForm] = useState<NewEntry>({
    course_id: "",
    day_of_week: "0",
    start_time: "09:00",
    end_time: "10:30",
    room: "",
    color_index: 0,
  });

  const canEdit = user?.role === "teacher" || user?.role === "admin";

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    if (!u?.id) {
      router.push("/login");
      return;
    }
    setUser(u);

    const fetchAll = async () => {
      try {
        const [schedRes] = await Promise.all([api.get("/schedule")]);
        setEntries(schedRes.data);
        if (u.role === "teacher" || u.role === "admin") {
          const endpoint =
            u.role === "admin" ? "/courses" : "/courses/lecturer-courses";
          const cRes = await api.get(endpoint);
          setCourses(cRes.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [router]);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/schedule", {
        ...form,
        course_id: Number(form.course_id),
        day_of_week: Number(form.day_of_week),
        color_index: form.color_index,
      });
      const res = await api.get("/schedule");
      setEntries(res.data);
      setShowModal(false);
      showToast("ok", "განრიგი დამატებულია ✓");
    } catch (err: any) {
      showToast("err", err.response?.data?.message || "შეცდომა");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("წაიშალოს ეს გაკვეთილი?")) return;
    try {
      await api.delete(`/schedule/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      showToast("ok", "წაიშალა ✓");
    } catch {
      showToast("err", "წაშლა ვერ მოხერხდა");
    }
  };

  const byDay: Record<number, ScheduleEntry[]> = {};
  for (let d = 0; d < 6; d++) byDay[d] = [];
  entries.forEach((e) => {
    if (byDay[e.day_of_week] !== undefined) byDay[e.day_of_week].push(e);
  });
  Object.values(byDay).forEach((arr) =>
    arr.sort((a, b) => a.start_time.localeCompare(b.start_time)),
  );

  // Shared entry card
  const EntryCard = ({ entry }: { entry: ScheduleEntry }) => {
    const col = COLOR_OPTIONS[entry.color_index ?? 0] ?? COLOR_OPTIONS[0];
    return (
      <div
        className={`rounded-[1.5rem] border p-4 transition-all group relative ${col.bg} ${col.border}`}
      >
        {canEdit && (
          <button
            onClick={() => handleDelete(entry.id)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/60"
          >
            <Trash2 size={12} className={col.text} />
          </button>
        )}
        <div className="flex items-center gap-1.5 mb-2">
          <div className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
          <span
            className={`text-[9px] font-black uppercase tracking-widest ${col.text} opacity-70`}
          >
            {entry.start_time} – {entry.end_time}
          </span>
        </div>
        <p className={`font-black text-xs leading-tight mb-2 ${col.text}`}>
          {entry.course_title}
        </p>
        {entry.room && (
          <div className={`flex items-center gap-1 ${col.text} opacity-60`}>
            <MapPin size={10} />
            <span className="text-[9px] font-bold">{entry.room}</span>
          </div>
        )}
        {entry.lecturer_name && (
          <div
            className={`flex items-center gap-1 mt-1 ${col.text} opacity-60`}
          >
            <BookOpen size={10} />
            <span className="text-[9px] font-bold truncate">
              {entry.lecturer_name}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <Sidebar role={user?.role ?? "student"} activePath="/schedule" />

      {/* pt-16 on mobile to clear the hamburger button from Sidebar */}
      <main className="flex-1 flex flex-col overflow-hidden md:pt-0">
        <PageHeader icon={Calendar} title="განრიგი">
          {canEdit && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
            >
              <Plus size={14} /> გაკვეთილის დამატება
            </button>
          )}
        </PageHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6">
          {/* Title + week nav */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                კვირის განრიგი
              </h1>
              <p className="text-slate-400 font-medium mt-1 text-sm">
                2025–2026 · საგაზაფხულო სემესტრი
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft size={16} className="text-slate-500" />
              </button>
              <span className="text-xs font-black text-slate-500 bg-slate-100 px-4 py-2 rounded-full whitespace-nowrap">
                {weekOffset === 0
                  ? "მიმდინარე კვირა"
                  : weekOffset > 0
                    ? `+${weekOffset} კვ.`
                    : `${weekOffset} კვ.`}
              </span>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <ChevronRight size={16} className="text-slate-500" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32 text-slate-400 gap-3">
              <Loader2 className="animate-spin" size={20} /> განრიგი
              იტვირთება...
            </div>
          ) : (
            <>
              {/* ── MOBILE: day tabs + single column ── */}
              <div className="md:hidden space-y-4">
                {/* Scrollable day tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                  {DAYS.map((day, idx) => {
                    const isToday = idx === todayIndex;
                    const isActive = idx === activeDay;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveDay(idx)}
                        className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black border transition-all ${
                          isActive
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                            : isToday
                              ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                              : "bg-white border-slate-200 text-slate-500"
                        }`}
                      >
                        {day}
                        {isToday && (
                          <span className="block text-[8px] font-bold opacity-70">
                            დღეს
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active day's entries */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {DAYS_FULL[activeDay]}
                  </p>
                  {(byDay[activeDay] ?? []).length === 0 ? (
                    <div className="rounded-[1.5rem] border-2 border-dashed border-slate-200 p-8 flex items-center justify-center">
                      <p className="text-xs text-slate-300 font-bold text-center">
                        გაკვეთილი არ არის
                      </p>
                    </div>
                  ) : (
                    (byDay[activeDay] ?? []).map((entry) => (
                      <EntryCard key={entry.id} entry={entry} />
                    ))
                  )}
                </div>
              </div>

              {/* ── DESKTOP: 6-column grid ── */}
              <div className="hidden md:grid grid-cols-6 gap-4">
                {DAYS.map((day, idx) => {
                  const isToday = idx === todayIndex;
                  const dayEntries = byDay[idx] ?? [];
                  return (
                    <div key={idx} className="flex flex-col gap-3">
                      <div
                        className={`rounded-2xl px-4 py-3 text-center border ${
                          isToday
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white border-slate-200 text-slate-500"
                        }`}
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest">
                          {day}
                        </p>
                        {isToday && (
                          <p className="text-[9px] font-bold opacity-70 mt-0.5">
                            დღეს
                          </p>
                        )}
                      </div>
                      {dayEntries.length === 0 ? (
                        <div className="flex-1 rounded-[1.5rem] border-2 border-dashed border-slate-100 p-4 flex items-center justify-center min-h-[80px]">
                          <p className="text-[10px] text-slate-300 font-bold text-center">
                            გაკვეთილი
                            <br />
                            არ არის
                          </p>
                        </div>
                      ) : (
                        dayEntries.map((entry) => (
                          <EntryCard key={entry.id} entry={entry} />
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Legend */}
          {!loading && entries.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                კურსები
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  new Map(entries.map((e) => [e.course_id, e])).values(),
                ).map((e) => {
                  const col =
                    COLOR_OPTIONS[e.color_index ?? 0] ?? COLOR_OPTIONS[0];
                  return (
                    <span
                      key={e.course_id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${col.bg} ${col.border} ${col.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                      {e.course_title}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* On mobile: sheet from bottom; on sm+: centered card */}
          <div className="bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-[2.5rem] z-10">
              <h2 className="text-lg font-black text-slate-800">
                გაკვეთილის დამატება
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 md:p-8 space-y-5">
              {/* Course */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  კურსი
                </label>
                <select
                  required
                  value={form.course_id}
                  onChange={(e) =>
                    setForm({ ...form, course_id: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">აირჩიეთ კურსი...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  დღე
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {DAYS.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, day_of_week: String(i) })
                      }
                      className={`py-2.5 rounded-xl text-[10px] font-black border transition-all ${
                        form.day_of_week === String(i)
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    დაწყება
                  </label>
                  <input
                    type="time"
                    required
                    value={form.start_time}
                    onChange={(e) =>
                      setForm({ ...form, start_time: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    დასრულება
                  </label>
                  <input
                    type="time"
                    required
                    value={form.end_time}
                    onChange={(e) =>
                      setForm({ ...form, end_time: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Room */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  აუდიტორია
                </label>
                <div className="relative">
                  <MapPin
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="მაგ: A-202"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pl-10 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  ფერი
                </label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm({ ...form, color_index: i })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        form.color_index === i
                          ? "border-slate-800 scale-110"
                          : "border-transparent"
                      }`}
                    >
                      <span
                        className={`block w-full h-full rounded-full ${c.dot}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={saving}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                დამატება
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-8 right-4 md:right-8 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold z-50 ${
            toast.type === "ok"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toast.type === "ok" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
