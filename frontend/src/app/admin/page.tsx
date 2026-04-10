"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ShieldCheck,
  UserPlus,
  Users,
  Lock,
  LogOut,
  Bell,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  BookOpen,
  PlusCircle,
  GraduationCap,
} from "lucide-react";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("add");
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "student",
  });

  const [courseForm, setCourseForm] = useState({
    title: "",
    course_code: "",
    lecturer_id: "",
  });

  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      const res = await api.get("/auth/users");
      setUsers(res.data);
    } catch (err) {
      console.error("იუზერების წამოღება ვერ მოხერხდა");
    }
  };

  const fetchCourseData = async () => {
    try {
      const tRes = await api.get("/users/teachers");
      setTeachers(tRes.data);
    } catch (err) {
      console.error("ლექტორების წამოღება ვერ მოხერხდა", err);
    }

    try {
      const cRes = await api.get("/courses");
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
        msg: `მომხმარებელი ${formData.full_name} შეიქმნა!`,
      });
      setFormData({ full_name: "", email: "", password: "", role: "student" });
      if (activeTab === "list") fetchUsers();
    } catch (err: any) {
      setStatus({
        type: "error",
        msg: err.response?.data?.message || "შეცდომა რეგისტრაციისას",
      });
    } finally {
      setLoading(false);
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

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/courses/create", courseForm);
      alert("კურსი წარმატებით დაემატა!");
      setCourseForm({ title: "", course_code: "", lecturer_id: "" });
      fetchCourseData();
    } catch (err) {
      alert("კურსის შექმნა ვერ მოხერხდა");
    }
  };

  const deleteCourse = async (id: number) => {
    if (confirm("წაიშალოს ეს კურსი?")) {
      try {
        await api.delete(`/courses/${id}`);
        setCourses(courses.filter((c: any) => c.id !== id));
      } catch (err) {
        alert("კურსის წაშლა ვერ მოხერხდა");
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* --- SIDEBAR --- */}
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
            label="Courses"
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

      {/* --- MAIN CONTENT --- */}
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
            {/* --- TAB: ADD USER --- */}
            {activeTab === "add" && (
              <div className="animate-in fade-in duration-500">
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
                      onChange={(val: any) =>
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
                  <InputField
                    label="ელ-ფოსტა"
                    icon={<Mail size={18} />}
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(val: any) =>
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

            {/* --- TAB: USERS LIST --- */}
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
                          მომხმარებელი
                        </th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          როლი
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
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700">
                                {u.full_name}
                              </span>
                              <span className="text-xs text-slate-400">
                                {u.email}
                              </span>
                            </div>
                          </td>
                          <td className="p-6">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.role === "admin" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"}`}
                            >
                              {u.role}
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

            {/* --- TAB: COURSES MANAGEMENT --- */}
            {activeTab === "courses" && (
              <div className="animate-in fade-in duration-500 space-y-10">
                <div>
                  <h1 className="text-3xl font-black text-slate-900">
                    სასწავლო კურსები
                  </h1>
                  <p className="text-slate-500 font-medium">
                    მართე აკადემიური პროგრამები
                  </p>
                </div>
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <PlusCircle size={20} className="text-emerald-500" /> ახალი
                    კურსის დამატება
                  </h3>
                  <form
                    onSubmit={handleCreateCourse}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                  >
                    <InputField
                      label="დასახელება"
                      placeholder="მაგ: Node.js"
                      value={courseForm.title}
                      onChange={(val: any) =>
                        setCourseForm({ ...courseForm, title: val })
                      }
                    />
                    <InputField
                      label="კოდი"
                      placeholder="CS-202"
                      value={courseForm.course_code}
                      onChange={(val: any) =>
                        setCourseForm({ ...courseForm, course_code: val })
                      }
                    />
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                        ლექტორი
                      </label>
                      <select
                        required
                        className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
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
                    <button className="bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">
                      კურსის შექმნა
                    </button>
                  </form>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courses.map((course: any) => (
                    <div
                      key={course.id}
                      className="bg-white p-6 rounded-[2.5rem] border border-slate-200 flex items-center justify-between group hover:border-indigo-400 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                          <GraduationCap size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">
                            {course.title}
                          </h4>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">
                            {course.course_code} •{" "}
                            {course.professor_name || "არ არის ლექტორი"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="p-2 text-slate-200 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
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

// --- HELPER COMPONENTS (იგივე დიზაინით) ---
function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-3.5 rounded-2xl text-sm font-bold transition-all ${active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "hover:bg-slate-800 hover:text-white"}`}
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
          className={`w-full bg-slate-50 border border-slate-100 p-3.5 ${icon ? "pl-12" : "px-4"} rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition`}
        />
      </div>
    </div>
  );
}

function StatusMsg({ type, msg }: any) {
  return (
    <div
      className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 ${type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}
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
