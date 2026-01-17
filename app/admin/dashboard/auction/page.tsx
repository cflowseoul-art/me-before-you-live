"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Settings, Activity, Trophy, History, CheckCircle2, Menu, X } from "lucide-react";

export default function AuctionDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const finishAuctionAndOpenFeed = async () => {
    const isConfirm = confirm(
      "📢 모든 경매 세션을 종료하고 피드 투표를 시작하시겠습니까?\n유저들은 즉시 갤러리(피드) 화면으로 리다이렉트됩니다."
    );
    if (!isConfirm) return;

    await supabase.from("auction_items").update({ status: 'finished' }).eq('status', 'active');
    const { error } = await supabase.from("system_settings").update({ value: "true" }).eq("key", "is_feed_open");

    if (error) {
      alert("오류 발생: " + error.message);
    } else {
      alert("✅ 옥션 종료! 피드로 이동합니다.");
      router.push("/admin/dashboard/feed");
    }
  };

  const fetchLive = useCallback(async () => {
    const [iRes, uRes, bRes] = await Promise.all([
      supabase.from("auction_items").select("*").order("id"),
      supabase.from("users").select("*"),
      supabase.from("bids").select("*").order("created_at", { ascending: false }).limit(15)
    ]);

    if (iRes.data) {
      // Session Queue 정렬: active(상단) → pending(중간) → finished(하단)
      const sorted = [...iRes.data].sort((a, b) => {
        const order: Record<string, number> = { active: 0, pending: 1, finished: 2 };
        const orderDiff = order[a.status] - order[b.status];
        if (orderDiff !== 0) return orderDiff;
        // 같은 상태면 id 순서 유지
        return a.id - b.id;
      });
      setItems(sorted);
    }
    if (uRes.data && iRes.data) {
      const ranked = uRes.data.map(user => {
        // 낙찰된 아이템 (finished 상태)
        const wonItems = iRes.data!.filter(item => item.status === 'finished' && item.highest_bidder_id === user.id);
        // 현재 최고 입찰 중인 아이템 (active 상태)
        const leadingItems = iRes.data!.filter(item => item.status === 'active' && item.highest_bidder_id === user.id);
        return {
          ...user,
          wonCount: wonItems.length,
          wonItems,
          leadingCount: leadingItems.length,
          leadingItems
        };
      }).sort((a, b) => {
        // 1순위: 낙찰 수
        if (b.wonCount !== a.wonCount) return b.wonCount - a.wonCount;
        // 2순위: 현재 리딩 수
        if (b.leadingCount !== a.leadingCount) return b.leadingCount - a.leadingCount;
        // 3순위: 잔액
        return b.balance - a.balance;
      });
      setUsers(ranked);
    }
    if (bRes.data) setBids(bRes.data);
  }, []);

  useEffect(() => {
    fetchLive();

    // 개별 테이블에 대한 Realtime 리스너 설정
    const channel = supabase
      .channel("admin_auction_dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_items" }, () => {
        console.log("🔄 auction_items changed");
        fetchLive();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, () => {
        console.log("💰 bids changed");
        fetchLive();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        console.log("👤 users changed");
        fetchLive();
      })
      .subscribe((status) => {
        console.log("📡 Admin dashboard subscription:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLive]);

  const activeItem = items.find(i => i.status === 'active');

  return (
    <main className="min-h-screen w-full bg-[#050505] text-[#E0E0E0] flex flex-col antialiased font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 h-[8vh] bg-black/80 backdrop-blur-3xl border-b border-white/5 px-6 md:px-10 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push("/admin")}>
          <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_#ef4444]" />
          <h1 className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-white/90">Command Center</h1>
        </div>

        <div className="hidden lg:flex gap-4">
          <button onClick={finishAuctionAndOpenFeed} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg">
            <CheckCircle2 size={12} /> Finish & Open Feed
          </button>
          <button onClick={() => router.push("/admin/dashboard/feed")} className="px-5 py-2 bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 hover:bg-pink-500/20 transition-all">Switch to Feed 📸</button>
          <button onClick={() => router.push("/admin/settings")} className="px-5 py-2 bg-[#A52A2A] rounded-full text-[9px] font-black uppercase tracking-widest transition-all">Settings ⚙️</button>
        </div>

        <button className="lg:hidden p-2 text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[8vh] z-[49] bg-black/95 backdrop-blur-xl p-8 flex flex-col gap-6 animate-in slide-in-from-top duration-300">
          <button onClick={finishAuctionAndOpenFeed} className="w-full py-5 bg-amber-600 rounded-2xl font-black uppercase tracking-widest text-xs">Finish & Open Feed</button>
          <button onClick={() => router.push("/admin/dashboard/feed")} className="w-full py-5 bg-white/5 rounded-2xl font-black uppercase tracking-widest text-xs border border-white/10">Switch to Feed 📸</button>
          <button onClick={() => router.push("/admin/settings")} className="w-full py-5 bg-[#A52A2A] rounded-2xl font-black uppercase tracking-widest text-xs">Settings ⚙️</button>
        </div>
      )}

      {/* Main Grid: lg 기준 순서 1(컨트롤) - 2(스트림) - 3(랭킹) */}
      <div className="flex-1 p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 overflow-y-auto lg:overflow-hidden">
        
        {/* [순서 1] Main Control: lg:col-span-4 */}
        <section className="order-1 lg:col-span-4 flex flex-col gap-6 h-fit lg:h-full">
          <div className="bg-gradient-to-br from-[#A52A2A] to-black rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 flex flex-col justify-center text-center shadow-2xl border border-white/10 min-h-[320px]">
            {activeItem ? (
              <div className="animate-in zoom-in duration-500">
                <span className="text-[9px] font-black tracking-[0.4em] opacity-40 uppercase mb-4 block">Live Session</span>
                <h2 className="text-3xl md:text-5xl font-serif italic font-bold mb-6 tracking-tighter">{activeItem.title}</h2>
                <p className="text-5xl md:text-6xl font-black mb-8 tracking-tighter">{activeItem.current_bid.toLocaleString()} <span className="text-xl font-normal opacity-40">만</span></p>
                <button 
                  onClick={async () => await supabase.from("auction_items").update({status:'finished'}).eq('id', activeItem.id)} 
                  className="w-full py-5 bg-white text-[#A52A2A] rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-transform shadow-xl"
                >
                  현재 세션 종료하기
                </button>
              </div>
            ) : (
              <div className="py-10 flex flex-col items-center gap-4">
                <div className="opacity-20 italic text-lg font-serif">대기 중인 세션</div>
                <p className="text-[8px] text-white/30 uppercase tracking-[0.2em]">Queue에서 시작 버튼을 누르세요</p>
              </div>
            )}
          </div>

          <div className="bg-[#111] rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-8 border border-white/5 flex flex-col h-[350px] lg:flex-1 overflow-hidden">
             <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] mb-6 flex items-center gap-2"><Activity size={12}/> Session Queue</h3>
             <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {items.map(item => {
                  const winner = item.status === 'finished' ? users.find(u => u.id === item.highest_bidder_id) : null;
                  return (
                    <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      item.status === 'active'
                        ? 'bg-[#A52A2A]/20 border-[#A52A2A]/50'
                        : item.status === 'finished'
                          ? 'bg-white/[0.01] border-white/5 opacity-30'
                          : 'bg-white/[0.02] border-white/5'
                    }`}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {item.status === 'active' && <span className="w-1.5 h-1.5 bg-[#A52A2A] rounded-full animate-pulse" />}
                          {item.status === 'finished' && <CheckCircle2 size={10} className="text-green-500/50" />}
                          <span className={`text-[11px] font-bold ${item.status === 'finished' ? 'line-through opacity-50' : ''}`}>{item.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] opacity-40">{item.current_bid.toLocaleString()}만</span>
                          {winner && <span className="text-[7px] text-green-400/60">→ {winner.nickname}</span>}
                        </div>
                      </div>
                      {item.status === 'pending' && (
                        <button
                          onClick={async () => await supabase.from("auction_items").update({status:'active'}).eq('id', item.id)}
                          className="px-4 py-2 bg-white text-black text-[9px] font-black rounded-lg uppercase shadow-xl active:scale-90 transition-transform"
                        >
                          Start
                        </button>
                      )}
                      {item.status === 'active' && (
                        <span className="text-[8px] text-[#A52A2A] font-black uppercase tracking-wider">LIVE</span>
                      )}
                      {item.status === 'finished' && (
                        <span className="text-[8px] text-green-500/40 font-bold uppercase">Done</span>
                      )}
                    </div>
                  );
                })}
             </div>
          </div>
        </section>

        {/* [순서 2] Live Stream (Bid Stream): lg:col-span-3 */}
        <section className="order-2 lg:col-span-3 bg-[#111] rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-8 border border-white/5 flex flex-col h-[400px] lg:h-full overflow-hidden shadow-2xl">
           <h3 className="text-[9px] font-black text-[#FFD700] uppercase tracking-[0.4em] mb-8 flex items-center gap-3 italic"><History size={14} /> Live Stream</h3>
           <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
              {bids.map((bid, idx) => (
                <div key={bid.id} className={`pl-5 border-l-2 transition-all ${idx === 0 ? 'border-[#FFD700] opacity-100 scale-105 origin-left' : 'border-white/5 opacity-20'}`}>
                  <p className="text-[8px] font-black text-[#FFD700] uppercase mb-1 truncate">{users.find(u => u.id === bid.user_id)?.nickname || 'Guest'}</p>
                  <p className="text-xl md:text-2xl font-black text-white tracking-tighter">{bid.amount.toLocaleString()}<span className="text-[10px] ml-1 font-normal opacity-40">만</span></p>
                </div>
              ))}
           </div>
        </section>

        {/* [순서 3] Global Ranking: lg:col-span-5 */}
        <section className="order-3 lg:col-span-5 bg-[#111] rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 border border-white/5 flex flex-col h-[500px] lg:h-full overflow-hidden shadow-2xl">
          <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mb-8 flex items-center gap-3 italic"><Trophy size={14} /> Identity Ranking</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
            {users.slice(0, 15).map((u, idx) => (
              <div key={u.id} className={`flex items-center justify-between p-5 rounded-[2rem] border transition-colors ${
                u.leadingCount > 0 ? 'bg-[#FFD700]/5 border-[#FFD700]/20' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]'
              }`}>
                <div className="flex items-center gap-5">
                  <span className="text-xl font-serif italic text-[#A52A2A] font-bold opacity-30">{(idx + 1).toString().padStart(2, '0')}</span>
                  <div className="overflow-hidden">
                    <p className="font-bold text-sm text-white/90 truncate">{u.nickname}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {/* 현재 리딩 중인 아이템 (Live 표시) */}
                      {u.leadingItems?.map((item: any) => (
                        <span key={`leading-${item.id}`} className="text-[7px] bg-[#FFD700]/20 px-2 py-0.5 rounded-full text-[#FFD700] font-bold border border-[#FFD700]/30 animate-pulse">
                          🔥 {item.title}
                        </span>
                      ))}
                      {/* 낙찰된 아이템 */}
                      {u.wonItems?.map((item: any) => (
                        <span key={`won-${item.id}`} className="text-[7px] bg-[#A52A2A]/20 px-2 py-0.5 rounded-full text-[#A52A2A] font-bold border border-[#A52A2A]/10">
                          #{item.title}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right pl-4">
                  {u.leadingCount > 0 && (
                    <div className="font-black text-[#FFD700] text-[9px] mb-1">LEADING</div>
                  )}
                  <div className="font-black text-white/60 text-[10px]">
                    {u.wonCount} 낙찰
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { bg: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { bg: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
    </main>
  );
}