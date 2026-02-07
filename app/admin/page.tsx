"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Settings, LogOut, Lock, ImageIcon, Sparkles, Loader2, CheckCircle, AlertCircle, Eye, Flag, Users, CheckCircle2 } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";
import { supabase } from "@/lib/supabase";

const { colors, borderRadius, transitions } = DESIGN_TOKENS;

export default function AdminGate() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  // 세션 설정 (날짜_회차 형식: "2026-02-07_01")
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionNum, setSessionNum] = useState("01");
  const [ratio, setRatio] = useState("5:5");
  const [isSessionSaving, setIsSessionSaving] = useState(false);
  const [sessionSaveSuccess, setSessionSaveSuccess] = useState(false);
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);

  // 매칭 확정 관련 상태
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<{ success: boolean; message: string } | null>(null);

  // 세션 종료 상태
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [sessionEndResult, setSessionEndResult] = useState<{ success: boolean; message: string } | null>(null);

  // 세션 종료 & 리포트 허브 오픈
  const handleEndSession = useCallback(async () => {
    if (isEndingSession) return;
    const confirmed = confirm(
      "세션을 종료하시겠습니까?\n\n1. 모든 유저의 리포트 스냅샷이 생성됩니다.\n2. 유저들은 리포트 허브로 이동됩니다.\n3. 스냅샷은 24시간 후 자동 삭제됩니다."
    );
    if (!confirmed) return;

    setIsEndingSession(true);
    setSessionEndResult(null);

    try {
      const snapRes = await fetch('/api/admin/snapshot', { method: 'POST' });
      const snapData = await snapRes.json();
      if (!snapData.success) throw new Error(snapData.error || '스냅샷 생성 실패');

      const phaseRes = await fetch('/api/admin/phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'completed' }),
      });
      const phaseData = await phaseRes.json();
      if (!phaseData.success) throw new Error(phaseData.error || 'Phase 변경 실패');

      setSessionEndResult({
        success: true,
        message: `세션 종료 완료! ${snapData.count}개의 스냅샷이 생성되었습니다.`,
      });
    } catch (err: any) {
      setSessionEndResult({
        success: false,
        message: err.message || '세션 종료 중 오류가 발생했습니다.',
      });
    } finally {
      setIsEndingSession(false);
    }
  }, [isEndingSession]);

  // 세션 설정 + 유저 수 조회
  const fetchSessionData = useCallback(async () => {
    let currentSession = '';
    try {
      const res = await fetch('/api/admin/phase');
      const data = await res.json();
      if (data.success && data.settings) {
        const raw = data.settings.current_session || '';
        // "2026-02-07_01" 형식 파싱
        if (raw.includes('_')) {
          const [d, n] = raw.split('_');
          setSessionDate(d);
          setSessionNum(n);
        } else {
          // 레거시 단순 번호 → 오늘 날짜 + 해당 번호
          setSessionDate(new Date().toISOString().slice(0, 10));
          setSessionNum(raw || '01');
        }
        setRatio(data.settings.session_ratio || '5:5');
        currentSession = raw;
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }

    if (currentSession) {
      const { data: users } = await supabase.from("users").select("gender").eq("session_id", currentSession);
      if (users) {
        setMaleCount(users.filter(u => u.gender === "남성").length);
        setFemaleCount(users.filter(u => u.gender === "여성").length);
      }
    }
  }, []);

  // 합성 세션 ID (날짜_회차)
  const sessionId = `${sessionDate}_${sessionNum}`;

  // 세션 저장 + phase→auction + 옥션 아이템 리셋 (이전 데이터 보존)
  const handleSaveSession = useCallback(async () => {
    const composedSession = `${sessionDate}_${sessionNum}`;
    const confirmed = confirm(
      `[${sessionDate} ${sessionNum}회차]로 새 세션을 시작합니다.\n\n` +
      `1. 이전 세션 리포트 스냅샷 자동 생성\n2. 세션 & 비율 저장\n3. Phase → 옥션 전환\n4. 옥션 아이템 초기화\n\n※ 이전 세션의 입찰/좋아요 데이터는 보존됩니다.\n\n진행하시겠습니까?`
    );
    if (!confirmed) return;

    setIsSessionSaving(true);
    setSessionSaveSuccess(false);
    try {
      // 0. 이전 세션 스냅샷 자동 생성 (데이터 보존)
      try {
        const snapRes = await fetch('/api/admin/snapshot', { method: 'POST' });
        const snapData = await snapRes.json();
        if (snapData.success) {
          console.log(`📸 이전 세션 스냅샷 생성 완료: ${snapData.count}개`);
        }
      } catch (e) {
        console.warn('스냅샷 생성 실패 (계속 진행):', e);
      }

      // 1. 세션 + 비율 저장
      const sessionRes = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: composedSession, ratio }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionData.success) throw new Error(sessionData.error);

      // 2. Phase → auction
      const phaseRes = await fetch('/api/admin/phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'auction' }),
      });
      const phaseData = await phaseRes.json();
      if (!phaseData.success) throw new Error(phaseData.error);

      // 3. 옥션 아이템만 리셋 (공유 리소스)
      // bids, feed_likes, conversation_feedback는 보존 (이전 세션 리포트에 필요)
      await supabase.from("auction_items").update({
        status: 'pending',
        current_bid: 0,
        highest_bidder_id: null
      }).neq("id", "00000000-0000-0000-0000-000000000000");

      setSessionSaveSuccess(true);
      setTimeout(() => setSessionSaveSuccess(false), 3000);
      await fetchSessionData();
    } catch (err: any) {
      alert("저장 중 오류: " + err.message);
    } finally {
      setIsSessionSaving(false);
    }
  }, [sessionDate, sessionNum, ratio, fetchSessionData]);

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") setIsAuthenticated(true);
    fetchSessionData();
  }, [fetchSessionData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "1234") {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
    } else {
      alert("Passcode Incorrect");
    }
  };

  // 최종 매칭 확정 API 호출
  const handleFinalizeMatches = async () => {
    if (isFinalizing) return;

    const confirmed = confirm(
      "최종 매칭을 확정하시겠습니까?\n\n이 작업은 기존 매칭 데이터를 삭제하고 새로운 매칭 결과를 생성합니다."
    );
    if (!confirmed) return;

    setIsFinalizing(true);
    setFinalizeResult(null);

    try {
      const res = await fetch('/api/admin/finalize-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: `${sessionDate}_${sessionNum}` })
      });

      const data = await res.json();

      if (data.success) {
        setFinalizeResult({
          success: true,
          message: `매칭 완료! ${data.matches_created}개의 매칭이 생성되었습니다.`
        });
      } else {
        setFinalizeResult({
          success: false,
          message: data.error || '매칭 생성 중 오류가 발생했습니다.'
        });
      }
    } catch (err: any) {
      setFinalizeResult({
        success: false,
        message: err.message || '서버 연결 오류'
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 font-serif" style={{ backgroundColor: colors.primary }}>
        <motion.form
          onSubmit={handleLogin}
          className="p-12 text-center w-full max-w-sm shadow-2xl"
          style={{
            backgroundColor: "#111111",
            borderRadius: borderRadius.onboarding,
            borderTop: `12px solid ${colors.accent}`
          }}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: transitions.default.duration, ease: transitions.default.ease }}
        >
          <motion.div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8"
            style={{ backgroundColor: `${colors.accent}20`, color: colors.accent }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <Lock size={24} />
          </motion.div>
          <h1 className="text-2xl italic mb-10 tracking-tighter text-white">Admin Access</h1>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full p-5 bg-black/50 border-2 border-white/5 rounded-2xl mb-6 text-center text-3xl text-white outline-none transition-all"
            style={{
              borderColor: passwordInput ? colors.accent : "rgba(255,255,255,0.05)"
            }}
            placeholder="••••"
            autoFocus
          />
          <motion.button
            type="submit"
            className="w-full text-white py-5 rounded-2xl font-sans font-black tracking-widest text-xs uppercase shadow-lg"
            style={{ backgroundColor: colors.accent }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Verify
          </motion.button>
        </motion.form>
      </main>
    );
  }

  // 비율 파싱
  const [expectedMale, expectedFemale] = ratio.split(":").map(Number);
  const totalUsers = maleCount + femaleCount;
  const expectedTotal = (expectedMale || 0) + (expectedFemale || 0);

  const menuItems = [
    {
      label: "Dashboard",
      description: "Live Auction & Stats",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
      accentColor: colors.accent
    },
    {
      label: "Feed Initializer",
      description: "Photo Sync & Session Control",
      icon: ImageIcon,
      path: "/admin/feed-init",
      accentColor: "#3B82F6"
    },
    {
      label: "Settings",
      description: "User & Phase Control",
      icon: Settings,
      path: "/admin/settings",
      accentColor: "#8B5CF6"
    }
  ];

  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-white font-serif" style={{ backgroundColor: colors.primary }}>
      <motion.div
        className="max-w-md w-full space-y-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        <header>
          <motion.h1
            className="text-4xl italic mb-3 tracking-tighter"
            style={{ color: colors.accent }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            Admin Gateway
          </motion.h1>
          <motion.p
            className="text-[10px] font-sans font-black uppercase tracking-[0.5em] opacity-40 italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.3 }}
          >
            Me Before You Control Center
          </motion.p>
        </header>

        {/* ─── 세션 설정 패널 ─── */}
        <motion.div
          className="p-6 border border-white/10 rounded-[2.5rem] bg-[#161616] shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-3 justify-center">
            <Users size={16} className="text-amber-400" />
            <span className="text-[9px] font-sans font-black uppercase tracking-[0.4em] text-amber-400">Session Config</span>
          </div>
          <p className="text-center text-[11px] text-white/40 font-sans mb-5">
            현재: <span className="text-amber-400 font-bold">{sessionDate} {sessionNum}회차</span>
          </p>

          <div className="flex items-center justify-center gap-3 mb-5 flex-wrap">
            {/* 날짜 */}
            <div className="text-center">
              <p className="text-[9px] font-sans font-black uppercase tracking-widest text-white/40 mb-2">날짜</p>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-[140px] text-center text-sm font-black bg-black/50 border-2 border-white/10 rounded-xl py-2.5 text-white outline-none focus:border-amber-500 transition-colors [color-scheme:dark]"
              />
            </div>

            {/* 회차 */}
            <div className="text-center">
              <p className="text-[9px] font-sans font-black uppercase tracking-widest text-white/40 mb-2">회차</p>
              <input
                type="text"
                value={sessionNum}
                onChange={(e) => setSessionNum(e.target.value)}
                placeholder="01"
                className="w-14 text-center text-2xl font-black bg-black/50 border-2 border-white/10 rounded-xl py-2.5 text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="text-white/20 text-2xl font-thin mt-6">/</div>

            {/* 비율 */}
            <div className="text-center">
              <p className="text-[9px] font-sans font-black uppercase tracking-widest text-white/40 mb-2">남 : 여</p>
              <input
                type="text"
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                placeholder="5:5"
                className="w-20 text-center text-2xl font-black bg-black/50 border-2 border-white/10 rounded-xl py-2.5 text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* 저장 */}
            <motion.button
              onClick={handleSaveSession}
              disabled={isSessionSaving}
              className="mt-6 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: sessionSaveSuccess ? '#16a34a' : colors.accent }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isSessionSaving ? <Loader2 size={14} className="animate-spin" /> : sessionSaveSuccess ? <CheckCircle2 size={14} /> : '저장'}
            </motion.button>
          </div>

          {/* 현재 인원 현황 */}
          <div className="flex items-center justify-center gap-6 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs font-sans">
                남 <span className={`font-black ${maleCount >= (expectedMale || 0) ? 'text-emerald-400' : 'text-white'}`}>{maleCount}</span>
                <span className="text-white/30">/{expectedMale || '?'}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-400" />
              <span className="text-xs font-sans">
                여 <span className={`font-black ${femaleCount >= (expectedFemale || 0) ? 'text-emerald-400' : 'text-white'}`}>{femaleCount}</span>
                <span className="text-white/30">/{expectedFemale || '?'}</span>
              </span>
            </div>
            <div className="text-white/20 text-xs">|</div>
            <span className="text-xs font-sans">
              총 <span className={`font-black ${totalUsers >= expectedTotal ? 'text-emerald-400' : 'text-amber-400'}`}>{totalUsers}</span>
              <span className="text-white/30">/{expectedTotal || '?'}명</span>
            </span>
          </div>
        </motion.div>

        <nav className="grid grid-cols-1 gap-4 pt-4">
          {menuItems.map((item, idx) => (
            <motion.button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="group p-6 border border-white/5 flex items-center gap-6 transition-all shadow-xl"
              style={{
                backgroundColor: "#161616",
                borderRadius: "2.5rem"
              }}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
              whileHover={{
                borderColor: item.accentColor,
                backgroundColor: colors.primary
              }}
            >
              <motion.div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: `${item.accentColor}20`,
                  color: item.accentColor
                }}
                whileHover={{ scale: 1.1 }}
              >
                <item.icon size={24} />
              </motion.div>
              <div className="text-left">
                <p className="text-lg font-bold">{item.label}</p>
                <p className="text-[9px] opacity-40 uppercase tracking-widest font-sans mt-0.5">{item.description}</p>
              </div>
            </motion.button>
          ))}
        </nav>

        {/* 최종 매칭 확정 버튼 */}
        <motion.div
          className="pt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <motion.button
            onClick={handleFinalizeMatches}
            disabled={isFinalizing}
            className="w-full p-6 border-2 border-dashed border-emerald-500/30 rounded-[2rem] bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!isFinalizing ? { scale: 1.02 } : {}}
            whileTap={!isFinalizing ? { scale: 0.98 } : {}}
          >
            {isFinalizing ? (
              <>
                <Loader2 size={24} className="text-emerald-400 animate-spin" />
                <div className="text-left">
                  <p className="text-lg font-bold text-emerald-400">매칭 계산 중...</p>
                  <p className="text-[9px] opacity-60 uppercase tracking-widest font-sans mt-0.5 text-emerald-300">Gale-Shapley Algorithm Running</p>
                </div>
              </>
            ) : (
              <>
                <motion.div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500/20"
                  whileHover={{ scale: 1.1, rotate: 15 }}
                >
                  <Sparkles size={24} className="text-emerald-400" />
                </motion.div>
                <div className="text-left">
                  <p className="text-lg font-bold text-emerald-400">최종 매칭 확정</p>
                  <p className="text-[9px] opacity-60 uppercase tracking-widest font-sans mt-0.5 text-emerald-300">Generate Final Match Results</p>
                </div>
              </>
            )}
          </motion.button>

          {/* 결과 메시지 */}
          <AnimatePresence>
            {finalizeResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-4 p-4 rounded-2xl flex items-center gap-3 ${
                  finalizeResult.success
                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                    : 'bg-red-500/20 border border-red-500/30'
                }`}
              >
                {finalizeResult.success ? (
                  <CheckCircle size={20} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={20} className="text-red-400" />
                )}
                <span className={`text-sm ${finalizeResult.success ? 'text-emerald-300' : 'text-red-300'}`}>
                  {finalizeResult.message}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 매칭 결과 보기 버튼 */}
          <motion.button
            onClick={() => router.push('/admin/dashboard/1on1/results')}
            className="w-full mt-4 p-5 border border-pink-500/30 rounded-[2rem] bg-pink-500/10 hover:bg-pink-500/20 hover:border-pink-500/50 transition-all flex items-center justify-center gap-4 group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-pink-500/20"
              whileHover={{ scale: 1.1 }}
            >
              <Eye size={20} className="text-pink-400" />
            </motion.div>
            <div className="text-left">
              <p className="text-base font-bold text-pink-400">매칭 결과 보기</p>
              <p className="text-[9px] opacity-60 uppercase tracking-widest font-sans mt-0.5 text-pink-300">View Match Results & MC Guide</p>
            </div>
          </motion.button>
        </motion.div>

        {/* 세션 종료 & 리포트 허브 오픈 */}
        <motion.div
          className="pt-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <motion.button
            onClick={handleEndSession}
            disabled={isEndingSession}
            className="w-full p-6 border-2 border-dashed border-violet-500/30 rounded-[2rem] bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-500/50 transition-all flex items-center justify-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!isEndingSession ? { scale: 1.02 } : {}}
            whileTap={!isEndingSession ? { scale: 0.98 } : {}}
          >
            {isEndingSession ? (
              <>
                <Loader2 size={24} className="text-violet-400 animate-spin" />
                <div className="text-left">
                  <p className="text-lg font-bold text-violet-400">스냅샷 생성 중...</p>
                  <p className="text-[9px] opacity-60 uppercase tracking-widest font-sans mt-0.5 text-violet-300">Creating Report Snapshots</p>
                </div>
              </>
            ) : (
              <>
                <motion.div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center bg-violet-500/20"
                  whileHover={{ scale: 1.1, rotate: 15 }}
                >
                  <Flag size={24} className="text-violet-400" />
                </motion.div>
                <div className="text-left">
                  <p className="text-lg font-bold text-violet-400">세션 종료 & 리포트 허브 오픈</p>
                  <p className="text-[9px] opacity-60 uppercase tracking-widest font-sans mt-0.5 text-violet-300">End Session & Open Report Hub</p>
                </div>
              </>
            )}
          </motion.button>

          <AnimatePresence>
            {sessionEndResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-4 p-4 rounded-2xl flex items-center gap-3 ${
                  sessionEndResult.success
                    ? 'bg-violet-500/20 border border-violet-500/30'
                    : 'bg-red-500/20 border border-red-500/30'
                }`}
              >
                {sessionEndResult.success ? (
                  <CheckCircle size={20} className="text-violet-400" />
                ) : (
                  <AlertCircle size={20} className="text-red-400" />
                )}
                <span className={`text-sm ${sessionEndResult.success ? 'text-violet-300' : 'text-red-300'}`}>
                  {sessionEndResult.message}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.button
          onClick={() => { sessionStorage.removeItem("admin_auth"); window.location.href = "/"; }}
          className="pt-10 text-[10px] text-white/20 hover:text-white uppercase tracking-[0.3em] font-sans font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          whileHover={{ scale: 1.05 }}
        >
          <LogOut size={12} /> Exit Admin Session
        </motion.button>
      </motion.div>
    </main>
  );
}
