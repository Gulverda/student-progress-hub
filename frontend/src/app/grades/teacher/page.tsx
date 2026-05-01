"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  LayoutGrid,
  Star,
  LogOut,
  BookOpen,
  ChevronDown,
  Users,
  TrendingUp,
  Award,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Save,
  X,
  Settings,
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader/inedx";

const WEEKS = Array.from({ length: 16 }, (_, i) => i + 1);

const DEFAULT_WEEK_MAX: Record<number, number> = {
  2: 2,
  3: 2,
  4: 10,
  5: 2,
  6: 2,
  7: 10,
  8: 20,
  9: 2,
  10: 2,
  11: 2,
  12: 10,
  13: 2,
  14: 2,
  15: 2,
  16: 30,
};

function calcGrade(score: number): {
  letter: string;
  color: string;
  bg: string;
} {
  if (score >= 98)
    return { letter: "+A", color: "text-emerald-700", bg: "bg-emerald-100" };
  if (score >= 94)
    return { letter: "A", color: "text-emerald-700", bg: "bg-emerald-100" };
  if (score >= 91)
    return { letter: "-A", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (score >= 88)
    return { letter: "+B", color: "text-blue-700", bg: "bg-blue-100" };
  if (score >= 85)
    return { letter: "B", color: "text-blue-700", bg: "bg-blue-100" };
  if (score >= 81)
    return { letter: "-B", color: "text-blue-600", bg: "bg-blue-50" };
  if (score >= 78)
    return { letter: "+C", color: "text-indigo-700", bg: "bg-indigo-100" };
  if (score >= 75)
    return { letter: "C", color: "text-indigo-700", bg: "bg-indigo-100" };
  if (score >= 71)
    return { letter: "-C", color: "text-indigo-600", bg: "bg-indigo-50" };
  if (score >= 68)
    return { letter: "+D", color: "text-amber-700", bg: "bg-amber-100" };
  if (score >= 65)
    return { letter: "D", color: "text-amber-700", bg: "bg-amber-100" };
  if (score >= 61)
    return { letter: "-D", color: "text-amber-600", bg: "bg-amber-50" };
  if (score >= 58)
    return { letter: "+E", color: "text-orange-700", bg: "bg-orange-100" };
  if (score >= 55)
    return { letter: "E", color: "text-orange-700", bg: "bg-orange-100" };
  if (score >= 51)
    return { letter: "-E", color: "text-orange-600", bg: "bg-orange-50" };
  return { letter: "F", color: "text-rose-700", bg: "bg-rose-100" };
}

type LocalEdits = Record<number, Record<number, string>>;
type ColumnType = "quiz" | "midterm" | "final";

function getWeekScore(student: any, week: number): number | null {
  if (week === 8) {
    const v = student.midterm_score;
    return v == null ? null : Number(v);
  }
  if (week === 16) {
    const v = student.final_score;
    return v == null ? null : Number(v);
  }
  const ws = student.weekly_scores;
  if (!ws) return null;
  const val = ws[String(week)] ?? ws[week];
  if (val == null) return null;
  if (typeof val === "object" && val.score != null) return Number(val.score);
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function computeRowTotals(
  student: any,
  localEdits: Record<number, string> | undefined,
  weekMax: Record<number, number>,
  currentWeek: number,
  weekFrom: number = 1,
  weekTo: number = 16,
) {
  let obtained = 0;
  let possible = 0;

  WEEKS.forEach((w) => {
    if (w > currentWeek) return;
    if (w < weekFrom || w > weekTo) return;

    const max = weekMax[w] ?? 2;
    const localVal = localEdits?.[w];
    if (localVal !== undefined && localVal !== "") {
      const parsed = parseFloat(localVal);
      if (!isNaN(parsed)) {
        obtained += parsed;
        possible += max;
        return;
      }
    }
    const score = getWeekScore(student, w);
    if (score !== null) obtained += score;
    possible += max;
  });

  return { obtained, possible };
}

function calcCurrentWeek(semesterStart: string): number {
  const start = new Date(semesterStart);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(Math.max(diffWeeks, 1), 16);
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function GradebookPage() {
  const router = useRouter();

  // ── state (ყველა hook return-მდე) ──
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [columnTypes] = useState<Record<number, ColumnType>>({
    8: "midterm",
    16: "final",
  });
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [localEdits, setLocalEdits] = useState<LocalEdits>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);
  const [weekMax, setWeekMax] =
    useState<Record<number, number>>(DEFAULT_WEEK_MAX);
  const [semesterStart, setSemesterStart] = useState<string>("");
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [showSettings, setShowSettings] = useState(false);
  const [editingWeekMax, setEditingWeekMax] = useState<Record<number, string>>(
    {},
  );
  const [editingSemStart, setEditingSemStart] = useState("");
  const [weekFrom, setWeekFrom] = useState(1); // ← სწორ ადგილას
  const [weekTo, setWeekTo] = useState(16); // ← სწორ ადგილას

  // ── auth ──
  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(userJson);
    if (user.role !== "teacher" && user.role !== "admin")
      router.push("/dashboard");
    else setIsAuthorized(true);
  }, [router]);

  // ── fetch settings ──
  useEffect(() => {
    if (!isAuthorized) return;
    Promise.all([
      api.get("/settings/semester-start"),
      api.get("/settings/week-scores"),
    ])
      .then(([startRes, scoresRes]) => {
        const date = startRes.data.date ?? "";
        setSemesterStart(date);
        setEditingSemStart(date);
        if (date) setCurrentWeek(calcCurrentWeek(date));

        const scores = scoresRes.data.scores ?? DEFAULT_WEEK_MAX;
        const parsed: Record<number, number> = {};
        Object.entries(scores).forEach(([k, v]) => {
          parsed[Number(k)] = Number(v);
        });
        setWeekMax(parsed);
        const strMap: Record<number, string> = {};
        Object.entries(parsed).forEach(([k, v]) => {
          strMap[Number(k)] = String(v);
        });
        setEditingWeekMax(strMap);
      })
      .catch(() => {});
  }, [isAuthorized]);

  // ── fetch courses ──
  useEffect(() => {
    if (!isAuthorized) return;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const endpoint =
      user?.role === "admin" ? "/courses" : "/courses/lecturer-courses";
    api.get(endpoint).then((r) => {
      setCourses(r.data);
      if (r.data.length > 0) setCourseId(r.data[0].id);
    });
  }, [isAuthorized]);

  // ── fetch grades ──
  const fetchGrades = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await api.get(`/grades/course/${courseId}/students`);
      setStudents(res.data.students ?? []);
      setLocalEdits({});
      setEditingRow(null);
    } catch {
      showToast("err", "ქულების წამოღება ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const saveSettings = async () => {
    try {
      const newScores: Record<number, number> = {};
      Object.entries(editingWeekMax).forEach(([k, v]) => {
        newScores[Number(k)] = parseFloat(v) || 0;
      });
      await Promise.all([
        api.post("/settings/semester-start", { date: editingSemStart }),
        api.post("/settings/week-scores", { scores: newScores }),
      ]);
      setWeekMax(newScores);
      setSemesterStart(editingSemStart);
      if (editingSemStart) setCurrentWeek(calcCurrentWeek(editingSemStart));
      setShowSettings(false);
      showToast("ok", "პარამეტრები შენახულია ✓");
    } catch {
      showToast("err", "შენახვა ვერ მოხერხდა");
    }
  };

  const startEdit = (studentId: number) => {
    const student = students.find((s) => s.student_id === studentId);
    const prefilled: Record<number, string> = {};
    if (student) {
      WEEKS.forEach((w) => {
        const score = getWeekScore(student, w);
        if (score !== null) prefilled[w] = String(score);
      });
    }
    setLocalEdits((prev) => ({ ...prev, [studentId]: prefilled }));
    setEditingRow(studentId);
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setLocalEdits((prev) => {
      const next = { ...prev };
      if (editingRow != null) delete next[editingRow];
      return next;
    });
  };

  const handleChange = (studentId: number, week: number, value: string) => {
    const parsedValue = parseFloat(value);
    const effectiveMax = weekMax[week] ?? 2;
    if (!isNaN(parsedValue) && parsedValue > effectiveMax) return;
    setLocalEdits((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [week]: value },
    }));
  };

  const handleSave = async (studentId: number) => {
    if (!courseId) {
      showToast("err", "კურსი არაა არჩეული");
      return;
    }
    const edits = localEdits[studentId] ?? {};
    const entries = Object.entries(edits).filter(([, v]) => v !== "");
    if (entries.length === 0) {
      cancelEdit();
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        entries.map(([week, value]) => {
          const score = parseFloat(value);
          if (isNaN(score)) return Promise.resolve();
          const type: ColumnType = columnTypes[Number(week)] ?? "quiz";
          return api.post("/grades/submit", {
            student_id: Number(studentId),
            course_id: Number(courseId),
            week: Number(week),
            score,
            type,
          });
        }),
      );
      showToast("ok", "შენახულია ✓");
      await fetchGrades();
    } catch (error: any) {
      showToast("err", error.response?.data?.message || "შეცდომა");
    } finally {
      setSaving(false);
    }
  };

  // ── stats (weekFrom/weekTo ფილტრით) ──
  const passCount = students.filter((s) => {
    const { obtained, possible } = computeRowTotals(
      s,
      undefined,
      weekMax,
      currentWeek,
      weekFrom,
      weekTo,
    );
    return possible > 0 && (obtained / possible) * 100 >= 51;
  }).length;

  const avgPct =
    students.length > 0
      ? Math.round(
          students.reduce((acc, s) => {
            const { obtained, possible } = computeRowTotals(
              s,
              undefined,
              weekMax,
              currentWeek,
              weekFrom,
              weekTo,
            );
            return acc + (possible > 0 ? (obtained / possible) * 100 : 0);
          }, 0) / students.length,
        )
      : 0;

  if (!isAuthorized) return null;

  const selectedCourse = courses.find((c) => c.id === courseId);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* ── Sidebar ── */}
      <Sidebar role="teacher" activePath="/grades/teacher" />

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <PageHeader icon={BookOpen} title="ჟურნალი">
          {semesterStart && (
            <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-4 py-2 rounded-full border border-indigo-100">
              კვირა {currentWeek} / 16
            </span>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
          >
            <Settings size={14} /> პარამეტრები
          </button>
        </PageHeader>
        {/* <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <BookOpen size={18} className="text-indigo-600" />
            <span className="font-bold text-slate-800">Gradebook</span>
            {selectedCourse && (
              <>
                <span className="text-slate-300">/</span>
                <span className="text-slate-500 font-medium text-sm">
                  {selectedCourse.title}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {semesterStart && (
              <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-4 py-2 rounded-full border border-indigo-100">
                კვირა {currentWeek} / 16
              </span>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
            >
              <Settings size={14} /> პარამეტრები
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
              <img
                src="https://ui-avatars.com/api/?name=Teacher&background=random"
                alt=""
              />
            </div>
          </div>
        </header> */}

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-end">
            {/* კურსი */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                კურსი / Course
              </label>
              <div className="relative">
                <select
                  value={courseId ?? ""}
                  onChange={(e) => {
                    cancelEdit();
                    setCourseId(Number(e.target.value));
                  }}
                  className="appearance-none bg-white border border-slate-200 rounded-2xl px-5 py-3 pr-10 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.course_code})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* კვირების დიაპაზონი — ცალკე div, კურსის გარეთ */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                კვირების დიაპაზონი
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={weekFrom}
                  onChange={(e) => setWeekFrom(Number(e.target.value))}
                  className="appearance-none bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                >
                  {WEEKS.filter((w) => w <= weekTo).map((w) => (
                    <option key={w} value={w}>
                      კვ. {w}
                    </option>
                  ))}
                </select>
                <span className="text-slate-400 font-bold text-sm">—</span>
                <select
                  value={weekTo}
                  onChange={(e) => setWeekTo(Number(e.target.value))}
                  className="appearance-none bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                >
                  {WEEKS.filter((w) => w >= weekFrom).map((w) => (
                    <option key={w} value={w}>
                      კვ. {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ml-auto">
              <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-4 py-2 rounded-full border border-indigo-100">
                2025–2026 · საგაზაფხულო სემ.
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<Users size={18} />}
              label="სტუდენტები"
              value={students.length}
              sub="enrolled"
            />
            <StatCard
              icon={<TrendingUp size={18} />}
              label="საშუალო %"
              value={`${avgPct}%`}
              sub={calcGrade(avgPct).letter}
              color={calcGrade(avgPct).color}
            />
            <StatCard
              icon={<Award size={18} />}
              label="Pass Rate"
              value={`${students.length ? Math.round((passCount / students.length) * 100) : 0}%`}
              sub={`${passCount} / ${students.length}`}
            />
          </div>

          {/* Grade Table */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
              <Loader2 className="animate-spin" size={20} /> ქულები იტვირთება...
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex gap-2 flex-wrap px-8 py-4 border-b border-slate-100 bg-slate-50/60">
                {[
                  "+A/A/-A",
                  "91–100",
                  "+B/B/-B",
                  "81–90",
                  "+C/C/-C",
                  "71–80",
                  "+D/D/-D",
                  "61–70",
                  "+E/E/-E",
                  "51–60",
                  "F",
                  "≤50",
                ].map((t, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold text-slate-500 bg-white border border-slate-100 rounded-full px-2.5 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#101D2D] text-white">
                      <th className="sticky left-0 z-10 bg-[#101D2D] text-left p-4 pl-8 font-black text-[11px] uppercase tracking-widest w-52">
                        სტუდენტი
                      </th>
                      {WEEKS.map((w) => (
                        <th
                          key={w}
                          className={`p-3 font-black text-[10px] tracking-widest text-center min-w-[3.5rem] ${
                            w === 8
                              ? "bg-indigo-900"
                              : w === 16
                                ? "bg-purple-900"
                                : w === currentWeek
                                  ? "bg-slate-600"
                                  : ""
                          } ${w < weekFrom || w > weekTo ? "opacity-30" : ""}`}
                        >
                          {w === 8 ? "MID" : w === 16 ? "FIN" : w}
                          {w === currentWeek && w !== 8 && w !== 16 && (
                            <div className="text-[8px] text-indigo-300 font-bold">
                              ●
                            </div>
                          )}
                        </th>
                      ))}
                      <th className="p-3 font-black text-[10px] tracking-widest text-center">
                        სულ
                      </th>
                      <th className="p-3 font-black text-[10px] tracking-widest text-center">
                        მაქს
                      </th>
                      <th className="p-3 font-black text-[10px] tracking-widest text-center">
                        %
                      </th>
                      <th className="p-3 font-black text-[10px] tracking-widest text-center">
                        ქულა
                      </th>
                      <th className="p-3 pr-8 font-black text-[10px] tracking-widest text-center">
                        მოქმედება
                      </th>
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <td className="sticky left-0 z-10 bg-slate-50 px-8 py-2 text-[10px] text-slate-400 font-bold">
                        მაქს. / კვირა
                      </td>
                      {WEEKS.map((w) => (
                        <td
                          key={w}
                          className={`text-center text-[10px] font-bold ${
                            w < weekFrom || w > weekTo
                              ? "opacity-30"
                              : w > currentWeek
                                ? "text-slate-200"
                                : "text-slate-400"
                          }`}
                        >
                          {weekMax[w] != null && weekMax[w] > 0
                            ? weekMax[w]
                            : "–"}
                        </td>
                      ))}
                      <td colSpan={5} />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-50">
                    {students.length === 0 ? (
                      <tr>
                        <td
                          colSpan={22}
                          className="text-center py-16 text-slate-400 font-medium"
                        >
                          ამ კურსზე სტუდენტები ჯერ არ არიან
                        </td>
                      </tr>
                    ) : (
                      students.map((student, idx) => {
                        const isEditing = editingRow === student.student_id;
                        const rowEdits = localEdits[student.student_id] ?? {};
                        // ← weekFrom/weekTo გადაეცემა
                        const { obtained, possible } = computeRowTotals(
                          student,
                          isEditing ? rowEdits : undefined,
                          weekMax,
                          currentWeek,
                          weekFrom,
                          weekTo,
                        );
                        const pct =
                          possible > 0
                            ? Math.round((obtained / possible) * 100)
                            : 0;
                        const grade = calcGrade(pct);

                        return (
                          <tr
                            key={student.student_id}
                            className={`transition-colors ${
                              isEditing
                                ? "bg-indigo-50/60 ring-1 ring-inset ring-indigo-200"
                                : idx % 2 === 0
                                  ? "bg-white hover:bg-slate-50/60"
                                  : "bg-slate-50/30 hover:bg-slate-50/60"
                            }`}
                          >
                            <td className="sticky left-0 z-10 bg-inherit px-8 py-3 font-bold text-slate-700 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">
                                  {student.full_name?.charAt(0)}
                                </div>
                                <span className="text-sm">
                                  {student.full_name}
                                </span>
                              </div>
                            </td>

                            {WEEKS.map((w) => {
                              const serverScore = getWeekScore(student, w);
                              const isFuture = w > currentWeek;
                              const isFiltered = w < weekFrom || w > weekTo;
                              const displayValue = isEditing
                                ? (rowEdits[w] ??
                                  (serverScore !== null
                                    ? String(serverScore)
                                    : ""))
                                : serverScore !== null
                                  ? String(serverScore)
                                  : "";

                              return (
                                <td
                                  key={w}
                                  className={`p-1 text-center ${(isFuture || isFiltered) && !isEditing ? "opacity-30" : ""} ${(w === 8 || w === 16) && !isEditing ? "bg-slate-50/80" : ""}`}
                                >
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min={0}
                                      max={weekMax[w] ?? 0}
                                      step={0.5}
                                      value={displayValue}
                                      onChange={(e) =>
                                        handleChange(
                                          student.student_id,
                                          w,
                                          e.target.value,
                                        )
                                      }
                                      className="w-12 text-center bg-white rounded-xl py-1.5 text-sm font-bold outline-none border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 shadow-sm"
                                    />
                                  ) : (
                                    <div
                                      className={`w-12 mx-auto text-center rounded-xl py-1.5 text-sm font-bold border ${
                                        displayValue !== ""
                                          ? "border-slate-200 bg-slate-50 text-slate-800"
                                          : "border-dashed border-slate-200 text-slate-300"
                                      }`}
                                    >
                                      {displayValue !== "" ? displayValue : "–"}
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            <td className="px-3 text-center font-bold text-slate-700 tabular-nums">
                              {obtained.toFixed(1)}
                            </td>
                            <td className="px-3 text-center text-slate-400 text-xs tabular-nums">
                              {possible.toFixed(1)}
                            </td>
                            <td className="px-3 text-center font-bold tabular-nums">
                              {pct}%
                            </td>
                            <td className="px-3 text-center">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-[11px] font-black ${grade.bg} ${grade.color}`}
                              >
                                {grade.letter}
                              </span>
                            </td>
                            <td className="px-3 pr-8 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() =>
                                      handleSave(student.student_id)
                                    }
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm"
                                  >
                                    {saving ? (
                                      <Loader2
                                        size={12}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Save size={12} />
                                    )}
                                    შენახვა
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    disabled={saving}
                                    className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-60"
                                  >
                                    <X size={12} /> გაუქმება
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEdit(student.student_id)}
                                  disabled={editingRow !== null}
                                  className="flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-indigo-100 hover:text-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Pencil size={12} /> რედაქტირება
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800">პარამეტრები</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  სემესტრის დაწყება
                </label>
                <input
                  type="date"
                  value={editingSemStart}
                  onChange={(e) => setEditingSemStart(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {editingSemStart && (
                  <p className="text-xs text-indigo-600 font-bold">
                    → მიმდინარე კვირა: {calcCurrentWeek(editingSemStart)}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  კვირების მაქსიმალური ქულები
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {WEEKS.map((w) => (
                    <div key={w} className="space-y-1">
                      <label
                        className={`text-[10px] font-black ${w === 8 ? "text-indigo-600" : w === 16 ? "text-purple-600" : "text-slate-400"}`}
                      >
                        {w === 8
                          ? "კვ.8 MID"
                          : w === 16
                            ? "კვ.16 FIN"
                            : `კვირა ${w}`}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={weekMax[w] ?? 0}
                        value={editingWeekMax[w] ?? ""}
                        onChange={(e) =>
                          setEditingWeekMax((prev) => ({
                            ...prev,
                            [w]: e.target.value,
                          }))
                        }
                        className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
                <p
                  className={`text-xs font-bold ${
                    Object.values(editingWeekMax).reduce(
                      (a, v) => a + (parseFloat(v) || 0),
                      0,
                    ) === 100
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  ჯამი:{" "}
                  {Object.values(editingWeekMax).reduce(
                    (a, v) => a + (parseFloat(v) || 0),
                    0,
                  )}{" "}
                  / 100
                </p>
              </div>
            </div>

            <div className="p-8 pt-0 flex gap-3 justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                გაუქმება
              </button>
              <button
                onClick={saveSettings}
                className="px-6 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30"
              >
                შენახვა
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold z-50 animate-in slide-in-from-bottom-4 duration-300 ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
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

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex items-center gap-3 w-full p-3.5 rounded-2xl text-sm font-bold transition-all ${active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "hover:bg-slate-800 hover:text-white"}`}
    >
      {icon} {label}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color = "text-slate-900",
}: {
  icon: any;
  label: string;
  value: any;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
      <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <p className={`text-2xl font-black mt-0.5 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 font-bold">{sub}</p>}
      </div>
    </div>
  );
}
