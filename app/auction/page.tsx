"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Trophy, ChevronDown, ChevronUp, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { usePhaseRedirect } from "@/lib/hooks/usePhaseRedirect";
// 가치관 → 축 키워드 뱃지 매핑
const VALUE_BADGE: Record<string, { keyword: string; opposite: string; axis: string }> = {
  "원하는 것을 살 수 있는 풍요": { keyword: "풍요", opposite: "사랑", axis: "우선순위" },
  "사랑하는 사람과 함께하는 시간": { keyword: "사랑", opposite: "풍요", axis: "우선순위" },
  "지금 당장 누리는 확실한 행복": { keyword: "지금", opposite: "미래", axis: "시간관" },
  "더 큰 미래를 위한 인내": { keyword: "미래", opposite: "지금", axis: "시간관" },
  "안정적이고 평온한 일상": { keyword: "안정", opposite: "도전", axis: "라이프" },
  "새로운 경험과 짜릿한 도전": { keyword: "도전", opposite: "안정", axis: "라이프" },
  "모두에게 인정받는 성공": { keyword: "성공", opposite: "여유", axis: "성취" },
  "나만의 속도로 걷는 여유": { keyword: "여유", opposite: "성공", axis: "성취" },
  "냉철하고 합리적인 판단": { keyword: "이성", opposite: "공감", axis: "판단" },
  "깊이 공감하는 따뜻한 마음": { keyword: "공감", opposite: "이성", axis: "판단" },
  "눈에 보이는 압도적 성과": { keyword: "성과", opposite: "과정", axis: "목표" },
  "함께 걷는 과정의 유대감": { keyword: "과정", opposite: "성과", axis: "목표" },
  "누구와도 차별화된 나만의 개성": { keyword: "개성", opposite: "소속", axis: "정체성" },
  "모두와 어우러지는 소속감": { keyword: "소속", opposite: "개성", axis: "정체성" },
  "오롯이 나에게 집중하는 자유": { keyword: "자유", opposite: "헌신", axis: "관계" },
  "소중한 사람을 위한 헌신": { keyword: "헌신", opposite: "자유", axis: "관계" },
};

export default function AuctionPage() {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<any>(null);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [myBids, setMyBids] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [showEndModal, setShowEndModal] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const minBidAmount = activeItem ? activeItem.current_bid + 100 : 100;
  const bidAmountNum = parseInt(bidAmount, 10) || 0;
  const isValidBid = bidAmountNum >= minBidAmount;

  const fetchAuctionData = useCallback(async () => {
    const stored = localStorage.getItem("auction_user");
    if (!stored) return;

    const userId = JSON.parse(stored).id;

    const [itemsRes, userRes, bidsRes] = await Promise.all([
      supabase
        .from("auction_items")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single(),
      supabase
        .from("bids")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
    ]);

    if (itemsRes.data) {
      setAllItems(itemsRes.data);
      const active = itemsRes.data.find(i => i.status === "active");
      setActiveItem(active || null);
    }

    if (userRes.data) {
      setUser(userRes.data);
      localStorage.setItem("auction_user", JSON.stringify(userRes.data));
    }

    if (bidsRes.data) {
      setMyBids(bidsRes.data);
    }
  }, []);

  // 피드 열림 시 카운트다운 팝업 표시
  const handleFeedOpened = useCallback(() => {
    if (!showEndModal) {
      setShowEndModal(true);
      setCountdown(3);
    }
  }, [showEndModal]);

  usePhaseRedirect({
    currentPage: "auction",
    onSettingsFetched: () => { fetchAuctionData(); },
    onAuctionItemsChange: () => { fetchAuctionData(); },
    onBidsChange: () => { fetchAuctionData(); },
    onUsersChange: () => { fetchAuctionData(); },
    onFeedOpened: handleFeedOpened
  });

  // 카운트다운 로직
  useEffect(() => {
    if (!showEndModal) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // 카운트다운 종료 시 피드로 이동
      window.location.href = "/feed";
    }
  }, [showEndModal, countdown]);

  useEffect(() => {
    const stored = localStorage.getItem("auction_user");
    if (stored) {
      fetchAuctionData();
      if (!sessionStorage.getItem("has_seen_modal")) {
        setShowModal(true);
      }
    }

    // 실시간 구독 채널 고유화
    const channel = supabase
      .channel('auction_user_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_items' }, () => {
        fetchAuctionData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => {
        fetchAuctionData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchAuctionData();
      })
      .subscribe();

    // Realtime이 비활성화된 경우를 대비한 폴링 (2초마다)
    const pollInterval = setInterval(() => {
      fetchAuctionData();
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchAuctionData]);

  const closeIntroModal = () => {
    setShowModal(false);
    sessionStorage.setItem("has_seen_modal", "true");
  };

  const toggleItemExpand = (itemId: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // 내가 비딩한 아이템들 (finished 상태만)
  const myBiddedItems = allItems.filter(item =>
    item.status === "finished" && myBids.some(bid => bid.auction_item_id === item.id)
  );

  // 아이템별 비딩 통계 계산
  const getItemBidStats = (itemId: number) => {
    const itemBids = myBids.filter(bid => bid.auction_item_id === itemId);
    const totalAmount = itemBids.reduce((sum, bid) => sum + bid.amount, 0);
    const maxAmount = itemBids.length > 0 ? Math.max(...itemBids.map(bid => bid.amount)) : 0;
    return { itemBids, totalAmount, maxAmount, count: itemBids.length };
  };

  const handleBid = async () => {
    if (!activeItem?.id || !user?.id || loading) return;

    if (!isValidBid) {
      alert(`최소 ${minBidAmount.toLocaleString()}만원 이상 입찰해야 합니다.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auction/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: activeItem.id,
          userId: user.id,
          bidAmount: bidAmountNum
        })
      });

      const result = await res.json();

      if (!result.success) {
        if (result.error === 'Insufficient balance') {
          alert(`잔액이 부족합니다. 현재 잔액: ${result.current?.toLocaleString()}만원`);
        } else {
          alert("입찰 중 오류가 발생했습니다.");
        }
        fetchAuctionData();
        return;
      }

      const newBalance = result.newBalance;
      setUser((prev: any) => ({ ...prev, balance: newBalance }));
      localStorage.setItem("auction_user", JSON.stringify({ ...user, balance: newBalance }));

      alert(`${activeItem.title} 입찰 완료!`);
      setBidAmount("");
    } catch (err: any) {
      console.error("Bid error:", err);
      alert("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen font-serif antialiased pb-20 bg-[#FDFDFD] text-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.header
          className="w-full flex justify-between items-center py-4 sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-[#EEEBDE]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-sans font-black uppercase tracking-widest text-gray-400">참가자</span>
            <span className="text-2xl italic font-medium tracking-tight">{user.nickname}</span>
          </div>

          <div className="flex items-center gap-6">
            {/* [수정 완료] 하트 버튼: 클릭 시 피드 페이지(/feed)로 단순 이동만 수행 */}
            <motion.button
              onClick={() => router.push("/feed")}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm border border-pink-200 text-pink-500 bg-white hover:bg-pink-50 transition-all"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
            >
              <Heart size={20} fill="currentColor" />
            </motion.button>

            <div className="text-right">
              <span className="text-[10px] font-sans font-black uppercase tracking-widest text-[#7DD3FC]">나의 잔액</span>
              <div className="text-3xl font-light italic">
                {user.balance.toLocaleString()}<span className="text-sm not-italic ml-1 opacity-40">만원</span>
              </div>
            </div>
          </div>
        </motion.header>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          <motion.aside className="w-full lg:w-1/3 order-2 lg:order-1 lg:sticky lg:top-32 space-y-6">
            {/* 나의 비딩 내역 */}
            {myBiddedItems.length > 0 && (
              <div className="p-6 bg-white rounded-[2rem] border border-[#EEEBDE]">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={16} className="text-[#7DD3FC]" />
                  <h3 className="text-[11px] font-sans font-black uppercase tracking-[0.2em] italic text-[#7DD3FC]">나의 비딩 내역</h3>
                </div>
                <div className="space-y-3">
                  {myBiddedItems.map((item) => {
                    const stats = getItemBidStats(item.id);
                    const isWinner = item.highest_bidder_id === user?.id;
                    const isExpanded = expandedItems.has(item.id);

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl overflow-hidden"
                        style={{
                          backgroundColor: isWinner ? '#7DD3FC10' : '#fff',
                          border: `1px solid ${isWinner ? '#7DD3FC40' : '#EEEBDE'}`
                        }}
                      >
                        {/* 메인 정보 */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold">{item.title}</span>
                            <span
                              className={`text-[9px] font-black px-2 py-1 rounded-full text-white ${isWinner ? 'bg-[#7DD3FC]' : 'bg-gray-400'}`}
                            >
                              {isWinner ? '낙찰 성공' : '낙찰 실패'}
                            </span>
                          </div>

                          <div className="flex gap-4 text-[11px] font-sans mb-3">
                            <div>
                              <span className="text-gray-400">누적 비딩 </span>
                              <span className="font-bold">{stats.totalAmount.toLocaleString()}만</span>
                            </div>
                            <div>
                              <span className="text-gray-400">최대 비딩 </span>
                              <span className="font-bold text-[#7DD3FC]">{stats.maxAmount.toLocaleString()}만</span>
                            </div>
                          </div>

                          {/* 토글 버튼 */}
                          <button
                            onClick={() => toggleItemExpand(item.id)}
                            className="flex items-center gap-1 text-[10px] font-bold transition-colors text-gray-400"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            비딩 내역 {isExpanded ? '접기' : '보기'} ({stats.count}회)
                          </button>
                        </div>

                        {/* 비딩 상세 내역 */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-2 border-t border-[#EEEBDE]">
                                <div className="space-y-2">
                                  {stats.itemBids.map((bid, idx) => (
                                    <div
                                      key={bid.id}
                                      className="flex justify-between items-center text-[11px] font-sans py-1"
                                    >
                                      <span className="text-gray-400">{idx + 1}회차 비딩</span>
                                      <span className="font-bold">{bid.amount.toLocaleString()}만원</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* 요약 */}
                <div className="mt-4 pt-4 border-t border-[#EEEBDE] space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-sans">
                    <span className="text-gray-400">낙찰 성공</span>
                    <span className="font-bold text-[#7DD3FC]">
                      {myBiddedItems.filter(item => item.highest_bidder_id === user?.id).length}건
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-sans">
                    <span className="text-gray-400">낙찰 실패</span>
                    <span className="font-bold text-gray-400">
                      {myBiddedItems.filter(item => item.highest_bidder_id !== user?.id).length}건
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 가치관 경매 현황 */}
            <div className="p-8 bg-white rounded-[2rem] border border-[#EEEBDE]">
              <h3 className="text-[11px] font-sans font-black mb-6 uppercase tracking-[0.2em] italic text-gray-400">가치관 경매 현황</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {allItems.map((item, idx) => {
                  const isMyWin = item.status === "finished" && item.highest_bidder_id === user?.id;
                  return (
                    <motion.div
                      key={item.id}
                      className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${
                        item.status === "active" ? "shadow-sm" : item.status === "finished" && !isMyWin ? "opacity-40" : ""
                      }`}
                      style={{
                        backgroundColor: isMyWin ? '#7DD3FC15' : item.status === "active" ? '#7DD3FC08' : item.status === "finished" ? '#FAF9F6' : "white",
                        borderColor: isMyWin ? '#7DD3FC' : item.status === "active" ? '#7DD3FC20' : "transparent"
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {isMyWin ? (
                          <Trophy size={14} className="text-[#7DD3FC]" />
                        ) : (
                          <div className={`w-1.5 h-1.5 rounded-full ${item.status === "active" ? "animate-pulse bg-[#7DD3FC]" : "bg-[#EEEBDE]"}`} />
                        )}
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${item.status === "finished" && !isMyWin ? "line-through" : ""}`}>{item.title}</span>
                          {VALUE_BADGE[item.title] && (
                            <span className="text-[9px] font-sans mt-0.5 text-gray-400">
                              {VALUE_BADGE[item.title].keyword} ↔ {VALUE_BADGE[item.title].opposite}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isMyWin && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#7DD3FC] text-white">낙찰</span>}
                        <span className={`text-[11px] font-sans font-bold ${isMyWin ? 'text-[#7DD3FC]' : 'text-gray-400'}`}>{item.current_bid.toLocaleString()}만</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.aside>

          <main className="flex-1 w-full order-1 lg:order-2 flex flex-col items-center">
            <AnimatePresence mode="wait">
              {activeItem ? (
                <motion.div key={activeItem.id} className="w-full max-w-xl" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <div className="bg-white p-8 md:p-10 shadow-sm text-center relative overflow-hidden rounded-[2.5rem] border border-[#EEEBDE]">
                    <p className="text-[10px] font-sans font-black tracking-[0.4em] mb-4 uppercase italic text-[#7DD3FC]/60">Auction Now</p>
                    {VALUE_BADGE[activeItem.title] && (
                      <div className="flex items-center justify-center gap-1.5 mb-4">
                        <span className="text-xs font-sans font-bold px-2.5 py-1 rounded-full bg-[#7DD3FC]/10 text-[#7DD3FC]">
                          {VALUE_BADGE[activeItem.title].keyword}
                        </span>
                        <span className="text-[10px] font-sans text-gray-400">↔</span>
                        <span className="text-xs font-sans px-2.5 py-1 rounded-full bg-[#EEEBDE] text-gray-400">
                          {VALUE_BADGE[activeItem.title].opposite}
                        </span>
                      </div>
                    )}
                    <h1 className="text-5xl font-medium italic tracking-tighter mb-12 leading-none break-all py-2 break-keep">{activeItem.title}</h1>
                    <div className="py-10 mb-8 shadow-inner rounded-[3rem] bg-[#FAF9F6]/50 border border-[#FAF9F6]">
                      <p className="text-[10px] font-sans font-black tracking-widest mb-2 uppercase italic text-gray-400">현재 최고가</p>
                      <p className="text-5xl font-light tracking-tighter italic text-[#7DD3FC]">{activeItem.current_bid.toLocaleString()}<span className="text-sm not-italic ml-1 opacity-30">만원</span></p>
                    </div>
                    <div className="mb-6">
                      <p className="text-[10px] font-sans font-black tracking-widest mb-1 uppercase text-gray-400">나의 입찰가</p>
                      <div className={`flex items-center gap-3 bg-white border rounded-2xl px-6 py-4 transition-colors ${bidAmount && !isValidBid ? 'border-red-300' : 'border-[#EEEBDE]'}`}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={bidAmount ? parseInt(bidAmount, 10).toLocaleString() : ""}
                          onChange={(e) => setBidAmount(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder={minBidAmount.toLocaleString()}
                          className="flex-1 text-3xl font-light bg-transparent outline-none text-center tracking-tight"
                        />
                        <span className="font-sans text-sm text-gray-400">만원</span>
                      </div>
                    </div>
                    <motion.button
                      onClick={handleBid}
                      disabled={loading || !isValidBid}
                      className="w-full text-white py-7 text-sm font-bold tracking-[0.3em] uppercase shadow-2xl disabled:bg-gray-200 rounded-full bg-[#1A1A1A]"
                      whileHover={{ backgroundColor: '#7DD3FC' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? "처리 중..." : `${bidAmountNum ? bidAmountNum.toLocaleString() : minBidAmount.toLocaleString()}만원 입찰`}
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <div className="py-32 italic tracking-widest text-sm text-center font-serif text-gray-400">
                  현재 진행 중인 경매가 없습니다.<br />잠시만 기다려주세요.
                </div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* 경매 안내 모달 */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-[#1A1A1A]/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white w-full max-w-md p-10 shadow-2xl text-center rounded-[2.5rem] border-t-[10px] border-t-[#7DD3FC]" initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}>
              <h2 className="text-2xl italic tracking-tight mb-8 text-[#1A1A1A]">가치관 경매 안내</h2>
              <div className="space-y-5 text-sm font-light mb-10 leading-loose text-left px-4 font-sans text-gray-400">
                <p>• 1인당 자산 <span className="font-bold text-[#7DD3FC]">5,000만원</span>이 지급됩니다.</p>
                <p>• 현재 최고가보다 <span className="font-bold text-[#7DD3FC]">최소 100만원 이상</span> 높게 입찰해야 합니다.</p>
                <p>• 입찰 성공 시 자산이 <span className="font-bold underline text-[#1A1A1A]">즉시 차감</span>됩니다.</p>
              </div>
              <button onClick={closeIntroModal} className="w-full text-white py-5 rounded-2xl text-xs font-bold tracking-[0.2em] uppercase bg-[#1A1A1A]">확인했습니다</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 경매 종료 카운트다운 모달 */}
      <AnimatePresence>
        {showEndModal && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-lg"
            style={{ backgroundColor: 'rgba(26,26,26,0.58)' }}
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
                className="mb-8"
                initial={{ y: -20 }}
                animate={{ y: 0 }}
              >
                <Heart size={60} fill="#7DD3FC" color="#7DD3FC" className="mx-auto mb-6" />
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 italic">
                  경매가 종료되었습니다
                </h2>
                <p className="text-white/70 text-sm font-sans">
                  잠시 후 피드 페이지로 이동합니다
                </p>
              </motion.div>

              <motion.div
                key={countdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-8xl md:text-9xl font-black text-white"
                style={{ textShadow: '0 0 60px #7DD3FC' }}
              >
                {countdown}
              </motion.div>

              <motion.div
                className="mt-8 flex justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {[3, 2, 1].map((num) => (
                  <div
                    key={num}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${countdown >= num ? 'bg-[#7DD3FC]' : 'bg-white/30'}`}
                  />
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}