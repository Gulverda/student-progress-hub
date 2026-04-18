"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // თუ ჩატვირთვა დასრულდა
    if (!loading) {
      if (user) {
        // თუ მომხმარებელი დალოგინებულია -> გადავიდეს Dashboard-ზე
        router.push("/dashboard");
      } else {
        // თუ არა -> გადავიდეს Login-ზე
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  // სანამ გადამისამართება მოხდება, ვაჩვენებთ "Loading" ეკრანს
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">
          Utopia Hub
        </p>
      </div>
    </div>
  );
}
