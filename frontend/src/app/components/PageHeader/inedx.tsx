"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  type LucideIcon,
  Bell,
  CheckCheck,
  BookOpen,
  GraduationCap,
  Star,
  X,
  Clock,
} from "lucide-react";
import api from "@/lib/api";

interface Notification {
  id: number;
  type: "homework" | "grade" | "evaluation" | "general";
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}

const NOTIF_ICON: Record<string, React.ReactNode> = {
  homework: <BookOpen size={14} className="text-indigo-500" />,
  grade: <GraduationCap size={14} className="text-emerald-500" />,
  evaluation: <Star size={14} className="text-amber-500" />,
  general: <Bell size={14} className="text-slate-400" />,
};

const NOTIF_DOT: Record<string, string> = {
  homework: "bg-indigo-500",
  grade: "bg-emerald-500",
  evaluation: "bg-amber-500",
  general: "bg-slate-400",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "ახლა";
  if (diff < 3600) return `${Math.floor(diff / 60)} წთ`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} სთ`;
  return `${Math.floor(diff / 86400)} დღე`;
}

export default function PageHeader({
  icon: Icon,
  title,
  children,
}: PageHeaderProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setFullName(JSON.parse(stored).full_name || "");
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data);
    } catch {
      // backend არ არის — demo
      setNotifications([
        {
          id: 1,
          type: "homework",
          title: "ახალი დავალება",
          message: "Web Development-ში დაემატა ახალი დავალება",
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          is_read: false,
        },
        {
          id: 2,
          type: "grade",
          title: "ქულა დაემატა",
          message: "კვ.5-ის შეფასება შეივსო — 9/10",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          is_read: false,
        },
        {
          id: 3,
          type: "evaluation",
          title: "ახალი შეფასება",
          message: "ლექტორმა დაამატა ახალი ფიდბექი",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          is_read: true,
        },
        {
          id: 4,
          type: "homework",
          title: "ვადა იწურება",
          message: "დავალება იწურება 2 საათში",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
          is_read: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all");
    } catch {
      /* silent */
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
    } catch {
      /* silent */
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  };

  const dismiss = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      /* silent */
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-20">
      {/* Left */}
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-indigo-600" />
        <span className="font-bold text-slate-800">{title}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {children}

        {/* Bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all
              ${open ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-sm">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-[360px] bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/60 overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800 text-sm">
                    შეტყობინებები
                  </span>
                  {unread > 0 && (
                    <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {unread} ახალი
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    <CheckCheck size={13} /> ყველა წაკითხული
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
                {loading ? (
                  <div className="flex items-center justify-center py-10 text-slate-400 text-xs gap-2">
                    <Clock size={14} className="animate-spin" /> იტვირთება...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                    <Bell size={24} className="text-slate-200" />
                    <p className="text-xs font-bold">შეტყობინება არ არის</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`flex items-start gap-3 px-5 py-4 cursor-pointer transition-all group relative
                        ${n.is_read ? "bg-white hover:bg-slate-50" : "bg-indigo-50/40 hover:bg-indigo-50"}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5
                        ${n.is_read ? "bg-slate-100" : "bg-white shadow-sm border border-slate-100"}`}
                      >
                        {NOTIF_ICON[n.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-xs font-black truncate ${n.is_read ? "text-slate-600" : "text-slate-800"}`}
                          >
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${NOTIF_DOT[n.type]}`}
                            />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-slate-300 font-bold mt-1">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-500 transition-all shrink-0 mt-0.5"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3 flex justify-center">
                  <button className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors">
                    ყველა შეტყობინება
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar */}
        <button onClick={() => router.push("/profile")} className="shrink-0">
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "U")}&background=random`}
              alt="avatar"
            />
          </div>
        </button>
      </div>
    </header>
  );
}
