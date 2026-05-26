"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  Menu,
  X,
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
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on route change (mobile)
  const is = (path: string) => activePath === path;
  const go = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const sidebarContent = (
    <aside className="w-64 bg-[#101D2D] text-slate-400 flex flex-col h-full">
      {/* Logo */}
      <div
        className="p-6 mb-4 flex items-center gap-2 text-white text-xl font-black italic tracking-tighter cursor-pointer"
        onClick={() => go("/dashboard")}
      >
        <div className="w-8 h-8 bg-white rounded flex items-center justify-center shrink-0">
          <div className="w-4 h-4 bg-[#101D2D] rotate-45" />
        </div>
        EduStep
        {role === "admin" && (
          <span className="text-[10px] bg-indigo-600 px-1.5 py-0.5 rounded ml-1 not-italic font-bold">
            ADMIN
          </span>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
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
          label="კალენდარი"
          active={is("/schedule")}
          onClick={() => go("/schedule")}
        />

        <NavItem
          icon={<ClipboardList size={20} />}
          label="დავალებები"
          active={is("/homeworks")}
          onClick={() => go("/homeworks")}
        />

        {role === "student" && (
          <>
            <NavItem
              icon={<GraduationCap size={20} />}
              label="ჩემი ქულები"
              active={is("/grades/student")}
              onClick={() => go("/grades/student")}
            />
            <NavItem
              icon={<User size={20} />}
              label="პროფილი"
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
              label="სტუდენტების შეფასება"
              active={is("/teacher")}
              onClick={() => go("/teacher")}
            />
            <NavItem
              icon={<BookOpen size={20} />}
              label="შეფასებების რვეული"
              active={is("/grades/teacher")}
              onClick={() => go("/grades/teacher")}
            />
            <NavItem
              icon={<Zap size={20} />}
              label="თასქების გენერატორი"
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

  return (
    <>
      {/* ── Hamburger button — მხოლოდ მობილურზე ── */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-2.5 right-4 z-50 p-2.5 bg-[#101D2D] text-white rounded-xl shadow-lg"
        aria-label="მენიუ"
      >
        <Menu size={22} />
      </button>

      {/* ── Desktop sidebar — ჩვეულებრივ ── */}
      <div className="hidden md:flex shrink-0">{sidebarContent}</div>

      {/* ── Mobile: backdrop + sliding drawer ── */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="md:hidden fixed inset-y-0 left-0 z-50 flex animate-slide-in">
            {sidebarContent}

            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-[-34px] p-2 bg-[#101D2D] text-slate-400 hover:text-white rounded-r-xl"
              aria-label="დახურვა"
            >
              <X size={20} />
            </button>
          </div>
        </>
      )}
    </>
  );
}
