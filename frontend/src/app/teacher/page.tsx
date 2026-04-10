"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  LayoutGrid,
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
} from "lucide-react";

interface Course {
  id: number;
  title: string;
}

interface Student {
  student_id: number;
  full_name: string;
  email: string;
}

export default function TeacherPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [level, setLevel] = useState("1"); // ← id ინახება, label-ის მაგივრად
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");

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
        console.error("კურსების ჩატვირთვის შეცდომა", err);
      }
    };
    fetchData();
  }, [router]);

  useEffect(() => {
    if (selectedCourse) {
      const fetchStudents = async () => {
        try {
          const res = await api.get(
            `/grades/course/${selectedCourse}/students`,
          );
          setStudents(res.data.students || []);
          setSelectedStudent("");
        } catch (err) {
          console.error("სტუდენტების ჩატვირთვის შეცდომა", err);
          setStudents([]);
        }
      };
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [selectedCourse]);

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
    formData.append("understanding_level", level); // ← ახლა "1", "2" ან "3" მიდის
    formData.append("teacher_feedback", feedback);

    if (selectedFile) {
      formData.append("attachment", selectedFile);
    } else if (fileUrl) {
      formData.append("file_url", fileUrl);
    }

    try {
      const response = await api.post("/evaluations/submit", formData);
      console.log("Response:", response.data);
      alert("✅ შეფასება წარმატებით გაიგზავნა!");

      setFeedback("");
      setSelectedFile(null);
      setFileUrl("");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "სერვერის შეცდომა";
      console.error("FULL ERROR DETAILS:", err.response?.data);
      alert("❌ შეცდომა: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) return null;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-[#101D2D] text-slate-400 flex flex-col shrink-0">
        <div
          className="p-6 mb-4 flex items-center gap-2 text-white text-xl font-black italic tracking-tighter cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
            <div className="w-4 h-4 bg-[#101D2D] rotate-45"></div>
          </div>
          UTOPIA
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-3 w-full p-3 rounded-xl text-sm font-medium hover:bg-slate-800/50 hover:text-white transition"
          >
            <LayoutGrid size={20} /> Dashboard
          </button>
          <div className="pt-6 pb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
            Lecturer Tools
          </div>
          <button className="flex items-center gap-3 w-full p-3 rounded-xl text-sm font-medium bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <Star size={20} /> Evaluate Students
          </button>
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
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

            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Course Selection */}
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

                {/* Student Selection */}
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

                {/* Level Buttons */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    გაგების დონე
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "1", label: "დაბალი გაგება" },
                      { id: "2", label: "გასაგებია" },
                      { id: "3", label: "მაღალი" },
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setLevel(lvl.id)} // ← id ინახება
                        className={`py-3 rounded-xl text-[9px] font-bold transition-all border ${
                          level === lvl.id // ← id-ით შედარება
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                            : "bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200"
                        }`}
                      >
                        {lvl.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
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
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-3 rounded-xl animate-in fade-in slide-in-from-top-1">
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

                {/* Submit Button */}
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
    </div>
  );
}
