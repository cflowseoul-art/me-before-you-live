"use client";

import { useState, useEffect, use } from "react"; // 1. use 추가
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ReportLoading({ params }: { params: Promise<{ id: string }> }) {
  // 2. params가 Promise라 use()로 먼저 풀어줘야 합니다.
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  
  const router = useRouter();
  const [nickname, setNickname] = useState("당신");
  const [step, setStep] = useState(0);

  const messages = [
    "당신의 가치관을 조심스럽게 분석 중입니다...",
    "데이터 속에서 따뜻한 연결고리를 찾는 중입니다.",
    "영혼의 빛깔이 닮은 인연을 매칭하고 있어요."
  ];

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", userId)
        .single();
      if (data?.nickname) setNickname(data.nickname);
    };
    fetchUser();

    const timer = setInterval(() => setStep(s => (s < 2 ? s + 1 : s)), 2000);
    
    // 6초 후 리포트로 이동
    const redirect = setTimeout(() => {
      router.push(`/1on1/report/${userId}`);
    }, 6000);

    return () => { clearInterval(timer); clearTimeout(redirect); };
  }, [userId, router]); // 의존성 배열에 userId 넣기

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center font-serif italic text-gray-400 p-6 text-center">
      <div className="w-12 h-[1px] bg-[#A52A2A] mx-auto mb-8 opacity-30 animate-pulse"></div>
      <div className="mb-6 relative">
         <div className="w-10 h-10 border-2 border-[#EEEBDE] border-t-[#A52A2A] rounded-full animate-spin"></div>
      </div>
      <p className="text-lg tracking-tighter leading-relaxed">
        {nickname} 님의<br/>{messages[step]}
      </p>
    </div>
  );
}