"use client";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  GraduationCap,
  DollarSign,
  Award,
} from "lucide-react";

export default function StudentProfile({ userData }: { userData: any }) {
  // თუ მონაცემები ჯერ არ მოსულა
  if (!userData)
    return (
      <div className="p-8 text-center text-slate-500 font-bold">
        იტვირთება...
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* მთავარი ბარათი */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        {/* ზედა ფონი */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-violet-600"></div>

        <div className="px-8 pb-8">
          <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16">
            {/* პროფილის ფოტო */}
            <div className="w-32 h-32 rounded-[2rem] bg-white p-2 shadow-2xl">
              <div className="w-full h-full rounded-[1.5rem] bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100">
                {userData.avatar_url ? (
                  <img
                    src={userData.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={48} className="text-slate-300" />
                )}
              </div>
            </div>

            {/* სახელი და სტატუსი */}
            <div className="flex-1 text-center md:text-left pb-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {userData.full_name}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black uppercase">
                  {userData.current_course} კურსის სტუდენტი
                </span>
                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-black uppercase">
                  აქტიური
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {/* აკადემიური ინფო */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                აკადემიური
              </h3>
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shadow-sm">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      GPA
                    </p>
                    <p className="font-black text-slate-700">
                      {userData.gpa || "0.00"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shadow-sm">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      კურსი
                    </p>
                    <p className="font-black text-slate-700">
                      {userData.current_course} წელი
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* პირადი ინფორმაცია */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                კონტაქტი
              </h3>
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-4 text-slate-600">
                  <Mail size={18} className="text-slate-400" />
                  <span className="text-sm font-bold truncate">
                    {userData.email}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-slate-600">
                  <Phone size={18} className="text-slate-400" />
                  <span className="text-sm font-bold">
                    {userData.phone_number || "არ არის"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-slate-600">
                  <CreditCard size={18} className="text-slate-400" />
                  <span className="text-sm font-bold">
                    {userData.id_number || "010XXXXXXXX"}
                  </span>
                </div>
              </div>
            </div>

            {/* ფინანსური ინფორმაცია */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                ფინანსები
              </h3>
              <div
                className={`p-5 rounded-3xl border ${Number(userData.balance) > 0 ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"} space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <DollarSign
                    size={24}
                    className={
                      Number(userData.balance) > 0
                        ? "text-rose-500"
                        : "text-emerald-500"
                    }
                  />
                  <span
                    className={`text-xl font-black ${Number(userData.balance) > 0 ? "text-rose-600" : "text-emerald-600"}`}
                  >
                    {userData.balance || "0.00"} ₾
                  </span>
                </div>
                <p
                  className={`text-[10px] font-bold uppercase ${Number(userData.balance) > 0 ? "text-rose-400" : "text-emerald-400"}`}
                >
                  {Number(userData.balance) > 0
                    ? "მიმდინარე დავალიანება"
                    : "ბალანსი სუფთაა"}
                </p>
              </div>
              <button className="w-full py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-600 hover:bg-slate-50 transition">
                გადახდის ისტორია
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
