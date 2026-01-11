"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuctionPage() {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<any>(null);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [wonItems, setWonItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  // 데이터 통합 로드 (기존 fetchAllData 구조 복구)
  const fetchAllData = async (userId: string) => {
    // 1. 전체 가치관 리스트
    const { data: items } = await supabase.from("auction_items").select("*").order("id");
    if (items) {
      setAllItems(items);
      // 2. 현재 활성화된 경매 매칭
      const active = items.find(i => i.status === "active");
      setActiveItem(active || null);

      // 3. 모든 경매 종료 시 피드로 이동
      const allFinished = items.length > 0 && items.every(i => i.status === "finished");
      if (allFinished) {
        router.push("/feed");
        return;
      }
    }

    // 3. 내 최신 정보 및 낙찰 목록 동기화
    const { data: userData } = await supabase.from("users").select("*").eq("id", userId).single();
    if (userData) {
      setUser(userData);
      localStorage.setItem("auction_user", JSON.stringify(userData));
    }
  };

  useEffect(() => {
    const loadUser = () => {
      const stored = localStorage.getItem("auction_user");
      const visited = sessionStorage.getItem("has_seen_modal");

      if (stored) {
        const parsedUser = JSON.parse(stored);
        fetchAllData(parsedUser.id);
        if (!visited) setShowModal(true);
      }
    };
    loadUser();

    // 실시간 리스너 (기존 로직 복구)
    const channel = supabase.channel("auction_realtime_v10")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        const stored = localStorage.getItem("auction_user");
        if (stored) fetchAllData(JSON.parse(stored).id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const closeIntroModal = () => {
    setShowModal(false);
    sessionStorage.setItem("has_seen_modal", "true");
  };

  // [로직 수정] 입찰 성공 시 즉시 내 잔액 차감 반영
  const handleBid = async () => {
    if (!activeItem?.id || !user?.id || loading) return;

    const nextBid = activeItem.current_bid + 100;

    if (user.balance < nextBid) {
      alert(`잔액이 부족합니다. 입찰하려면 ${nextBid}만원이 필요합니다.`);
      return;
    }

    setLoading(true);
    try {
      // 0. 경매 상태 재확인 (race condition 방지)
      const { data: currentItem } = await supabase
        .from("auction_items")
        .select("status, current_bid")
        .eq("id", activeItem.id)
        .single();

      if (!currentItem || currentItem.status !== 'active') {
        alert("이 경매는 이미 종료되었습니다.");
        fetchAllData(user.id);
        return;
      }

      // 입찰가가 변경되었는지 확인
      if (currentItem.current_bid !== activeItem.current_bid) {
        alert("다른 참가자가 먼저 입찰했습니다. 다시 시도해주세요.");
        fetchAllData(user.id);
        return;
      }

      // 1. 최고가 및 낙찰자 업데이트
      await supabase.from("auction_items").update({
        current_bid: nextBid,
        highest_bidder_id: user.id
      }).eq("id", activeItem.id);

      // 2. 입찰 로그 기록
      await supabase.from("bids").insert({
        auction_item_id: activeItem.id,
        user_id: user.id,
        amount: nextBid
      });

      // 3. 내 잔액 즉시 차감 로직 추가
      const newBalance = user.balance - nextBid;
      await supabase.from("users").update({ balance: newBalance }).eq("id", user.id);

      alert(`${activeItem.title}에 입찰했습니다!`);
      fetchAllData(user.id);
    } catch (err: any) {
      alert("입찰 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif antialiased pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* 1. 상단 정보 바 (기존 상단 바 구조 + 톤앤매너) */}
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
          
          {/* 2. 왼쪽 사이드바: 전체 가치관 현황판 (복구) */}
          <aside className="w-full lg:w-1/3 order-2 lg:order-1 lg:sticky lg:top-32">
            <div className="bg-[#FCF9F2]/50 rounded-[2.5rem] p-8 border border-[#EEEBDE]">
              <h3 className="text-[11px] font-sans font-black mb-6 text-gray-300 uppercase tracking-[0.2em] italic">가치관 경매 현황</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {allItems.map((item) => (
                  <div key={item.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${
                    item.status === 'active' ? 'bg-[#FDF8F8] border-[#A52A2A]/20 shadow-sm' : 
                    item.status === 'finished' ? 'bg-gray-50 border-transparent opacity-40' : 'bg-white border-[#F0EDE4]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-[#A52A2A] animate-pulse' : 'bg-gray-200'}`}></div>
                      <span className={`text-sm font-medium ${item.status === 'finished' ? 'text-gray-400 line-through' : 'text-[#1A1A1A]'}`}>{item.title}</span>
                    </div>
                    <span className="text-[11px] font-sans font-bold text-gray-400">{item.current_bid}만</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* 3. 메인 콘텐츠: 중앙 경매 카드 (기존 구조 + 가독성) */}
          <main className="flex-1 w-full order-1 lg:order-2 flex flex-col items-center">
            {activeItem ? (
              <div className="w-full max-w-xl animate-in fade-in zoom-in duration-1000">
                <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.03)] border border-[#EEEBDE] text-center relative overflow-hidden">
                  <div className="h-[1px] w-20 bg-[#A52A2A] mx-auto mb-10 opacity-30"></div>
                  <p className="text-[10px] font-sans font-black tracking-[0.4em] text-[#A52A2A]/60 mb-4 uppercase italic">Auction Now</p>
                  
                  <h1 className="text-5xl font-medium italic tracking-tighter mb-12 leading-none break-all py-2">
                    {activeItem.title}
                  </h1>

                  <div className="bg-[#FCF9F2]/50 py-10 rounded-[3rem] border border-[#F0EDE4] mb-12 shadow-inner">
                    <p className="text-[10px] font-sans font-black tracking-widest text-gray-300 mb-2 uppercase italic">현재 최고가</p>
                    <p className="text-5xl font-light text-[#A52A2A] tracking-tighter italic">
                      {activeItem.current_bid}<span className="text-sm not-italic ml-1 opacity-30 font-sans font-normal">만원</span>
                    </p>
                  </div>

                  <button 
                    onClick={handleBid}
                    disabled={loading}
                    className="w-full bg-[#1A1A1A] text-white py-7 rounded-[2.2rem] text-sm font-bold tracking-[0.3em] uppercase shadow-2xl active:scale-95 transition-all hover:bg-[#A52A2A] disabled:bg-gray-100"
                  >
                    {loading ? "처리 중..." : "+100만원 입찰하기"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-32 text-gray-300 italic tracking-widest text-sm text-center">
                현재 진행 중인 경매가 없습니다.<br/>잠시만 기다려주세요.
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 4. 최초 입장 모달 (기존 내용 유지 + 디자인 최적화) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1A1A1A]/50 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white text-[#1A1A1A] w-full max-w-md p-10 rounded-[3.5rem] shadow-2xl border-t-[10px] border-[#A52A2A] text-center">
            <h2 className="text-2xl italic tracking-tight mb-8">가치관 경매 안내</h2>
            <div className="space-y-5 text-sm font-light text-gray-500 mb-10 leading-loose text-left px-4">
              <p>• 1인당 자산 <span className="text-[#A52A2A] font-bold">1,000만원</span>이 지급됩니다.</p>
              <p>• 모든 입찰은 <span className="text-[#A52A2A] font-bold">100만원 단위</span>로만 가능합니다.</p>
              <p>• 입찰 성공 시 자산이 <span className="text-gray-900 font-bold underline decoration-[#A52A2A]/30">즉시 차감</span>됩니다.</p>
              <p>• 이전 입찰자가 있을 경우 해당 금액은 즉시 환불됩니다.</p>
            </div>
            <button 
              onClick={closeIntroModal}
              className="w-full bg-[#1A1A1A] text-white py-5 rounded-2xl text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#A52A2A] transition-all"
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}
    </div>
  );
}