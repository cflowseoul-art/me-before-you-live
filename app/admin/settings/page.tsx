"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ChevronLeft, LayoutDashboard, UserPlus, Trash2, RotateCcw, Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export default function AdminSettings() {
  const router = useRouter();
  const [phase, setPhase] = useState("");
  const [session, setSession] = useState("01");
  const [users, setUsers] = useState<any[]>([]);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [isPhaseLoading, setIsPhaseLoading] = useState<string | null>(null);
  const [phaseSuccess, setPhaseSuccess] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const fetchSettings = async () => {
    // Use API route to fetch settings (bypasses RLS)
    try {
      const res = await fetch('/api/admin/phase');
      const data = await res.json();
      if (data.success && data.settings) {
        setPhase(data.settings.current_phase || '');
        setSession(data.settings.current_session || '01');
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }

    // Users can still be fetched with anon key (no RLS on users)
    const { data: u } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    if (u) setUsers(u);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // [핵심 로직] 행사 단계 전환 및 유저 화면 강제 리다이렉션 제어
  const changePhase = async (v: string) => {
    const phaseNames: any = {
      auction: "옥션 진행",
      feed: "갤러리(피드) 오픈",
      report: "최종 리포트 발행"
    };

    if (!confirm(`[${phaseNames[v]}] 단계로 전환하시겠습니까? 모든 유저의 화면이 즉시 리다이렉트됩니다.`)) return;

    setIsPhaseLoading(v);
    setPhaseSuccess(null);

    try {
      // Use API route with service role to bypass RLS
      const res = await fetch('/api/admin/phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: v })
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update phase');
      }

      setPhase(v);
      setPhaseSuccess(v);

      // Clear success indicator after 3 seconds
      setTimeout(() => setPhaseSuccess(null), 3000);

      console.log(`✅ Phase changed to ${v}:`, result);
    } catch (err: any) {
      console.error('Phase change error:', err);
      alert("단계 전환 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsPhaseLoading(null);
    }
  };

  // 피드 레코드 일괄 생성
  const generateFeedRecords = async () => {
    if (!confirm("모든 참가자의 사진 슬롯(1~4번)을 생성하시겠습니까? (이미 생성된 데이터는 유지됩니다)")) return;
    const records: any[] = [];
    users.forEach(user => {
      for (let i = 1; i <= 4; i++) {
        records.push({
          user_id: user.id,
          photo_number: i,
          order_prefix: "00",
          gender_code: user.gender || "F",
          likes: 0
        });
      }
    });
    const { error } = await supabase
      .from("feed_items")
      .upsert(records, { onConflict: 'user_id, photo_number' });
    if (!error) alert("피드 레코드가 생성/동기화되었습니다.");
    else alert("오류 발생: " + error.message);
  };

  const handleForceRename = async (user: any) => {
    const newSuffix = user.phone_suffix + "A";
    const { error } = await supabase.from("users").update({ phone_suffix: newSuffix }).eq("id", user.id);
    if (!error) {
      setTargetUser({ ...user, phone_suffix: newSuffix, newSuffix: newSuffix });
      setShowDriveModal(true); 
      fetchSettings();
    }
  };

  const handleUndoRename = async (user: any) => {
    if (!user) return;
    const currentSuffix = user.phone_suffix.toString();
    const originalSuffix = currentSuffix.endsWith("A") ? currentSuffix.slice(0, -1) : currentSuffix;
    const { error } = await supabase.from("users").update({ phone_suffix: originalSuffix }).eq("id", user.id);
    if (!error) {
      alert(`${user.real_name}님의 정보가 복구되었습니다.`);
      setShowDriveModal(false);
      setTargetUser(null);
      fetchSettings();
    }
  };

  const changeSession = async (v: string) => {
    setIsSessionLoading(true);
    setSessionSuccess(false);

    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: v })
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update session');
      }

      setSession(v);
      setSessionSuccess(true);

      // Clear success indicator after 3 seconds
      setTimeout(() => setSessionSuccess(false), 3000);

      console.log('✅ Session updated:', result);
    } catch (err: any) {
      console.error('Session update error:', err);
      alert("회차 저장 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`[${user.nickname}] 참가자를 삭제하시겠습니까?`)) return;
    await supabase.from("users").delete().eq("id", user.id);
    fetchSettings();
  };

  const handleSessionReset = async () => {
    if (resetConfirmText !== "초기화") {
      alert("'초기화'를 정확히 입력해주세요.");
      return;
    }

    setIsResetLoading(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await res.json();
      console.log('Reset API response:', result);

      if (!result.success) {
        throw new Error(result.error || JSON.stringify(result.results) || 'Reset failed');
      }

      alert("✅ 회차 초기화가 완료되었습니다.\n\n모든 유저, 피드, 입찰 기록이 삭제되고\n옥션이 초기 상태로 리셋되었습니다.");
      setShowResetConfirm(false);
      setResetConfirmText("");
      fetchSettings();
    } catch (err: any) {
      console.error('Reset error:', err);
      alert("초기화 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFDFD] p-6 text-[#1A1A1A] font-serif relative pb-20">
      <header className="mb-10 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push("/admin")}>
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <h1 className="text-xl italic font-bold">Backstage</h1>
        </div>
        <button onClick={() => router.push("/admin/dashboard")} className="text-[10px] font-sans font-black uppercase tracking-widest bg-[#A52A2A] text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 active:scale-95 transition-all">
          <LayoutDashboard size={14} /> Go Dashboard
        </button>
      </header>

      {/* 🚀 서비스 단계 컨트롤 (통합 제어판) */}
      <section className="bg-[#1A1A1A] p-7 rounded-[2.5rem] text-white mb-6 shadow-2xl border-b-4 border-[#A52A2A]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[9px] font-sans font-black tracking-[0.4em] text-[#FFD700] uppercase italic">Service Phase Control</h3>
          <div className="flex items-center gap-1.5 bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30">
             <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
             <span className="text-[8px] font-black uppercase text-red-400 font-sans">Live Sync Active</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['auction', 'feed', 'report'].map(p => (
            <button
              key={p}
              onClick={() => changePhase(p)}
              disabled={isPhaseLoading !== null}
              className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex flex-col items-center gap-2 disabled:cursor-not-allowed ${
                phase === p
                ? 'bg-[#A52A2A] border-transparent scale-105 shadow-[0_0_20px_rgba(165,42,42,0.4)]'
                : 'border-white/10 opacity-30 hover:opacity-100 disabled:opacity-20'
              } ${phaseSuccess === p ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-[#1A1A1A]' : ''}`}
            >
              {isPhaseLoading === p ? (
                <Loader2 size={16} className="animate-spin" />
              ) : phaseSuccess === p ? (
                <CheckCircle2 size={16} className="text-green-400" />
              ) : (
                p
              )}
              {phase === p && !isPhaseLoading && !phaseSuccess && (
                <div className="w-1 h-1 bg-white rounded-full animate-bounce" />
              )}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-white/30 text-center mt-4 font-sans italic">
          * 버튼 클릭 시 해당 단계로 모든 유저가 강제 리다이렉트됩니다.
        </p>
      </section>

      {/* 피드 초기화 버튼 섹션 */}
      <section className="mb-8">
        <div className="bg-pink-50 border border-pink-100 p-8 rounded-[2.5rem] flex justify-between items-center shadow-sm">
          <div>
            <h3 className="text-sm font-sans font-black text-pink-600 uppercase tracking-widest mb-1 italic">Feed Initializer</h3>
            <p className="text-[10px] font-sans text-pink-400 font-medium">참가자들의 1~4번 사진 데이터를 강제로 생성하여 대시보드에 노출시킵니다.</p>
          </div>
          <button 
            onClick={generateFeedRecords}
            className="flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-2xl text-[10px] font-sans font-black uppercase tracking-widest shadow-md hover:bg-pink-700 transition-all active:scale-95"
          >
            <Sparkles size={14} /> 레코드 일괄 생성
          </button>
        </div>
      </section>

      <section className="bg-white p-7 rounded-[2.5rem] mb-12 shadow-sm border border-[#EEEBDE]">
        <h3 className="text-[9px] font-sans font-black tracking-[0.4em] text-[#A52A2A] uppercase mb-4 text-center italic">Current Session (회차)</h3>
        <div className="flex items-center justify-center gap-3">
          <input
            type="text"
            value={session}
            onChange={(e) => setSession(e.target.value)}
            disabled={isSessionLoading}
            className="w-20 text-center text-2xl font-black border-2 border-[#EEEBDE] rounded-xl py-3 focus:border-[#A52A2A] outline-none disabled:bg-gray-100"
            placeholder="01"
          />
          <button
            onClick={() => changeSession(session)}
            disabled={isSessionLoading}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:cursor-not-allowed ${
              sessionSuccess
                ? 'bg-green-600 text-white'
                : 'bg-[#1A1A1A] text-white hover:bg-[#A52A2A]'
            }`}
          >
            {isSessionLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> 저장 중...
              </>
            ) : sessionSuccess ? (
              <>
                <CheckCircle2 size={14} /> 저장 완료
              </>
            ) : (
              '저장'
            )}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[10px] font-sans font-black tracking-[0.3em] text-gray-300 uppercase italic mb-6">Attendee Management</h3>
        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="p-5 bg-white border border-[#EEEBDE] rounded-[2rem] flex justify-between items-center shadow-sm">
              <div className="min-w-0 pr-4 font-sans">
                <p className="font-bold text-sm truncate flex items-center gap-2">
                  {user.real_name} 
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${user.phone_suffix.endsWith("A") ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                    {user.phone_suffix}
                  </span>
                </p>
                <p className="text-[11px] text-[#A52A2A] font-black uppercase mt-0.5 italic">{user.nickname}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {user.phone_suffix.endsWith("A") ? (
                  <button onClick={() => handleUndoRename(user)} className="w-10 h-10 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 flex items-center justify-center"><RotateCcw size={16} /></button>
                ) : (
                  <button onClick={() => handleForceRename(user)} className="w-10 h-10 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 flex items-center justify-center"><UserPlus size={16} /></button>
                )}
                <button onClick={() => handleDeleteUser(user)} className="w-10 h-10 bg-red-50 text-red-700 rounded-2xl border border-red-100 flex items-center justify-center"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🚨 Danger Zone - 회차 초기화 */}
      <section className="mt-12 bg-red-50 border-2 border-red-200 p-8 rounded-[2.5rem]">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className="text-red-600" />
          <h3 className="text-sm font-sans font-black text-red-600 uppercase tracking-widest italic">Danger Zone</h3>
        </div>
        <div className="bg-white border border-red-100 p-6 rounded-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h4 className="font-bold text-[#1A1A1A] mb-1">회차 초기화 (Session Reset)</h4>
              <p className="text-[11px] font-sans text-gray-500 leading-relaxed">
                모든 유저, 피드, 입찰 기록을 삭제하고<br/>
                옥션을 초기 상태로 되돌립니다. <span className="text-red-500 font-bold">되돌릴 수 없습니다.</span>
              </p>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="shrink-0 px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-sans font-black uppercase tracking-widest shadow-md hover:bg-red-700 transition-all active:scale-95 flex items-center gap-2"
            >
              <RotateCcw size={14} /> 전체 초기화
            </button>
          </div>
        </div>
      </section>

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-serif italic font-bold mb-3 tracking-tight text-red-600">회차 초기화</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed font-sans">
              정말로 모든 데이터를 초기화하시겠습니까?<br/>
              <span className="text-red-500 font-bold">이 작업은 되돌릴 수 없습니다.</span>
            </p>
            <div className="bg-red-50 p-5 rounded-2xl mb-6 text-left border border-red-100">
              <p className="text-[10px] text-red-400 uppercase font-black mb-3 font-sans">삭제될 항목:</p>
              <ul className="text-xs text-gray-600 space-y-1 font-sans">
                <li>• 모든 유저 계정</li>
                <li>• 모든 피드 아이템 및 좋아요</li>
                <li>• 모든 입찰 기록</li>
                <li>• 옥션 진행 상태 (pending으로 리셋)</li>
              </ul>
            </div>
            <div className="mb-6">
              <p className="text-[10px] text-gray-400 uppercase font-black mb-2 font-sans">확인을 위해 "초기화"를 입력하세요</p>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="초기화"
                className="w-full text-center text-lg font-bold border-2 border-gray-200 rounded-xl py-3 focus:border-red-500 outline-none"
              />
            </div>
            <div className="space-y-3 font-sans">
              <button
                onClick={handleSessionReset}
                disabled={isResetLoading || resetConfirmText !== "초기화"}
                className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isResetLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> 초기화 중...
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} /> 초기화 실행
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetConfirmText("");
                }}
                disabled={isResetLoading}
                className="w-full py-3 text-[10px] text-gray-500 font-bold uppercase hover:underline disabled:opacity-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {showDriveModal && targetUser && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-3xl">⚠️</div>
            <h3 className="text-2xl font-serif italic font-bold mb-3 tracking-tight">Drive Sync Required</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed font-sans">
              데이터베이스 정보가 변경되었습니다.<br/>
              스태프님, <span className="text-[#A52A2A] font-bold underline">구글 드라이브 파일명</span>도<br/>
              즉시 수정이 필요합니다!
            </p>
            <div className="bg-gray-50 p-6 rounded-[1.5rem] mb-6 text-left border border-gray-100 font-mono">
              <p className="text-[9px] text-gray-400 uppercase font-black mb-2">Expected Filename</p>
              <code className="text-xs font-bold text-[#1A1A1A] break-all">
                ..._{targetUser.real_name}_{targetUser.newSuffix}_...
              </code>
            </div>
            <div className="space-y-3 font-sans">
              <button onClick={() => setShowDriveModal(false)} className="w-full py-5 bg-[#1A1A1A] text-white rounded-2xl font-black text-xs uppercase shadow-lg">확인 및 작업완료</button>
              <button onClick={() => handleUndoRename(targetUser)} className="w-full py-3 text-[10px] text-red-500 font-bold uppercase hover:underline">실행 취소</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}