"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react"; // 하트 아이콘 추가
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { usePhaseRedirect } from "@/lib/hooks/usePhaseRedirect";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

const { colors, borderRadius } = DESIGN_TOKENS;

export default function AuctionPage() {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<any>(null);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [bidAmount, setBidAmount] = useState<string>("");

  const minBidAmount = activeItem ? activeItem.current_bid + 100 : 100;
  const bidAmountNum = parseInt(bidAmount, 10) || 0;
  const isValidBid = bidAmountNum >= minBidAmount;

  const fetchAuctionData = useCallback(async () => {
    const stored = localStorage.getItem("auction_user");
    if (!stored) return;

    const userId = JSON.parse(stored).id;

    const { data: itemsData } = await supabase
      .from("auction_items")
      .select("*")
      .order("created_at", { ascending: true }); // 생성 순으로 정렬

    if (itemsData) {
      setAllItems(itemsData);
      // [중요] 관리자 대시보드 상태값인 'progress'와 일치시킴
      const active = itemsData.find(i => i.status === "progress");
      setActiveItem(active || null);
    }

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userData) {
      setUser(userData);
      localStorage.setItem("auction_user", JSON.stringify(userData));
    }
  }, []);

  usePhaseRedirect({
    currentPage: "auction",
    onSettingsFetched: () => { fetchAuctionData(); },
    onAuctionItemsChange: () => { fetchAuctionData(); },
    onBidsChange: () => { fetchAuctionData(); },
    onUsersChange: () => { fetchAuctionData(); }
  });

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAuctionData]);

  const closeIntroModal = () => {
    setShowModal(false);
    sessionStorage.setItem("has_seen_modal", "true");
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
    <div className="min-h-screen font-serif antialiased pb-20" style={{ backgroundColor: colors.background, color: colors.primary }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.header
          className="w-full flex justify-between items-center py-8 mb-12 sticky top-0 z-40 backdrop-blur-md"
          style={{ borderBottom: `1px solid ${colors.soft}`, backgroundColor: `${colors.background}cc` }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-sans font-black uppercase tracking-widest" style={{ color: colors.muted }}>참가자</span>
            <span className="text-2xl italic font-medium tracking-tight">{user.nickname}</span>
          </div>

          <div className="flex items-center gap-6">
            {/* [수정 완료] 하트 버튼: 클릭 시 피드 페이지(/feed)로 단순 이동만 수행 */}
            <motion.button
              onClick={() => router.push("/feed")}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border transition-all"
              style={{ borderColor: colors.soft, color: colors.accent, backgroundColor: 'white' }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
            >
              <Heart size={20} fill="currentColor" />
            </motion.button>

            <div className="text-right">
              <span className="text-[10px] font-sans font-black uppercase tracking-widest" style={{ color: colors.accent }}>나의 잔액</span>
              <div className="text-3xl font-light italic">
                {user.balance.toLocaleString()}<span className="text-sm not-italic ml-1 opacity-40">만원</span>
              </div>
            </div>
          </div>
        </motion.header>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          <motion.aside className="w-full lg:w-1/3 order-2 lg:order-1 lg:sticky lg:top-32">
            <div className="p-8" style={{ backgroundColor: `${colors.paper}50`, borderRadius: "2.5rem", border: `1px solid ${colors.soft}` }}>
              <h3 className="text-[11px] font-sans font-black mb-6 uppercase tracking-[0.2em] italic" style={{ color: colors.muted }}>가치관 경매 현황</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {allItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${
                      item.status === "progress" ? "shadow-sm" : item.status === "finished" ? "opacity-40" : ""
                    }`}
                    style={{
                      backgroundColor: item.status === "progress" ? `${colors.accent}08` : item.status === "finished" ? colors.paper : "white",
                      borderColor: item.status === "progress" ? `${colors.accent}20` : "transparent"
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.status === "progress" ? "animate-pulse" : ""}`} style={{ backgroundColor: item.status === "progress" ? colors.accent : colors.soft }} />
                      <span className={`text-sm font-medium ${item.status === "finished" ? "line-through" : ""}`}>{item.title}</span>
                    </div>
                    <span className="text-[11px] font-sans font-bold" style={{ color: colors.muted }}>{item.current_bid.toLocaleString()}만</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.aside>

          <main className="flex-1 w-full order-1 lg:order-2 flex flex-col items-center">
            <AnimatePresence mode="wait">
              {activeItem ? (
                <motion.div key={activeItem.id} className="w-full max-w-xl" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <div className="bg-white p-12 shadow-[0_40px_100px_rgba(0,0,0,0.03)] text-center relative overflow-hidden" style={{ borderRadius: "3.5rem", border: `1px solid ${colors.soft}` }}>
                    <p className="text-[10px] font-sans font-black tracking-[0.4em] mb-4 uppercase italic" style={{ color: `${colors.accent}99` }}>Auction Now</p>
                    <h1 className="text-5xl font-medium italic tracking-tighter mb-12 leading-none break-all py-2 break-keep">{activeItem.title}</h1>
                    <div className="py-10 mb-8 shadow-inner" style={{ backgroundColor: `${colors.paper}50`, borderRadius: borderRadius.onboarding, border: `1px solid ${colors.paper}` }}>
                      <p className="text-[10px] font-sans font-black tracking-widest mb-2 uppercase italic" style={{ color: colors.muted }}>현재 최고가</p>
                      <p className="text-5xl font-light tracking-tighter italic" style={{ color: colors.accent }}>{activeItem.current_bid.toLocaleString()}<span className="text-sm not-italic ml-1 opacity-30">만원</span></p>
                    </div>
                    <div className="mb-6">
                      <p className="text-[10px] font-sans font-black tracking-widest mb-1 uppercase" style={{ color: colors.muted }}>나의 입찰가</p>
                      <div className={`flex items-center gap-3 bg-white border rounded-2xl px-6 py-4 transition-colors`} style={{ borderColor: bidAmount && !isValidBid ? "#fca5a5" : colors.soft }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={bidAmount ? parseInt(bidAmount, 10).toLocaleString() : ""}
                          onChange={(e) => setBidAmount(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder={minBidAmount.toLocaleString()}
                          className="flex-1 text-3xl font-light bg-transparent outline-none text-center tracking-tight"
                        />
                        <span className="font-sans text-sm" style={{ color: colors.muted }}>만원</span>
                      </div>
                    </div>
                    <motion.button
                      onClick={handleBid}
                      disabled={loading || !isValidBid}
                      className="w-full text-white py-7 text-sm font-bold tracking-[0.3em] uppercase shadow-2xl disabled:bg-gray-200"
                      style={{ backgroundColor: colors.primary, borderRadius: "2.2rem" }}
                      whileHover={{ backgroundColor: colors.accent }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? "처리 중..." : `${bidAmountNum ? bidAmountNum.toLocaleString() : minBidAmount.toLocaleString()}만원 입찰`}
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <div className="py-32 italic tracking-widest text-sm text-center font-serif" style={{ color: colors.muted }}>
                  현재 진행 중인 경매가 없습니다.<br />잠시만 기다려주세요.
                </div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md" style={{ backgroundColor: `${colors.primary}80` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white w-full max-w-md p-10 shadow-2xl text-center" style={{ borderRadius: "3.5rem", borderTop: `10px solid ${colors.accent}` }} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}>
              <h2 className="text-2xl italic tracking-tight mb-8" style={{ color: colors.primary }}>가치관 경매 안내</h2>
              <div className="space-y-5 text-sm font-light mb-10 leading-loose text-left px-4 font-sans" style={{ color: colors.muted }}>
                <p>• 1인당 자산 <span className="font-bold" style={{ color: colors.accent }}>1,000만원</span>이 지급됩니다.</p>
                <p>• 현재 최고가보다 <span className="font-bold" style={{ color: colors.accent }}>최소 100만원 이상</span> 높게 입찰해야 합니다.</p>
                <p>• 입찰 성공 시 자산이 <span className="font-bold underline" style={{ color: colors.primary }}>즉시 차감</span>됩니다.</p>
              </div>
              <button onClick={closeIntroModal} className="w-full text-white py-5 rounded-2xl text-xs font-bold tracking-[0.2em] uppercase" style={{ backgroundColor: colors.primary }}>확인했습니다</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}