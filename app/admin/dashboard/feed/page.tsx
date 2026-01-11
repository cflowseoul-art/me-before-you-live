"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Heart, Trophy, Users, TrendingUp, FileText } from "lucide-react"; // FileText 아이콘 추가

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

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

  // [추가] 리포트 발행 함수: DB 상태를 true로 변경
  const releaseReport = async () => {
    const isConfirm = confirm(
      "📢 모든 유저에게 리포트를 발행하시겠습니까?\n발행 즉시 모든 유저의 화면이 '로딩 중'으로 전환됩니다."
    );
    
    if (!isConfirm) return;

    const { error } = await supabase
      .from("system_settings")
      .update({ value: "true" })
      .eq("key", "is_report_open");

    if (error) {
      alert("리포트 발행 중 오류가 발생했습니다: " + error.message);
    } else {
      alert("✅ 리포트 발행 성공! 유저들이 결과 페이지로 이동합니다.");
    }
  };

  const fetchFeedData = async (session: string) => {
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
        likeCounts[like.target_user_id] = (likeCounts[like.target_user_id] || 0) + 1;
      });

      const matchedItems: FeedItem[] = allFiles
        .filter((file: any) => file.name.startsWith(`${session}_`))
        .map((file: any) => {
          const namePart = file.name.replace(/\.[^/.]+$/, "");
          const [, realName, suffix, gender, caption] = namePart.split("_");

          const matchedUser = users.find(
            (u: any) => u.real_name === realName && u.phone_suffix === suffix
          );

          if (!matchedUser) return null;

          return {
            id: file.id,
            photo_url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
            nickname: matchedUser.nickname,
            real_name: realName || "Unknown",
            gender: gender || matchedUser.gender || "Unknown",
            caption: caption || "",
            target_user_id: matchedUser.id,
            like_count: likeCounts[matchedUser.id] || 0
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
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "current_session").single();
      const session = data?.value || "01";
      setCurrentSession(session);
      fetchFeedData(session);
    };
    init();

    const channel = supabase.channel("feed_admin_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_likes" }, () => fetchFeedData(currentSession))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentSession]);

  if (isLoading) {
    return (
      <main className="h-screen w-full bg-[#050505] flex items-center justify-center">
        <p className="text-white/40 text-sm font-mono animate-pulse">Loading Feed Dashboard...</p>
      </main>
    );
  }

  return (
    <main className="h-screen w-full bg-[#050505] text-[#E0E0E0] overflow-hidden flex flex-col antialiased font-sans tracking-tight">

      {/* Navigation */}
      <nav className="h-[8vh] min-h-[60px] bg-black/60 backdrop-blur-3xl border-b border-pink-500/20 px-10 flex justify-between items-center z-50 shadow-2xl shrink-0">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push("/admin")}>
          <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse shadow-[0_0_15px_#ec4899]" />
          <h1 className="text-sm font-black uppercase tracking-[0.5em] text-white/90">Feed Popularity</h1>
        </div>
        <div className="flex gap-4">
          {/* 리포트 발행 버튼 추가 */}
          <button 
            onClick={releaseReport}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.3)]"
          >
            <FileText size={14} /> Release Report
          </button>
          
          <button onClick={() => router.push("/admin/dashboard/auction")} className="px-5 py-2 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-[#A52A2A]/20 transition-all">Auction</button>
          <button onClick={() => router.push("/admin/settings")} className="px-5 py-2 bg-pink-600 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">Settings</button>
        </div>
      </nav>

      {/* Stats Bar */}
      <div className="px-10 py-6 flex gap-6 shrink-0">
        <div className="bg-[#111] border border-white/5 rounded-2xl px-8 py-5 flex items-center gap-4">
          <Users className="text-pink-500" size={20} />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Total Photos</p>
            <p className="text-2xl font-black text-white">{feedItems.length}</p>
          </div>
        </div>
        <div className="bg-[#111] border border-white/5 rounded-2xl px-8 py-5 flex items-center gap-4">
          <Heart className="text-pink-500" size={20} />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Total Likes</p>
            <p className="text-2xl font-black text-white">{totalLikes}</p>
          </div>
        </div>
        <div className="bg-[#111] border border-white/5 rounded-2xl px-8 py-5 flex items-center gap-4">
          <TrendingUp className="text-pink-500" size={20} />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Top Liked</p>
            <p className="text-2xl font-black text-white">{feedItems[0]?.like_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Photo Ranking Grid */}
      <div className="flex-1 px-10 pb-10 overflow-hidden">
        <div className="h-full bg-[#111] rounded-[3rem] p-8 border border-white/5 flex flex-col shadow-2xl overflow-y-auto">

          <div className="flex justify-between items-end mb-8 px-2">
            <div>
              <h3 className="text-[11px] font-black text-pink-500 uppercase tracking-[0.4em] flex items-center gap-3 mb-1">
                <Trophy size={16} /> Popularity Ranking
              </h3>
              <p className="text-[10px] text-white/20 uppercase tracking-widest">sorted by likes</p>
            </div>
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest animate-pulse">Live</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {feedItems.map((item, idx) => (
              <div
                key={item.id}
                className={`relative group rounded-2xl overflow-hidden border transition-all duration-500 ${
                  idx === 0
                    ? 'border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.2)] ring-2 ring-pink-500/20'
                    : idx < 3
                      ? 'border-pink-500/20'
                      : 'border-white/5'
                }`}
              >
                <div className={`absolute top-3 left-3 z-20 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                  idx === 0 ? 'bg-pink-500 text-white' :
                  idx < 3 ? 'bg-black/80 text-pink-400 border border-pink-500/30' :
                  'bg-black/60 text-white/60'
                }`}>
                  {idx + 1}
                </div>

                <div className="aspect-square w-full bg-black/40">
                  <img
                    src={item.photo_url}
                    alt={item.nickname}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    onError={(e) => { (e.target as any).src = "https://via.placeholder.com/400?text=No+Image"; }}
                  />
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{item.nickname}</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">{item.gender}</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-pink-500/90 px-3 py-1.5 rounded-full shrink-0 ml-2">
                      <Heart size={12} fill="white" className="text-white" />
                      <span className="text-xs font-black text-white">{item.like_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}