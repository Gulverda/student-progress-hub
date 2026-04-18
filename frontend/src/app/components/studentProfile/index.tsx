"use client";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  GraduationCap,
  Award,
  Hash,
  Calendar,
  BookOpen,
  Briefcase,
} from "lucide-react";

export default function StudentProfile({ userData }: { userData: any }) {
  if (!userData)
    return <div className="p-10 text-center animate-pulse">იტვირთება...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-10">
      {/* მთავარი საიდენტიფიკაციო ბარათი */}
      <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
        {/* ზედა ზოლი - სტატუსის ინდიკატორით */}
        <div className="h-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600"></div>

        <div className="p-8 md:p-12">
          {/*Header: Photo + Main Info */}
          <div className="flex flex-col md:flex-row gap-10 items-start border-b border-slate-50 pb-10">
            {/* პროფილის სურათი - "პასპორტის" სტილის ჩარჩო */}
            <div className="relative shrink-0">
              <div className="w-48 h-56 rounded-2xl bg-slate-50 border-2 border-slate-100 p-1 overflow-hidden">
                <div className="w-full h-full rounded-xl bg-white flex items-center justify-center">
                  {userData.avatar_url ? (
                    <img
                      src={userData.avatar_url}
                      alt="Student"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={80} className="text-slate-200" />
                  )}
                </div>
              </div>
              <div className="absolute -top-3 -left-3 bg-indigo-600 text-white p-2 rounded-lg shadow-lg">
                <GraduationCap size={20} />
              </div>
            </div>

            {/* სახელი და GPA - აქცენტირებული */}
            <div className="flex-1 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                    სტუდენტის სახელი და გვარი
                  </h2>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                    {userData.full_name}
                  </h1>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    GPA ქულა
                  </span>
                  <div className="text-4xl font-black text-indigo-600 italic">
                    {userData.gpa || "2.15"}
                  </div>
                </div>
              </div>

              {/* სწრაფი სტატუსის ბარათები */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                    სტატუსი
                  </p>
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>{" "}
                    აქტიური
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                    სასწავლო წელი
                  </p>
                  <p className="text-xs font-bold text-slate-700">
                    {userData.current_course}-ე კურსი
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                    რეიტინგი
                  </p>
                  <p className="text-xs font-bold text-slate-700">#67</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                  <p className="text-[9px] font-black text-rose-400 uppercase mb-1">
                    დავალიანება
                  </p>
                  <p
                    className={`text-xs font-bold ${Number(userData.balance) > 0 ? "text-rose-600" : "text-slate-400"}`}
                  >
                    {userData.balance || "0"} ₾
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* დეტალური ინფორმაცია - ცხრილის სტილის დაყოფა */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
            <section className="space-y-6">
              <h3 className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-600 pl-3">
                პირადი მონაცემები
              </h3>

              <div className="space-y-4">
                <InfoRow
                  icon={<Hash size={16} />}
                  label="პირადი ნომერი"
                  value={userData.id_number || "010XXXXXXXX"}
                />
                <InfoRow
                  icon={<Calendar size={16} />}
                  label="დაბადების თარიღი"
                  value="12/05/2002"
                />
                <InfoRow
                  icon={<Mail size={16} />}
                  label="ელ-ფოსტა"
                  value={userData.email}
                />
                <InfoRow
                  icon={<Phone size={16} />}
                  label="მობილური"
                  value={userData.phone_number || "5XX XX XX XX"}
                />
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-600 pl-3">
                აკადემიური მონაცემები
              </h3>

              <div className="space-y-4">
                <InfoRow
                  icon={<Briefcase size={16} />}
                  label="ფაკულტეტი"
                  value="ინფორმატიკისა და ინჟინერიის სკოლა"
                />
                <InfoRow
                  icon={<BookOpen size={16} />}
                  label="სპეციალობა"
                  value="კომპიუტერული მეცნიერება"
                />
                <InfoRow
                  icon={<Hash size={16} />}
                  label="სტუდენტის ID"
                  value={userData.id || "5XXXXX"}
                />
                <InfoRow
                  icon={<Award size={16} />}
                  label="გრანტი"
                  value="100% სახელმწიფო გრანტი"
                />
              </div>
            </section>
          </div>
        </div>

        {/* Footer / QR Code Placeholder */}
        {/* <div className="bg-slate-50 p-6 flex justify-between items-center border-t border-slate-100">
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-white rounded-md border border-slate-200"></div>
            <div className="w-8 h-8 bg-white rounded-md border border-slate-200"></div>
            <div className="w-8 h-8 bg-white rounded-md border border-slate-200"></div>
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
            Digital Identity System • Utopia Hub 2024
          </p>
        </div> */}
      </div>
    </div>
  );
}

// დამხმარე კომპონენტი ხაზებისთვის (Row)
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 group hover:border-indigo-100 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">
          {icon}
        </span>
        <span className="text-xs font-bold text-slate-400 uppercase">
          {label}:
        </span>
      </div>
      <span className="text-sm font-black text-slate-700 tracking-tight">
        {value}
      </span>
    </div>
  );
}
