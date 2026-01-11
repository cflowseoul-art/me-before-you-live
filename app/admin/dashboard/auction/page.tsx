"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Settings, Activity, Trophy, History, Zap, CheckCircle2 } from "lucide-react"; // CheckCircle2 추가

export default function AuctionDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);

  // [추가] 옥션 최종 종료 및 피드 오픈 함수
  const finishAuctionAndOpenFeed = async () => {
    const isConfirm = confirm(
      "📢 모든 경매 세션을 종료하고 피드 투표를 시작하시겠습니까?\n유저들은 즉시 갤러리(피드) 화면으로 리다이렉트됩니다."
    );
    
    if (!isConfirm) return;

    // 1. 진행 중인 모든 아이템을 finished로 (안전장치)
    await supabase.from("auction_items").update({ status: 'finished' }).eq('status', 'active');

    // 2. 시스템 설정에서 피드 오픈 신호 발송
    const { error } = await supabase
      .from("system_settings")
      .update({ value: "true" })
      .eq("key", "is_feed_open");

    if (error) {
      alert("피드 오픈 중 오류 발생: " + error.message);
    } else {
      alert("✅ 옥션 종료! 유저들이 피드 페이지로 이동합니다.");
      router.push("/admin/dashboard/feed"); // 어드민도 피드 대시보드로 이동
    }
  };

  const fetchLive = async () => {
    const [iRes, uRes, bRes] = await Promise.all([
      supabase.from("auction_items").select("*"),
      supabase.from("users").select("*"),
      supabase.from("bids").select("*").order("created_at", { ascending: false }).limit(10)
    ]);
    
    if (iRes.data) {
      setItems(iRes.data.sort((a, b) => {
        const order: any = { active: 1, pending: 2, finished: 3 };
        return order[a.status] - order[b.status];
      }));
    }
    if (uRes.data && iRes.data) {
      const ranked = uRes.data.map(user => {
        const won = iRes.data!.filter(item => item.status === 'finished' && item.highest_bidder_id === user.id);
        return { ...user, wonCount: won.length, wonItems: won };
      }).sort((a, b) => b.wonCount - a.wonCount || b.balance - a.balance);
      setUsers(ranked);
    }
    if (bRes.data) setBids(bRes.data);
  };

  useEffect(() => {
    fetchLive();
    const c = supabase.channel("auction_sync").on("postgres_changes", { event: "*", schema: "public" }, fetchLive).subscribe();
    return () => { supabase.removeChannel(c); };
  }, []);

  const activeItem = items.find(i => i.status === 'active');

  return (
    <main className="h-screen w-full bg-[#050505] text-[#E0E0E0] overflow-hidden flex flex-col antialiased font-sans">
      <nav className="h-[8vh] bg-black/60 backdrop-blur-3xl border-b border-white/5 px-10 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push("/admin")}>
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_#ef4444]" />
          <h1 className="text-sm font-black uppercase tracking-[0.5em] text-white/90">Auction Command</h1>
        </div>
        <div className="flex gap-4">
          {/* [추가] 옥션 전체 종료 및 피드 이동 버튼 */}
          <button 
            onClick={finishAuctionAndOpenFeed}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-amber-400/50 flex items-center gap-2 shadow-[0_0_20px_rgba(217,119,6,0.2)]"
          >
            <CheckCircle2 size={14} /> Auction Finish & Feed Open
          </button>
          
          <button onClick={() => router.push("/admin/dashboard/feed")} className="px-5 py-2 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-pink-500/20 transition-all">Switch to Feed 📸</button>
          <button onClick={() => router.push("/admin/settings")} className="px-5 py-2 bg-[#A52A2A] rounded-full text-[10px] font-black uppercase tracking-widest transition-all">Settings ⚙️</button>
        </div>
      </nav>

      <div className="flex-1 p-8 grid grid-cols-12 gap-8 overflow-hidden">
        {/* 경매 메인 컨트롤 */}
        <section className="col-span-4 flex flex-col gap-8 h-full">
          <div className="flex-none h-2/3 bg-gradient-to-br from-[#A52A2A] to-black rounded-[3rem] p-10 flex flex-col justify-center text-center shadow-2xl border border-white/10">
            {activeItem ? (
              <div className="animate-in fade-in duration-700">
                <span className="text-[10px] font-black tracking-[0.4em] opacity-40 uppercase mb-4 block">Now Progressing</span>
                <h2 className="text-5xl font-serif italic font-bold mb-6 tracking-tighter">{activeItem.title}</h2>
                <p className="text-6xl font-black mb-10 tracking-tighter">{activeItem.current_bid.toLocaleString()} <span className="text-xl font-normal opacity-40">만</span></p>
                <button 
                  onClick={async () => await supabase.from("auction_items").update({status:'finished'}).eq('id', activeItem.id)} 
                  className="w-full py-5 bg-white text-[#A52A2A] rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-colors"
                >
                  현재 세션 종료
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="opacity-20 italic text-xl">진행 중인 경매가 없습니다</div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">모든 세션이 종료되었다면 상단의 Finish 버튼을 누르세요</p>
              </div>
            )}
          </div>

          <div className="flex-1 bg-[#111] rounded-[3rem] p-8 border border-white/5 overflow-hidden flex flex-col">
             <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-6 flex items-center gap-2"><Activity size={12}/> 세션 리스트</h3>
             <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                {items.map(item => (
                  <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${item.status === 'active' ? 'bg-[#A52A2A]/10 border-[#A52A2A]/40' : 'bg-white/[0.02] border-white/5 opacity-40'}`}>
                    <span className="text-xs font-bold">{item.title}</span>
                    {item.status === 'pending' && (
                      <button 
                        onClick={async () => {
                          // 다른 active 아이템이 있으면 먼저 finish 시키고 시작하는 로직 권장
                          await supabase.from("auction_items").update({status:'active'}).eq('id', item.id);
                        }} 
                        className="px-3 py-1 bg-white text-black text-[9px] font-black rounded uppercase"
                      >
                        Start
                      </button>
                    )}
                    {item.status === 'finished' && <span className="text-[9px] font-black text-[#FFD700] uppercase">Sold Out</span>}
                  </div>
                ))}
             </div>
          </div>
        </section>

        {/* 종합 랭킹 */}
        <section className="col-span-5 bg-[#111] rounded-[3rem] p-10 border border-white/5 flex flex-col overflow-hidden shadow-2xl">
          <h3 className="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.4em] mb-8 flex items-center gap-3 italic"><Trophy size={14} /> Identity Ranking</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-3 scrollbar-hide">
            {users.slice(0, 10).map((u, idx) => (
              <div key={u.id} className="flex items-center justify-between p-6 bg-white/[0.03] rounded-3xl border border-white/5">
                <div className="flex items-center gap-6">
                  <span className="text-2xl font-serif italic text-[#A52A2A] font-bold opacity-40">0{idx + 1}</span>
                  <div>
                    <p className="font-bold text-base text-white/90">{u.nickname}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">{u.wonItems?.map((item: any) => (<span key={item.id} className="text-[8px] bg-[#A52A2A]/10 px-2 py-0.5 rounded-full text-[#A52A2A] font-bold border border-[#A52A2A]/10">#{item.title}</span>))}</div>
                  </div>
                </div>
                <div className="text-right"><p className="text-xs font-black text-[#FFD700]">{u.wonCount} 낙찰</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* 입찰 내역 */}
        <section className="col-span-3 bg-[#111] rounded-[3rem] p-8 border border-white/5 flex flex-col overflow-hidden shadow-2xl">
           <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-8 flex items-center gap-3 italic"><History size={14} /> Bid Stream</h3>
           <div className="flex-1 overflow-y-auto space-y-10 pr-2 scrollbar-hide">
              {bids.map((bid, idx) => (
                <div key={bid.id} className={`pl-6 border-l-2 transition-all ${idx === 0 ? 'border-[#FFD700] opacity-100' : 'border-white/5 opacity-20'}`}>
                  <p className="text-[10px] font-black text-[#FFD700] uppercase mb-1">{users.find(u => u.id === bid.user_id)?.nickname || '---'}</p>
                  <p className="text-2xl font-black text-white tracking-tighter">{bid.amount}만</p>
                </div>
              ))}
           </div>
        </section>
      </div>
    </main>
  );
}