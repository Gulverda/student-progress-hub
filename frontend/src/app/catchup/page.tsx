"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import StudentCard from "../components/catchup/StudentCard";
import DraftPanel from "../components/catchup/DraftPanel";

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
}

export default function CatchupPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelected] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentPrediction[]>([]);
  const [loadingStudents, setLoadingS] = useState(false);
  const [activeStudent, setActive] = useState<StudentPrediction | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loadingGen, setLoadingGen] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");

  // კურსების ჩატვირთვა
  useEffect(() => {
    api.get("/courses/lecturer-courses").then((r) => setCourses(r.data));
  }, []);

  // სტუდენტების ჩატვირთვა კურსის მიხედვით
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

  // AI დავალებების გენერაცია
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

  // გაგზავნა
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

  // Draft-ის წაშლა
  const removeDraft = (id: number) =>
    setDrafts((prev) => prev.filter((d) => d.id !== id));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">
          🎯 Adaptive Catch-up
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          სტუდენტის რისკის ანალიზი და პერსონალიზებული დავალებები
        </p>
      </div>

      {/* კურსის არჩევა */}
      <div className="flex gap-2 flex-wrap mb-6">
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => loadStudents(c.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              selectedCourse === c.id
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* მთავარი layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* სტუდენტების სია */}
        <div>
          {loadingStudents ? (
            <div className="flex justify-center py-12">
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
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              {selectedCourse ? "სტუდენტები ვერ მოიძებნა" : "👆 აირჩიე კურსი"}
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
          {activeStudent && (
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
          )}
        </div>
      </div>
    </div>
  );
}
