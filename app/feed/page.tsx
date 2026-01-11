"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  real_name: string;
  phone_suffix: string;
  nickname: string;
  gender: string;
}

interface FeedItem {
  id: string;
  nickname: string;
  gender: string;
  photo_url: string;
  caption: string;
  target_user_id: string; // 좋아요 대상 ID (DB상의 유저 ID)
}

interface Like {
  id: string;
  user_id: string;
  target_user_id: string;
}

const MAX_LIKES = 3;
const CURRENT_SESSION = "1"; // 현재 회차 설정

export default function FeedPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [remainingLikes, setRemainingLikes] = useState(MAX_LIKES);
  const [isLoading, setIsLoading] = useState(true);

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

  // 유저의 좋아요 수 가져오기
  const getLikeCount = (targetUserId: string) => {
    return likes.filter(like => like.target_user_id === targetUserId).length;
  };

  // 이미 좋아요 했는지 확인
  const hasLiked = (targetUserId: string) => {
    if (!currentUser) return false;
    return likes.some(like =>
      like.user_id === currentUser.id && like.target_user_id === targetUserId
    );
  };

  // 데이터 통합 페칭 (G-Drive + Supabase)
  const fetchFeedData = async () => {
    try {
      // 1. Supabase 데이터 가져오기
      const [usersRes, likesRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("likes").select("*")
      ]);

      // 2. Google Drive API 호출
      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name)&key=${API_KEY}`
      );
      const driveData = await driveRes.json();
      const allFiles = driveData.files || [];

      // 3. 회차 필터링 및 매칭 로직
      const matchedItems: FeedItem[] = allFiles
        .filter((file: any) => file.name.startsWith(`${CURRENT_SESSION}_`))
        .map((file: any) => {
          const namePart = file.name.replace(/\.[^/.]+$/, "");
          const [session, realName, suffix, gender, caption] = namePart.split("_");

          const matchedUser = usersRes.data?.find(
            (u) => u.real_name === realName && u.phone_suffix === suffix
          );

          return {
            id: file.id,
            target_user_id: matchedUser?.id || file.id,
            nickname: matchedUser?.nickname || "신비로운 참가자",
            gender: gender || matchedUser?.gender || "Unknown",
            photo_url: `https://drive.google.com/uc?export=view&id=${file.id}`,
            caption: caption || "매력을 탐색 중입니다."
          };
        });

      setFeedItems(matchedItems);
      if (likesRes.data) {
        setLikes(likesRes.data);
        if (currentUser) {
          const myLikes = likesRes.data.filter(l => l.user_id === currentUser.id).length;
          setRemainingLikes(MAX_LIKES - myLikes);
        }
      }
    } catch (error) {
      console.error("Feed Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 좋아요 처리
  const handleLike = async (item: FeedItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser || currentUser.id === item.target_user_id) return;

    const alreadyLiked = hasLiked(item.target_user_id);

    if (alreadyLiked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("target_user_id", item.target_user_id);

      if (!error) fetchFeedData();
    } else {
      if (remainingLikes <= 0) {
        alert("좋아요 가능 횟수를 모두 사용했습니다!");
        return;
      }
      const { error } = await supabase
        .from("likes")
        .insert({ user_id: currentUser.id, target_user_id: item.target_user_id });

      if (!error) fetchFeedData();
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("auction_user");
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    fetchFeedData();
    const channel = supabase.channel("feed_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, fetchFeedData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-serif italic text-gray-400">Loading Gallery...</div>;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif antialiased pb-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#EEEBDE] px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl italic tracking-tight">Gallery</h1>
          <div className="flex items-center gap-1.5 bg-[#FDF8F8] px-4 py-2 rounded-full border border-[#A52A2A]/10">
            <span className="text-[10px] font-sans font-bold text-[#A52A2A] uppercase tracking-widest mr-1">Likes Left</span>
            <span className="text-xs font-sans font-bold text-[#A52A2A]">{remainingLikes}</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-1 py-1">
        <div className="grid grid-cols-3 gap-[2px]">
          {feedItems.map((item) => (
            <div 
              key={item.id} 
              className="aspect-square relative cursor-pointer group" 
              onClick={() => setSelectedItem(item)}
            >
              <img src={item.photo_url} className="w-full h-full object-cover" alt="feed" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex items-center gap-1 text-white">
                  <span className="text-sm font-sans font-bold">♥ {getLikeCount(item.target_user_id)}</span>
                </div>
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