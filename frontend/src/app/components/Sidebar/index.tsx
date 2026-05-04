"use client";
import { useRouter } from "next/navigation";
import {
  LayoutGrid,
  Star,
  User,
  BookOpen,
  GraduationCap,
  LogOut,
  PlusCircle,
  Calendar,
  ClipboardList,
  Zap,
} from "lucide-react";

interface SidebarProps {
  role: "student" | "teacher" | "admin";
  activePath?: string;
  onCreateCourse?: () => void;
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-3.5 rounded-2xl text-sm font-bold transition-all
        ${
          active
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "hover:bg-slate-800 hover:text-white"
        }`}
    >
      {icon} {label}
    </button>
  );
}

export default function Sidebar({
  role,
  activePath,
  onCreateCourse,
}: SidebarProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const is = (path: string) => activePath === path;
  const go = (path: string) => router.push(path);

  return (
    <aside className="w-64 bg-[#101D2D] text-slate-400 flex flex-col shrink-0">
      {/* Logo */}
      <div
        className="p-6 mb-4 flex items-center gap-2 text-white text-xl font-black italic tracking-tighter cursor-pointer"
        onClick={() => go("/dashboard")}
      >
        <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
          <div className="w-4 h-4 bg-[#101D2D] rotate-45" />
        </div>
        UTOPIA
        {role === "admin" && (
          <span className="text-[10px] bg-indigo-600 px-1.5 py-0.5 rounded ml-1 not-italic font-bold">
            ADMIN
          </span>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <NavItem
          icon={<LayoutGrid size={20} />}
          label="Dashboard"
          active={is("/dashboard")}
          onClick={() => go("/dashboard")}
        />

        <div className="pt-5 pb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Academic
        </div>

        <NavItem
          icon={<Calendar size={20} />}
          label="Schedule"
          active={is("/schedule")}
          onClick={() => go("/schedule")}
        />

        <NavItem
          icon={<ClipboardList size={20} />}
          label="Homeworks"
          active={is("/homeworks")}
          onClick={() => go("/homeworks")}
        />

        {role === "student" && (
          <>
            <NavItem
              icon={<GraduationCap size={20} />}
              label="My Grades"
              active={is("/grades/student")}
              onClick={() => go("/grades/student")}
            />
            <NavItem
              icon={<User size={20} />}
              label="Profile"
              active={is("/profile")}
              onClick={() => go("/profile")}
            />
          </>
        )}

        {(role === "teacher" || role === "admin") && (
          <>
            <div className="pt-5 pb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Lecturer Tools
            </div>
            <NavItem
              icon={<Star size={20} />}
              label="Evaluate Students"
              active={is("/teacher")}
              onClick={() => go("/teacher")}
            />
            <NavItem
              icon={<BookOpen size={20} />}
              label="Gradebook"
              active={is("/grades/teacher")}
              onClick={() => go("/grades/teacher")}
            />
            <NavItem
              icon={<Zap size={20} />}
              label="Catch-up"
              active={is("/catchup")}
              onClick={() => go("/catchup")}
            />
          </>
        )}

        {role === "admin" && onCreateCourse && (
          <>
            <div className="pt-5 pb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Admin
            </div>
            <NavItem
              icon={<PlusCircle size={20} className="text-emerald-400" />}
              label="Create Course"
              onClick={onCreateCourse}
            />
          </>
        )}
      </nav>

      <div
        className="p-4 mt-auto border-t border-slate-800 cursor-pointer"
        onClick={handleLogout}
      >
        <NavItem icon={<LogOut size={20} />} label="Logout" />
      </div>
    </aside>
  );
}
