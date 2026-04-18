"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Star,
  User,
  MessageSquare,
  Loader2,
  Paperclip,
  Link2,
  X,
  FileText,
  BookOpen,
  ArrowRight,
  BookMarked,
  ChevronRight,
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

interface Course {
  id: number;
  title: string;
}
interface Student {
  student_id: number;
  full_name: string;
  email: string;
}
type Level = "beginner" | "intermediate" | "advanced";
interface TaskTemplate {
  id: number;
  title: string;
  description: string;
  level: Level;
  max_score: number;
}

const UNDERSTANDING_LEVELS = [
  { id: "1", label: "I" },
  { id: "2", label: "II" },
  { id: "3", label: "III" },
];

const LEVEL_META = {
  beginner: {
    label: "დამწყები",
    color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  },
  intermediate: {
    label: "საშუალო",
    color: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  },
  advanced: {
    label: "მოწინავე",
    color: "bg-rose-500/15 text-rose-400 border border-rose-500/25",
  },
};

export default function TeacherPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [level, setLevel] = useState("1");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");

  const [showLibrary, setShowLibrary] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [libFilter, setLibFilter] = useState<Level | "all">("all");
  const [libLoading, setLibLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskTemplate | null>(null);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const userJson = localStorage.getItem("user");
      if (!userJson) {
        router.push("/login");
        return;
      }
      const user = JSON.parse(userJson);
      if (user.role !== "teacher" && user.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      setIsAuthorized(true);
      try {
        const res = await api.get("/courses/lecturer-courses");
        setCourses(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [router]);

  useEffect(() => {
    if (!selectedCourse) {
      setStudents([]);
      return;
    }
    const fetch_ = async () => {
      try {
        const res = await api.get(`/grades/course/${selectedCourse}/students`);
        setStudents(res.data.students || []);
        setSelectedStudent("");
      } catch {
        setStudents([]);
      }
    };
    fetch_();
  }, [selectedCourse]);

  const openLibrary = async () => {
    setShowLibrary(true);
    if (templates.length > 0) return;
    setLibLoading(true);
    try {
      const res = await api.get("/task-templates");
      setTemplates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLibLoading(false);
    }
  };

  const pickTask = (task: TaskTemplate) => {
    setSelectedTask(task);
    setFeedback(task.description || task.title);
    setShowLibrary(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedCourse) {
      alert("გთხოვთ აირჩიოთ კურსი და სტუდენტი");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("student_id", selectedStudent);
    formData.append("topic_id", selectedCourse);
    formData.append("understanding_level", level);
    formData.append("teacher_feedback", feedback);
    if (selectedTask)
      formData.append("task_template_id", String(selectedTask.id));
    if (selectedFile) formData.append("attachment", selectedFile);
    else if (fileUrl) formData.append("file_url", fileUrl);
    try {
      await api.post("/evaluations/submit", formData);
      alert("✅ შეფასება წარმატებით გაიგზავნა!");
      setFeedback("");
      setSelectedFile(null);
      setFileUrl("");
      setSelectedTask(null);
    } catch (err: any) {
      alert(
        "❌ შეცდომა: " + (err.response?.data?.message || "სერვერის შეცდომა"),
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates =
    libFilter === "all"
      ? templates
      : templates.filter((t) => t.level === libFilter);

  if (!isAuthorized) return null;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <Sidebar role="teacher" activePath="/teacher" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-widest">
            <Star size={16} className="text-indigo-600" /> Evaluation Hub
          </h2>
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
            LG
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 flex justify-center">
          <div className="w-full max-w-[500px] space-y-8">
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-black text-[#101D2D] tracking-tight">
                შეფასება
              </h1>
              <p className="text-slate-400 text-sm font-medium">
                სტუდენტის აკადემიური პროგრესი
              </p>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Course */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    კურსი
                  </label>
                  <div className="relative group">
                    <BookOpen
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"
                      size={18}
                    />
                    <select
                      required
                      className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-medium appearance-none cursor-pointer"
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                    >
                      <option value="">აირჩიეთ კურსი...</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Student */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    სტუდენტი
                  </label>
                  <div className="relative group">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"
                      size={18}
                    />
                    <select
                      required
                      disabled={!selectedCourse}
                      className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-medium appearance-none cursor-pointer disabled:opacity-50"
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                    >
                      <option value="">
                        {selectedCourse
                          ? "აირჩიეთ სტუდენტი..."
                          : "ჯერ აირჩიეთ კურსი"}
                      </option>
                      {students.map((s) => (
                        <option key={s.student_id} value={s.student_id}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Understanding level — I / II / III */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    გაგების დონე
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {UNDERSTANDING_LEVELS.map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setLevel(lvl.id)}
                        className={`py-3 rounded-xl text-sm font-black tracking-widest transition-all border ${
                          level === lvl.id
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                            : "bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Task Library picker */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    დავალება
                  </label>
                  {selectedTask ? (
                    <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BookMarked
                          size={15}
                          className="text-indigo-500 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-indigo-800 text-xs font-bold truncate">
                            {selectedTask.title}
                          </p>
                          <p className="text-indigo-400 text-[10px]">
                            {LEVEL_META[selectedTask.level].label} ·{" "}
                            {selectedTask.max_score} ქულა
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTask(null)}
                        className="text-indigo-300 hover:text-indigo-600 ml-2 shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={openLibrary}
                      className="w-full flex items-center justify-between bg-slate-50 border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 p-4 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-2.5 text-slate-400 group-hover:text-indigo-500 transition-colors">
                        <BookMarked size={16} />
                        <span className="text-xs font-semibold">
                          ბიბლიოთეკიდან აირჩიე
                        </span>
                      </div>
                      <ChevronRight
                        size={15}
                        className="text-slate-300 group-hover:text-indigo-400 transition-colors"
                      />
                    </button>
                  )}
                </div>

                {/* Feedback */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    აკადემიური ფიდბექი
                  </label>
                  <div className="relative group">
                    <MessageSquare
                      className="absolute left-4 top-4 text-slate-300 group-focus-within:text-indigo-500"
                      size={18}
                    />
                    <textarea
                      placeholder="აღწერეთ პროგრესი..."
                      className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl h-24 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-medium resize-none"
                      onChange={(e) => setFeedback(e.target.value)}
                      value={feedback}
                    />
                  </div>
                </div>

                {/* File/Link */}
                <div className="flex gap-3 pt-2">
                  <label
                    className={`flex-1 cursor-pointer flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed transition-all ${selectedFile ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-300"}`}
                  >
                    <Paperclip size={18} />
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        setSelectedFile(e.target.files?.[0] || null);
                        setFileUrl("");
                      }}
                    />
                  </label>
                  <div className="flex-[4] relative">
                    <Link2
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="რესურსის ლინკი..."
                      disabled={!!selectedFile}
                      className="w-full bg-slate-50 border border-slate-100 p-4 pl-10 rounded-2xl outline-none text-xs font-medium disabled:opacity-40"
                      onChange={(e) => setFileUrl(e.target.value)}
                      value={fileUrl}
                    />
                  </div>
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-700 truncate max-w-[180px]">
                        {selectedFile.name}
                      </span>
                    </div>
                    <X
                      size={14}
                      className="text-emerald-600 cursor-pointer hover:scale-110"
                      onClick={() => setSelectedFile(null)}
                    />
                  </div>
                )}

                <button
                  disabled={loading}
                  className="w-full bg-[#101D2D] hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 group"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      Save Feedback{" "}
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Task Library Modal */}
      {showLibrary && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowLibrary(false)}
        >
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <BookMarked size={16} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    დავალებების ბიბლიოთეკა
                  </h3>
                  <p className="text-slate-400 text-[10px]">
                    {templates.length} შაბლონი
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                className="text-slate-400 hover:text-slate-700 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-1.5 px-6 pt-4">
              {(["all", "beginner", "intermediate", "advanced"] as const).map(
                (lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLibFilter(lvl)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${libFilter === lvl ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}
                  >
                    {lvl === "all" ? "ყველა" : LEVEL_META[lvl].label}
                  </button>
                ),
              )}
            </div>

            <div className="px-6 py-4 space-y-2 max-h-[360px] overflow-y-auto">
              {libLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-indigo-400" size={24} />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-12">
                  შაბლონი ვერ მოიძებნა
                </p>
              ) : (
                filteredTemplates.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => pickTask(task)}
                    className="w-full text-left flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${LEVEL_META[task.level].color}`}
                        >
                          {LEVEL_META[task.level].label}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {task.max_score} ქულა
                        </span>
                      </div>
                      <p className="text-slate-800 text-sm font-bold truncate">
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-slate-400 text-xs mt-0.5 truncate">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-slate-300 group-hover:text-indigo-400 shrink-0 ml-3 transition-colors"
                    />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
