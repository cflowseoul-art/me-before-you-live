"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePhaseRedirect } from "@/lib/hooks/usePhaseRedirect";

export default function AuctionPage() {
  const [activeItem, setActiveItem] = useState<any>(null);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [bidAmount, setBidAmount] = useState<string>("");

  // 최소 입찰가 계산 (현재 최고가 + 100만원)
  const minBidAmount = activeItem ? activeItem.current_bid + 100 : 100;
  const bidAmountNum = parseInt(bidAmount, 10) || 0;
  const isValidBid = bidAmountNum >= minBidAmount;

  // Fetch auction data
  const fetchAuctionData = useCallback(async () => {
    const stored = localStorage.getItem("auction_user");
    if (!stored) return;

    const userId = JSON.parse(stored).id;

    const { data: itemsData } = await supabase
      .from("auction_items")
      .select("*")
      .order("id");

    if (itemsData) {
      setAllItems(itemsData);
      const active = itemsData.find(i => i.status === "active");
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

  // Use unified phase redirect hook with all Realtime listeners
  usePhaseRedirect({
    currentPage: "auction",
    onSettingsFetched: () => {
      // Settings fetched and no redirect needed - load auction data
      fetchAuctionData();
    },
    onAuctionItemsChange: () => {
      // Auction items changed - refresh data
      fetchAuctionData();
    },
    onBidsChange: () => {
      // Bids changed - refresh data
      fetchAuctionData();
    },
    onUsersChange: () => {
      // Users changed (balance updated) - refresh data
      fetchAuctionData();
    }
  });

  // Initial load and modal check
  useEffect(() => {
    const stored = localStorage.getItem("auction_user");
    if (stored) {
      fetchAuctionData();
      if (!sessionStorage.getItem("has_seen_modal")) {
        setShowModal(true);
      }
    }
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

    if (user.balance < bidAmountNum) {
      alert(`잔액이 부족합니다. 현재 잔액: ${user.balance.toLocaleString()}만원`);
      return;
    }

    setLoading(true);
    try {
      // Check current state before bidding (including previous bidder info)
      const { data: currentItem } = await supabase
        .from("auction_items")
        .select("status, current_bid, highest_bidder_id")
        .eq("id", activeItem.id)
        .single();

      if (!currentItem || currentItem.status !== "active") {
        alert("이 경매는 이미 종료되었습니다.");
        fetchAuctionData();
        return;
      }

      // 다른 사용자가 먼저 입찰한 경우 - 최소 입찰가 재계산
      const newMinBid = currentItem.current_bid + 100;
      if (bidAmountNum < newMinBid) {
        alert(`다른 참가자가 먼저 입찰했습니다. 최소 ${newMinBid.toLocaleString()}만원 이상 입찰해야 합니다.`);
        fetchAuctionData();
        return;
      }

      // 이전 입찰자가 있으면 환불 처리
      if (currentItem.highest_bidder_id && currentItem.current_bid > 0) {
        const previousBidderId = currentItem.highest_bidder_id;
        const refundAmount = currentItem.current_bid;

        // 이전 입찰자의 현재 잔액 조회
        const { data: previousBidder } = await supabase
          .from("users")
          .select("balance")
          .eq("id", previousBidderId)
          .single();

        if (previousBidder) {
          // 이전 입찰자에게 환불
          await supabase
            .from("users")
            .update({ balance: previousBidder.balance + refundAmount })
            .eq("id", previousBidderId);

          console.log(`환불 완료: ${previousBidderId}에게 ${refundAmount}만원 환불`);
        }
      }

      // Update auction item
      await supabase
        .from("auction_items")
        .update({ current_bid: bidAmountNum, highest_bidder_id: user.id })
        .eq("id", activeItem.id);

      // Record bid
      await supabase
        .from("bids")
        .insert({ auction_item_id: activeItem.id, user_id: user.id, amount: bidAmountNum });

      // Update new bidder's balance (deduct bid amount)
      const newBalance = user.balance - bidAmountNum;
      await supabase
        .from("users")
        .update({ balance: newBalance })
        .eq("id", user.id);

      alert(`${activeItem.title}에 ${bidAmountNum.toLocaleString()}만원으로 입찰 완료!`);
      setBidAmount("");
      fetchAuctionData();
    } catch (err: any) {
      console.error("Bid error:", err);
      alert("입찰 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif antialiased pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <header className="w-full flex justify-between items-center py-8 mb-12 border-b border-[#EEEBDE] sticky top-0 bg-[#FDFDFD]/80 backdrop-blur-md z-40">
          <div className="flex flex-col">
            <span className="text-[10px] font-sans font-black text-gray-300 uppercase tracking-widest">참가자</span>
            <span className="text-2xl italic font-medium tracking-tight text-[#1A1A1A]">{user.nickname}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-sans font-black text-[#A52A2A] uppercase tracking-widest">나의 잔액</span>
            <div className="text-3xl font-light italic text-[#1A1A1A]">
              {user.balance.toLocaleString()}<span className="text-sm not-italic ml-1 opacity-40">만원</span>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          <aside className="w-full lg:w-1/3 order-2 lg:order-1 lg:sticky lg:top-32">
            <div className="bg-[#FCF9F2]/50 rounded-[2.5rem] p-8 border border-[#EEEBDE]">
              <h3 className="text-[11px] font-sans font-black mb-6 text-gray-300 uppercase tracking-[0.2em] italic">가치관 경매 현황</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {allItems.map((item) => (
                  <div key={item.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${
                    item.status === "active" ? "bg-[#FDF8F8] border-[#A52A2A]/20 shadow-sm" :
                    item.status === "finished" ? "bg-gray-50 border-transparent opacity-40" : "bg-white border-[#F0EDE4]"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.status === "active" ? "bg-[#A52A2A] animate-pulse" : "bg-gray-200"}`}></div>
                      <span className={`text-sm font-medium ${item.status === "finished" ? "text-gray-400 line-through" : "text-[#1A1A1A]"}`}>{item.title}</span>
                    </div>
                    <span className="text-[11px] font-sans font-bold text-gray-400">{item.current_bid.toLocaleString()}만</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1 w-full order-1 lg:order-2 flex flex-col items-center">
            {activeItem ? (
              <div className="w-full max-w-xl animate-in fade-in zoom-in duration-1000">
                <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.03)] border border-[#EEEBDE] text-center relative overflow-hidden">
                  <div className="h-[1px] w-20 bg-[#A52A2A] mx-auto mb-10 opacity-30"></div>
                  <p className="text-[10px] font-sans font-black tracking-[0.4em] text-[#A52A2A]/60 mb-4 uppercase italic">Auction Now</p>
                  <h1 className="text-5xl font-medium italic tracking-tighter mb-12 leading-none break-all py-2">{activeItem.title}</h1>
                  <div className="bg-[#FCF9F2]/50 py-10 rounded-[3rem] border border-[#F0EDE4] mb-8 shadow-inner">
                    <p className="text-[10px] font-sans font-black tracking-widest text-gray-300 mb-2 uppercase italic">현재 최고가</p>
                    <p className="text-5xl font-light text-[#A52A2A] tracking-tighter italic">
                      {activeItem.current_bid.toLocaleString()}<span className="text-sm not-italic ml-1 opacity-30 font-sans font-normal">만원</span>
                    </p>
                  </div>
                  <div className="mb-6">
                    <p className="text-[10px] font-sans font-black tracking-widest text-gray-400 mb-1 uppercase">나의 입찰가</p>
                    <p className="text-[10px] font-sans text-gray-300 mb-3">
                      최소 <span className="text-[#A52A2A] font-bold">{minBidAmount.toLocaleString()}만원</span> 이상
                    </p>
                    <div className={`flex items-center gap-3 bg-white border rounded-2xl px-6 py-4 transition-colors ${
                      bidAmount && !isValidBid ? "border-red-300" : "border-[#EEEBDE]"
                    }`}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={bidAmount ? parseInt(bidAmount, 10).toLocaleString() : ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, "");
                          setBidAmount(value);
                        }}
                        placeholder={minBidAmount.toLocaleString()}
                        className="flex-1 text-3xl font-light text-[#1A1A1A] bg-transparent outline-none text-center tracking-tight"
                      />
                      <span className="text-gray-400 font-sans text-sm whitespace-nowrap">만원</span>
                    </div>
                    {bidAmount && !isValidBid && (
                      <p className="text-[10px] font-sans text-red-400 mt-2 text-center">
                        최소 입찰가보다 낮습니다
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleBid}
                    disabled={loading || !isValidBid}
                    className="w-full bg-[#1A1A1A] text-white py-7 rounded-[2.2rem] text-sm font-bold tracking-[0.3em] uppercase shadow-2xl active:scale-95 transition-all hover:bg-[#A52A2A] disabled:bg-gray-200 disabled:cursor-not-allowed"
                  >
                    {loading ? "처리 중..." : `${bidAmountNum ? bidAmountNum.toLocaleString() : minBidAmount.toLocaleString()}만원 입찰`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-32 text-gray-300 italic tracking-widest text-sm text-center font-serif">
                현재 진행 중인 경매가 없습니다.<br/>잠시만 기다려주세요.
              </div>
            )}
          </main>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1A1A1A]/50 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white text-[#1A1A1A] w-full max-w-md p-10 rounded-[3.5rem] shadow-2xl border-t-[10px] border-[#A52A2A] text-center">
            <h2 className="text-2xl italic tracking-tight mb-8">가치관 경매 안내</h2>
            <div className="space-y-5 text-sm font-light text-gray-500 mb-10 leading-loose text-left px-4 font-sans">
              <p>• 1인당 자산 <span className="text-[#A52A2A] font-bold">1,000만원</span>이 지급됩니다.</p>
              <p>• 현재 최고가보다 <span className="text-[#A52A2A] font-bold">최소 100만원 이상</span> 높게 입찰해야 합니다.</p>
              <p>• 입찰 성공 시 자산이 <span className="text-gray-900 font-bold underline decoration-[#A52A2A]/30">즉시 차감</span>됩니다.</p>
              <p>• 이전 입찰자가 있을 경우 해당 금액은 즉시 환불됩니다.</p>
            </div>
            <button onClick={closeIntroModal} className="w-full bg-[#1A1A1A] text-white py-5 rounded-2xl text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#A52A2A] transition-all">확인했습니다</button>
          </div>
        </div>
      )}
    </div>
  );
}
