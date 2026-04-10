"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import StudentProfile from "@/app/components/studentProfile";

export default function ProfilePage({
  userData: passedUserData,
}: {
  userData?: any;
}) {
  const [userData, setUserData] = useState(passedUserData || null);
  const [error, setError] = useState("");

  useEffect(() => {
    // თუ მშობელმა კომპონენტმა (Dashboard-მა) არ მოგვაწოდა მონაცემები, თავად წამოვიღოთ
    if (!userData) {
      const fetchProfile = async () => {
        try {
          const res = await api.get("/auth/me");
          setUserData(res.data);
        } catch (err) {
          // თუ API-მ დააგდო, ვცადოთ localStorage-დან ამოღება
          const stored = localStorage.getItem("user");
          if (stored) {
            setUserData(JSON.parse(stored));
          } else {
            setError("პროფილის ჩატვირთვა ვერ მოხერხდა");
          }
          console.error(err);
        }
      };
      fetchProfile();
    }
  }, [userData]);

  if (error && !userData)
    return <div className="p-10 text-rose-500 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* userData-ს გადაცემა კომპონენტისთვის */}
      <StudentProfile userData={userData} />
    </div>
  );
}
