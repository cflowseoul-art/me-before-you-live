"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MatchingCard } from "../../_components/MatchingCard";

export default function UserReportPage({ params }: { params: any }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [targetGender, setTargetGender] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로드 함수
  const fetchData = async (userId: string) => {
    // 1. 시스템 설정 확인 (역방향 리다이렉션용)
    const { data: settings } = await supabase.from("system_settings").select("*");
    const isReportOpen = settings?.find(s => s.key === "is_report_open")?.value === "true";
    const isFeedOpen = settings?.find(s => s.key === "is_feed_open")?.value === "true";

    // 만약 어드민이 리포트를 닫았다면, 현재 단계에 맞는 곳으로 강제 소환
    if (!isReportOpen) {
      if (isFeedOpen) router.push("/feed");
      else router.push("/auction");
      return;
    }

    // 2. 내 정보 및 매칭 상대 가져오기
    const { data: userData } = await supabase.from("users").select("*").eq("id", userId).single();
    
    if (userData) {
      setUser(userData);
      const myGender = userData.gender?.trim() || "";
      const target = (myGender === '여성' || myGender === '여') ? '남성' : '여성';
      setTargetGender(target);

      const { data: matchData } = await supabase
        .from("users")
        .select("id, nickname, real_name, gender")
        .neq("id", userId)
        .eq("gender", target)
        .limit(3);
      
      setMatches(matchData || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Next.js 15 params 대응
    params.then((p: any) => {
      fetchData(p.id);

      // [실시간 안테나] 어드민이 리포트 단계를 끄면 즉시 퇴장
      const channel = supabase.channel("report_status_monitor")
        .on("postgres_changes", { 
          event: "UPDATE", 
          schema: "public", 
          table: "system_settings"
        }, (payload: any) => {
          // 리포트가 닫히면(false가 되면) 무조건 쫓겨남
          if (payload.new.key === "is_report_open" && payload.new.value === "false") {
            window.location.reload(); // 가장 확실하게 상태 초기화 후 리다이렉트
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, [router]);

  if (isLoading || !user) return <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center font-serif italic text-gray-400 animate-pulse">Analyzing your soul...</div>;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif p-6 pb-20 antialiased">
      <header className="text-center mb-10 pt-10">
        <p className="text-[10px] font-sans font-black tracking-[0.4em] text-[#A52A2A] uppercase mb-2">Soul Report</p>
        <h1 className="text-3xl italic tracking-tighter leading-tight">{user.nickname} 님의 영혼의 빛깔</h1>
      </header>

      <section className="max-w-xl mx-auto space-y-8">
        <div className="bg-white p-10 rounded-[3.5rem] border border-[#EEEBDE] shadow-[0_40px_100px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 font-sans font-black text-6xl italic">98%</div>
          <p className="text-sm leading-[1.8] text-gray-500 font-light break-keep text-center">
            "{user.nickname} 님은 따뜻한 온기를 가진 분이시군요. <br/>
            가장 결이 잘 맞는 <span className="text-[#A52A2A] font-bold underline">{targetGender}</span> 인연들을 찾아보았습니다."
          </p>
        </div>

        <div className="space-y-4 mt-10">
          <h3 className="text-[10px] font-sans font-black tracking-[0.3em] text-gray-300 uppercase text-center mb-6 italic">Destined Connections</h3>
          {matches.length > 0 ? (
            matches.map((match, idx) => (
              <MatchingCard 
                key={match.id}
                index={idx + 1}
                nickname={match.nickname}
                matchType={`${targetGender} 매칭`}
              />
            ))
          ) : (
            <div className="py-20 text-center border border-dashed border-[#EEEBDE] rounded-[2.5rem]">
              <p className="text-sm text-gray-400 italic px-10">아직 매칭 가능한 {targetGender} 유저가 없습니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}