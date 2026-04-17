"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  LayoutGrid,
  BookOpen,
  GraduationCap,
  LogOut,
  TrendingUp,
  Loader2,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

// ─── Grade helpers ─────────────────────────────────────────────────────────

const ROMAN = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
];

function calcGrade(score: number): {
  letter: string;
  color: string;
  bg: string;
  border: string;
} {
  if (score >= 98)
    return {
      letter: "+A",
      color: "text-emerald-700",
      bg: "bg-emerald-100",
      border: "border-emerald-200",
    };
  if (score >= 94)
    return {
      letter: "A",
      color: "text-emerald-700",
      bg: "bg-emerald-100",
      border: "border-emerald-200",
    };
  if (score >= 91)
    return {
      letter: "-A",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    };
  if (score >= 88)
    return {
      letter: "+B",
      color: "text-blue-700",
      bg: "bg-blue-100",
      border: "border-blue-200",
    };
  if (score >= 85)
    return {
      letter: "B",
      color: "text-blue-700",
      bg: "bg-blue-100",
      border: "border-blue-200",
    };
  if (score >= 81)
    return {
      letter: "-B",
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    };
  if (score >= 78)
    return {
      letter: "+C",
      color: "text-indigo-700",
      bg: "bg-indigo-100",
      border: "border-indigo-200",
    };
  if (score >= 75)
    return {
      letter: "C",
      color: "text-indigo-700",
      bg: "bg-indigo-100",
      border: "border-indigo-200",
    };
  if (score >= 71)
    return {
      letter: "-C",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-100",
    };
  if (score >= 68)
    return {
      letter: "+D",
      color: "text-amber-700",
      bg: "bg-amber-100",
      border: "border-amber-200",
    };
  if (score >= 65)
    return {
      letter: "D",
      color: "text-amber-700",
      bg: "bg-amber-100",
      border: "border-amber-200",
    };
  if (score >= 61)
    return {
      letter: "-D",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    };
  if (score >= 58)
    return {
      letter: "+E",
      color: "text-orange-700",
      bg: "bg-orange-100",
      border: "border-orange-200",
    };
  if (score >= 55)
    return {
      letter: "E",
      color: "text-orange-700",
      bg: "bg-orange-100",
      border: "border-orange-200",
    };
  if (score >= 51)
    return {
      letter: "-E",
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-100",
    };
  return {
    letter: "F",
    color: "text-rose-700",
    bg: "bg-rose-100",
    border: "border-rose-200",
  };
}

// ─── Component ────────────────────────────────────────────────────────────

export default function StudentGradesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
      router.push("/login");
      return;
    }
    const u = JSON.parse(userJson);
    if (u.role !== "student") {
      router.push("/dashboard");
      return;
    }
    setUser(u);

    api
      .get("/grades/my-grades")
      .then((r) => {
        setCourses(r.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const toggleCourse = (id: number) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // overall GPA-ish average
  const overallPct =
    courses.length > 0
      ? Math.round(
          courses.reduce((acc, c) => {
            const tot = Number(c.total_score) || 0;
            const max = Number(c.total_max) || 0;
            return acc + (max > 0 ? (tot / max) * 100 : 0);
          }, 0) / courses.length,
        )
      : 0;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* ── Sidebar ── */}
      <Sidebar role="student" activePath="/grades/student" />

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <GraduationCap size={18} className="text-indigo-600" />
            <span className="font-bold text-slate-800">ჩემი შეფასებები</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
            <a href="/profile">
              <img
                src={`https://ui-avatars.com/api/?name=${user?.full_name || "S"}&background=random`}
                alt=""
              />
            </a>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                აკადემიური პროგრესი
              </h1>
              <p className="text-slate-400 font-medium mt-1">
                2025–2026 · საგაზაფხულო სემესტრი
              </p>
            </div>

            {/* Overall badge */}
            {courses.length > 0 && (
              <div
                className={`px-6 py-4 rounded-3xl border-2 text-center ${calcGrade(overallPct).bg} ${calcGrade(overallPct).border}`}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  საერთო
                </p>
                <p
                  className={`text-4xl font-black mt-0.5 ${calcGrade(overallPct).color}`}
                >
                  {calcGrade(overallPct).letter}
                </p>
                <p className="text-xs text-slate-400 font-bold">
                  {overallPct}%
                </p>
              </div>
            )}
          </div>

          {/* ── Grade scale legend ── */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
              შეფასების სკალა
            </p>
            <div className="grid grid-cols-6 gap-2">
              {[
                ["+A", "98-100", "emerald"],
                ["A", "94-97", "emerald"],
                ["-A", "91-93", "emerald"],
                ["+B", "88-90", "blue"],
                ["B", "85-87", "blue"],
                ["-B", "81-84", "blue"],
                ["+C", "78-80", "indigo"],
                ["C", "75-77", "indigo"],
                ["-C", "71-74", "indigo"],
                ["+D", "68-70", "amber"],
                ["D", "65-67", "amber"],
                ["-D", "61-64", "amber"],
                ["+E", "58-60", "orange"],
                ["E", "55-57", "orange"],
                ["-E", "51-54", "orange"],
                ["F", "≤50", "rose"],
              ].map(([letter, range, col]) => (
                <div
                  key={letter}
                  className={`text-center p-2 rounded-2xl bg-${col}-50 border border-${col}-100`}
                >
                  <p className={`font-black text-sm text-${col}-700`}>
                    {letter}
                  </p>
                  <p className={`text-[9px] font-bold text-${col}-400 mt-0.5`}>
                    {range}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Course cards ── */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
              <Loader2 className="animate-spin" size={20} /> ქულები იტვირთება...
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center">
              <GraduationCap
                size={32}
                className="text-slate-200 mx-auto mb-3"
              />
              <p className="font-bold text-slate-400">კურსები არ მოიძებნა</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => {
                const obtained = Number(course.total_score) || 0;
                const max = Number(course.total_max) || 100;
                const pct = max > 0 ? Math.round((obtained / max) * 100) : 0;
                const grade = calcGrade(pct);
                const open = expanded[course.course_id];
                const hasGrades = Number(course.weeks_graded) > 0;

                return (
                  <div
                    key={course.course_id}
                    className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden transition-all"
                  >
                    {/* course header */}
                    <button
                      onClick={() => toggleCourse(course.course_id)}
                      className="w-full flex items-center gap-6 p-6 px-8 text-left hover:bg-slate-50/50 transition-colors"
                    >
                      {/* icon */}
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <BookOpen size={22} />
                      </div>

                      {/* course info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 text-base truncate">
                          {course.course_title}
                        </h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                          {course.course_code} ·{" "}
                          {course.lecturer_name || "ლექტორი"}
                        </p>
                      </div>

                      {/* progress bar */}
                      <div className="hidden md:block w-40">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                          <span>
                            {obtained.toFixed(1)} / {max.toFixed(1)}
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pct >= 91
                                ? "bg-emerald-500"
                                : pct >= 81
                                  ? "bg-blue-500"
                                  : pct >= 71
                                    ? "bg-indigo-500"
                                    : pct >= 61
                                      ? "bg-amber-500"
                                      : pct >= 51
                                        ? "bg-orange-500"
                                        : "bg-rose-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* grade badge */}
                      <span
                        className={`shrink-0 w-16 text-center px-3 py-2 rounded-2xl font-black text-base border ${grade.bg} ${grade.color} ${grade.border}`}
                      >
                        {hasGrades ? grade.letter : "–"}
                      </span>

                      {open ? (
                        <ChevronUp
                          size={18}
                          className="text-slate-400 shrink-0"
                        />
                      ) : (
                        <ChevronDown
                          size={18}
                          className="text-slate-400 shrink-0"
                        />
                      )}
                    </button>

                    {/* expanded: weekly breakdown */}
                    {open && (
                      <div className="border-t border-slate-100 px-8 py-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                          კვირეული შეფასებები
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: 16 }, (_, i) => i + 1).map(
                            (w) => {
                              // ვიღებთ ქულას weekly_scores-დან
                              const score =
                                course.weekly_scores?.[w.toString()];

                              // რადგან თქვენს მონაცემებში max_score არ ჩანს,
                              // დროებით 100-ს ან სხვა სტატიკურ რიცხვს შევადაროთ პროცენტისთვის,
                              // ან უბრალოდ ქულა გამოვიტანოთ
                              const weekPct =
                                score != null
                                  ? Math.round((Number(score) / 10) * 100)
                                  : null;
                              const wGrade =
                                weekPct !== null ? calcGrade(weekPct) : null;

                              return (
                                <div
                                  key={w}
                                  className={`flex flex-col items-center p-3 rounded-2xl border min-w-[52px] transition-all
      ${
        score != null
          ? `${wGrade?.bg} ${wGrade?.border}`
          : "bg-slate-50 border-dashed border-slate-200"
      }`}
                                >
                                  <span className="text-[9px] font-black text-slate-400 uppercase">
                                    {ROMAN[w - 1]}
                                  </span>
                                  <span
                                    className={`font-black text-sm mt-1 ${
                                      score != null
                                        ? wGrade?.color
                                        : "text-slate-300"
                                    }`}
                                  >
                                    {score != null ? `${score}` : "–"}
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>

                        {/* summary row */}
                        {hasGrades && (
                          <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                            <SummaryPill
                              label="მიღებული"
                              value={`${obtained.toFixed(1)}`}
                            />
                            <SummaryPill
                              label="მაქსიმუმი"
                              value={`${max.toFixed(1)}`}
                            />
                            <SummaryPill label="პროცენტი" value={`${pct}%`} />
                            <SummaryPill
                              label="საბოლოო"
                              value={grade.letter}
                              className={`${grade.bg} ${grade.color} ${grade.border} border`}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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
      className={`flex items-center gap-3 w-full p-3.5 rounded-2xl text-sm font-bold transition-all
        ${
          active
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "hover:bg-slate-800 hover:text-white"
        }`}
    >
      {icon} {label}
    </button>
  );
}

function SummaryPill({
  label,
  value,
  className = "bg-slate-100 text-slate-700",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`px-4 py-2 rounded-2xl ${className}`}>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="font-black text-sm">{value}</p>
    </div>
  );
}
