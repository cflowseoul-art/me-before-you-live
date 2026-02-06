"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Activity, Trophy, History, Settings, Play, RotateCcw, RefreshCw, Heart, LayoutDashboard } from "lucide-react";

// 가치관 → 축 키워드 뱃지 매핑
const VALUE_BADGE: Record<string, { keyword: string; opposite: string }> = {
  "원하는 것을 살 수 있는 풍요": { keyword: "풍요", opposite: "사랑" },
  "사랑하는 사람과 함께하는 시간": { keyword: "사랑", opposite: "풍요" },
  "지금 당장 누리는 확실한 행복": { keyword: "지금", opposite: "미래" },
  "더 큰 미래를 위한 인내": { keyword: "미래", opposite: "지금" },
  "안정적이고 평온한 일상": { keyword: "안정", opposite: "도전" },
  "새로운 경험과 짜릿한 도전": { keyword: "도전", opposite: "안정" },
  "모두에게 인정받는 성공": { keyword: "성공", opposite: "여유" },
  "나만의 속도로 걷는 여유": { keyword: "여유", opposite: "성공" },
  "냉철하고 합리적인 판단": { keyword: "이성", opposite: "공감" },
  "깊이 공감하는 따뜻한 마음": { keyword: "공감", opposite: "이성" },
  "눈에 보이는 압도적 성과": { keyword: "성과", opposite: "과정" },
  "함께 걷는 과정의 유대감": { keyword: "과정", opposite: "성과" },
  "누구와도 차별화된 나만의 개성": { keyword: "개성", opposite: "소속" },
  "모두와 어우러지는 소속감": { keyword: "소속", opposite: "개성" },
  "오롯이 나에게 집중하는 자유": { keyword: "자유", opposite: "헌신" },
  "소중한 사람을 위한 헌신": { keyword: "헌신", opposite: "자유" },
};

export default function AuctionDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);

  const fetchLive = useCallback(async () => {
    const [iRes, uRes, bRes] = await Promise.all([
      supabase.from("auction_items").select("*").order("id"),
      supabase.from("users").select("*"),
      supabase.from("bids").select("*").order("created_at", { ascending: false }).limit(20)
    ]);

    if (iRes.data) {
      const sorted = [...iRes.data].sort((a, b) => {
        const statusOrder: Record<string, number> = { active: 0, pending: 1, finished: 2 };
        return (statusOrder[a.status as string] ?? 3) - (statusOrder[b.status as string] ?? 3);
      });
      setItems(sorted);
    }
    
    if (uRes.data && iRes.data) {
      const ranked = uRes.data.map(user => ({
        ...user,
        wonItems: iRes.data!.filter(item => item.status === 'finished' && item.highest_bidder_id === user.id),
        leadingItems: iRes.data!.filter(item => item.status === 'active' && item.highest_bidder_id === user.id),
      })).sort((a, b) => (b.wonItems.length + b.leadingItems.length) - (a.wonItems.length + a.leadingItems.length));
      setUsers(ranked);
    }
    if (bRes.data) setBids(bRes.data);
  }, []);

  const handleStartAuction = async (itemId: number) => {
    setItems(prev => prev.map(item => {
      if (item.status === 'active') return { ...item, status: 'finished' };
      if (item.id === itemId) return { ...item, status: 'active' };
      return item;
    }));

    const currentActive = items.find(i => i.status === 'active');
    if (currentActive && currentActive.id !== itemId) {
      await supabase.from("auction_items").update({ status: 'finished' }).eq('id', currentActive.id);
    }
    await supabase.from("auction_items").update({ status: 'active' }).eq('id', itemId);
  };

  const handleFinishAuction = async (itemId: number) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, status: 'finished' } : item
    ));
    await supabase.from("auction_items").update({ status: 'finished' }).eq('id', itemId);
  };

  const handleRevertToPending = async (itemId: number) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, status: 'pending' } : item
    ));
    await supabase.from("auction_items").update({ status: 'pending' }).eq('id', itemId);
  };

  const handleOpenFeed = async () => {
    if (!confirm("피드 단계로 전환하시겠습니까?\n유저들에게 경매 종료 안내 후 피드 페이지로 이동합니다.")) return;

    try {
      const res = await fetch('/api/admin/phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'feed' })
      });

      const result = await res.json();
      if (result.success) {
        router.push("/admin/dashboard/feed");
      } else {
        alert("단계 전환 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("Phase change error:", err);
      alert("서버 오류가 발생했습니다.");
    }
  };

  const handleResetAuction = async () => {
    if (!confirm("경매를 초기화하시겠습니까?\n- 모든 입찰 내역 삭제\n- 모든 아이템 pending 상태로\n- 참가자 잔액 1000만원으로 복구")) return;

    try {
      await supabase.from("bids").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("auction_items").update({
        status: 'pending',
        current_bid: 0,
        highest_bidder_id: null
      }).neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("users").update({ balance: 1000 }).neq("id", "00000000-0000-0000-0000-000000000000");

      alert("경매가 초기화되었습니다.");
      fetchLive();
    } catch (err) {
      console.error("Reset error:", err);
      alert("초기화 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    fetchLive();
    const channel = supabase.channel("admin_auction_dashboard").on("postgres_changes", { event: "*", schema: "public" }, fetchLive).subscribe();

    // Realtime이 비활성화된 경우를 대비한 폴링 (2초마다)
    const pollInterval = setInterval(() => {
      fetchLive();
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchLive]);

  const activeItem = items.find(i => i.status === 'active');
  const pendingItems = items.filter(i => i.status === 'pending');
  const finishedItems = items.filter(i => i.status === 'finished');

  return (
    <main className="h-screen w-full bg-[#FDFDFD] text-[#1A1A1A] antialiased flex flex-col overflow-hidden">
      {/* 1. Header Navigation */}
      <nav className="h-[50px] md:h-[70px] border-b border-[#EEEBDE] px-4 md:px-10 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <h1 className="text-sm md:text-xl font-serif italic font-black cursor-pointer" onClick={() => router.push("/admin")}>Me Before You</h1>
          <span className="hidden sm:inline text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] md:tracking-[0.4em] text-[#A52A2A] bg-[#FDF8F8] px-2 md:px-3 py-1 rounded-full border border-[#A52A2A]/10">Admin</span>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          {/* 하트 버튼: 피드 단계로 전환 (유저들에게 경매 종료 알림) */}
          <motion.button
            onClick={handleOpenFeed}
            className="p-2 md:p-2.5 rounded-full border border-pink-200 hover:bg-pink-50 text-pink-500 transition-all shadow-sm"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            title="피드 단계로 전환"
          >
            <Heart size={14} className="md:w-4 md:h-4" fill="currentColor" />
          </motion.button>

          <button onClick={handleResetAuction} className="p-2 md:p-2.5 rounded-full border border-red-200 hover:bg-red-50 text-red-500 transition-all" title="경매 초기화"><RefreshCw size={14} className="md:w-4 md:h-4" /></button>
          <button onClick={() => router.push("/admin/settings")} className="p-2 md:p-2.5 rounded-full border border-[#EEEBDE] hover:bg-[#F0EDE4] transition-all"><Settings size={14} className="md:w-4 md:h-4" /></button>
        </div>
      </nav>

      {/* 2. Main Content Grid */}
      <div className="flex-1 flex flex-col p-2 md:p-6 gap-2 md:gap-4 overflow-hidden">

        {/* TOP: Active Now | Inventory Flow */}
        <div className="h-[30%] md:h-[35%] grid grid-cols-2 gap-2 md:gap-4 shrink-0">
          <section className="flex flex-col min-h-0">
            <h3 className="text-[7px] md:text-[10px] font-black uppercase tracking-wider md:tracking-[0.3em] mb-1 text-[#A52A2A]">Active Now</h3>
            <div className="flex-1 bg-white rounded-xl md:rounded-[2rem] border border-[#EEEBDE] shadow-lg p-2 md:p-6 flex flex-col justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                {activeItem ? (
                  <motion.div key={activeItem.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-1 md:gap-3">
                    {VALUE_BADGE[activeItem.title] && (
                      <div className="flex items-center gap-1 md:gap-1.5 mb-1 md:mb-2">
                        <span className="text-[8px] md:text-xs font-sans font-bold px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full bg-[#A52A2A]/10 text-[#A52A2A]">
                          {VALUE_BADGE[activeItem.title].keyword}
                        </span>
                        <span className="text-[8px] md:text-[10px] font-sans text-[#A52A2A]/30">↔</span>
                        <span className="text-[8px] md:text-xs font-sans px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full bg-[#EEEBDE] text-[#999]">
                          {VALUE_BADGE[activeItem.title].opposite}
                        </span>
                      </div>
                    )}
                    <h2 className="text-[11px] sm:text-base md:text-xl lg:text-2xl font-serif italic font-black line-clamp-2">{activeItem.title}</h2>
                    <p className="text-base sm:text-lg md:text-2xl lg:text-3xl font-black">{activeItem.current_bid?.toLocaleString()}<span className="text-[8px] md:text-xs font-serif italic ml-0.5 opacity-40">만</span></p>
                    <button onClick={() => handleFinishAuction(activeItem.id)} className="px-2 py-1 md:px-6 md:py-3 bg-[#A52A2A] text-white rounded-md md:rounded-xl text-[7px] md:text-[9px] font-black uppercase tracking-wider self-start">Finish</button>
                  </motion.div>
                ) : (
                  <div className="text-center opacity-20 italic font-serif text-[10px] md:text-sm">Stage Empty</div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <section className="flex flex-col min-h-0">
            <h3 className="text-[7px] md:text-[10px] font-black uppercase tracking-wider md:tracking-[0.3em] mb-1 text-gray-400">Inventory</h3>
            <div className="flex-1 bg-[#F0EDE4]/50 rounded-xl md:rounded-[2rem] border border-[#EEEBDE] p-1.5 md:p-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-1 md:space-y-2">
                {pendingItems.map((item) => (
                  <div key={item.id} className="bg-white p-1.5 md:p-3 rounded-md md:rounded-lg flex justify-between items-center gap-1">
                    <span className="font-serif italic text-[9px] md:text-sm truncate flex-1">{item.title}</span>
                    <button onClick={() => handleStartAuction(item.id)} className="px-1.5 py-0.5 md:px-3 md:py-1.5 bg-[#1A1A1A] text-white rounded text-[6px] md:text-[8px] font-black uppercase shrink-0 flex items-center gap-0.5"><Play size={6} className="md:hidden" fill="currentColor" /><Play size={8} className="hidden md:block" fill="currentColor" /><span className="hidden sm:inline">Start</span></button>
                  </div>
                ))}
                {finishedItems.map((item) => (
                  <div key={item.id} className="bg-white/40 p-1.5 md:p-3 rounded-md md:rounded-lg border border-dashed border-[#EEEBDE] flex justify-between items-center gap-1">
                    <span className="font-serif italic text-[9px] md:text-sm text-gray-300 truncate flex-1">{item.title}</span>
                    <div className="flex gap-1 md:gap-2 shrink-0">
                      <button onClick={() => handleRevertToPending(item.id)} className="text-gray-400 p-0.5"><RotateCcw size={10} className="md:hidden" /><RotateCcw size={14} className="hidden md:block" /></button>
                      <button onClick={() => handleStartAuction(item.id)} className="text-[6px] md:text-[8px] font-black uppercase text-[#A52A2A]">Re</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* MIDDLE: Live Bid Stream */}
        <section className="flex-1 flex flex-col min-h-0">
          <h3 className="text-[7px] md:text-[10px] font-black uppercase tracking-wider md:tracking-[0.3em] mb-1 text-[#A52A2A]">Live Bids</h3>
          <div className="flex-1 bg-[#1A1A1A] rounded-xl md:rounded-[2rem] shadow-xl p-2 md:p-4 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar-dark pr-1 md:pr-3 space-y-1 md:space-y-2">
              <AnimatePresence mode="popLayout">
                {bids.slice(0, 10).map((bid, idx) => (
                  <motion.div key={bid.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: idx === 0 ? 1 : 0.3 }} className={`flex justify-between items-center pb-1 md:pb-2 border-b border-white/5 ${idx === 0 ? 'text-white' : 'text-white/30'}`}>
                    <p className="text-[10px] sm:text-xs md:text-base font-serif italic font-bold truncate flex-1">{users.find(u => u.id === bid.user_id)?.nickname || 'Guest'}</p>
                    <p className="text-sm sm:text-base md:text-xl font-black tracking-tight shrink-0">{bid.amount.toLocaleString()}<span className="text-[6px] md:text-xs font-normal opacity-50 ml-0.5">만</span></p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* BOTTOM: Identity Ranking */}
        <section className="shrink-0">
          <h3 className="text-[7px] md:text-[10px] font-black uppercase tracking-wider md:tracking-[0.3em] mb-1 text-gray-400">Ranking</h3>
          <div className="bg-[#F0EDE4] rounded-xl md:rounded-2xl p-2 md:p-3 flex flex-wrap gap-1 md:gap-2 shadow-inner">
            {users.slice(0, 10).map((u, idx) => (
              <div key={u.id} className="flex items-center gap-1 md:gap-1.5 bg-white/60 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5">
                <span className="text-[10px] md:text-sm font-serif italic text-[#A52A2A]/60 font-bold">{(idx + 1)}</span>
                <span className="font-bold text-[9px] md:text-xs whitespace-nowrap">{u.nickname}</span>
                <span className="text-[7px] md:text-[9px] font-black text-[#A52A2A]/40">{u.wonItems.length}W</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #EEEBDE; border-radius: 10px; }
        .custom-scrollbar-dark::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </main>
  );
}