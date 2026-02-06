"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { usePhaseRedirect } from "@/lib/hooks/usePhaseRedirect";
import { Heart, X, Sparkles, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parseDriveFileName } from "@/lib/utils/feed-parser";

// 하트 최대 개수 제한 (1on1-spec.md 기준)
const MAX_HEARTS = 5;

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
  const [showReportModal, setShowReportModal] = useState(false);

  // 하트 제한 경고 모달
  const [showHeartLimitWarning, setShowHeartLimitWarning] = useState(false);

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

  useEffect(() => {
    const stored = localStorage.getItem("auction_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.id) {
          setCurrentUser(parsed);
          // 이성 사진만 보이도록 자동 필터 설정
          const g = String(parsed.gender || "").substring(0, 1);
          if (g === "남") setGenderFilter("female");
          else if (g === "여") setGenderFilter("male");
        }
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

  // 리포트 열림 시 로딩 표시 후 바로 이동 (브릿지 삭제 - 직접 report 페이지로)
  const handleReportOpened = useCallback(() => {
    if (!showReportModal && currentUser?.id) {
      setShowReportModal(true);
      // 브릿지(loading) 페이지 거치지 않고 바로 report 페이지로 이동
      setTimeout(() => {
        window.location.href = `/1on1/report/${currentUser.id}`;
      }, 1500);
    }
  }, [showReportModal, currentUser?.id]);

  usePhaseRedirect({
    currentPage: "feed",
    onSettingsFetched: (settings) => {
      const session = String(settings.current_session).padStart(2, '0');
      if (currentSession !== session) {
        setCurrentSession(session);
      }
    },
    onReportOpened: handleReportOpened
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

  // Phase 변경 감지 폴링 (2초마다)
  useEffect(() => {
    const checkPhase = async () => {
      try {
        const res = await fetch('/api/admin/phase');
        const data = await res.json();
        if (data.success && data.settings?.is_report_open === 'true') {
          handleReportOpened();
        }
      } catch (e) {
        console.error('Phase check error:', e);
      }
    };

    const pollInterval = setInterval(checkPhase, 2000);
    return () => clearInterval(pollInterval);
  }, [handleReportOpened]);

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

  // 현재 세션 피드의 photo_id 집합
  const currentFeedPhotoIds = useMemo(() => {
    return new Set(feedItems.map(item => item.id));
  }, [feedItems]);

  // 현재 사용자가 보낸 하트 개수 계산 (현재 세션 피드 사진만)
  const getMyHeartCount = useCallback(() => {
    if (!currentUser?.id) return 0;

    // 현재 세션 피드에 속하는 좋아요만 카운트
    let count = likes.filter(l =>
      String(l.user_id) === String(currentUser.id) &&
      currentFeedPhotoIds.has(String(l.photo_id))
    ).length;

    // optimistic 상태에서 추가/삭제된 것 반영
    Object.entries(optimisticStatus).forEach(([photoId, isLiked]) => {
      const wasLiked = likes.some(l => String(l.user_id) === String(currentUser.id) && String(l.photo_id) === String(photoId));
      if (isLiked && !wasLiked) count++;
      if (!isLiked && wasLiked) count--;
    });

    return count;
  }, [currentUser?.id, likes, optimisticStatus, currentFeedPhotoIds]);

  // [핵심] 좋아요 처리 로직: 본인 및 같은 성별 차단 + 5개 제한
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
      alert("이성 참가자의 사진에만 하트를 누를 수 있습니다!");
      return;
    }

    const currentlyLiked = checkIfLiked(item.id);

    // 3. 하트 5개 제한 체크 (좋아요 추가 시에만)
    if (!currentlyLiked) {
      const currentHeartCount = getMyHeartCount();
      if (currentHeartCount >= MAX_HEARTS) {
        setShowHeartLimitWarning(true);
        return;
      }
    }

    if (isSyncing.current[item.id]) return;

    const nextStatus = !currentlyLiked;

    isSyncing.current[item.id] = true;
    setOptimisticStatus(prev => ({ ...prev, [item.id]: nextStatus }));

    try {
      let result;
      if (currentlyLiked) {
        result = await supabase.from("feed_likes").delete().match({ user_id: currentUser.id, photo_id: item.id });
      } else {
        result = await supabase.from("feed_likes").insert({ user_id: currentUser.id, target_user_id: item.target_user_id, photo_id: item.id });
      }

      // Supabase 클라이언트는 에러 시 throw하지 않고 { error } 를 반환함
      if (result.error) {
        console.error("feed_likes DB error:", result.error);
        setOptimisticStatus(prev => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        fetchFeedData(currentSession);
        return;
      }

      // 성공: 실제 DB 데이터를 다시 가져온 후 optimistic 상태 제거
      await fetchFeedData(currentSession);
      setOptimisticStatus(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (e) {
      console.error(e);
      setOptimisticStatus(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      fetchFeedData(currentSession);
    } finally {
      isSyncing.current[item.id] = false;
    }
  };

  if (isLoading && feedItems.length === 0) return <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] font-serif italic text-gray-400">Loading Gallery...</div>;

  const myHeartCount = getMyHeartCount();

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif pb-24 select-none">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#EEEBDE] px-5 py-4">
        <div className="max-w-xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl italic font-bold">The Gallery</h1>
            <div className="flex items-center gap-3">
              {/* 하트 카운터 */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                myHeartCount >= MAX_HEARTS
                  ? 'bg-rose-50 border-rose-200 text-rose-500'
                  : 'bg-pink-50 border-pink-200 text-pink-500'
              }`}>
                <Heart size={12} fill={myHeartCount > 0 ? "currentColor" : "none"} />
                <span>{myHeartCount}/{MAX_HEARTS}</span>
              </div>
              <div className="bg-[#FDF8F8] px-3 py-1 rounded-full text-[10px] text-[#A52A2A] font-black uppercase tracking-widest border border-[#A52A2A]/5">{displayItems.length} Photos</div>
            </div>
          </div>
          {/* 성별 필터: 이성만 자동 표시되므로 유저에게는 숨김 */}
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
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-sans font-black text-gray-300 uppercase tracking-widest">{selectedItem.gender}</span>
                  {/* 남은 하트 표시 */}
                  <span className={`text-[9px] font-sans font-bold ${myHeartCount >= MAX_HEARTS ? 'text-rose-400' : 'text-pink-400'}`}>
                    {MAX_HEARTS - myHeartCount}개 남음
                  </span>
                </div>
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

      {/* 하트 제한 경고 모달 */}
      <AnimatePresence>
        {showHeartLimitWarning && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-lg"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHeartLimitWarning(false)}
          >
            <motion.div
              className="bg-white rounded-[2rem] max-w-sm w-full p-8 shadow-2xl"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                {/* 아이콘 */}
                <motion.div
                  className="w-16 h-16 mx-auto mb-6 bg-rose-100 rounded-full flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <AlertTriangle size={32} className="text-rose-500" />
                </motion.div>

                {/* 제목 */}
                <h3 className="text-xl font-bold mb-3 text-gray-800">
                  하트를 모두 사용했어요!
                </h3>

                {/* 설명 */}
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  최대 <span className="font-bold text-rose-500">{MAX_HEARTS}개</span>의 하트만 보낼 수 있어요.<br />
                  더 마음에 드는 분이 있다면<br />
                  기존 하트를 취소하고 다시 선택해주세요.
                </p>

                {/* 하트 시각화 */}
                <div className="flex justify-center gap-2 mb-6">
                  {[...Array(MAX_HEARTS)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Heart
                        size={24}
                        fill="#f43f5e"
                        className="text-rose-500"
                      />
                    </motion.div>
                  ))}
                </div>

                {/* 팁 */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <p className="text-xs text-gray-500">
                    <span className="font-bold text-gray-700">Tip:</span> 신중하게 선택한 하트일수록 매칭 점수에 더 큰 영향을 줍니다!
                  </p>
                </div>

                {/* 버튼 */}
                <button
                  onClick={() => setShowHeartLimitWarning(false)}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-bold text-sm uppercase tracking-widest shadow-lg shadow-rose-200 active:scale-95 transition-transform"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 리포트 발행 로딩 모달 */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-lg"
            style={{ backgroundColor: "rgba(26, 26, 26, 0.95)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              >
                <Sparkles size={60} className="mx-auto mb-8 text-[#7DD3FC]" />
              </motion.div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 italic">
                1:1 리포트 발행 중
              </h2>
              <p className="text-white/70 text-sm font-sans">
                당신만을 위한 매칭 결과를 준비하고 있습니다
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
