import { StudentPrediction } from "@/app/catchup/page";
import RiskBadge from "./RiskBadge";
import { Zap } from "lucide-react";

const DIFF_LABEL: Record<string, string> = {
  easy: "იოლი",
  medium: "საშუალო",
  hard: "რთული",
  complex: "კომპლექსური",
};

const DIFF_COLOR: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-700",
  medium: "bg-blue-100 text-blue-700",
  hard: "bg-orange-100 text-orange-700",
  complex: "bg-rose-100 text-rose-700",
};

const TREND_ICON: Record<number, string> = { 1: "↑", "-1": "↓", 0: "→" };

interface Props {
  student: StudentPrediction;
  isActive: boolean;
  onGenerate: () => void;
  loading: boolean;
}

export default function StudentCard({
  student,
  isActive,
  onGenerate,
  loading,
}: Props) {
  const { profile, milestone } = student;

  return (
    <div
      className={`bg-white rounded-2xl border p-4 transition-all ${
        isActive
          ? "border-indigo-400 shadow-md"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-black text-slate-800">{student.student_name}</p>
          <p className="text-xs text-slate-400">{student.course_title}</p>
        </div>
        <RiskBadge level={student.risk_level} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-slate-50 rounded-xl p-2 text-center">
          <p className="text-xs text-slate-400">საშ. ქულა</p>
          <p className="font-black text-slate-700">
            {profile.avg_hw_score.toFixed(1)}
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2 text-center">
          <p className="text-xs text-slate-400">ჩაბარება</p>
          <p className="font-black text-slate-700">
            {profile.submission_rate.toFixed(0)}%
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2 text-center">
          <p className="text-xs text-slate-400">ტრენდი</p>
          <p
            className={`font-black text-lg ${
              profile.understanding_trend === 1
                ? "text-emerald-500"
                : profile.understanding_trend === -1
                  ? "text-rose-500"
                  : "text-slate-400"
            }`}
          >
            {TREND_ICON[profile.understanding_trend]}
          </p>
        </div>
      </div>

      {/* Milestone + predicted */}
      <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
        <span>
          ⏰ {milestone.name} — {milestone.weeks_left} კვირაში
        </span>
        <span>
          პროგნოზი:{" "}
          <span className="font-black text-slate-700">
            {student.predicted_score}
          </span>
        </span>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-bold px-2 py-1 rounded-lg ${
            DIFF_COLOR[student.recommended_difficulty]
          }`}
        >
          {DIFF_LABEL[student.recommended_difficulty]}
        </span>

        <button
          onClick={onGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700
                     disabled:opacity-50 text-white text-xs font-black
                     px-3 py-2 rounded-xl transition-all"
        >
          <Zap size={13} />
          {loading ? "გენერაცია..." : "Generate"}
        </button>
      </div>
    </div>
  );
}
