"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  UserPlus,
  Users,
  BookOpen,
  LogOut,
  Mail,
  User,
  Lock,
  RefreshCw,
  Trash2,
  PlusCircle,
  GraduationCap,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("add");
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "student",
    current_course: 1,
  });

  const [courseForm, setCourseForm] = useState({
    title: "",
    course_code: "",
    lecturer_id: "",
    target_course: 1,
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get("/auth/users");
      setUsers(res.data);
    } catch (err) {
      console.error("იუზერების წამოღება ვერ მოხერხდა", err);
    }
  };

  const fetchCourseData = async () => {
    try {
      const tRes = await api.get("/auth/teachers");
      setTeachers(tRes.data);
    } catch (err) {
      console.error("ლექტორების წამოღება ვერ მოხერხდა", err);
    }
    try {
      const cRes = await api.get("/courses/all");
      setCourses(cRes.data);
    } catch (err) {
      console.error("კურსების წამოღება ვერ მოხერხდა", err);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    if (!user || user.role !== "admin") {
      router.push("/dashboard");
    }
    if (activeTab === "list") fetchUsers();
    if (activeTab === "courses") fetchCourseData();
  }, [router, activeTab]);

  const generateTempPassword = () => {
    const generatedPass = `UTOPIA-${new Date().getFullYear().toString().slice(-2)}${Math.floor(100000 + Math.random() * 900000)}`;
    setFormData({ ...formData, password: generatedPass });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/register", formData);
      setStatus({
        type: "success",
        msg: `${formData.full_name} წარმატებით დარეგისტრირდა!`,
      });
      setFormData({
        full_name: "",
        email: "",
        password: "",
        role: "student",
        current_course: 1,
      });
    } catch (err: any) {
      setStatus({
        type: "error",
        msg: err.response?.data?.message || "რეგისტრაცია ვერ მოხერხდა",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/courses/create", courseForm);
      setCourseForm({
        title: "",
        course_code: "",
        lecturer_id: "",
        target_course: 1,
      });
      fetchCourseData();
      alert("საგანი შეიქმნა და მიება სტუდენტებს!");
    } catch (err) {
      alert("შეცდომა საგნის შექმნისას");
    }
  };

  const deleteUser = async (id: string) => {
    if (confirm("ნამდვილად გსურთ მომხმარებლის წაშლა?")) {
      try {
        await api.delete(`/auth/users/${id}`);
        setUsers(users.filter((u: any) => u.id !== id));
      } catch (err) {
        alert("წაშლა ვერ მოხერხდა");
      }
    }
  };

  const deleteCourse = async (id: number) => {
    if (confirm("წაიშალოს ეს საგანი?")) {
      try {
        await api.delete(`/courses/${id}`);
        fetchCourseData();
      } catch (err) {
        alert("საგნის წაშლა ვერ მოხერხდა");
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#101D2D] text-slate-400 flex flex-col shrink-0">
        <div className="p-6 mb-4">
          <div className="flex items-center gap-2 text-white text-xl font-black italic tracking-tighter">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <div className="w-4 h-4 bg-[#101D2D] rotate-45"></div>
            </div>
            UTOPIA{" "}
            <span className="text-[10px] bg-indigo-600 px-1.5 py-0.5 rounded ml-1 not-italic font-bold">
              ADMIN
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <div className="pb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Management
          </div>
          <TabButton
            active={activeTab === "add"}
            onClick={() => setActiveTab("add")}
            icon={<UserPlus size={20} />}
            label="Add User"
          />
          <TabButton
            active={activeTab === "list"}
            onClick={() => setActiveTab("list")}
            icon={<Users size={20} />}
            label="Users List"
          />
          <TabButton
            active={activeTab === "courses"}
            onClick={() => setActiveTab("courses")}
            icon={<BookOpen size={20} />}
            label="Courses Matrix"
          />
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <button
            onClick={() => {
              localStorage.clear();
              router.push("/login");
            }}
            className="flex items-center gap-3 w-full p-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="text-sm font-bold text-slate-400">
            Admin Panel /{" "}
            <span className="text-slate-900 capitalize">{activeTab}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-indigo-600 font-bold shadow-sm">
            AD
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="max-w-5xl mx-auto">
            {/* TAB: ADD USER */}
            {activeTab === "add" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-10">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    ახალი მომხმარებელი
                  </h1>
                  <p className="text-slate-500 mt-1 font-medium">
                    სისტემური წვდომის მინიჭება
                  </p>
                </div>

                <form
                  onSubmit={handleCreateUser}
                  className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-6 max-w-2xl"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label="სრული სახელი"
                      icon={<User size={18} />}
                      placeholder="გიორგი გიორგაძე"
                      value={formData.full_name}
                      onChange={(val: string) =>
                        setFormData({ ...formData, full_name: val })
                      }
                    />
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-400 ml-1">
                        როლი
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-700"
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  {/* current_course გამოჩნდეს მხოლოდ student-ისთვის */}
                  {formData.role === "student" && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-400 ml-1">
                        აკადემიური კურსი
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-700"
                        value={formData.current_course}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            current_course: Number(e.target.value),
                          })
                        }
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {n} კურსი
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <InputField
                    label="ელ-ფოსტა"
                    icon={<Mail size={18} />}
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(val: string) =>
                      setFormData({ ...formData, email: val })
                    }
                  />

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400 ml-1">
                      დროებითი პაროლი
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Lock
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                          size={18}
                        />
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-100 p-3.5 pl-12 rounded-2xl font-mono text-sm outline-none"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generateTempPassword}
                        className="bg-slate-100 px-4 rounded-2xl border border-slate-200 hover:bg-slate-200 transition"
                      >
                        <RefreshCw size={20} />
                      </button>
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    className="w-full bg-[#101D2D] text-white font-bold py-4 rounded-2xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                  >
                    {loading ? "მუშავდება..." : "მომხმარებლის შექმნა"}
                  </button>

                  {status.msg && (
                    <StatusMsg type={status.type} msg={status.msg} />
                  )}
                </form>
              </div>
            )}

            {/* TAB: USERS LIST */}
            {activeTab === "list" && (
              <div className="animate-in fade-in duration-500">
                <h1 className="text-3xl font-black text-slate-900 mb-8">
                  მომხმარებლების სია
                </h1>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="p-6 pl-10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          სახელი / Email
                        </th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          როლი / კურსი
                        </th>
                        <th className="p-6 text-right pr-10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          მოქმედება
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.map((u: any) => (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="p-6 pl-10">
                            <div className="font-bold text-slate-700">
                              {u.full_name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {u.email}
                            </div>
                          </td>
                          <td className="p-6">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                u.role === "admin"
                                  ? "bg-indigo-50 text-indigo-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {u.role}{" "}
                              {u.role === "student" &&
                                `(${u.current_course} კურსი)`}
                            </span>
                          </td>
                          <td className="p-6 text-right pr-10">
                            <button
                              onClick={() => deleteUser(u.id)}
                              className="text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: COURSES MATRIX */}
            {activeTab === "courses" && (
              <div className="animate-in fade-in duration-500 space-y-10">
                <div>
                  <h1 className="text-3xl font-black text-slate-900">
                    აკადემიური ბადე
                  </h1>
                  <p className="text-slate-500 font-medium">
                    მართე საგნები კურსების მიხედვით
                  </p>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="font-bold mb-6 flex items-center gap-2 text-indigo-600">
                    <PlusCircle size={20} /> ახალი საგნის დამატება
                  </h3>
                  <form
                    onSubmit={handleCreateCourse}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                  >
                    <InputField
                      label="დასახელება"
                      placeholder="მაგ: Node.js"
                      value={courseForm.title}
                      onChange={(v: string) =>
                        setCourseForm({ ...courseForm, title: v })
                      }
                    />
                    <InputField
                      label="კოდი"
                      placeholder="CS-202"
                      value={courseForm.course_code}
                      onChange={(v: string) =>
                        setCourseForm({ ...courseForm, course_code: v })
                      }
                    />
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                        კურსი
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl font-bold text-sm outline-none"
                        value={courseForm.target_course}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            target_course: Number(e.target.value),
                          })
                        }
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {n} კურსის საგანი
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                        ლექტორი
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl font-bold text-sm outline-none"
                        value={courseForm.lecturer_id}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            lecturer_id: e.target.value,
                          })
                        }
                      >
                        <option value="">აირჩიე</option>
                        {teachers.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button className="bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 md:col-span-4">
                      შექმნა
                    </button>
                  </form>
                </div>

                {/* კურსების ბადე target_course-ის მიხედვით */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[1, 2, 3, 4].map((year) => (
                    <div
                      key={year}
                      className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <GraduationCap size={80} />
                      </div>
                      <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                        <Layers className="text-indigo-500" size={24} /> კურსი{" "}
                        {year}
                      </h2>
                      <div className="space-y-3">
                        {courses
                          .filter((c: any) => c.target_course === year)
                          .map((c: any) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 transition"
                            >
                              <div>
                                <p className="font-bold text-slate-700">
                                  {c.title}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  {c.course_code && `${c.course_code} • `}
                                  {c.professor_name || "ლექტორის გარეშე"}
                                </p>
                              </div>
                              <button
                                onClick={() => deleteCourse(c.id)}
                                className="text-slate-300 hover:text-rose-500 transition"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          ))}
                        {courses.filter((c: any) => c.target_course === year)
                          .length === 0 && (
                          <p className="text-center py-4 text-sm text-slate-400 italic">
                            საგნები ჯერ არ არის
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
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

function InputField({
  label,
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
}: any) {
  return (
    <div className="space-y-2 w-full">
      <label className="text-xs font-black uppercase tracking-wider text-slate-400 ml-1">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
            {icon}
          </div>
        )}
        <input
          type={type}
          required
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-slate-50 border border-slate-100 p-3.5 ${
            icon ? "pl-12" : "px-4"
          } rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition font-bold`}
        />
      </div>
    </div>
  );
}

function StatusMsg({ type, msg }: any) {
  return (
    <div
      className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 ${
        type === "success"
          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
          : "bg-rose-50 text-rose-700 border border-rose-100"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 size={20} />
      ) : (
        <AlertCircle size={20} />
      )}
      <p className="text-sm font-bold">{msg}</p>
    </div>
  );
}
