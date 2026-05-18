"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  AlertTriangle,
} from "lucide-react";

const WEEKS = Array.from({ length: 16 }, (_, i) => i + 1);

interface Student {
  student_id: number;
  full_name: string;
  email: string;
  attendance: Record<string, boolean>;
}

interface Props {
  courseId?: number;
  currentWeek: number;
  studentId?: number;
}

export default function AttendanceTab({ courseId, currentWeek }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  // local edits: studentId → week → boolean
  const [edits, setEdits] = useState<Record<number, Record<number, boolean>>>(
    {},
  );
  const [dirty, setDirty] = useState(false);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/course/${courseId}`);
      setStudents(res.data.students ?? []);
      setEdits({});
      setDirty(false);
    } catch {
      showToast("err", "დასწრების წამოღება ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const toggle = (studentId: number, week: number, current: boolean | null) => {
    // null → true → false → true (cycle)
    const next = current === null ? true : !current;
    setEdits((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [week]: next },
    }));
    setDirty(true);
  };

  const getVal = (student: Student, week: number): boolean | null => {
    if (edits[student.student_id]?.[week] !== undefined) {
      return edits[student.student_id][week];
    }
    const v = student.attendance[String(week)];
    return v === undefined ? null : v;
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const promises: Promise<any>[] = [];
      for (const [sid, weeks] of Object.entries(edits)) {
        for (const [week, is_present] of Object.entries(weeks)) {
          promises.push(
            api.post("/attendance/save", {
              course_id: courseId,
              student_id: Number(sid),
              week: Number(week),
              is_present,
            }),
          );
        }
      }
      await Promise.all(promises);
      showToast("ok", "დასწრება შენახულია ✓");
      await fetchAttendance();
    } catch {
      showToast("err", "შენახვა ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  };

  // ── stats ──
  const presentCounts = students.map((s) => {
    let count = 0;
    WEEKS.forEach((w) => {
      if (w > currentWeek) return;
      const v = getVal(s, w);
      if (v === true) count++;
    });
    return count;
  });

  const totalPossible = WEEKS.filter((w) => w <= currentWeek).length;
  const avgRate =
    students.length > 0 && totalPossible > 0
      ? Math.round(
          (presentCounts.reduce((a, b) => a + b, 0) /
            (students.length * totalPossible)) *
            100,
        )
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
        <Loader2 className="animate-spin" size={20} /> იტვირთება...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 flex items-center gap-3 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            საშ. დასწრება
          </span>
          <span
            className={`text-xl font-black ${avgRate >= 75 ? "text-emerald-600" : avgRate >= 50 ? "text-amber-600" : "text-rose-600"}`}
          >
            {avgRate}%
          </span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 flex items-center gap-3 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            სტუდენტები
          </span>
          <span className="text-xl font-black text-slate-800">
            {students.length}
          </span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 flex items-center gap-3 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            ჩატარებული კვირები
          </span>
          <span className="text-xl font-black text-slate-800">
            {totalPossible}
          </span>
        </div>

        {dirty && (
          <button
            onClick={saveAll}
            disabled={saving}
            className="ml-auto flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            შენახვა
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center">
            <CheckCircle2 size={12} className="text-emerald-600" />
          </span>
          დასწრება
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-lg bg-rose-100 border border-rose-300 flex items-center justify-center">
            <XCircle size={12} className="text-rose-500" />
          </span>
          გაცდენა
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-lg bg-slate-100 border border-dashed border-slate-300" />
          შეუვსებელი
        </span>
        <span className="text-slate-300 text-[10px]">
          · დააჭირე checkbox-ს შეცვლისთვის
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
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
                    className={`p-3 font-black text-[10px] tracking-widest text-center min-w-[3rem] ${
                      w === currentWeek
                        ? "bg-slate-600"
                        : w > currentWeek
                          ? "opacity-30"
                          : ""
                    }`}
                  >
                    {w}
                    {w === currentWeek && (
                      <div className="text-[8px] text-indigo-300 font-bold">
                        ●
                      </div>
                    )}
                  </th>
                ))}
                <th className="p-3 font-black text-[10px] tracking-widest text-center min-w-[4rem]">
                  %
                </th>
                <th className="p-3 pr-8 font-black text-[10px] tracking-widest text-center min-w-[3rem]">
                  ✓/სულ
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan={20}
                    className="text-center py-16 text-slate-400 font-medium"
                  >
                    სტუდენტები ვერ მოიძებნა
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => {
                  const presentCount = presentCounts[idx];
                  const rate =
                    totalPossible > 0
                      ? Math.round((presentCount / totalPossible) * 100)
                      : 0;

                  return (
                    <tr
                      key={student.student_id}
                      className={
                        idx % 2 === 0
                          ? "bg-white hover:bg-slate-50/60"
                          : "bg-slate-50/30 hover:bg-slate-50/60"
                      }
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-8 py-3 font-bold text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">
                            {student.full_name?.charAt(0)}
                          </div>
                          <span className="text-sm">{student.full_name}</span>
                        </div>
                      </td>

                      {WEEKS.map((w) => {
                        const val = getVal(student, w);
                        const isFuture = w > currentWeek;

                        return (
                          <td
                            key={w}
                            className={`p-1 text-center ${isFuture ? "opacity-20 pointer-events-none" : ""}`}
                          >
                            <button
                              onClick={() =>
                                !isFuture && toggle(student.student_id, w, val)
                              }
                              className={`w-8 h-8 mx-auto rounded-xl border-2 flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                                val === true
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                                  : val === false
                                    ? "bg-rose-50 border-rose-300 text-rose-500"
                                    : "bg-slate-50 border-dashed border-slate-300 text-slate-300"
                              }`}
                            >
                              {val === true ? (
                                <CheckCircle2 size={14} />
                              ) : val === false ? (
                                <XCircle size={14} />
                              ) : (
                                <span className="text-[10px] font-black">
                                  –
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* % */}
                      <td className="px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black ${
                            rate >= 75
                              ? "bg-emerald-100 text-emerald-700"
                              : rate >= 50
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {rate}%
                        </span>
                      </td>

                      {/* count */}
                      <td className="px-3 pr-8 text-center text-xs font-bold text-slate-500 tabular-nums">
                        {presentCount}/{totalPossible}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold z-50 ${
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
