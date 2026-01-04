"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuctionPage() {
  const [activeItem, setActiveItem] = useState<any>(null);
  const [allItems, setAllItems] = useState<any[]>([]); // 전체 리스트용
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [wonItems, setWonItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false); // 모달 제어

  // 데이터 가져오기 함수들
  const fetchAllData = async (userId: string) => {
    // 1. 전체 가치관 리스트
    const { data: items } = await supabase.from("auction_items").select("*").order("id");
    if (items) setAllItems(items);

    // 2. 현재 활성화된 경매
    const active = items?.find(i => i.status === "active");
    setActiveItem(active || null);

    // 3. 내 낙찰 목록
    const { data: won } = await supabase
      .from("auction_items")
      .select("*")
      .eq("highest_bidder_id", userId)
      .eq("status", "finished");
    if (won) setWonItems(won);
  };

  useEffect(() => {
    const loadUser = () => {
      const stored = localStorage.getItem("auction_user");
      const visited = sessionStorage.getItem("has_seen_modal"); // 세션 동안 1회만

      if (stored) {
        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);
        fetchAllData(parsedUser.id);
        if (!visited) setShowModal(true); // 방문한 적 없으면 모달 띄움
      }
    };
    loadUser();

    // 실시간 구독
    const channel = supabase
      .channel("auction_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_items" }, 
        () => {
          const stored = localStorage.getItem("auction_user");
          if (stored) fetchAllData(JSON.parse(stored).id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const closeIntroModal = () => {
    setShowModal(false);
    sessionStorage.setItem("has_seen_modal", "true");
  };

  const handleBid = async () => {
    if (!activeItem || !user) return;
    const nextBid = activeItem.current_bid + 100;

    if (user.balance < nextBid) {
      alert(`잔액이 부족합니다! 입찰하려면 ${nextBid}만원이 필요합니다.`);
      return;
    }

    setLoading(true);
    try {
      // 1. 이전 입찰자 환불
      if (activeItem.highest_bidder_id && activeItem.highest_bidder_id !== user.id) {
        const { data: prevUser } = await supabase.from("users").select("balance").eq("id", activeItem.highest_bidder_id).single();
        if (prevUser) {
          await supabase.from("users").update({ balance: prevUser.balance + activeItem.current_bid }).eq("id", activeItem.highest_bidder_id);
        }
      }

      // 2. 아이템 업데이트
      await supabase.from("auction_items").update({ current_bid: nextBid, highest_bidder_id: user.id }).eq("id", activeItem.id);

      // 3. 내 잔액 차감
      const nextBalance = user.balance - nextBid;
      setUser({ ...user, balance: nextBalance });
      localStorage.setItem("auction_user", JSON.stringify({ ...user, balance: nextBalance }));
      await supabase.from("users").update({ balance: nextBalance }).eq("id", user.id);
      
      // 4. 입찰 로그 (컬럼명 auction_item_id 확인 완료)
      await supabase.from("bids").insert({
        auction_item_id: activeItem.id,
        user_id: user.id,
        amount: nextBid
      });

      alert("입찰 성공!");
    } catch (err: any) {
      alert("오류 발생: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 flex flex-col items-center">
      
      {/* 1. 상단 정보 바 */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8 bg-gray-900/80 backdrop-blur-md p-5 rounded-2xl border border-gray-800 sticky top-4 z-40 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Participant</span>
          <span className="text-blue-400 font-black text-xl">{user.nickname}</span>
        </div>
        <div className="text-right">
          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">My Balance</span>
          <div className="text-green-400 font-black text-2xl">{user.balance.toLocaleString()}만원</div>
        </div>
      </div>

      {/* 2. 메인 콘텐츠: 현재 경매 중인 아이템 (상단에 크게 노출) */}
      {activeItem && (
        <div className="w-full max-w-lg mb-12 animate-in fade-in zoom-in duration-500">
           <div className="bg-white text-gray-900 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(59,130,246,0.5)] text-center border-t-[12px] border-blue-600 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-xs font-black rounded-bl-xl animate-pulse">AUCTION LIVE</div>
              <p className="text-blue-600 font-black text-sm mb-2 tracking-tighter">현재 경매 진행 중!</p>
              <h1 className="text-5xl font-black mb-6 tracking-tight">{activeItem.title}</h1>
              <div className="bg-gray-100 py-4 rounded-2xl mb-6">
                <p className="text-gray-400 text-xs font-bold">현재 최고가</p>
                <p className="text-4xl font-black text-blue-600">{activeItem.current_bid}만원</p>
              </div>
              <button 
                onClick={handleBid} 
                disabled={loading}
                className="w-full bg-blue-600 text-white py-5 rounded-2xl text-2xl font-black hover:bg-blue-700 active:scale-95 transition-all shadow-xl disabled:bg-gray-300"
              >
                {loading ? "처리 중..." : "+100만원 입찰"}
              </button>
           </div>
        </div>
      )}

      {/* 3. 가치관 전체 리스트 (갤러리 형태) */}
      <div className="w-full max-w-4xl">
        <h3 className="text-xl font-black mb-6 flex items-center gap-2">
          <span className="text-blue-500">■</span> 전체 가치관 목록
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {allItems.map((item) => (
            <div key={item.id} className={`p-5 rounded-2xl border-2 transition-all ${
              item.status === 'active' ? 'bg-blue-900/20 border-blue-500 ring-2 ring-blue-500/50' : 
              item.status === 'finished' ? 'bg-gray-900/50 border-gray-800 opacity-60' : 'bg-gray-900/30 border-gray-800'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-lg">{item.title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
                  item.status === 'active' ? 'bg-blue-500 text-white animate-pulse' : 
                  item.status === 'finished' ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 text-gray-400'
                }`}>
                  {item.status.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                현재가: <span className="text-white font-bold">{item.current_bid}만원</span>
              </div>
              {item.status === 'finished' && item.highest_bidder_id === user.id && (
                <div className="mt-2 text-[10px] text-yellow-500 font-bold">🏆 내가 낙찰받음!</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. 최초 입장 모달 (Portal 스타일) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white text-gray-900 w-full max-w-md p-8 rounded-[2rem] shadow-2xl border-t-8 border-blue-600 animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black mb-4 text-blue-600 leading-tight">📢 경매 가이드</h2>
            <div className="space-y-4 text-gray-700 font-medium border-y py-6 my-6 border-gray-100">
              <p>• 1인당 자산 <span className="text-blue-600 font-bold">1,000만원</span>이 지급됩니다.</p>
              <p>• 모든 입찰은 <span className="text-blue-600 font-bold">100만원 단위</span>로만 가능합니다.</p>
              <p>• 낙찰 시 자산이 즉시 소모되며, <span className="text-red-500 font-bold">취소가 불가능</span>합니다.</p>
              <p>• 이전 입찰자가 있을 경우 해당 금액은 즉시 환불됩니다.</p>
            </div>
            <button 
              onClick={closeIntroModal}
              className="w-full bg-gray-900 text-white py-5 rounded-2xl text-xl font-black hover:bg-black transition-all active:scale-95"
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}
    </div>
  );
}