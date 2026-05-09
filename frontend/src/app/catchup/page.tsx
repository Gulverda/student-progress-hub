"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Sidebar from "@/app/components/Sidebar";
import StudentCard from "../components/catchup/StudentCard";
import DraftPanel from "../components/catchup/DraftPanel";
import { Target, TrendingUp, AlertTriangle, Users } from "lucide-react";

interface Profile {
  avg_hw_score: number;
  submission_rate: number;
  avg_understanding: number;
  understanding_trend: number;
  missed_homeworks: number;
  current_week: number;
}

interface Milestone {
  name: string;
  week: number;
  weeks_left: number;
}

export interface StudentPrediction {
  student_id: number;
  course_id: number;
  student_name: string;
  course_title: string;
  recommended_difficulty: "easy" | "medium" | "hard" | "complex";
  predicted_score: number;
  risk_level: "low" | "medium" | "high";
  risk_score: number;
  profile: Profile;
  milestone: Milestone;
}

export interface Draft {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  week_number: number;
  source: "ai" | "existing";
}

export default function CatchupPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelected] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentPrediction[]>([]);
  const [loadingStudents, setLoadingS] = useState(false);
  const [activeStudent, setActive] = useState<StudentPrediction | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loadingGen, setLoadingGen] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    if (!u?.id) {
      router.push("/login");
      return;
    }
    setUser(u);
    api.get("/courses/lecturer-courses").then((r) => setCourses(r.data));
  }, []);

  const loadStudents = async (courseId: number) => {
    setSelected(courseId);
    setActive(null);
    setDrafts([]);
    setLoadingS(true);
    try {
      const r = await api.get(`/catchup/course/${courseId}/students`);
      setStudents(r.data);
    } catch {
      setStudents([]);
    } finally {
      setLoadingS(false);
    }
  };

  const generate = async (student: StudentPrediction) => {
    setActive(student);
    setDrafts([]);
    setLoadingGen(true);
    try {
      const r = await api.post("/catchup/generate", {
        student_id: student.student_id,
        course_id: student.course_id,
      });
      setDrafts(r.data.drafts);
    } catch {
    } finally {
      setLoadingGen(false);
    }
  };

  const send = async (draft: Draft) => {
    if (!dueDate || !activeStudent) return;
    setSendingId(draft.id);
    try {
      await api.post(`/catchup/send/${draft.id}`, {
        student_id: activeStudent.student_id,
        due_date: dueDate,
      });
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    } finally {
      setSendingId(null);
    }
  };

  const removeDraft = (id: number) =>
    setDrafts((prev) => prev.filter((d) => d.id !== id));

  // Stats
  const highRisk = students.filter((s) => s.risk_level === "high").length;
  const medRisk = students.filter((s) => s.risk_level === "medium").length;
  const avgScore = students.length
    ? (
        students.reduce((a, s) => a + s.predicted_score, 0) / students.length
      ).toFixed(1)
    : "—";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <Sidebar role={user?.role ?? "teacher"} activePath="/catchup" />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-5 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Target size={20} className="text-indigo-600" />
                Adaptive Catch-up
              </h1>
              <p className="text-slate-400 text-xs font-bold mt-0.5">
                ML-ზე დაფუძნებული სტუდენტის რისკის ანალიზი
              </p>
            </div>

            {/* კურსის არჩევა */}
            <div className="flex gap-2 flex-wrap">
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadStudents(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedCourse === c.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Stats Row */}
          {students.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                icon={<Users size={18} className="text-indigo-500" />}
                label="სტუდენტები"
                value={String(students.length)}
                bg="bg-indigo-50"
              />
              <StatCard
                icon={<AlertTriangle size={18} className="text-rose-500" />}
                label="მაღალი რისკი"
                value={String(highRisk)}
                bg="bg-rose-50"
                valueColor="text-rose-600"
              />
              <StatCard
                icon={<AlertTriangle size={18} className="text-amber-500" />}
                label="საშუალო რისკი"
                value={String(medRisk)}
                bg="bg-amber-50"
                valueColor="text-amber-600"
              />
              <StatCard
                icon={<TrendingUp size={18} className="text-emerald-500" />}
                label="საშ. პროგნოზი"
                value={`${avgScore}`}
                bg="bg-emerald-50"
                valueColor="text-emerald-600"
              />
            </div>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* სტუდენტების სია */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                {selectedCourse
                  ? `სტუდენტები — რისკის მიხედვით`
                  : "კურსი აირჩიე"}
              </p>

              {loadingStudents ? (
                <div className="flex justify-center py-16">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              ) : students.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <Target size={28} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-bold">
                    {selectedCourse
                      ? "სტუდენტები ვერ მოიძებნა"
                      : "👆 აირჩიე კურსი სტუდენტების სანახავად"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map((s) => (
                    <StudentCard
                      key={`${s.student_id}-${s.course_id}`}
                      student={s}
                      isActive={activeStudent?.student_id === s.student_id}
                      onGenerate={() => generate(s)}
                      loading={
                        loadingGen && activeStudent?.student_id === s.student_id
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Draft Panel */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                {activeStudent ? "AI გენერირებული დავალებები" : ""}
              </p>
              {activeStudent ? (
                <DraftPanel
                  student={activeStudent}
                  drafts={drafts}
                  loading={loadingGen}
                  dueDate={dueDate}
                  onDueDateChange={setDueDate}
                  onSend={send}
                  onRemove={removeDraft}
                  sendingId={sendingId}
                />
              ) : (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <p className="text-slate-400 text-sm font-bold">
                    სტუდენტის კარტზე Generate დააჭირე
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
  valueColor = "text-slate-800",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <p className={`text-xl font-black ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}
