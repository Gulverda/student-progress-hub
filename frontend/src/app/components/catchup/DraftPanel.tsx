import { StudentPrediction, Draft } from "@/app/catchup/page";
import { Send, Trash2 } from "lucide-react";

const DIFF_COLOR: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-700",
  medium: "bg-blue-100 text-blue-700",
  hard: "bg-orange-100 text-orange-700",
  complex: "bg-rose-100 text-rose-700",
};

const DIFF_LABEL: Record<string, string> = {
  easy: "იოლი",
  medium: "საშუალო",
  hard: "რთული",
  complex: "კომპლექსური",
};

interface Props {
  student: StudentPrediction;
  drafts: Draft[];
  loading: boolean;
  dueDate: string;
  onDueDateChange: (v: string) => void;
  onSend: (d: Draft) => void;
  onRemove: (id: number) => void;
  sendingId: number | null;
}

export default function DraftPanel({
  student,
  drafts,
  loading,
  dueDate,
  onDueDateChange,
  onSend,
  onRemove,
  sendingId,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      {/* Header */}
      <div className="mb-4">
        <p className="font-black text-slate-800">
          📋 Draft — {student.student_name}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          AI-ის მიერ გენერირებული, შენ ადასტურებ
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Deadline picker */}
      {!loading && drafts.length > 0 && (
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-600 block mb-1">
            Deadline
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => onDueDateChange(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2
                       text-sm outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      )}

      {/* Draft cards */}
      {!loading && drafts.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-8">
          Generate დააჭირე სტუდენტის კარტზე
        </p>
      )}

      <div className="space-y-3">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="border border-slate-100 rounded-xl p-3 bg-slate-50"
          >
            <div className="flex items-start justify-between mb-1">
              <p className="font-bold text-sm text-slate-800 flex-1 pr-2">
                {draft.title}
              </p>
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded-lg shrink-0 ${
                  DIFF_COLOR[draft.difficulty]
                }`}
              >
                {DIFF_LABEL[draft.difficulty]}
              </span>
            </div>

            {draft.description && (
              <p className="text-xs text-slate-500 mb-2 line-clamp-2">
                {draft.description}
              </p>
            )}

            {draft.week_number && (
              <p className="text-[11px] text-indigo-400 font-bold mb-2">
                კვირა {draft.week_number}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => onSend(draft)}
                disabled={!dueDate || sendingId === draft.id}
                className="flex-1 flex items-center justify-center gap-1.5
                           bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40
                           text-white text-xs font-black py-2 rounded-xl transition-all"
              >
                <Send size={12} />
                {sendingId === draft.id ? "იგზავნება..." : "გაგზავნა"}
              </button>
              <button
                onClick={() => onRemove(draft.id)}
                className="w-9 h-9 flex items-center justify-center
                           bg-rose-50 hover:bg-rose-100 text-rose-500
                           rounded-xl transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
