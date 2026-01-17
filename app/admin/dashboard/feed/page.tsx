"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Heart, Trophy, Users, TrendingUp, Sparkles, Loader2, ChevronLeft } from "lucide-react";
import { parseDriveFileName } from "@/lib/utils/feed-parser";

interface FeedItem {
  id: string;
  photo_url: string;
  nickname: string;
  real_name: string;
  gender: string;
  caption: string;
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

  const femaleItems = feedItems.filter(item => isFemaleGender(item.gender));
  const maleItems = feedItems.filter(item => isMaleGender(item.gender));

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

  const fetchFeedData = useCallback(async (session: string) => {
    if (!FOLDER_ID || !API_KEY) return;
    try {
      const [usersRes, likesRes, driveRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("feed_likes").select("*"),
        fetch(`https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name)&key=${API_KEY}`)
      ]);

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
          if (!parsed || parsed.session !== session) return null;

          const matchedUser = users.find(
            (u: any) => String(u.real_name).trim() === parsed.realName &&
                        String(u.phone_suffix).trim() === parsed.phoneSuffix
          );

          if (!matchedUser) return null;

          return {
            id: file.id,
            photo_url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
            nickname: matchedUser.nickname,
            real_name: parsed.realName,
            gender: parsed.gender || matchedUser.gender || "Unknown",
            caption: parsed.caption || "",
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

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "current_session").single();
      const session = data?.value || "01";
      sessionRef.current = session;
      setCurrentSession(session);
      fetchFeedData(session);
    };
    init();

    const channelName = `feed_admin_dashboard_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_likes" }, () => {
        fetchFeedData(sessionRef.current);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchFeedData]);

  const finalizeAndReleaseReport = async () => {
    const isConfirm = confirm("📢 모든 매칭을 계산하고 리포트를 발행하시겠습니까?\n\n모든 유저의 화면이 리포트로 전환됩니다.");
    if (!isConfirm) return;
    setIsFinalizing(true);
    try {
      const response = await fetch('/api/admin/finalize-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSession })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to finalize matches');
      await supabase.from("system_settings").update({ value: "true" }).eq("key", "is_report_open");
      alert(`✅ 매칭 완료!`);
    } catch (err: any) {
      alert("오류 발생: " + err.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  if (isLoading) {
    return <main className="h-screen w-full bg-[#050505] flex items-center justify-center"><Loader2 className="text-pink-500 animate-spin" /></main>;
  }

  return (
    <main className="min-h-screen w-full bg-[#050505] text-[#E0E0E0] flex flex-col antialiased font-sans pb-10 overflow-x-hidden">
      
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 w-full">
        <div className="max-w-7xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push("/admin")}>
            <ChevronLeft size={18} className="text-white/30 group-hover:text-white transition-colors" />
            <h1 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-white">Popularity</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={finalizeAndReleaseReport}
              disabled={isFinalizing}
              className="px-3 md:px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 transition-all active:scale-95"
            >
              {isFinalizing ? <Loader2 size={12} className="animate-spin" /> : <><Sparkles size={12} /> Finalize</>}
            </button>
            <button onClick={() => router.push("/admin/settings")} className="px-3 md:px-5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-[9px] font-black uppercase transition-all">Settings</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-5">
        <div className="py-6 flex gap-3 overflow-x-auto no-scrollbar justify-start md:justify-center items-center shrink-0">
          {[
            { label: "Photos", value: feedItems.length, icon: Users },
            { label: "Total Likes", value: totalLikes, icon: Heart },
            { label: "Top Score", value: feedItems[0]?.like_count || 0, icon: TrendingUp }
          ].map((stat, i) => (
            <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-3 min-w-[120px] md:min-w-[180px] flex-1 md:flex-none">
              <stat.icon className="text-pink-500 shrink-0" size={16} />
              <div>
                <p className="text-[8px] text-white/30 uppercase font-bold leading-none mb-1">{stat.label}</p>
                <p className="text-lg font-black text-white leading-none">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 성별 필터: 모바일 중앙 / PC 우측 정렬 */}
        <div className="mb-8 flex gap-2 justify-center md:justify-end items-center w-full">
          {[
            { id: "all", label: "전체", count: feedItems.length, color: "bg-white text-black" },
            { id: "F", label: "여성", count: femaleItems.length, color: "bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]" },
            { id: "M", label: "남성", count: maleItems.length, color: "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setGenderFilter(btn.id as any)}
              className={`flex-1 md:flex-none md:w-32 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                genderFilter === btn.id ? btn.color : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {btn.label} <span className="opacity-50 ml-1">{btn.count}</span>
            </button>
          ))}
        </div>

        <div className="bg-[#111] rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 border border-white/5 min-h-[500px] shadow-inner mb-10">
          <div className="flex justify-between items-center mb-8 px-2">
            <h3 className="text-[10px] md:text-xs font-black text-pink-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <Trophy size={14} className="animate-bounce" /> Ranking Popularity
            </h3>
            <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-green-500 uppercase tracking-tighter">Live Sync</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 justify-items-center">
            {filteredItems.map((item, idx) => {
              const isFemale = isFemaleGender(item.gender);
              return (
                <div
                  key={item.id}
                  className={`relative group rounded-2xl overflow-hidden border transition-all duration-700 w-full max-w-[220px] ${
                    idx === 0
                      ? isFemale ? 'border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.2)]' : 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                      : 'border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className={`absolute top-2.5 left-2.5 z-20 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg ${
                    idx === 0 ? (isFemale ? 'bg-pink-500' : 'bg-blue-500') : 'bg-black/70 backdrop-blur-md text-white/50 border border-white/10'
                  } text-white`}>
                    {idx + 1}
                  </div>

                  <div className="aspect-square w-full bg-black/40 relative">
                    <img src={item.photo_url} alt="Participant" className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110" />
                    <div className={`absolute top-2.5 right-2.5 z-20 px-2 py-1 rounded-md text-[8px] font-black text-white shadow-sm backdrop-blur-sm ${isFemale ? 'bg-pink-500/70' : 'bg-blue-500/70'}`}>
                      {isFemale ? 'FEMALE' : 'MALE'}
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[9px] font-bold text-white/30 italic truncate">Anonymous Participant</p>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg ${isFemale ? 'bg-pink-500/90' : 'bg-blue-500/90'}`}>
                        <Heart size={10} fill="white" className="text-white" />
                        <span className="text-[11px] font-black text-white">{item.like_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}