"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, LayoutDashboard, UserPlus, Trash2, RotateCcw,
  Sparkles, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Gavel, Heart
} from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";
import { AUCTION_ITEMS } from "@/app/constants";

const { colors, borderRadius } = DESIGN_TOKENS;

export default function AdminSettings() {
  const router = useRouter();
  const [phase, setPhase] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionNum, setSessionNum] = useState("01");
  const [ratio, setRatio] = useState("5:5");
  const [users, setUsers] = useState<any[]>([]);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [isPhaseLoading, setIsPhaseLoading] = useState<string | null>(null);
  const [phaseSuccess, setPhaseSuccess] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [isAuctionResetLoading, setIsAuctionResetLoading] = useState(false);
  const [isFeedResetLoading, setIsFeedResetLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const fetchSettings = async () => {
    let currentSession = '01';
    try {
      const res = await fetch('/api/admin/phase');
      const data = await res.json();
      if (data.success && data.settings) {
        setPhase(data.settings.current_phase || '');
        const raw = data.settings.current_session || '';
        if (raw.includes('_')) {
          const [d, n] = raw.split('_');
          setSessionDate(d);
          setSessionNum(n);
        } else {
          setSessionDate(new Date().toISOString().slice(0, 10));
          setSessionNum(raw || '01');
        }
        setRatio(data.settings.session_ratio || '5:5');
        currentSession = raw || `${new Date().toISOString().slice(0, 10)}_01`;
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }

    const { data: u } = await supabase.from("users").select("*").eq("session_id", currentSession).order("created_at", { ascending: false });
    if (u) setUsers(u);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const syncInventoryFromConstants = async () => {
    if (!AUCTION_ITEMS || AUCTION_ITEMS.length === 0) {
      alert("constants.ts에서 AUCTION_ITEMS를 찾을 수 없습니다.");
      return;
    }
    if (!confirm(`현재 설정된 ${AUCTION_ITEMS.length}개의 가치관 목록으로 옥션을 초기화하시겠습니까?`)) return;

    setIsSyncLoading(true);
    try {
      await supabase.from("bids").delete().filter("id", "not.is", null);
      await supabase.from("auction_items").delete().filter("id", "not.is", null);

      const itemsToInsert = AUCTION_ITEMS.map((val) => ({
        title: val,
        current_bid: 0,
        status: 'pending'
      }));

      const { error } = await supabase.from("auction_items").insert(itemsToInsert);
      if (error) throw error;

      alert("✅ 가치관 목록 동기화 완료!");
    } catch (err: any) {
      console.error('Sync error:', err);
      alert("동기화 중 오류 발생: " + err.message);
    } finally {
      setIsSyncLoading(false);
    }
  };

  // --- [수정된 Feed Reset 로직] ---
  const resetFeed = async () => {
    if (!confirm("피드를 초기화하시겠습니까?\n- 모든 좋아요(하트) 기록이 삭제됩니다.")) return;

    setIsFeedResetLoading(true);
    try {
      // 1. feed_likes 테이블 삭제 (이것만 해도 피드에서 하트가 사라집니다)
      const { error: likesError } = await supabase
        .from("feed_likes")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (likesError) throw likesError;

      // 2. feed_items 테이블의 컬럼명 오류를 방지하기 위해 
      // 컬럼 업데이트 로직은 제외하거나, 정확한 컬럼 확인 후 추가하는 것이 안전합니다.
      // 일단 상세 기록 삭제만으로 초기화 효과를 낼 수 있도록 구성했습니다.

      alert("✅ 피드 좋아요 기록이 초기화되었습니다.");
      fetchSettings();
    } catch (err: any) {
      console.error('Feed reset error:', err);
      alert("초기화 중 오류 발생: " + err.message);
    } finally {
      setIsFeedResetLoading(false);
    }
  };

  const resetAuction = async () => {
    if (!confirm("경매를 초기화하시겠습니까?\n- 모든 입찰 내역 삭제\n- 모든 아이템 pending 상태로\n- 참가자 잔액 5000만원으로 복구")) return;

    setIsAuctionResetLoading(true);
    try {
      await supabase.from("bids").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("auction_items").update({
        status: 'pending',
        current_bid: 0,
        highest_bidder_id: null
      }).neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("users").update({ balance: 5000 }).neq("id", "00000000-0000-0000-0000-000000000000");

      alert("경매가 초기화되었습니다.");
      fetchSettings();
    } catch (err: any) {
      alert("초기화 중 오류 발생: " + err.message);
    } finally {
      setIsAuctionResetLoading(false);
    }
  };

  const changePhase = async (v: string) => {
    const phaseNames: any = {
      auction: "옥션 진행",
      feed: "갤러리(피드) 오픈",
      report: "최종 리포트 발행",
      completed: "세션 종료 (리포트 허브)"
    };

    if (!confirm(`[${phaseNames[v]}] 단계로 전환하시겠습니까? 모든 유저의 화면이 즉시 리다이렉트됩니다.`)) return;

    setIsPhaseLoading(v);
    setPhaseSuccess(null);

    try {
      const res = await fetch('/api/admin/phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: v })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to update phase');

      setPhase(v);
      setPhaseSuccess(v);
      setTimeout(() => setPhaseSuccess(null), 3000);
    } catch (err: any) {
      console.error('Phase change error:', err);
      alert("단계 전환 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsPhaseLoading(null);
    }
  };

  const generateFeedRecords = async () => {
    if (!confirm("모든 참가자의 사진 슬롯을 생성하시겠습니까? (이미 생성된 데이터는 유지됩니다)")) return;

    // 기존 레코드 조회하여 이미 있는 슬롯 스킵
    const { data: existing } = await supabase.from("feed_items").select("user_id, photo_number");
    const existingSet = new Set((existing || []).map(r => `${r.user_id}_${r.photo_number}`));

    const newRecords: any[] = [];
    users.forEach(user => {
      for (let i = 1; i <= 4; i++) {
        if (!existingSet.has(`${user.id}_${i}`)) {
          newRecords.push({
            user_id: user.id,
            photo_number: i,
            order_prefix: "00",
            gender_code: user.gender || "F"
          });
        }
      }
    });

    if (newRecords.length === 0) {
      alert("모든 슬롯이 이미 생성되어 있습니다.");
      return;
    }

    const { error } = await supabase.from("feed_items").insert(newRecords);
    if (!error) alert(`피드 레코드 ${newRecords.length}개가 생성되었습니다.`);
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

  const saveSession = async () => {
    setIsSessionLoading(true);
    setSessionSuccess(false);

    try {
      const composedSession = `${sessionDate}_${sessionNum}`;
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: composedSession, ratio })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to update session');

      setSessionSuccess(true);
      setTimeout(() => setSessionSuccess(false), 3000);
      // 유저 목록을 새 세션 기준으로 다시 불러오기
      await fetchSettings();
    } catch (err: any) {
      console.error('Session update error:', err);
      alert("회차 저장 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`[${user.nickname}] 참가자를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      fetchSettings();
    } catch (err: any) {
      alert("삭제 중 오류 발생: " + err.message);
    }
  };

  // 특정 세션 초기화
  const [resetTargetDate, setResetTargetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [resetTargetNum, setResetTargetNum] = useState("01");

  const handleSessionReset = async () => {
    const targetSessionId = `${resetTargetDate}_${resetTargetNum}`;
    if (resetConfirmText !== targetSessionId) {
      alert(`'${targetSessionId}'를 정확히 입력해주세요.`);
      return;
    }

    setIsResetLoading(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: targetSessionId })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Reset failed');

      alert(`✅ ${result.message}`);
      setShowResetConfirm(false);
      setResetConfirmText("");
      fetchSettings();
    } catch (err: any) {
      alert("초기화 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 font-serif relative pb-20" style={{ backgroundColor: colors.background, color: colors.primary }}>
      <motion.header
        className="mb-10 flex justify-between items-center shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push("/admin")}>
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <h1 className="text-xl italic font-bold">Backstage</h1>
        </div>
        <motion.button
          onClick={() => router.push("/admin/dashboard/auction")}
          className="text-[10px] font-sans font-black uppercase tracking-widest text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2"
          style={{ backgroundColor: colors.accent }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <LayoutDashboard size={14} /> Go Dashboard
        </motion.button>
      </motion.header>

      {/* Phase Control */}
      <motion.section
        className="p-7 text-white mb-6 shadow-2xl"
        style={{ backgroundColor: colors.primary, borderRadius: "2.5rem", borderBottom: `4px solid ${colors.accent}` }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[9px] font-sans font-black tracking-[0.4em] uppercase italic" style={{ color: colors.accent }}>Service Phase Control</h3>
          <div className="flex items-center gap-1.5 bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[8px] font-black uppercase text-red-400 font-sans">Live Sync Active</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {['auction', 'feed', 'report', 'completed'].map(p => (
            <motion.button
              key={p}
              onClick={() => changePhase(p)}
              disabled={isPhaseLoading !== null}
              className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex flex-col items-center gap-2 ${phase === p ? 'border-transparent scale-105' : 'border-white/10 opacity-30'}`}
              style={{ backgroundColor: phase === p ? colors.accent : 'transparent' }}
            >
              {isPhaseLoading === p ? <Loader2 size={16} className="animate-spin" /> : phaseSuccess === p ? <CheckCircle2 size={16} /> : p}
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* Values Sync */}
      <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="p-8 flex justify-between items-center shadow-sm" style={{ backgroundColor: `${colors.primary}05`, border: `1px solid ${colors.soft}`, borderRadius: "2.5rem" }}>
          <div>
            <h3 className="text-sm font-sans font-black uppercase tracking-widest mb-1 italic" style={{ color: colors.primary }}>Values Sync</h3>
            <p className="text-[10px] font-sans font-medium text-gray-400">constants.ts의 AUCTION_ITEMS 리스트를 DB와 동기화합니다.</p>
          </div>
          <motion.button
            onClick={syncInventoryFromConstants}
            disabled={isSyncLoading}
            className="flex items-center gap-2 px-6 py-3 text-white text-[10px] font-sans font-black uppercase tracking-widest shadow-md"
            style={{ backgroundColor: colors.primary, borderRadius: borderRadius.card }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isSyncLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 가치관 동기화
          </motion.button>
        </div>
      </motion.section>

      {/* Auction Reset */}
      <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="p-8 flex justify-between items-center shadow-sm" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "2.5rem" }}>
          <div>
            <h3 className="text-sm font-sans font-black uppercase tracking-widest mb-1 italic text-red-600">Auction Reset</h3>
            <p className="text-[10px] font-sans font-medium text-red-400">입찰 내역 삭제, 아이템 초기화, 잔액 5000만원 복구</p>
          </div>
          <motion.button
            onClick={resetAuction}
            disabled={isAuctionResetLoading}
            className="flex items-center gap-2 px-6 py-3 text-white text-[10px] font-sans font-black uppercase tracking-widest shadow-md bg-red-500"
            style={{ borderRadius: borderRadius.card }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isAuctionResetLoading ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />} 경매 초기화
          </motion.button>
        </div>
      </motion.section>

      {/* Feed Reset (Fixed) */}
      <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="p-8 flex justify-between items-center shadow-sm" style={{ backgroundColor: "#FDF2F8", border: "1px solid #FBCFE8", borderRadius: "2.5rem" }}>
          <div>
            <h3 className="text-sm font-sans font-black uppercase tracking-widest mb-1 italic text-pink-600">Feed Reset</h3>
            <p className="text-[10px] font-sans font-medium text-pink-400">모든 좋아요(하트) 기록을 삭제합니다.</p>
          </div>
          <motion.button
            onClick={resetFeed}
            disabled={isFeedResetLoading}
            className="flex items-center gap-2 px-6 py-3 text-white text-[10px] font-sans font-black uppercase tracking-widest shadow-md bg-pink-500 disabled:bg-pink-300"
            style={{ borderRadius: borderRadius.card }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isFeedResetLoading ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} />} 피드 초기화
          </motion.button>
        </div>
      </motion.section>

      {/* Feed Initializer */}
      <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="p-8 flex justify-between items-center shadow-sm" style={{ backgroundColor: `${colors.accent}08`, border: `1px solid ${colors.accent}20`, borderRadius: "2.5rem" }}>
          <div>
            <h3 className="text-sm font-sans font-black uppercase tracking-widest mb-1 italic" style={{ color: colors.accent }}>Feed Initializer</h3>
            <p className="text-[10px] font-sans font-medium" style={{ color: colors.muted }}>참가자들의 사진 슬롯 데이터를 강제로 생성합니다.</p>
          </div>
          <motion.button
            onClick={generateFeedRecords}
            className="flex items-center gap-2 px-6 py-3 text-white text-[10px] font-sans font-black uppercase tracking-widest shadow-md"
            style={{ backgroundColor: colors.accent, borderRadius: borderRadius.card }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles size={14} /> 레코드 일괄 생성
          </motion.button>
        </div>
      </motion.section>

      {/* Current Session */}
      <motion.section className="bg-white p-7 mb-12 shadow-sm" style={{ borderRadius: "2.5rem", border: `1px solid ${colors.soft}` }}>
        <h3 className="text-[9px] font-sans font-black tracking-[0.4em] uppercase mb-3 text-center italic" style={{ color: colors.accent }}>Session Config</h3>
        <p className="text-center text-xs mb-5" style={{ color: colors.muted }}>
          현재: <span className="font-black" style={{ color: colors.accent }}>{sessionDate} {sessionNum}회차</span>
          <span className="mx-2">·</span>
          비율 <span className="font-black" style={{ color: colors.accent }}>{ratio}</span>
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="text-center">
            <p className="text-[9px] font-sans font-black uppercase tracking-widest mb-2" style={{ color: colors.muted }}>날짜</p>
            <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} disabled={isSessionLoading} className="w-[140px] text-center text-sm font-black border-2 rounded-xl py-3 outline-none" style={{ borderColor: colors.soft }} />
          </div>
          <div className="text-center">
            <p className="text-[9px] font-sans font-black uppercase tracking-widest mb-2" style={{ color: colors.muted }}>회차</p>
            <input type="text" value={sessionNum} onChange={(e) => setSessionNum(e.target.value)} disabled={isSessionLoading} placeholder="01" className="w-14 text-center text-2xl font-black border-2 rounded-xl py-3 outline-none" style={{ borderColor: colors.soft }} />
          </div>
          <div className="text-xl font-thin mt-6" style={{ color: colors.soft }}>/</div>
          <div className="text-center">
            <p className="text-[9px] font-sans font-black uppercase tracking-widest mb-2" style={{ color: colors.muted }}>남 : 여</p>
            <input type="text" value={ratio} onChange={(e) => setRatio(e.target.value)} disabled={isSessionLoading} placeholder="5:5" className="w-20 text-center text-2xl font-black border-2 rounded-xl py-3 outline-none" style={{ borderColor: colors.soft }} />
          </div>
          <motion.button
            onClick={saveSession}
            disabled={isSessionLoading}
            className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:cursor-not-allowed text-white mt-6"
            style={{ backgroundColor: sessionSuccess ? '#16a34a' : colors.primary }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isSessionLoading ? <Loader2 size={14} className="animate-spin" /> : sessionSuccess ? <CheckCircle2 size={14} /> : '저장'}
          </motion.button>
        </div>
      </motion.section>

      {/* Attendee Management */}
      <motion.section className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] font-sans font-black tracking-[0.3em] uppercase italic" style={{ color: colors.muted }}>Attendee Management</h3>
          {(() => {
            const [expM, expF] = ratio.split(":").map(Number);
            const mCount = users.filter(u => u.gender === "남성").length;
            const fCount = users.filter(u => u.gender === "여성").length;
            return (
              <div className="flex items-center gap-4 text-[11px] font-sans">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  남 <span className={`font-black ${mCount >= (expM || 0) ? 'text-emerald-600' : ''}`}>{mCount}</span>
                  <span style={{ color: colors.muted }}>/{expM || '?'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
                  여 <span className={`font-black ${fCount >= (expF || 0) ? 'text-emerald-600' : ''}`}>{fCount}</span>
                  <span style={{ color: colors.muted }}>/{expF || '?'}</span>
                </span>
                <span style={{ color: colors.muted }}>|</span>
                <span>
                  총 <span className={`font-black ${(mCount + fCount) >= ((expM || 0) + (expF || 0)) ? 'text-emerald-600' : ''}`} style={{ color: (mCount + fCount) >= ((expM || 0) + (expF || 0)) ? undefined : colors.accent }}>{mCount + fCount}</span>
                  <span style={{ color: colors.muted }}>/{(expM || 0) + (expF || 0)}명</span>
                </span>
              </div>
            );
          })()}
        </div>
        <div className="space-y-3">
          {users.map((user) => (
            <motion.div key={user.id} className="p-5 bg-white flex justify-between items-center shadow-sm" style={{ borderRadius: "2rem", border: `1px solid ${colors.soft}` }}>
              <div className="min-w-0 pr-4">
                <p className="font-bold text-sm truncate flex items-center gap-2">
                  {user.real_name}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${user.gender === '남성' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-pink-50 border-pink-200 text-pink-600'}`}>
                    {user.gender === '남성' ? '남' : '여'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${user.phone_suffix.toString().endsWith("A") ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                    {user.phone_suffix}
                  </span>
                </p>
                <p className="text-[11px] font-black uppercase mt-0.5 italic" style={{ color: colors.accent }}>{user.nickname}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <motion.button
                  onClick={() => user.phone_suffix.toString().endsWith("A") ? handleUndoRename(user) : handleForceRename(user)}
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${user.phone_suffix.toString().endsWith("A") ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {user.phone_suffix.toString().endsWith("A") ? <RotateCcw size={16} /> : <UserPlus size={16} />}
                </motion.button>
                <motion.button
                  onClick={() => handleDeleteUser(user)}
                  className="w-10 h-10 bg-red-50 text-red-700 rounded-2xl border border-red-100 flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 size={16} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Danger Zone */}
      <motion.section className="mt-12 bg-red-50 border-2 border-red-200 p-8" style={{ borderRadius: "2.5rem" }}>
        <div className="flex items-center gap-3 mb-4 text-red-600">
          <AlertTriangle size={20} />
          <h3 className="text-sm font-sans font-black uppercase tracking-widest italic">Danger Zone</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-red-100">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-bold">Session Reset</h4>
              <p className="text-[11px] text-gray-400 font-sans">특정 날짜/회차의 데이터만 초기화</p>
            </div>
            <motion.button
              onClick={() => {
                setResetTargetDate(sessionDate);
                setResetTargetNum(sessionNum);
                setShowResetConfirm(true);
              }}
              className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-sans font-black uppercase shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              회차 초기화
            </motion.button>
          </div>
        </div>
      </motion.section>

      {/* Modals */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white p-10 rounded-[3rem] w-full max-w-md text-center shadow-2xl">
              <h3 className="text-2xl font-serif italic font-bold text-red-600 mb-4">회차 초기화</h3>

              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="text-center">
                  <p className="text-[9px] font-sans font-black uppercase tracking-widest mb-1 text-gray-400">날짜</p>
                  <input type="date" value={resetTargetDate} onChange={(e) => setResetTargetDate(e.target.value)} className="w-[140px] text-center text-sm font-bold border-2 rounded-xl py-2 outline-none focus:border-red-500 font-sans" />
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-sans font-black uppercase tracking-widest mb-1 text-gray-400">회차</p>
                  <input type="text" value={resetTargetNum} onChange={(e) => setResetTargetNum(e.target.value)} className="w-14 text-center text-lg font-bold border-2 rounded-xl py-2 outline-none focus:border-red-500 font-sans" />
                </div>
              </div>

              <div className="bg-red-50 rounded-xl p-4 mb-5 border border-red-100">
                <p className="text-sm text-red-600 font-bold font-sans mb-1">삭제 대상: {resetTargetDate} {parseInt(resetTargetNum)}회차</p>
                <p className="text-[11px] text-red-400 font-sans">해당 회차의 유저, 입찰, 피드, 매칭, 리포트가 모두 삭제됩니다.</p>
              </div>

              <p className="text-sm text-gray-500 mb-3 font-sans">확인을 위해 아래에 세션 ID를 입력하세요.</p>
              <p className="text-xs text-gray-400 font-mono mb-2">{resetTargetDate}_{resetTargetNum}</p>
              <input type="text" value={resetConfirmText} onChange={(e) => setResetConfirmText(e.target.value)} placeholder={`${resetTargetDate}_${resetTargetNum}`} className="w-full text-center text-base font-bold border-2 rounded-xl py-3 mb-6 outline-none focus:border-red-500 font-sans font-mono" />
              <button onClick={handleSessionReset} disabled={isResetLoading || resetConfirmText !== `${resetTargetDate}_${resetTargetNum}`} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black font-sans shadow-lg disabled:bg-gray-300">초기화 실행</button>
              <button onClick={() => { setShowResetConfirm(false); setResetConfirmText(""); }} className="mt-4 text-gray-400 text-[10px] font-black uppercase hover:underline font-sans">취소</button>
            </motion.div>
          </div>
        )}

        {showDriveModal && targetUser && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white p-10 rounded-[3rem] w-full max-w-sm text-center shadow-2xl">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">!</div>
              <h3 className="text-xl font-serif italic font-bold mb-4">Drive Sync Required</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed font-sans">구글 드라이브 파일명도 수정해야 합니다.<br/>New Suffix: <b>{targetUser.newSuffix}</b></p>
              <button onClick={() => setShowDriveModal(false)} className="w-full py-5 bg-[#1A1A1A] text-white rounded-2xl font-black text-xs uppercase shadow-lg font-sans">확인 완료</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}