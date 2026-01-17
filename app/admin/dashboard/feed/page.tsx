"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Heart, Trophy, Users, TrendingUp, Sparkles, Loader2 } from "lucide-react";
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

  // Ref to hold current session for Realtime callback
  const sessionRef = useRef(currentSession);

  // 성별 판단 함수 (다양한 형식 지원)
  const isFemaleGender = (gender: string) => {
    const g = gender?.toUpperCase?.() || "";
    return g === "F" || g === "FEMALE" || g === "여" || g === "여성";
  };
  const isMaleGender = (gender: string) => {
    const g = gender?.toUpperCase?.() || "";
    return g === "M" || g === "MALE" || g === "남" || g === "남성";
  };

  // 성별로 필터링된 아이템
  const filteredItems = genderFilter === "all"
    ? feedItems
    : genderFilter === "F"
      ? feedItems.filter(item => isFemaleGender(item.gender))
      : feedItems.filter(item => isMaleGender(item.gender));

  // 성별별 통계
  const femaleItems = feedItems.filter(item => isFemaleGender(item.gender));
  const maleItems = feedItems.filter(item => isMaleGender(item.gender));

  // 디버깅용 로그
  console.log("Feed items genders:", feedItems.map(item => item.gender));

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

  // Finalize all matches atomically via RPC, then release report
  const finalizeAndReleaseReport = async () => {
    const isConfirm = confirm(
      "📢 모든 매칭을 계산하고 리포트를 발행하시겠습니까?\n\n1. 매칭 알고리즘이 실행됩니다 (가치관 70% + 피드 30%)\n2. 모든 유저의 화면이 리포트로 전환됩니다."
    );

    if (!isConfirm) return;

    setIsFinalizing(true);

    try {
      // Step 1: Finalize all matches atomically via RPC
      const response = await fetch('/api/admin/finalize-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSession })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to finalize matches');
      }

      // Step 2: Release report to all users
      const { error } = await supabase
        .from("system_settings")
        .update({ value: "true" })
        .eq("key", "is_report_open");

      if (error) {
        throw new Error(error.message);
      }

      alert(`✅ 매칭 완료! ${result.matches_created}개의 매칭이 생성되었습니다.\n유저들이 결과 페이지로 이동합니다.`);
    } catch (err: any) {
      alert("리포트 발행 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsFinalizing(false);
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

      // Build like counts by photo_id (each photo has unique likes)
      const likeCounts: Record<string, number> = {};
      likes.forEach(like => {
        const photoId = String(like.photo_id);
        likeCounts[photoId] = (likeCounts[photoId] || 0) + 1;
      });

      console.log("📊 Like counts by photo:", likeCounts);

      const matchedItems: FeedItem[] = allFiles
        .map((file: any) => {
          const parsed = parseDriveFileName(file.name);

          // Only include files from current session
          if (!parsed || parsed.session !== session) return null;

          const matchedUser = users.find(
            (u: any) => String(u.real_name).trim() === parsed.realName &&
                        String(u.phone_suffix).trim() === parsed.phoneSuffix
          );

          if (!matchedUser) {
            console.log("❌ No user match for:", parsed.realName, parsed.phoneSuffix);
            return null;
          }

          const targetUserId = String(matchedUser.id);
          const photoId = String(file.id);
          const likeCount = likeCounts[photoId] || 0;

          return {
            id: file.id,
            photo_url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
            nickname: matchedUser.nickname,
            real_name: parsed.realName,
            gender: parsed.gender || matchedUser.gender || "Unknown",
            caption: parsed.caption || "",
            target_user_id: targetUserId,
            like_count: likeCount
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
      sessionRef.current = session;
      setCurrentSession(session);
      fetchFeedData(session);
    };
    init();

    // Realtime listener
    const channelName = `feed_admin_dashboard_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feed_likes" },
        (payload) => {
          console.log("❤️ Feed likes changed:", payload.eventType, payload);
          fetchFeedData(sessionRef.current);
        }
      )
      .subscribe((status) => {
        console.log("📡 Feed Admin Dashboard subscription:", status);
      });

    return () => {
      console.log("🔌 Unsubscribing from feed_likes");
      supabase.removeChannel(channel);
    };
  }, []);

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
          {/* Finalize All Matches & Release Report Button */}
          <button
            onClick={finalizeAndReleaseReport}
            disabled={isFinalizing}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 disabled:cursor-not-allowed rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.3)]"
          >
            {isFinalizing ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Finalizing...
              </>
            ) : (
              <>
                <Sparkles size={14} /> Finalize All & Report
              </>
            )}
          </button>
          
          <button onClick={() => router.push("/admin/dashboard/auction")} className="px-5 py-2 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-[#A52A2A]/20 transition-all">Auction</button>
          <button onClick={() => router.push("/admin/settings")} className="px-5 py-2 bg-pink-600 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">Settings</button>
        </div>
      </nav>

      {/* Stats Bar */}
      <div className="px-10 py-6 flex gap-6 shrink-0 flex-wrap">
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

        {/* Gender Filter Tabs */}
        <div className="flex-1 flex justify-end items-center gap-2">
          <button
            onClick={() => setGenderFilter("all")}
            className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              genderFilter === "all"
                ? "bg-white text-black"
                : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            전체 ({feedItems.length})
          </button>
          <button
            onClick={() => setGenderFilter("F")}
            className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              genderFilter === "F"
                ? "bg-pink-500 text-white"
                : "bg-pink-500/10 text-pink-400 hover:bg-pink-500/20"
            }`}
          >
            여성 ({femaleItems.length})
          </button>
          <button
            onClick={() => setGenderFilter("M")}
            className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              genderFilter === "M"
                ? "bg-blue-500 text-white"
                : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            }`}
          >
            남성 ({maleItems.length})
          </button>
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
            {filteredItems.map((item, idx) => {
              const isFemale = isFemaleGender(item.gender);

              return (
                <div
                  key={item.id}
                  className={`relative group rounded-2xl overflow-hidden border transition-all duration-500 ${
                    idx === 0
                      ? isFemale
                        ? 'border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.2)] ring-2 ring-pink-500/20'
                        : 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)] ring-2 ring-blue-500/20'
                      : idx < 3
                        ? isFemale ? 'border-pink-500/20' : 'border-blue-500/20'
                        : 'border-white/5'
                  }`}
                >
                  <div className={`absolute top-3 left-3 z-20 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                    idx === 0
                      ? isFemale ? 'bg-pink-500 text-white' : 'bg-blue-500 text-white'
                      : idx < 3
                        ? isFemale ? 'bg-black/80 text-pink-400 border border-pink-500/30' : 'bg-black/80 text-blue-400 border border-blue-500/30'
                        : 'bg-black/60 text-white/60'
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Gender Badge */}
                  <div className={`absolute top-3 right-3 z-20 px-2 py-1 rounded-full text-[8px] font-black uppercase ${
                    isFemale ? 'bg-pink-500/80 text-white' : 'bg-blue-500/80 text-white'
                  }`}>
                    {isFemale ? '여' : '남'}
                  </div>

                  <div className="aspect-square w-full bg-black/40">
                    <img
                      src={item.photo_url}
                      alt="익명"
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                      onError={(e) => { (e.target as any).src = "https://via.placeholder.com/400?text=No+Image"; }}
                    />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white/50 truncate italic">익명</p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 ml-2 ${
                        isFemale ? 'bg-pink-500/90' : 'bg-blue-500/90'
                      }`}>
                        <Heart size={12} fill="white" className="text-white" />
                        <span className="text-xs font-black text-white">{item.like_count}</span>
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