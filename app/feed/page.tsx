"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface FeedItem {
  id: string;
  nickname: string;
  gender: string;
  photo_url: string;
  caption: string;
  target_user_id: string;
}

interface Like {
  id: string;
  user_id: string;
  target_user_id: string;
}

const MAX_LIKES = 3;

export default function FeedPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [remainingLikes, setRemainingLikes] = useState(MAX_LIKES);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState("01");

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

  const getLikeCount = (targetUserId: string) => {
    return likes.filter(like => like.target_user_id === targetUserId).length;
  };

  const hasLiked = (targetUserId: string) => {
    if (!currentUser) return false;
    return likes.some(like =>
      like.user_id === currentUser.id && like.target_user_id === targetUserId
    );
  };

  const fetchFeedData = async (session: string, userId?: string) => {
    try {
      const [usersRes, likesRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("feed_likes").select("*")
      ]);

      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name)&key=${API_KEY}`
      );
      const driveData = await driveRes.json();
      const allFiles = driveData.files || [];

      const matchedItems: FeedItem[] = allFiles
        .filter((file: any) => file.name.startsWith(`${session}_`))
        .map((file: any) => {
          const namePart = file.name.replace(/\.[^/.]+$/, "");
          const [sess, realName, suffix, gender, caption] = namePart.split("_");
          const matchedUser = usersRes.data?.find(u => u.real_name === realName && u.phone_suffix === suffix);
          if (!matchedUser) return null;
          return {
            id: file.id,
            target_user_id: matchedUser.id,
            nickname: matchedUser.nickname,
            gender: gender || matchedUser.gender || "Unknown",
            photo_url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
            caption: caption || "매력을 탐색 중입니다."
          };
        })
        .filter((item: any): item is FeedItem => item !== null);

      setFeedItems(matchedItems);
      if (likesRes.data) {
        setLikes(likesRes.data);
        const myId = userId || currentUser?.id;
        if (myId) {
          const myLikes = likesRes.data.filter(l => l.user_id === myId).length;
          setRemainingLikes(MAX_LIKES - myLikes);
        }
      }
    } catch (error) {
      console.error("Feed Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem("auction_user");
      let myId = "";
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
        myId = parsed.id;
      }

      const { data: settings } = await supabase.from("system_settings").select("*");
      const session = settings?.find(s => s.key === "current_session")?.value || "01";
      const isReportOpen = settings?.find(s => s.key === "is_report_open")?.value === "true";
      
      // [자동 이동] 이미 리포트가 열려있다면 즉시 이동
      if (isReportOpen && myId) {
        window.location.href = `/1on1/loading/${myId}`;
        return;
      }

      setCurrentSession(session);
      fetchFeedData(session, myId);
    };
    init();

    // [실시간 안테나] 리포트 발행 신호 및 좋아요 동기화
    const channel = supabase.channel("feed_realtime_sync")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "system_settings" }, (payload: any) => {
        if (payload.new.key === "is_report_open" && payload.new.value === "true") {
          const stored = localStorage.getItem("auction_user");
          if (stored) window.location.href = `/1on1/loading/${JSON.parse(stored).id}`;
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_likes" }, () => fetchFeedData(currentSession))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentSession]);

  const handleLike = async (item: FeedItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser || currentUser.id === item.target_user_id) return;
    const alreadyLiked = hasLiked(item.target_user_id);
    if (alreadyLiked) {
      await supabase.from("feed_likes").delete().eq("user_id", currentUser.id).eq("target_user_id", item.target_user_id);
    } else {
      if (remainingLikes <= 0) return alert("좋아요 가능 횟수를 모두 사용했습니다!");
      await supabase.from("feed_likes").insert({ user_id: currentUser.id, target_user_id: item.target_user_id });
    }
    fetchFeedData(currentSession);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-serif italic text-gray-400 bg-[#FDFDFD]">Loading Gallery...</div>;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif antialiased pb-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#EEEBDE] px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl italic tracking-tight">Gallery</h1>
          <div className="flex items-center gap-1.5 bg-[#FDF8F8] px-4 py-2 rounded-full border border-[#A52A2A]/10">
            <span className="text-[10px] font-sans font-black text-[#A52A2A] uppercase tracking-widest mr-1">Likes Left</span>
            <span className="text-xs font-sans font-bold text-[#A52A2A]">{remainingLikes}</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-1 py-1">
        <div className="grid grid-cols-3 gap-[2px]">
          {feedItems.map((item) => (
            <div key={item.id} className="aspect-square relative cursor-pointer group" onClick={() => setSelectedItem(item)}>
              <img src={item.photo_url} className="w-full h-full object-cover" alt="feed" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-sm font-sans font-bold text-white">♥ {getLikeCount(item.target_user_id)}</span>
              </div>
              {hasLiked(item.target_user_id) && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-[#A52A2A] rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-[10px] text-white">♥</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-[2.5rem] max-w-md w-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={selectedItem.photo_url} className="w-full aspect-square object-cover" />
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-medium italic mb-1">{selectedItem.nickname}</h2>
                  <span className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-widest">{selectedItem.gender}</span>
                </div>
                <div className="text-sm font-sans font-bold text-gray-400">♥ {getLikeCount(selectedItem.target_user_id)}</div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed italic border-l-2 border-[#A52A2A]/20 pl-4">"{selectedItem.caption}"</p>
              {currentUser && currentUser.id !== selectedItem.target_user_id && (
                <button
                  onClick={(e) => handleLike(selectedItem, e)}
                  className={`w-full py-4 rounded-2xl text-xs font-sans font-black tracking-widest uppercase transition-all ${
                    hasLiked(selectedItem.target_user_id) ? 'bg-[#A52A2A] text-white' : 'bg-[#1A1A1A] text-white'
                  }`}
                >
                  {hasLiked(selectedItem.target_user_id) ? 'Liked' : 'Send Like'}
                </button>
              )}
              <button onClick={() => setSelectedItem(null)} className="w-full text-[10px] font-sans font-bold text-gray-400 uppercase tracking-widest">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}