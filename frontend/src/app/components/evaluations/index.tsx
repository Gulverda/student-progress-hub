"use client";
import { FileText, Link2, Loader2, X, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Evaluation {
  course_title?: string;
  course_id?: number;
  student_name?: string;
  lecturer_name?: string;
  understanding_level: number;
  teacher_feedback?: string;
  file_url?: string;
  created_at?: string;
}

interface Props {
  evaluations: Evaluation[];
  userRole?: "student" | "teacher" | "admin";
  loading?: boolean;
}

const LEVEL_CONFIG: Record<
  number,
  { label: string; cardClass: string; dotFill: string }
> = {
  3: {
    label: "Excellent",
    cardClass: "bg-green-50 text-green-800",
    dotFill: "bg-green-500",
  },
  2: {
    label: "Progressing",
    cardClass: "bg-amber-50 text-amber-800",
    dotFill: "bg-amber-500",
  },
  1: {
    label: "Needs work",
    cardClass: "bg-red-50 text-red-700",
    dotFill: "bg-red-500",
  },
};

function LevelDots({ level }: { level: number }) {
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG[1];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${config.cardClass}`}
    >
      <span className="flex gap-0.5 items-center">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${i <= level ? config.dotFill : "bg-slate-200"}`}
          />
        ))}
      </span>
      {config.label}
    </span>
  );
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-indigo-50 text-indigo-700",
  "bg-sky-50 text-sky-700",
  "bg-violet-50 text-violet-700",
  "bg-teal-50 text-teal-700",
];

function avatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getFileHref(fileUrl: string) {
  return fileUrl.startsWith("/uploads/")
    ? `${process.env.NEXT_PUBLIC_API_URL}${fileUrl}`
    : fileUrl;
}

function SingleCard({
  ev,
  role,
}: {
  ev: Evaluation;
  role: "student" | "teacher";
}) {
  const personName = role === "teacher" ? ev.student_name : ev.lecturer_name;
  const isUpload = ev.file_url?.startsWith("/uploads/");

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3 px-5 pt-4 pb-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium shrink-0 ${avatarColor(personName)}`}
        >
          {getInitials(personName)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 leading-tight">
            {personName || (role === "teacher" ? "Student" : "Instructor")}
          </p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {ev.course_title || `Course #${ev.course_id}`}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-[11px] text-slate-400">
            {new Date(ev.created_at || Date.now()).toLocaleDateString("ka-GE")}
          </span>
          <LevelDots level={ev.understanding_level} />
        </div>
      </div>

      <div className="px-5 pb-4">
        <p className="text-[13px] text-slate-600 leading-relaxed bg-slate-50 rounded-xl px-4 py-3 border-l-2 border-slate-200">
          &ldquo;{ev.teacher_feedback || "No written feedback."}&rdquo;
        </p>
      </div>

      <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-100">
        {ev.file_url ? (
          <a
            href={getFileHref(ev.file_url)}
            download={isUpload}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-opacity hover:opacity-75 ${
              isUpload
                ? "text-indigo-700 bg-indigo-50 border-indigo-100"
                : "text-sky-700 bg-sky-50 border-sky-100"
            }`}
          >
            {isUpload ? <FileText size={11} /> : <Link2 size={11} />}
            {isUpload ? "Download attachment" : "Open resource"}
          </a>
        ) : (
          <span className="text-[11px] text-slate-300">No attachment</span>
        )}
        <span className="text-[11px] text-slate-400">
          level {ev.understanding_level} / 3
        </span>
      </div>
    </div>
  );
}

export default function EvaluationCard({
  evaluations,
  userRole,
  loading,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  if (userRole === "admin") return null;

  const role = (userRole ?? "student") as "student" | "teacher";
  const preview = evaluations.slice(0, 2);
  const remaining = evaluations.length - 2;

  return (
    <>
      <section className="space-y-4">
        <div>
          <h3 className="font-medium text-slate-800 text-base">
            {role === "teacher"
              ? "Evaluation history"
              : "Lecturer feedback & grades"}
          </h3>
          {!loading && (
            <p className="text-[12px] text-slate-400 mt-0.5">
              {evaluations.length} evaluation
              {evaluations.length !== 1 ? "s" : ""}
              {evaluations.length > 0 ? " received" : ""}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-6">
            <Loader2 className="animate-spin" size={16} />
            <span>Loading...</span>
          </div>
        ) : evaluations.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-3">
              {preview.map((ev, idx) => (
                <SingleCard key={idx} ev={ev} role={role} />
              ))}
            </div>

            {remaining > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-dashed border-slate-200 text-[12px] font-medium text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-colors"
              >
                <ChevronDown size={14} />
                Load {remaining} more
              </button>
            )}
          </>
        ) : (
          <div className="border border-dashed border-slate-200 rounded-2xl py-12 text-center">
            <p className="text-slate-400 text-sm">No evaluations yet.</p>
          </div>
        )}
      </section>

      {/* MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <p className="font-medium text-slate-800 text-sm">
                  All evaluations
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {evaluations.length} total
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div className="overflow-y-auto p-4 space-y-3">
              {evaluations.map((ev, idx) => (
                <SingleCard key={idx} ev={ev} role={role} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
