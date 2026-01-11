"use client" ;

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { VALUES } from "@/app/constants";

interface AuctionItem {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'finished';
  current_bid: number;
  highest_bidder_id?: string;
}

interface User {
  id: string;
  nickname: string;
  balance: number;
  awardedItems?: AuctionItem[];
  count?: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [activeTab, setActiveTab] = useState<'status' | 'control'>('status');
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const fetchData = async () => {
    const { data: itemsData } = await supabase.from("auction_items").select("*");
    const { data: usersData } = await supabase.from("users").select("*");
    const { data: bidsData } = await supabase.from("bids").select("*").order("created_at", { ascending: false }).limit(4);

    if (itemsData) {
      setItems(itemsData.sort((a, b) => {
        const order: any = { active: 1, pending: 2, finished: 3 };
        return order[a.status] - order[b.status];
      }));
    }

    if (usersData && itemsData) {
      const rankedUsers = usersData.map(user => {
        const myItems = itemsData.filter(item => item.status === 'finished' && item.highest_bidder_id === user.id);
        return { ...user, awardedItems: myItems, count: myItems.length };
      }).sort((a, b) => b.count - a.count || b.balance - a.balance);
      setUsers(rankedUsers);
    }
    if (bidsData) setBids(bidsData);
  };

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") setIsAuthenticated(true);
    fetchData();

    const channel = supabase.channel("admin_final_visibility_v3")
      .on("postgres_changes", { event: "*", schema: "public" }, () => fetchData())
      .subscribe((status) => setIsRealtimeConnected(status === 'SUBSCRIBED'));
    
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (passwordInput === "1234") { setIsAuthenticated(true); sessionStorage.setItem("admin_auth", "true"); }
    else alert("Passcode Incorrect");
  };

const updateStatus = async (id: string, status: string) => {
  const { error } = await supabase
    .from("auction_items")
    .update({ status })
    .eq("id", id);
  
  if (error) {
    console.error("Update failed:", error);
    alert("상태 변경에 실패했습니다.");
  } else {
    fetchData();
  }
};

  // 현재 활성 경매 종료 (Close Auction)
  const handleCloseAuction = async () => {
    const active = items.find(i => i.status === 'active');
    if (!active) {
      alert("현재 진행 중인 경매가 없습니다.");
      return;
    }

    const winner = users.find(u => u.id === active.highest_bidder_id);
    const winnerName = winner?.nickname || "없음";

    if (!confirm(`"${active.title}" 경매를 종료하시겠습니까?\n\n최종 낙찰자: ${winnerName}\n최종 금액: ${active.current_bid}만원`)) {
      return;
    }

    await supabase.from("auction_items").update({ status: 'finished' }).eq("id", active.id);
    fetchData();
  };

  // 모든 경매 일괄 종료
  const handleCloseAllAuctions = async () => {
    const activeItems = items.filter(i => i.status === 'active' || i.status === 'pending');
    if (activeItems.length === 0) {
      alert("종료할 경매가 없습니다.");
      return;
    }

    if (!confirm(`진행 중/대기 중인 ${activeItems.length}개의 경매를 모두 종료하시겠습니까?`)) {
      return;
    }

    await supabase.from("auction_items").update({ status: 'finished' }).in("id", activeItems.map(i => i.id));
    fetchData();
  };

  const handleAuctionReset = async () => {
    if (!confirm("🚨 모든 데이터를 초기화하시겠습니까?")) return;
    await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('auction_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const newItems = VALUES.map((v: any) => ({ title: v.title || v, status: 'pending', current_bid: 0 }));
    await supabase.from('auction_items').insert(newItems);
    alert("시스템이 초기화되었습니다.");
    fetchData();
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#1A1A1A] p-10 font-serif">
        <form onSubmit={handleLogin} className="bg-[#FCF9F2] p-12 rounded-[3.5rem] border-t-[12px] border-[#A52A2A] text-center w-full max-w-sm shadow-2xl">
          <h1 className="text-3xl italic mb-10 tracking-tighter text-[#1A1A1A]">Private Hall Entrance</h1>
          <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full p-5 bg-white border-2 border-[#EEEBDE] rounded-2xl mb-5 text-center text-4xl outline-none focus:border-[#A52A2A] transition-all" placeholder="••••" autoFocus />
          <button type="submit" className="w-full bg-[#A52A2A] text-white py-5 rounded-2xl font-sans font-black tracking-widest text-xs uppercase shadow-lg active:scale-95 transition-all">Verify</button>
        </form>
      </main>
    );
  }

  const activeItem = items.find(i => i.status === 'active');

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif antialiased overflow-x-hidden flex flex-col relative pb-32">
      
      {/* 1. 상단 LIVE 게시판: 요청하신 문구형 입찰 알림 적용 */}
      <section className="sticky top-0 z-50 bg-[#121212] px-6 py-8 border-b-[8px] border-[#A52A2A] shadow-2xl">
        {activeItem && (
          <div className="mb-10 p-6 bg-[#A52A2A]/5 border border-[#A52A2A]/20 rounded-[2.5rem] text-center animate-in fade-in zoom-in duration-700">
            <p className="text-[#A52A2A] text-[10px] font-sans font-black tracking-[0.4em] uppercase mb-3 leading-none opacity-60">현재 경매 중</p>
            <h2 className="text-[#FFD700] text-5xl italic font-medium tracking-tighter mb-4 leading-none">{activeItem.title}</h2>
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-white/40 text-[10px] font-sans tracking-widest uppercase">현재가</span>
              <span className="text-white text-xl font-sans font-bold tracking-tight">{activeItem.current_bid.toLocaleString()}만원</span>
            </div>
            {/* Close Auction Button */}
            <button
              onClick={handleCloseAuction}
              className="px-8 py-4 bg-[#A52A2A] text-white rounded-2xl text-[11px] font-sans font-black tracking-[0.2em] uppercase shadow-lg hover:bg-[#8B2323] active:scale-95 transition-all border-2 border-[#A52A2A]/50"
            >
              Close Auction
            </button>
          </div>
        )}

        <div className="space-y-6 h-40 overflow-hidden relative">
          {bids.map((bid, idx) => {
            const bidder = users.find(u => u.id === bid.user_id);
            const item = items.find(i => i.id === (bid.auction_item_id || bid.item_id));
            return (
              <div key={bid.id} className={`flex flex-col gap-1 transition-all duration-700 ${idx === 0 ? 'opacity-100 scale-100' : 'opacity-20 scale-95'}`}>
                <div className="flex justify-between items-baseline">
                  <div className="flex flex-wrap items-baseline gap-x-2 min-w-0 pr-2">
                    {/* 닉네임 {가치관} 입찰 성공 구조 */}
                    <span className="text-[#FFD700] font-serif italic font-bold text-2xl tracking-tight break-all">
                      {bidder?.nickname}
                    </span>
                    <span className="text-white font-bold text-lg italic tracking-tighter shrink-0 border-b border-white/20">
                      {item?.title}
                    </span>
                    <span className="text-[#A52A2A] text-[10px] font-sans font-black tracking-widest uppercase shrink-0">
                      입찰 성공
                    </span>
                  </div>
                  <span className="text-white font-sans font-black text-2xl tracking-tighter shrink-0">
                    {bid.amount}<span className="text-[10px] ml-0.5 opacity-40 font-normal">만원</span>
                  </span>
                </div>
              </div>
            );
          })}
          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent pointer-events-none"></div>
        </div>
      </section>

      {/* 2. 메인 콘텐츠 (기존 UI 유지) */}
      <div className="flex-1 px-5 mt-12 max-w-xl mx-auto w-full">
        {activeTab === 'status' ? (
          <div className="space-y-16 animate-in fade-in duration-1000">
            {/* 누적 입찰액 통계 */}
            <section>
              <h3 className="text-[10px] font-sans font-black tracking-[0.5em] text-[#A52A2A] uppercase mb-10 text-center italic underline underline-offset-8 decoration-[#A52A2A]/20">Value Statistics</h3>
              <div className="space-y-8 bg-white p-9 rounded-[3.5rem] border border-[#EEEBDE] shadow-sm">
                {[...items].sort((a, b) => b.current_bid - a.current_bid).slice(0, 4).map((item) => (
                  <div key={item.id} className="space-y-3">
                    <div className="flex justify-between items-end text-sm font-medium italic">
                      <span className="tracking-tight">{item.title}</span>
                      <span className="text-[#A52A2A] font-sans font-bold text-xs">{item.current_bid}만</span>
                    </div>
                    <div className="w-full bg-[#FCF9F2] h-[2px] rounded-full overflow-hidden">
                      <div className="bg-[#A52A2A] h-full opacity-60 transition-all duration-1000" style={{ width: `${Math.min((item.current_bid / 1000) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 가치관 획득 랭킹 */}
            <section>
              <h3 className="text-[10px] font-sans font-black tracking-[0.5em] text-gray-300 uppercase mb-10 text-center italic">Identity Ranking</h3>
              <div className="space-y-6 text-center">
                {users.map((user, idx) => (
                  <div key={user.id} className="bg-white p-8 rounded-[3rem] border border-[#EEEBDE] relative overflow-hidden group shadow-sm text-left">
                    <span className="absolute -right-4 -bottom-8 text-[9rem] font-black text-black/[0.02] italic font-serif pointer-events-none">{idx + 1}</span>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                         <h4 className="text-2xl font-medium italic tracking-tighter break-all leading-tight pr-4">{user.nickname}</h4>
                         <span className="shrink-0 text-[9px] font-sans font-black text-[#A52A2A] bg-[#FDF8F8] px-3 py-1.5 rounded-full border border-[#A52A2A]/10 uppercase">{user.count} Won</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {user.awardedItems?.map((item: any) => (
                          <span key={item.id} className="px-4 py-2 rounded-full border border-[#EEEBDE] bg-[#FDFDFD] text-[10px] font-sans font-bold text-[#A52A2A] shadow-sm italic">{item.title}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* 컨트롤러 */
          <div className="space-y-6">
             <h3 className="text-[10px] font-sans font-black tracking-[0.5em] text-[#A52A2A] uppercase mb-10 text-center italic">Auction Inventory</h3>
             {items.map((item) => {
              const winner = users.find(u => u.id === item.highest_bidder_id);
              return (
              <div key={item.id} className={`p-8 bg-white rounded-[3rem] border border-[#EEEBDE] ${item.status === 'active' ? 'ring-2 ring-[#A52A2A]/20 shadow-xl' : item.status === 'finished' ? 'opacity-40' : 'opacity-70'}`}>
                <div className="flex justify-between items-center">
                  <div className="min-w-0 flex-1 pr-4 text-left">
                    <h3 className="text-xl font-medium italic tracking-tighter break-words leading-none mb-2">{item.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-sans font-black uppercase tracking-widest ${
                        item.status === 'active' ? 'bg-[#A52A2A] text-white animate-pulse' :
                        item.status === 'finished' ? 'bg-[#1A1A1A] text-white' : 'bg-gray-100 text-gray-400'
                      }`}>{item.status}</span>
                      <span className="text-[10px] font-sans font-bold text-gray-300 uppercase italic">{item.current_bid}만원</span>
                      {item.status === 'finished' && winner && (
                        <span className="text-[10px] font-sans font-bold text-[#A52A2A] italic">→ {winner.nickname}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {item.status === 'pending' && (
                      <button onClick={() => updateStatus(item.id, 'active')} className="px-5 py-3 rounded-xl bg-[#1A1A1A] text-white text-[9px] font-sans font-black uppercase shadow-md active:scale-95 transition-all hover:bg-[#333]">Start</button>
                    )}
                    {item.status === 'active' && (
                      <button onClick={() => updateStatus(item.id, 'finished')} className="px-5 py-3 rounded-xl bg-[#A52A2A] text-white text-[9px] font-sans font-black uppercase shadow-md active:scale-95 transition-all hover:bg-[#8B2323]">Close</button>
                    )}
                    {item.status === 'finished' && (
                      <span className="px-5 py-3 text-[9px] font-sans font-black uppercase text-gray-300 italic">Closed</span>
                    )}
                  </div>
                </div>
              </div>
              );
            })}

            {/* Close All Auctions */}
            <div className="mt-12 pt-8 border-t border-[#EEEBDE]">
              <button
                onClick={handleCloseAllAuctions}
                className="w-full py-5 rounded-2xl bg-[#1A1A1A] text-white text-[10px] font-sans font-black tracking-[0.2em] uppercase shadow-lg active:scale-[0.98] transition-all hover:bg-[#A52A2A]"
              >
                Close All Auctions
              </button>
            </div>

            <div className="mt-16 pt-12 border-t border-dashed border-[#EEEBDE] text-center">
              <button onClick={handleAuctionReset} className="text-[9px] font-sans font-black tracking-[0.4em] text-[#A52A2A]/20 hover:text-[#A52A2A]/60 uppercase transition-all underline underline-offset-8">
                Initialize Hall of Identity
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. 플로팅 내비게이션 */}
      <div className="fixed bottom-10 right-7 z-[100] flex flex-col items-end gap-4">
        <div className="flex bg-white/60 backdrop-blur-xl p-2 rounded-[2.5rem] border border-white/30 shadow-xl opacity-70 hover:opacity-100 transition-all duration-500">
          <button onClick={() => setActiveTab('status')} className={`px-6 py-3.5 rounded-[1.8rem] text-[10px] font-sans font-black tracking-widest uppercase transition-all ${activeTab === 'status' ? 'bg-[#1A1A1A] text-white shadow-lg' : 'text-[#1A1A1A]/40'}`}>Stats</button>
          <button onClick={() => setActiveTab('control')} className={`px-6 py-3.5 rounded-[1.8rem] text-[10px] font-sans font-black tracking-widest uppercase transition-all ${activeTab === 'control' ? 'bg-[#1A1A1A] text-white shadow-lg' : 'text-[#1A1A1A]/40'}`}>Admin</button>
        </div>
      </div>
    </div>
  );
}