"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Sidebar from "@/app/components/Sidebar";
import {
  BookOpen,
  Plus,
  X,
  Loader2,
  Calendar,
  Clock,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Pencil,
  Send,
  Star,
  Trash2,
  Link2,
  AlertCircle,
} from "lucide-react";

interface Homework {
  id: number;
  course_id: number;
  course_title: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  created_by_name: string;
  // student view extras:
  submission_id?: number;
  submitted_at?: string;
  file_url?: string;
  score?: number | null;
  feedback?: string;
}

function statusInfo(hw: Homework, isStudent: boolean) {
  if (!isStudent) return null;
  const now = new Date();
  const due = new Date(hw.due_date);
  if (hw.submission_id) {
    return {
      label: hw.score != null ? `${hw.score}/${hw.max_score}` : "ჩაბარებული",
      bg: hw.score != null ? "bg-emerald-100" : "bg-sky-100",
      text: hw.score != null ? "text-emerald-700" : "text-sky-700",
      border: hw.score != null ? "border-emerald-200" : "border-sky-200",
    };
  }
  if (now > due) {
    return {
      label: "ვადა გასულია",
      bg: "bg-rose-100",
      text: "text-rose-700",
      border: "border-rose-200",
    };
  }
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 2) {
    return {
      label: `${diffDays} დღე`,
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200",
    };
  }
  return {
    label: `${diffDays} დღე`,
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
  };
}

export default function HomeworksPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  // Create form (teacher)
  const [createForm, setCreateForm] = useState({
    course_id: "",
    title: "",
    description: "",
    due_date: "",
    max_score: "10",
  });
  const [creating, setCreating] = useState(false);

  // Submit state (student) — per homework
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [submitFiles, setSubmitFiles] = useState<Record<number, File | null>>(
    {},
  );
  const [submitLinks, setSubmitLinks] = useState<Record<number, string>>({});

  // Grade modal (teacher)
  const [gradeModal, setGradeModal] = useState<{
    hwId: number;
    submissionId: number;
    name: string;
  } | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: "", feedback: "" });
  const [grading, setGrading] = useState(false);

  // Submissions view (teacher)
  const [submissions, setSubmissions] = useState<Record<number, any[]>>({});
  const [loadingSubs, setLoadingSubs] = useState<number | null>(null);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const isStudent = user?.role === "student";

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2800);
  };

  const fetchHomeworks = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isTeacher
        ? "/homeworks/my-homeworks"
        : "/homeworks/student";
      const res = await api.get(endpoint);
      setHomeworks(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isTeacher]);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    if (!u?.id) {
      router.push("/login");
      return;
    }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetchHomeworks();
    if (isTeacher) {
      const endpoint =
        user.role === "admin" ? "/courses" : "/courses/lecturer-courses";
      api
        .get(endpoint)
        .then((r) => setCourses(r.data))
        .catch(console.error);
    }
  }, [user]);

  const toggleExpand = async (hwId: number) => {
    setExpanded((prev) => ({ ...prev, [hwId]: !prev[hwId] }));
    // Teacher: fetch submissions when expanding
    if (isTeacher && !submissions[hwId]) {
      setLoadingSubs(hwId);
      try {
        const res = await api.get(`/homeworks/${hwId}/submissions`);
        setSubmissions((prev) => ({ ...prev, [hwId]: res.data }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSubs(null);
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/homeworks", {
        ...createForm,
        course_id: Number(createForm.course_id),
        max_score: Number(createForm.max_score),
      });
      await fetchHomeworks();
      setShowCreateModal(false);
      setCreateForm({
        course_id: "",
        title: "",
        description: "",
        due_date: "",
        max_score: "10",
      });
      showToast("ok", "დავალება შეიქმნა ✓");
    } catch (err: any) {
      showToast("err", err.response?.data?.message || "შეცდომა");
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (hwId: number) => {
    const file = submitFiles[hwId];
    const link = submitLinks[hwId];
    if (!file && !link) {
      showToast("err", "ჩამოტვირთეთ ფაილი ან ჩაწერეთ ლინკი");
      return;
    }
    setSubmitting(hwId);
    try {
      const fd = new FormData();
      fd.append("homework_id", String(hwId));
      if (file) fd.append("file", file);
      else if (link) fd.append("file_url", link);
      await api.post("/homeworks/submit", fd);
      await fetchHomeworks();
      setSubmitFiles((p) => ({ ...p, [hwId]: null }));
      setSubmitLinks((p) => ({ ...p, [hwId]: "" }));
      showToast("ok", "დავალება ჩაბარდა ✓");
    } catch (err: any) {
      showToast("err", err.response?.data?.message || "შეცდომა");
    } finally {
      setSubmitting(null);
    }
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeModal) return;
    setGrading(true);
    try {
      await api.post(
        `/homeworks/submissions/${gradeModal.submissionId}/grade`,
        {
          score: Number(gradeForm.score),
          feedback: gradeForm.feedback,
        },
      );
      setSubmissions((prev) => ({
        ...prev,
        [gradeModal.hwId]:
          prev[gradeModal.hwId]?.map((s) =>
            s.id === gradeModal.submissionId
              ? {
                  ...s,
                  score: Number(gradeForm.score),
                  feedback: gradeForm.feedback,
                }
              : s,
          ) ?? [],
      }));
      setGradeModal(null);
      setGradeForm({ score: "", feedback: "" });
      showToast("ok", "შეფასება შენახულია ✓");
    } catch (err: any) {
      showToast("err", err.response?.data?.message || "შეცდომა");
    } finally {
      setGrading(false);
    }
  };

  const handleDelete = async (hwId: number) => {
    if (!confirm("წაიშალოს ეს დავალება?")) return;
    try {
      await api.delete(`/homeworks/${hwId}`);
      setHomeworks((p) => p.filter((h) => h.id !== hwId));
      showToast("ok", "წაიშალა ✓");
    } catch {
      showToast("err", "წაშლა ვერ მოხერხდა");
    }
  };

  const getFileHref = (url: string) =>
    url.startsWith("/uploads/")
      ? `${process.env.NEXT_PUBLIC_API_URL}${url}`
      : url;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <Sidebar role={user?.role ?? "student"} activePath="/homeworks" />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen size={18} className="text-indigo-600" />
            <span className="font-bold text-slate-800">დავალებები</span>
          </div>
          <div className="flex items-center gap-3">
            {isTeacher && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                <Plus size={14} /> დავალების შექმნა
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
              <img
                src={`https://ui-avatars.com/api/?name=${user?.full_name || "U"}&background=random`}
                alt=""
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {isStudent ? "ჩემი დავალებები" : "გამოქვეყნებული დავალებები"}
            </h1>
            <p className="text-slate-400 font-medium mt-1">
              2025–2026 · საგაზაფხულო სემესტრი
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32 text-slate-400 gap-3">
              <Loader2 className="animate-spin" size={20} /> იტვირთება...
            </div>
          ) : homeworks.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center">
              <BookOpen size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-slate-400">დავალებები არ მოიძებნა</p>
            </div>
          ) : (
            <div className="space-y-4">
              {homeworks.map((hw) => {
                const open = expanded[hw.id];
                const status = statusInfo(hw, !!isStudent);
                const isOverdue =
                  new Date() > new Date(hw.due_date) && !hw.submission_id;
                const hwSubs = submissions[hw.id] ?? [];
                const gradedCount = hwSubs.filter(
                  (s) => s.score != null,
                ).length;

                return (
                  <div
                    key={hw.id}
                    className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* Card header */}
                    <button
                      onClick={() => toggleExpand(hw.id)}
                      className="w-full flex items-center gap-5 p-6 px-8 text-left hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Icon */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isOverdue && isStudent ? "bg-rose-50 text-rose-500" : "bg-indigo-50 text-indigo-600"}`}
                      >
                        <FileText size={22} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 text-base truncate">
                          {hw.title}
                        </h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                          {hw.course_title}
                          {isTeacher && ` · ${hw.created_by_name}`}
                        </p>
                      </div>

                      {/* Due date */}
                      <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs font-bold shrink-0">
                        <Calendar size={13} />
                        <span>
                          {new Date(hw.due_date).toLocaleDateString("ka-GE")}
                        </span>
                      </div>

                      {/* Max score */}
                      <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs font-bold shrink-0">
                        <Star size={13} />
                        <span>{hw.max_score} ქ.</span>
                      </div>

                      {/* Teacher: submissions count */}
                      {isTeacher && (
                        <span className="shrink-0 text-xs font-black px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">
                          {gradedCount}/{hwSubs.length || "?"} შეფ.
                        </span>
                      )}

                      {/* Student: status badge */}
                      {isStudent && status && (
                        <span
                          className={`shrink-0 text-xs font-black px-3 py-1.5 rounded-xl border ${status.bg} ${status.text} ${status.border}`}
                        >
                          {status.label}
                        </span>
                      )}

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

                    {/* Expanded content */}
                    {open && (
                      <div className="border-t border-slate-100 px-8 py-6 space-y-6">
                        {/* Description */}
                        {hw.description && (
                          <div className="bg-slate-50 rounded-2xl p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                              დავალების აღწერა
                            </p>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                              {hw.description}
                            </p>
                          </div>
                        )}

                        {/* Meta row */}
                        <div className="flex flex-wrap gap-3">
                          <MetaPill
                            icon={<Calendar size={13} />}
                            label="ვადა"
                            value={new Date(hw.due_date).toLocaleDateString(
                              "ka-GE",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          />
                          <MetaPill
                            icon={<Clock size={13} />}
                            label="დრო"
                            value={new Date(hw.due_date).toLocaleTimeString(
                              "ka-GE",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          />
                          <MetaPill
                            icon={<Star size={13} />}
                            label="მაქს. ქულა"
                            value={`${hw.max_score}`}
                          />
                        </div>

                        {/* ── STUDENT: submission area ── */}
                        {isStudent && (
                          <div className="space-y-4">
                            {hw.submission_id ? (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2
                                    size={18}
                                    className="text-emerald-600"
                                  />
                                  <p className="font-black text-sm text-emerald-700">
                                    ჩაბარებულია
                                  </p>
                                  <span className="text-xs text-emerald-500 font-bold ml-auto">
                                    {hw.submitted_at
                                      ? new Date(
                                          hw.submitted_at,
                                        ).toLocaleDateString("ka-GE")
                                      : ""}
                                  </span>
                                </div>
                                {hw.file_url && (
                                  <a
                                    href={getFileHref(hw.file_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                  >
                                    <FileText size={13} /> ნახე ჩაბარებული ფაილი
                                  </a>
                                )}
                                {hw.score != null && (
                                  <div className="pt-3 border-t border-emerald-200 space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                      შეფასება
                                    </p>
                                    <p className="text-2xl font-black text-emerald-700">
                                      {hw.score}{" "}
                                      <span className="text-sm font-bold text-emerald-500">
                                        / {hw.max_score}
                                      </span>
                                    </p>
                                    {hw.feedback && (
                                      <p className="text-sm text-emerald-600 font-medium italic">
                                        &ldquo;{hw.feedback}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                )}
                                {hw.score == null && (
                                  <p className="text-xs text-emerald-500 font-bold italic">
                                    შეფასება მოლოდინშია...
                                  </p>
                                )}
                              </div>
                            ) : new Date() > new Date(hw.due_date) ? (
                              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-center gap-3">
                                <AlertCircle
                                  size={18}
                                  className="text-rose-500 shrink-0"
                                />
                                <p className="text-sm font-bold text-rose-600">
                                  ჩაბარების ვადა გასულია. დავალება ვეღარ
                                  ჩაბარდება.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  დავალების ჩაბარება
                                </p>
                                <div className="flex gap-3">
                                  <label
                                    className={`flex-1 cursor-pointer flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed transition-all ${submitFiles[hw.id] ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-300"}`}
                                  >
                                    <Upload size={20} className="mb-1" />
                                    <span className="text-[10px] font-black uppercase">
                                      {submitFiles[hw.id]
                                        ? submitFiles[hw.id]!.name.slice(
                                            0,
                                            20,
                                          ) + "..."
                                        : "ფაილის ატვირთვა"}
                                    </span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        setSubmitFiles((p) => ({
                                          ...p,
                                          [hw.id]: e.target.files?.[0] || null,
                                        }));
                                        setSubmitLinks((p) => ({
                                          ...p,
                                          [hw.id]: "",
                                        }));
                                      }}
                                    />
                                  </label>
                                  <div className="flex-[2] relative">
                                    <Link2
                                      size={15}
                                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                      type="text"
                                      placeholder="ან ჩასვით ლინკი..."
                                      disabled={!!submitFiles[hw.id]}
                                      value={submitLinks[hw.id] ?? ""}
                                      onChange={(e) =>
                                        setSubmitLinks((p) => ({
                                          ...p,
                                          [hw.id]: e.target.value,
                                        }))
                                      }
                                      className="w-full h-full bg-slate-50 border border-slate-200 rounded-2xl px-4 pl-10 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
                                    />
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleSubmit(hw.id)}
                                  disabled={
                                    submitting === hw.id ||
                                    (!submitFiles[hw.id] && !submitLinks[hw.id])
                                  }
                                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                >
                                  {submitting === hw.id ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Send size={14} />
                                  )}
                                  ჩაბარება
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── TEACHER: submissions list ── */}
                        {isTeacher && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                ჩაბარებული სამუშაოები
                              </p>
                              <button
                                onClick={() => handleDelete(hw.id)}
                                className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={13} /> დავალების წაშლა
                              </button>
                            </div>

                            {loadingSubs === hw.id ? (
                              <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                                <Loader2 size={16} className="animate-spin" />{" "}
                                იტვირთება...
                              </div>
                            ) : hwSubs.length === 0 ? (
                              <div className="bg-slate-50 rounded-2xl p-6 text-center">
                                <p className="text-slate-400 text-sm font-bold">
                                  ჯერ არავის ჩაუბარებია
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {hwSubs.map((sub: any) => (
                                  <div
                                    key={sub.id}
                                    className="flex items-center gap-4 bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">
                                      {sub.student_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-sm text-slate-700">
                                        {sub.student_name}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-bold">
                                        {new Date(
                                          sub.submitted_at,
                                        ).toLocaleDateString("ka-GE")}
                                      </p>
                                    </div>
                                    {sub.file_url && (
                                      <a
                                        href={getFileHref(sub.file_url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 shrink-0"
                                      >
                                        <FileText size={13} /> ფაილი
                                      </a>
                                    )}
                                    {sub.score != null ? (
                                      <span className="shrink-0 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-black border border-emerald-200">
                                        {sub.score}/{hw.max_score}
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setGradeModal({
                                            hwId: hw.id,
                                            submissionId: sub.id,
                                            name: sub.student_name,
                                          });
                                          setGradeForm({
                                            score: "",
                                            feedback: "",
                                          });
                                        }}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-black border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                      >
                                        <Pencil size={12} /> შეფასება
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
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

      {/* Create Modal (teacher) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800">
                ახალი დავალება
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-5">
              <ModalField label="კურსი">
                <select
                  required
                  value={createForm.course_id}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, course_id: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">აირჩიეთ კურსი...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </ModalField>

              <ModalField label="სათაური">
                <input
                  required
                  type="text"
                  placeholder="დავალების სათაური"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </ModalField>

              <ModalField label="აღწერა">
                <textarea
                  placeholder="დავალების სრული პირობა..."
                  rows={4}
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </ModalField>

              <div className="grid grid-cols-2 gap-4">
                <ModalField label="ბოლო ვადა">
                  <input
                    required
                    type="datetime-local"
                    value={createForm.due_date}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, due_date: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </ModalField>
                <ModalField label="მაქს. ქულა">
                  <input
                    required
                    type="number"
                    min={1}
                    max={100}
                    value={createForm.max_score}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        max_score: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </ModalField>
              </div>

              <button
                disabled={creating}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                გამოქვეყნება
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Grade Modal (teacher) */}
      {gradeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">შეფასება</h2>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  {gradeModal.name}
                </p>
              </div>
              <button
                onClick={() => setGradeModal(null)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleGrade} className="p-8 space-y-5">
              <ModalField
                label={`ქულა (მაქს: ${homeworks.find((h) => h.id === gradeModal.hwId)?.max_score ?? "?"})`}
              >
                <input
                  required
                  type="number"
                  min={0}
                  max={
                    homeworks.find((h) => h.id === gradeModal.hwId)
                      ?.max_score ?? 100
                  }
                  value={gradeForm.score}
                  onChange={(e) =>
                    setGradeForm({ ...gradeForm, score: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </ModalField>
              <ModalField label="ფიდბექი (სურვილისამებრ)">
                <textarea
                  rows={3}
                  placeholder="კომენტარი სამუშაოზე..."
                  value={gradeForm.feedback}
                  onChange={(e) =>
                    setGradeForm({ ...gradeForm, feedback: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </ModalField>
              <button
                disabled={grading}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {grading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Star size={16} />
                )}
                შეფასების შენახვა
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold z-50 ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
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

function MetaPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700">
      <span className="text-slate-400">{icon}</span>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <p className="text-xs font-black">{value}</p>
      </div>
    </div>
  );
}

function ModalField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}
