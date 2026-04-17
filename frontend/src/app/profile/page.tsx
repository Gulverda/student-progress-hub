"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import StudentProfile from "@/app/components/studentProfile"; // შეამოწმე სწორია თუ არა გზა
import Sidebar from "@/app/components/Sidebar";
import { GraduationCap } from "lucide-react";

export default function ProfilePage() {
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/auth/me");
        setUserData(res.data);
      } catch (err) {
        console.error("Profile fetch error:", err);
        const stored = localStorage.getItem("user");
        if (stored) {
          setUserData(JSON.parse(stored));
        } else {
          setError("პროფილის ჩატვირთვა ვერ მოხერხდა");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="font-bold text-slate-500 animate-pulse">იტვირთება...</p>
      </div>
    );

  if (error && !userData)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-rose-500 font-bold">{error}</p>
      </div>
    );

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* 1. მარცხენა მხარე - Sidebar */}
      <Sidebar role={userData?.role || "student"} activePath="/profile" />

      {/* 2. მარჯვენა მხარე - კონტენტი */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <GraduationCap size={18} className="text-indigo-600" />
            <span className="font-bold text-slate-800">ჩემი შეფასებები</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
            <a href="/profile">
              <img
                src={`https://ui-avatars.com/api/?name=${userData?.full_name || "S"}&background=random`}
                alt=""
              />
            </a>
          </div>
        </header>
        <div className="container mx-auto py-8">
          <StudentProfile userData={userData} />
        </div>
      </main>
    </div>
  );
}
