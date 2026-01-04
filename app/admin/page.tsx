"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { VALUES } from "@/app/constants";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [activeTab, setActiveTab] = useState<'controller' | 'stats'>('controller');
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  const usersRef = useRef<any[]>([]);
  const itemsRef = useRef<any[]>([]);

  useEffect(() => {
    usersRef.current = users;
    itemsRef.current = items;
  }, [users, items]);

  const fetchData = async () => {
    const { data: itemsData } = await supabase.from("auction_items").select("*");
    if (itemsData) {
      const sorted = [...itemsData].sort((a, b) => {
        const order: any = { active: 1, pending: 2, finished: 3 };
        return order[a.status] - order[b.status];
      });
      setItems(sorted);
    }

    const { data: usersData } = await supabase.from("users").select("*").order("balance", { ascending: false });
    if (usersData) setUsers(usersData);

    const { data: bidsData } = await supabase
      .from("bids")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (bidsData) setBids(bidsData);
  };

  useEffect(() => {
    // 세션에서 인증 정보 확인
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") setIsAuthenticated(true);

    fetchData();

    const generalChannel = supabase
      .channel("admin_general_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_items" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => fetchData())
      .subscribe();

    const bidsChannel = supabase
      .channel("admin_bids_insert")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids" }, (payload) => {
        console.table(payload.new);
        setBids((prev) => [payload.new, ...prev.slice(0, 9)]);
        fetchData(); 
      })
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });
    
    return () => { 
      supabase.removeChannel(generalChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, []);

  // 패스워드 핸들러
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "1234") { // 설정하신 패스워드
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    if (status === "active") {
      await supabase.from("auction_items").update({ status: "pending" }).eq("status", "active");
    }
    await supabase.from("auction_items").update({ status }).eq("id", id);
  };

  // --- 1. 패스워드 인증 전 화면 ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <form onSubmit={handleLogin} className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border-4 border-gray-800">
          <h1 className="text-3xl font-black text-center text-gray-900 mb-8 tracking-tighter italic">ADMIN LOGIN</h1>
          <input 
            type="password" 
            value={passwordInput} 
            onChange={(e) => setPasswordInput(e.target.value)} 
            placeholder="비밀번호 입력" 
            className="w-full p-5 bg-gray-100 rounded-2xl mb-4 text-center text-2xl font-bold outline-none border-4 border-transparent focus:border-blue-600 transition-all" 
            autoFocus 
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-blue-700 shadow-xl active:scale-95 transition-all">
            접속하기
          </button>
        </form>
      </div>
    );
  }

  // --- 2. 패스워드 인증 후 대시보드 화면 ---
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 공지사항 상단 고정 */}
        <div className="bg-blue-600 text-white p-4 rounded-2xl mb-6 shadow-lg flex justify-between items-center border-b-4 border-blue-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📢</span>
            <p className="font-bold text-sm md:text-base tracking-tight">
              "자산 1,000만원 / 100만원 단위 배팅 / 낙찰 후 취소 불가" - 가치관 경매 안내
            </p>
          </div>
          <div className="flex items-center gap-2 bg-blue-700 px-3 py-1.5 rounded-full border border-blue-500">
            <div className={`w-2.5 h-2.5 rounded-full ${isRealtimeConnected ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-red-400'}`}></div>
            <span className="text-xs font-black uppercase tracking-widest">{isRealtimeConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>

        <header className="flex justify-between items-center mb-10">
          <h1 className="text-2xl font-black italic tracking-tighter text-gray-900">THE VALUE AUCTION <span className="text-blue-600">ADMIN</span></h1>
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200">
            <button onClick={() => setActiveTab('controller')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'controller' ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}>컨트롤러</button>
            <button onClick={() => setActiveTab('stats')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'stats' ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}>실시간 통계</button>
          </div>
        </header>

        {activeTab === 'controller' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
               <h2 className="text-xl font-black text-gray-800">🎮 경매 컨트롤러</h2>
               <span className="text-xs text-gray-400 font-medium">| 아이템 정렬: 진행중 ⮕ 대기 ⮕ 종료</span>
            </div>
            {items.map((item) => (
              <div key={item.id} className={`p-5 border-2 rounded-2xl flex justify-between items-center transition-all ${item.status === 'active' ? 'bg-blue-50 border-blue-600 ring-4 ring-blue-100 scale-[1.01]' : 'bg-white border-gray-100 opacity-90'}`}>
                <div>
                  <span className="font-black text-xl text-gray-900">[{item.title}]</span>
                  <span className={`ml-3 px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${item.status === 'active' ? 'bg-green-500 text-white animate-pulse' : item.status === 'finished' ? 'bg-gray-400 text-white' : 'bg-yellow-100 text-yellow-800'}`}>
                    {item.status.toUpperCase()}
                  </span>
                  <div className="text-sm text-gray-500 mt-2 font-bold italic">현재가: <span className="text-blue-600 text-lg not-italic">{item.current_bid}만원</span></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(item.id, "active")} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 shadow-md transition-all active:scale-90">시작</button>
                  <button onClick={() => updateStatus(item.id, "finished")} className="px-6 py-3 bg-red-500 text-white rounded-xl font-black hover:bg-red-600 shadow-md transition-all active:scale-90">종료</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* 실시간 입찰 로그 (전광판) */}
            <div className="bg-black text-green-400 p-8 rounded-[2rem] shadow-2xl border-x-8 border-gray-900 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-20"></div>
              <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-3">
                <h2 className="text-xs font-black tracking-[0.3em] text-gray-600 uppercase">📢 LIVE BIDDING FEED</h2>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-[10px] text-gray-500 font-bold">{isRealtimeConnected ? 'LIVE' : 'OFFLINE'}</span>
                </div>
              </div>
              <div className="space-y-4 min-h-[160px]">
                {bids.length > 0 ? bids.map((bid) => {
                  const bidder = users.find(u => u.id === bid.user_id);
                  const itemId = bid.auction_item_id || bid.item_id;
                  const item = items.find(i => i.id === itemId);
                  return (
                    <div key={bid.id} className="text-xl font-mono flex items-center gap-4 animate-fadeIn border-l-2 border-gray-900 pl-4">
                      <span className="text-gray-700 text-xs">[{new Date(bid.created_at).toLocaleTimeString()}]</span>
                      <span className="text-yellow-400 font-black">{bidder?.nickname || '익명'}</span>
                      <span className="text-gray-500 italic text-sm">bid on</span>
                      <span className="text-blue-400 font-black tracking-tighter">[{item?.title || '가치관'}]</span>
                      <span className="text-green-400 font-black text-2xl">{bid.amount}만원!</span>
                    </div>
                  );
                }) : <p className="text-gray-700 italic text-center py-10">Waiting for first bid...</p>}
              </div>
            </div>

            {/* 통계 그래프 & 랭킹 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-black mb-6 text-gray-800">📊 가치관별 누적 금액</h2>
                <div className="space-y-6">
                  {[...items].sort((a,b) => b.current_bid - a.current_bid).slice(0, 8).map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between text-sm mb-2 font-black">
                        <span>{item.title}</span>
                        <span className="text-blue-600">{item.current_bid}만원</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-1000" style={{ width: `${(item.current_bid / Math.max(...items.map(i => i.current_bid), 100)) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-black mb-6 text-gray-800">💰 자산 랭킹</h2>
                <div className="divide-y divide-gray-50">
                  {users.map((u, idx) => (
                    <div key={u.id} className="flex justify-between items-center py-4">
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</span>
                        <span className="font-bold text-gray-700 text-lg">{u.nickname}</span>
                      </div>
                      <span className="text-green-600 font-black text-xl">{u.balance}만원</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}