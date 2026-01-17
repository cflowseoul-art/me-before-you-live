"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { usePhaseRedirect } from "@/lib/hooks/usePhaseRedirect";
import { Heart, X } from "lucide-react";
import { parseDriveFileName } from "@/lib/utils/feed-parser";

interface FeedItem {
  id: string;
  nickname: string;
  user_id: string;
  gender: string;
  photo_url: string;
  caption: string | null;
  target_user_id: string;
  photo_id: string;
}

interface Like {
  user_id: string;
  target_user_id: string;
  photo_id: string;
}

export default function FeedPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [shuffledRawItems, setShuffledRawItems] = useState<FeedItem[]>([]);

  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, boolean>>({});
  const isSyncing = useRef<Record<string, boolean>>({});

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

  useEffect(() => {
    const stored = localStorage.getItem("auction_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.id) setCurrentUser(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  const fetchFeedData = useCallback(async (session: string) => {
    if (!session || !FOLDER_ID || !API_KEY) return;
    
    try {
      setIsLoading(true);
      const [usersRes, likesRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("feed_likes").select("user_id, target_user_id, photo_id") 
      ]);

      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name)&key=${API_KEY}`
      );
      const driveData = await driveRes.json();

      const matchedItems = (driveData.files || [])
        .map((file: any) => {
          const info = parseDriveFileName(file.name);
          if (!info || info.session !== session) return null;

          const matchedUser = usersRes.data?.find(u => 
            String(u.real_name).trim() === info.realName && 
            String(u.phone_suffix).trim() === info.phoneSuffix
          );

          if (!matchedUser) return null;

          return {
            id: file.id,
            photo_id: file.id,
            user_id: currentUser?.id || "",
            target_user_id: String(matchedUser.id),
            nickname: matchedUser.nickname,
            gender: info.gender, // "남성" 또는 "여성" 등
            photo_url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
            caption: info.caption
          } as FeedItem;
        }).filter((item: any): item is FeedItem => item !== null);

      setFeedItems(matchedItems);
      setLikes(likesRes.data || []);
      
      if (shuffledRawItems.length === 0) {
        setShuffledRawItems([...matchedItems].sort(() => Math.random() - 0.5));
      }
    } catch (error) {
      console.error("Feed Load Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, API_KEY, FOLDER_ID, shuffledRawItems.length]);

  usePhaseRedirect({
    currentPage: "feed",
    onSettingsFetched: (settings) => {
      const session = String(settings.current_session).padStart(2, '0');
      if (currentSession !== session) {
        setCurrentSession(session);
      }
    }
  });

  useEffect(() => {
    if (!currentSession) return;
    fetchFeedData(currentSession);

    const channel = supabase
      .channel("feed_likes_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_likes" }, () => {
        fetchFeedData(currentSession);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentSession, fetchFeedData]);

  const displayItems = useMemo(() => {
    let items = shuffledRawItems.length > 0 ? shuffledRawItems : feedItems;
    if (genderFilter === "male") items = items.filter(i => ["남성", "남", "m", "male"].includes(i.gender.toLowerCase()));
    if (genderFilter === "female") items = items.filter(i => ["여성", "여", "f", "female"].includes(i.gender.toLowerCase()));
    return items;
  }, [shuffledRawItems, feedItems, genderFilter]);

  const checkIfLiked = (photoId: string) => {
    if (!currentUser?.id) return false;
    if (optimisticStatus[photoId] !== undefined) return optimisticStatus[photoId];
    return likes.some(l => String(l.user_id) === String(currentUser.id) && String(l.photo_id) === String(photoId));
  };

  const getLikeCount = (photoId: string) => {
    const othersCount = likes.filter(l => String(l.photo_id) === String(photoId) && String(l.user_id) !== String(currentUser?.id)).length;
    return checkIfLiked(photoId) ? othersCount + 1 : othersCount;
  };

  // [핵심] 좋아요 처리 로직: 본인 및 같은 성별 차단
  const handleLike = async (item: FeedItem) => {
    if (!currentUser) return;

    // 1. 본인 사진 차단
    if (String(currentUser.id) === String(item.target_user_id)) {
      alert("본인 사진에는 하트를 남길 수 없습니다. :)");
      return;
    }

    // 2. 같은 성별 차단 (성별 데이터 정규화 비교)
    const userGender = String(currentUser.gender || "").substring(0, 1); // '남' 또는 '여'
    const targetGender = String(item.gender || "").substring(0, 1);

    if (userGender === targetGender) {
      alert("이성 참가자의 사진에만 하트를 누를 수 있습니다! ❤️");
      return;
    }

    if (isSyncing.current[item.id]) return;

    const currentlyLiked = checkIfLiked(item.id);
    const nextStatus = !currentlyLiked;

    isSyncing.current[item.id] = true;
    setOptimisticStatus(prev => ({ ...prev, [item.id]: nextStatus }));

    try {
      if (currentlyLiked) {
        await supabase.from("feed_likes").delete().match({ user_id: currentUser.id, photo_id: item.id });
      } else {
        await supabase.from("feed_likes").insert({ user_id: currentUser.id, target_user_id: item.target_user_id, photo_id: item.id });
      }
    } catch (e) {
      console.error(e);
      fetchFeedData(currentSession);
    } finally {
      setTimeout(() => {
        setOptimisticStatus(prev => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        isSyncing.current[item.id] = false;
      }, 500);
    }
  };

  if (isLoading && feedItems.length === 0) return <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] font-serif italic text-gray-400">Loading Gallery...</div>;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif pb-24 select-none">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#EEEBDE] px-5 py-4">
        <div className="max-w-xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl italic font-bold">The Gallery</h1>
            <div className="bg-[#FDF8F8] px-3 py-1 rounded-full text-[10px] text-[#A52A2A] font-black uppercase tracking-widest border border-[#A52A2A]/5">{displayItems.length} Photos</div>
          </div>
          <div className="flex gap-2 justify-center">
            {["all", "male", "female"].map((f: any) => (
              <button key={f} onClick={() => setGenderFilter(f)} className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${genderFilter === f ? "bg-[#1A1A1A] text-white" : "bg-gray-100 text-gray-400"}`}>{f}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto grid grid-cols-3 gap-[2px] pt-[2px]">
        {displayItems.map((item) => (
          <div key={item.id} onClick={() => setSelectedItem(item)} className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-100">
            <img src={item.photo_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white text-xs font-bold transition-opacity">
              <Heart size={14} fill={checkIfLiked(item.id) ? "#FF3B30" : "none"} className={checkIfLiked(item.id) ? "text-[#FF3B30]" : "text-white"} />
              <span className="ml-1">{getLikeCount(item.id)}</span>
            </div>
          </div>
        ))}
      </main>

      {selectedItem && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-[2.5rem] max-w-md w-full overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="relative">
              <img src={selectedItem.photo_url} className="w-full aspect-square object-cover shadow-inner" alt="" />
              <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white z-[110]"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <div onClick={() => handleLike(selectedItem)} className="flex items-center gap-3 cursor-pointer transition-transform active:scale-125 select-none">
                  <Heart size={38} fill={checkIfLiked(selectedItem.id) ? "#FF3B30" : "none"} className={checkIfLiked(selectedItem.id) ? "text-[#FF3B30]" : "text-gray-300"} />
                  <span className="font-sans font-black text-3xl">{getLikeCount(selectedItem.id)}</span>
                </div>
                <span className="text-[10px] font-sans font-black text-gray-300 uppercase tracking-widest">{selectedItem.gender}</span>
              </div>
              {selectedItem.caption && (
                <div className="py-6 border-y border-gray-50 text-center italic text-gray-600 text-[13px] break-keep">
                  "{selectedItem.caption}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}