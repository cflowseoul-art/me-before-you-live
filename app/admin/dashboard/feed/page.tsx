"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Heart, Trophy, Users, Sparkles, 
  Loader2, ChevronLeft, Settings, AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parseDriveFileName } from "@/lib/utils/feed-parser";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

const { colors } = DESIGN_TOKENS;

// 파스텔 톤 컬러 정의
const PASTEL_THEME = {
  blue: "#E0F2FE",      // 파스텔 블루 배경
  darkBlue: "#7DD3FC",  // 포인트 블루
  softBeige: "#F5F5F4", // 소프트 베이지
  border: "#EEEBDE",    // 테두리
  text: "#44403C"       // 차콜 텍스트
};

interface FeedItem {
  id: string;
  photo_url: string;
  gender: string;
  target_user_id: string;
  like_count: number;
}

export default function FeedDashboard() {
  const router = useRouter();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState("01");
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [genderFilter, setGenderFilter] = useState<"all" | "F" | "M">("all");

  const sessionRef = useRef(currentSession);

  // 성별 판단 헬퍼 함수
  const isFemaleGender = (gender: string) => {
    const g = gender?.toUpperCase?.() || "";
    return g === "F" || g === "FEMALE" || g === "여" || g === "여성";
  };
  const isMaleGender = (gender: string) => {
    const g = gender?.toUpperCase?.() || "";
    return g === "M" || g === "MALE" || g === "남" || g === "남성";
  };

  const filteredItems = genderFilter === "all"
    ? feedItems
    : genderFilter === "F"
      ? feedItems.filter(item => isFemaleGender(item.gender))
      : feedItems.filter(item => isMaleGender(item.gender));

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

  // 데이터 페칭 로직
  const fetchFeedData = useCallback(async (session: string) => {
    if (!FOLDER_ID || !API_KEY) return;
    
    // session = "2026-02-07_01" -> date = "2026-02-07", num = "01" 파싱 로직 추가
    const sessionDate = session.includes('_') ? session.split('_')[0] : "";
    const sessionNum = session.includes('_') ? session.split('_').pop()!.padStart(2, '0') : session.padStart(2, '0');

    try {
      const [usersRes, likesRes] = await Promise.all([
        supabase.from("users").select("id, real_name, phone_suffix"),
        supabase.from("feed_likes").select("*"),
      ]);

      // 1단계: 날짜 폴더 ID 찾기 (유저 페이지와 동일한 로직)
      let targetFolderId = FOLDER_ID;
      if (sessionDate) {
        const rootRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&fields=files(id,name,mimeType)&key=${API_KEY}`);
        const rootData = await rootRes.json();
        const dateFolder = (rootData.files || []).find((f: any) => f.name === sessionDate);
        if (dateFolder) targetFolderId = dateFolder.id;
      }

      // 2단계: 해당 폴더에서 사진 가져오기
      const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${targetFolderId}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name)&key=${API_KEY}`);
      const driveData = await driveRes.json();
      const allFiles = driveData.files || [];
      const likes = likesRes.data || [];
      const users = usersRes.data || [];

      const likeCounts: Record<string, number> = {};
      likes.forEach(like => {
        const photoId = String(like.photo_id);
        likeCounts[photoId] = (likeCounts[photoId] || 0) + 1;
      });

      const matchedItems: FeedItem[] = allFiles
        .map((file: any) => {
          const parsed = parseDriveFileName(file.name);
          if (!parsed || parsed.session !== sessionNum) return null; // 파싱된 번호와 비교

          const matchedUser = users.find(
            (u: any) => String(u.real_name).trim() === parsed.realName &&
                        String(u.phone_suffix).trim() === parsed.phoneSuffix
          );

          if (!matchedUser) return null;

          return {
            id: file.id,
            // URL 수정: 백틱(`)과 ${} 를 정확히 사용
            photo_url: `https://lh3.googleusercontent.com/u/0/d/${file.id}`,
            gender: parsed.gender || "Unknown",
            target_user_id: String(matchedUser.id),
            like_count: likeCounts[file.id] || 0
          };
        })
        .filter((item: FeedItem | null): item is FeedItem => item !== null)
        .sort((a: FeedItem, b: FeedItem) => b.like_count - a.like_count);

      setFeedItems(matchedItems);
      setTotalLikes(likes.length);
    } catch (error) {
      console.error("Feed Dashboard Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [API_KEY, FOLDER_ID]);

  // 초기 로드 및 실시간 구독
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "current_session").single();
      const session = data?.value || "01";
      sessionRef.current = session;
      setCurrentSession(session);
      fetchFeedData(session);
    };
    init();

    const channel = supabase
      .channel(`feed_admin_${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_likes" }, () => {
        fetchFeedData(sessionRef.current);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchFeedData]);

  // [중요] 리포트 발행 및 페이지 이동 로직
  const finalizeAndReleaseReport = async () => {
    const isConfirm = confirm("📢 모든 매칭을 계산하고 리포트를 발행하시겠습니까?\n발행 후 결과 확인 페이지로 이동합니다.");
    if (!isConfirm) return;
    
    setIsFinalizing(true);
    try {
      // 1. 매칭 알고리즘 실행 및 DB 저장 API 호출
      const response = await fetch('/api/admin/finalize-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSession })
      });
      
      const result = await response.json();
      
      // DB 컬럼 오류 등이 발생했을 때 처리
      if (!result.success) {
        throw new Error(result.error || '매칭 처리 중 오류가 발생했습니다.');
      }

      // 2. 유저용 리포트 공개 설정 (API 사용 - RLS 우회)
      const phaseRes = await fetch('/api/admin/phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'report' })
      });

      if (!phaseRes.ok) {
        throw new Error('리포트 공개 설정 실패');
      }

      alert(`✅ 리포트 발행 및 매칭이 성공적으로 완료되었습니다!`);

      // 3. 결과 대시보드로 이동
      router.push("/admin/dashboard/1on1"); 
      
    } catch (err: any) {
      console.error("Finalize Error:", err);
      alert("오류 발생: " + err.message + "\n(DB 컬럼 설정을 다시 확인해주세요.)");
    } finally {
      setIsFinalizing(false);
    }
  };

  if (isLoading) {
    return (
      <main className="h-screen w-full bg-[#FAF9F6] flex items-center justify-center">
        <Loader2 className="text-[#7DD3FC] animate-spin" size={30} />
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#FAF9F6] text-[#44403C] antialiased flex flex-col font-serif pb-20 overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="h-[70px] border-b border-[#EEEBDE] px-6 md:px-10 flex justify-between items-center bg-white sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push("/admin")}>
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <h1 className="text-xl italic font-black">Popularity</h1>
          </div>
          <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-[0.4em] text-[#7DD3FC] bg-[#E0F2FE] px-3 py-1 rounded-full border border-[#7DD3FC]/20">Live Status</span>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.button
            onClick={finalizeAndReleaseReport}
            disabled={isFinalizing}
            className="px-4 py-2 bg-[#7DD3FC] text-white rounded-full text-[10px] font-sans font-black uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
          >
            {isFinalizing ? <Loader2 size={12} className="animate-spin" /> : <><Sparkles size={12} /> Finalize Report</>}
          </motion.button>
          <button onClick={() => router.push("/admin/settings")} className="p-2.5 rounded-full border border-[#EEEBDE] hover:bg-[#F0EDE4] transition-all"><Settings size={18} /></button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-6 pt-10">
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 font-sans">
          {[
            { label: "Total Photos", value: filteredItems.length, icon: Users, color: "#44403C" },
            { label: "Total Hearts", value: totalLikes, icon: Heart, color: "#7DD3FC" },
            { label: "Top Score", value: filteredItems[0]?.like_count || 0, icon: Trophy, color: "#B19470" }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-[#EEEBDE] rounded-[2rem] p-6 flex items-center gap-5 shadow-sm">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#FAF9F6] border border-[#EEEBDE]" style={{ color: stat.color }}>
                <stat.icon size={20} fill={stat.label === "Total Hearts" ? "currentColor" : "none"} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Ranking List */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-[#EEEBDE] shadow-sm mb-10">
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
            <h3 className="text-lg italic font-bold flex items-center gap-3">
              <Trophy size={24} className="text-[#7DD3FC]" /> Real-time Ranking
            </h3>
            
            {/* Filter Buttons */}
            <div className="flex bg-[#F5F5F4] p-1.5 rounded-2xl gap-1 font-sans">
              {[
                { id: "all", label: "All" },
                { id: "F", label: "Female" },
                { id: "M", label: "Male" }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setGenderFilter(btn.id as any)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    genderFilter === btn.id ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 justify-items-center">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, idx) => {
                const isFemale = isFemaleGender(item.gender);
                return (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative group w-full"
                  >
                    {/* Rank Badge */}
                    <div className={`absolute -top-3 -left-3 z-20 w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shadow-xl font-sans ${
                      idx === 0 ? 'bg-[#7DD3FC] text-white' : idx === 1 ? 'bg-[#B19470] text-white' : 'bg-white border border-[#EEEBDE] text-gray-400'
                    }`}>
                      {idx + 1}
                    </div>

                    <div className="aspect-[3/4] w-full bg-[#FAF9F6] rounded-[2rem] overflow-hidden border border-[#EEEBDE] relative shadow-sm group-hover:shadow-md transition-all duration-500">
                      <img 
                        src={item.photo_url} 
                        alt="Participant" 
                        className="w-full h-full object-cover opacity-95 group-hover:scale-105 transition-transform duration-700" 
                      />
                      
                      {/* Gender Badge */}
                      <div className={`absolute top-4 right-4 z-20 px-2.5 py-1 rounded-full text-[8px] font-black text-white shadow-sm font-sans ${
                        isFemale ? 'bg-pink-300' : 'bg-blue-300'
                      }`}>
                        {isFemale ? 'FEMALE' : 'MALE'}
                      </div>

                      {/* Info Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-white/90 via-white/40 to-transparent">
                        <div className="flex items-center justify-end gap-2">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm font-sans bg-white/80 border border-[#EEEBDE] ${
                            isFemale ? 'text-pink-400' : 'text-blue-400'
                          }`}>
                            <Heart size={10} fill="currentColor" />
                            <span className="text-[11px] font-black">{item.like_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filteredItems.length === 0 && (
            <div className="py-20 text-center text-gray-300 italic">No matching records found.</div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #EEEBDE; border-radius: 10px; }
      `}</style>
    </main>
  );
}
