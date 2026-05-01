"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Search,
  BookOpen,
  GraduationCap,
  Star,
  Loader2,
  Quote,
  XCircle,
  ShieldCheck,
  FileText,
  Link2,
  Calendar as CalendarIcon,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import EvaluationCard from "../components/evaluations";
import ChatWidget from "../components/ChatWidget";

export default function UtopiaDashboard() {
  const [user, setUser] = useState<any>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvals, setLoadingEvals] = useState(false);
  const router = useRouter();

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: "",
    course_code: "",
    lecturer_id: "",
    is_mandatory: false,
    color_scheme: "bg-indigo-50 text-indigo-600 border-indigo-100",
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (!storedUser.token && !localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    setUser(storedUser);
    initDashboard(storedUser);
  }, [router]);

  const initDashboard = async (currUser: any) => {
    setLoading(true);
    try {
      fetchMyEvaluations();
      if (currUser.role === "student") {
        const [myRes, availRes] = await Promise.all([
          api.get("/courses/my-courses"),
          api.get("/courses/available"),
        ]);
        setMyCourses(myRes.data);
        setAvailableCourses(availRes.data);
      } else if (currUser.role === "teacher") {
        const res = await api.get("/courses/lecturer-courses");
        setMyCourses(res.data);
      } else if (currUser.role === "admin") {
        const teachersRes = await api.get("/users/teachers");
        setTeachers(teachersRes.data);
      }
    } catch (err) {
      console.error("Dashboard init error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyEvaluations = async () => {
    setLoadingEvals(true);
    try {
      const res = await api.get("/evaluations/my-evaluations");
      setEvaluations(res.data);
    } catch (err) {
      console.error("Evaluation fetch error:", err);
    } finally {
      setLoadingEvals(false);
    }
  };

  const handleEnroll = async (courseId: number) => {
    try {
      await api.post("/courses/enroll", { course_id: courseId });
      initDashboard(user);
    } catch (err) {
      alert("რეგისტრაცია ვერ მოხერხდა");
    }
  };

  const handleUnenroll = async (courseId: number) => {
    if (!confirm("ნამდვილად გსურთ კურსიდან გასვლა?")) return;
    try {
      await api.delete(`/courses/unenroll/${courseId}`);
      initDashboard(user);
    } catch (err: any) {
      alert(err.response?.data?.message || "გაუქმება ვერ მოხერხდა");
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/courses/create", newCourse);
      setShowAdminModal(false);
      initDashboard(user);
    } catch (err) {
      alert("კურსი ვერ შეიქმნა");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const getFileHref = (fileUrl: string) =>
    fileUrl.startsWith("/uploads/")
      ? `${process.env.NEXT_PUBLIC_API_URL}${fileUrl}`
      : fileUrl;

  const isUpload = (fileUrl: string) => fileUrl?.startsWith("/uploads/");

  // console.log("User Data:", user.role, user);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* SIDEBAR */}
      <Sidebar
        role={user?.role || "student" || "teacher" || "admin"}
        activePath="/dashboard"
        onCreateCourse={() => setShowAdminModal(true)}
      />

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="relative w-96">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full bg-slate-100 border-none rounded-lg py-2 pl-10 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white overflow-hidden shadow-sm">
            <img
              src={`https://ui-avatars.com/api/?name=${user?.full_name || "User"}&background=random`}
              alt="User"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          <div className="flex justify-between items-end">
            <h1 className="text-2xl font-bold">
              Welcome, {user?.full_name?.split(" ")[0]}!
            </h1>
            <p className="text-slate-400 text-xs font-medium">
              23 Mar 2026, Monday
            </p>
          </div>

          {/* EVALUATIONS */}
          {/* {(user?.role === "student" || user?.role === "teacher") && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Star
                    size={18}
                    className={
                      user?.role === "teacher"
                        ? "fill-purple-500 text-purple-500"
                        : "fill-amber-500 text-amber-500"
                    }
                  />
                  {user?.role === "teacher"
                    ? "Evaluation History (Sent)"
                    : "Lecturer Feedback & Grades"}
                </h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                  Total: {evaluations.length}
                </span>
              </div>

              {loadingEvals ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium italic">
                  <Loader2 className="animate-spin" size={18} /> Syncing
                  history...
                </div>
              ) : evaluations.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {evaluations.map((evalItem, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-indigo-300 transition-all group relative overflow-hidden"
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                          user?.role === "teacher"
                            ? "bg-purple-500"
                            : "bg-amber-500"
                        }`}
                      />

                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                            {evalItem.course_title ||
                              `Course #${evalItem.course_id}`}
                          </span>
                          {user?.role === "teacher" && (
                            <span className="bg-purple-50 text-purple-600 text-[10px] font-black px-3 py-1 rounded-full uppercase italic">
                              To: {evalItem.student_name || "Student"}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                              evalItem.understanding_level >= 3
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-rose-50 text-rose-600"
                            }`}
                          >
                            Level: {evalItem.understanding_level}/3
                          </span>
                        </div>

                        <div className="flex gap-3">
                          <Quote
                            className="text-slate-100 shrink-0"
                            size={28}
                          />
                          <div className="space-y-1">
                            <p className="text-slate-700 font-semibold italic text-sm leading-relaxed">
                              &ldquo;
                              {evalItem.teacher_feedback ||
                                "No written feedback."}
                              &rdquo;
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {user?.role === "teacher"
                                ? "Submitted by You"
                                : `By ${evalItem.lecturer_name || "Instructor"}`}
                            </p>
                          </div>
                        </div>

                        {evalItem.file_url && (
                          <a
                            href={getFileHref(evalItem.file_url)}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all border ${
                              isUpload(evalItem.file_url)
                                ? "text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100"
                                : "text-sky-600 bg-sky-50 border-sky-100 hover:bg-sky-100"
                            }`}
                          >
                            {isUpload(evalItem.file_url) ? (
                              <>
                                <FileText size={12} />
                                <span>Download Attachment</span>
                              </>
                            ) : (
                              <>
                                <Link2 size={12} />
                                <span>Open Resource</span>
                              </>
                            )}
                          </a>
                        )}
                      </div>

                      <div className="text-right border-l border-slate-50 pl-6 hidden md:block shrink-0">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">
                          Date
                        </p>
                        <p className="text-xs font-bold text-slate-600">
                          {new Date(
                            evalItem.created_at || Date.now(),
                          ).toLocaleDateString("ka-GE")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center">
                  <Star className="text-slate-200 mx-auto mb-3" size={32} />
                  <p className="text-slate-400 font-bold text-sm">
                    No history found.
                  </p>
                </div>
              )}
            </section>
          )} */}
          <EvaluationCard
            evaluations={evaluations}
            userRole={user?.role}
            loading={loadingEvals}
          />
          {/* MY COURSES */}
          <section className="space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap size={18} className="text-indigo-600" />
              {user?.role === "teacher"
                ? "Classes I Lead"
                : "My Enrolled Courses"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {myCourses.map((course) => (
                <div
                  key={course.id}
                  className="p-6 rounded-3xl border border-slate-200 bg-white hover:shadow-md transition-all relative group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 flex items-center justify-center">
                    <BookOpen size={20} />
                  </div>
                  <h4 className="font-bold text-sm mb-1 line-clamp-1">
                    {course.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 tracking-tighter">
                    {course.professor_name || course.course_code}
                  </p>
                  <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 italic">
                      {course.start_time?.slice(0, 5) || "09:00"} @{" "}
                      {course.room || "Room A"}
                    </span>
                    {user?.role === "student" && (
                      <button
                        onClick={() => handleUnenroll(course.id)}
                        className="text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AVAILABLE COURSES */}
          {user?.role === "student" && availableCourses.length > 0 && (
            <section className="bg-indigo-600 p-10 rounded-[3rem] text-white space-y-8 shadow-xl shadow-indigo-200">
              <div>
                <h3 className="text-xl font-black mb-2">
                  Broaden Your Horizons
                </h3>
                <p className="text-indigo-100 text-sm opacity-80">
                  New elective courses available for this semester.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {availableCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="font-bold mb-1">{course.title}</h4>
                      <p className="text-xs text-indigo-200 mb-6 italic">
                        {course.professor_name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEnroll(course.id)}
                      className="bg-white text-indigo-600 py-3 rounded-2xl text-xs font-black hover:bg-indigo-50 transition-all"
                    >
                      Enroll Now
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <ChatWidget />

      {/* ADMIN MODAL */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck className="text-emerald-500" /> New Course
              </h2>
              <button
                onClick={() => setShowAdminModal(false)}
                className="text-slate-400 hover:text-slate-900"
              >
                <XCircle />
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <input
                required
                className="w-full p-4 bg-slate-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Course Title"
                onChange={(e) =>
                  setNewCourse({ ...newCourse, title: e.target.value })
                }
              />
              <input
                required
                className="w-full p-4 bg-slate-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Code (e.g. CS50)"
                onChange={(e) =>
                  setNewCourse({ ...newCourse, course_code: e.target.value })
                }
              />
              <select
                required
                className="w-full p-4 bg-slate-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) =>
                  setNewCourse({ ...newCourse, lecturer_id: e.target.value })
                }
              >
                <option value="">Assign Lecturer</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
              <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all mt-4">
                Create & Publish
              </button>
            </form>
          </div>
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
      className={`flex items-center gap-3 w-full p-3.5 rounded-2xl text-sm font-bold transition-all ${
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
          : "hover:bg-slate-800 hover:text-white"
      }`}
    >
      {icon} {label}
    </button>
  );
}
