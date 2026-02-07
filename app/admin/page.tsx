"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Settings, LogOut, Lock, ImageIcon, Sparkles, Loader2, CheckCircle, AlertCircle, Heart, Eye, Send, XCircle, MessageCircle } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

const { colors, borderRadius, transitions } = DESIGN_TOKENS;

export default function AdminGate() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  // 매칭 확정 관련 상태
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<{ success: boolean; message: string } | null>(null);

  // 최종 리포트 발송 상태
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [surveyStats, setSurveyStats] = useState<{
    feedbackCount: number;
    matchedUserCount: number;
    activeRound: number;
    expectedTotal: number;
    completionRate: number;
  } | null>(null);

  // 리포트 상태 조회
  const fetchSurveyStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/final-report');
      const data = await res.json();
      if (data.success) {
        setSurveyStats(data.survey);
        setIsReportOpen(data.is_final_report_open);
      }
    } catch (e) {
      console.error('Failed to fetch survey stats:', e);
    }
  }, []);

  // 리포트 발송 / 취소
  const handleReportToggle = useCallback(async (open: boolean) => {
    if (isSendingReport) return;
    setIsSendingReport(true);
    try {
      const res = await fetch('/api/admin/final-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open }),
      });
      const data = await res.json();
      if (data.success) {
        setIsReportOpen(open);
      }
    } catch (e) {
      console.error('Failed to toggle report:', e);
    } finally {
      setIsSendingReport(false);
    }
  }, [isSendingReport]);

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") setIsAuthenticated(true);
    fetchSurveyStats();
  }, [fetchSurveyStats]);

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
        body: JSON.stringify({ sessionId: '01' })
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

        <nav className="grid grid-cols-1 gap-4 pt-12">
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

        {/* 최종 리포트 발송 섹션 */}
        <motion.div
          className="pt-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="p-6 border border-amber-500/30 rounded-[2rem] bg-amber-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20">
                <Sparkles size={20} className="text-amber-400" />
              </div>
              <div className="text-left">
                <p className="text-base font-bold text-amber-400">The Final Command</p>
                <p className="text-[9px] opacity-60 uppercase tracking-widest font-sans mt-0.5 text-amber-300">시그니처 리포트 발송</p>
              </div>
            </div>

            {/* 현재 상태 표시 */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${isReportOpen ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
              <span className="text-xs font-sans text-white/60">
                {isReportOpen ? '발송됨 (유저 열람 가능)' : '미발송'}
              </span>
              {surveyStats && (
                <span className="ml-auto text-xs font-sans text-amber-300/70 flex items-center gap-1">
                  <MessageCircle size={11} />
                  {surveyStats.feedbackCount}/{surveyStats.expectedTotal} ({surveyStats.completionRate}%)
                </span>
              )}
            </div>

            {/* 발송 취소 / 발송 버튼 */}
            <div className="flex gap-3">
              <motion.button
                onClick={() => handleReportToggle(false)}
                disabled={isSendingReport || !isReportOpen}
                whileHover={!isSendingReport && isReportOpen ? { scale: 1.02 } : {}}
                whileTap={!isSendingReport && isReportOpen ? { scale: 0.98 } : {}}
                className={`flex-1 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  !isReportOpen || isSendingReport
                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                }`}
              >
                {isSendingReport && !isReportOpen ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                발송 취소
              </motion.button>
              <motion.button
                onClick={() => handleReportToggle(true)}
                disabled={isSendingReport || isReportOpen}
                whileHover={!isSendingReport && !isReportOpen ? { scale: 1.02 } : {}}
                whileTap={!isSendingReport && !isReportOpen ? { scale: 0.98 } : {}}
                className={`flex-1 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  isReportOpen || isSendingReport
                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                }`}
              >
                {isSendingReport && isReportOpen ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                발송
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.button
          onClick={() => { sessionStorage.removeItem("admin_auth"); window.location.href = "/"; }}
          className="pt-10 text-[10px] text-white/20 hover:text-white uppercase tracking-[0.3em] font-sans font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.05 }}
        >
          <LogOut size={12} /> Exit Admin Session
        </motion.button>
      </motion.div>
    </main>
  );
}
