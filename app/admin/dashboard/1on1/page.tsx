"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Users, Settings, Play, RotateCcw, Timer, Volume2, Heart, Send, Check, MessageCircle, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

export default function Admin1on1Dashboard() {
  const router = useRouter();
  const [matchCount, setMatchCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // Timer states
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timeLeft, setTimeLeft] = useState(5 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerFinished, setIsTimerFinished] = useState(false);

  // Feedback modal states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Final report states
  const [surveyStats, setSurveyStats] = useState<{
    feedbackCount: number;
    matchedUserCount: number;
    activeRound: number;
    expectedTotal: number;
    completionRate: number;
  } | null>(null);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [isSendingFinal, setIsSendingFinal] = useState(false);
  const [finalSent, setFinalSent] = useState(false);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on user interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Fanfare sound
  const playFanfareSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const notes = [
        { freq: 523.25, start: 0, duration: 0.25 },
        { freq: 659.25, start: 0.12, duration: 0.25 },
        { freq: 783.99, start: 0.24, duration: 0.35 },
        { freq: 1046.50, start: 0.4, duration: 0.5 },
        { freq: 783.99, start: 0.7, duration: 0.25 },
        { freq: 1046.50, start: 0.85, duration: 0.7 },
      ];

      notes.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.start);
        gain.gain.setValueAtTime(0, now + note.start);
        gain.gain.linearRampToValueAtTime(0.3, now + note.start + 0.03);
        gain.gain.linearRampToValueAtTime(0, now + note.start + note.duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration + 0.1);
      });
    } catch (e) {
      console.log("Fanfare failed:", e);
    }
  }, [getAudioContext]);

  // Beep sound
  const playBeepSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const beeps = [
        { freq: 880, start: 0, duration: 0.12 },
        { freq: 660, start: 0.18, duration: 0.12 },
        { freq: 880, start: 0.45, duration: 0.12 },
        { freq: 660, start: 0.63, duration: 0.12 },
        { freq: 880, start: 0.9, duration: 0.12 },
        { freq: 660, start: 1.08, duration: 0.25 },
      ];

      beeps.forEach(beep => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(beep.freq, now + beep.start);
        gain.gain.setValueAtTime(0, now + beep.start);
        gain.gain.linearRampToValueAtTime(0.2, now + beep.start + 0.01);
        gain.gain.linearRampToValueAtTime(0, now + beep.start + beep.duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + beep.start);
        osc.stop(now + beep.start + beep.duration + 0.05);
      });
    } catch (e) {
      console.log("Beep failed:", e);
    }
  }, [getAudioContext]);

  // Confetti effect
  const fireConfetti = useCallback(() => {
    const duration = 3500;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 40 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#7DD3FC', '#BAE6FD', '#E0F2FE', '#0EA5E9', '#38BDF8', '#F0ABFC', '#FDE68A']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#7DD3FC', '#BAE6FD', '#E0F2FE', '#0EA5E9', '#38BDF8', '#F0ABFC', '#FDE68A']
      });
    }, 250);
  }, []);

  // Celebrate with sound and confetti
  const celebrate = useCallback(() => {
    fireConfetti();
    playFanfareSound();
    setHasCelebrated(true);
  }, [fireConfetti, playFanfareSound]);

  // Timer functions
  const startTimer = useCallback(() => {
    if (isTimerRunning) return;

    // Initialize audio context on first interaction
    getAudioContext();

    setIsTimerRunning(true);
    setIsTimerFinished(false);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          setIsTimerRunning(false);
          setIsTimerFinished(true);
          playBeepSound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isTimerRunning, playBeepSound, getAudioContext]);

  const resetTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsTimerRunning(false);
    setIsTimerFinished(false);
    setTimeLeft(timerMinutes * 60);
    // Reset feedback modal states
    setShowFeedbackModal(false);
    setSelectedRound(null);
    setIsSending(false);
    setFeedbackSent(false);
  }, [timerMinutes]);

  // Auto-popup feedback modal when timer finishes
  useEffect(() => {
    if (isTimerFinished) {
      setShowFeedbackModal(true);
      setFeedbackSent(false);
      setSelectedRound(null);
    }
  }, [isTimerFinished]);

  // Send feedback round to users
  const handleSendFeedback = useCallback(async () => {
    if (selectedRound === null || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/admin/feedback-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: String(selectedRound) }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackSent(true);
      }
    } catch (e) {
      console.error('Failed to send feedback round:', e);
    } finally {
      setIsSending(false);
    }
  }, [selectedRound, isSending]);

  const handleMinutesChange = useCallback((value: number) => {
    const newValue = Math.max(1, Math.min(60, value));
    setTimerMinutes(newValue);
    if (!isTimerRunning) setTimeLeft(newValue * 60);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch survey stats for final report section
  const fetchSurveyStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/final-report');
      const data = await res.json();
      if (data.success) {
        setSurveyStats(data.survey);
        if (data.is_final_report_open) setFinalSent(true);
      }
    } catch (e) {
      console.error('Failed to fetch survey stats:', e);
    }
  }, []);

  // Send final report
  const handleSendFinalReport = useCallback(async () => {
    if (isSendingFinal) return;
    setIsSendingFinal(true);
    try {
      const res = await fetch('/api/admin/final-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open: true }),
      });
      const data = await res.json();
      if (data.success) {
        setFinalSent(true);
        setShowFinalConfirm(false);
      }
    } catch (e) {
      console.error('Failed to send final report:', e);
    } finally {
      setIsSendingFinal(false);
    }
  }, [isSendingFinal]);

  // Fetch match count
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from("matches").select("id");
      if (!error && data) setMatchCount(data.length);
      setIsLoading(false);
    };

    fetchData();
    fetchSurveyStats();

    const channel = supabase
      .channel("admin_1on1_dashboard_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, fetchData)
      .subscribe();

    // Realtime for conversation_feedback count updates
    const feedbackChannel = supabase
      .channel("admin_feedback_stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_feedback" }, fetchSurveyStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(feedbackChannel);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  if (isLoading) {
    return (
      <main className="h-screen w-full bg-[#FAF9F6] flex items-center justify-center">
        <Loader2 className="text-[#7DD3FC] animate-spin" size={40} />
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#F0F9FF] to-[#FAF9F6] text-[#44403C] antialiased flex flex-col font-serif overflow-x-hidden">
      {/* Navigation */}
      <nav className="h-[70px] border-b border-sky-100 px-6 md:px-10 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push("/admin")}>
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform text-sky-400" />
            <h1 className="text-xl italic font-black text-stone-700">MC Control</h1>
          </div>
          <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-[0.3em] text-sky-500 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">Live</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Clickable Match Count - navigates to results */}
          <button
            onClick={() => router.push("/admin/dashboard/1on1/results")}
            className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 px-4 py-2 rounded-full hover:bg-sky-100 hover:border-sky-300 transition-all cursor-pointer"
          >
            <Users size={14} className="text-sky-500" />
            <span className="text-[10px] font-black uppercase font-sans tracking-widest text-sky-600">{matchCount} Matched</span>
          </button>
          <button onClick={() => router.push("/admin/settings")} className="p-2.5 rounded-full border border-sky-100 hover:bg-sky-50 transition-all">
            <Settings size={18} className="text-sky-400" />
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Celebration Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl mb-10"
        >
          <div className="relative bg-white border border-sky-200 rounded-[2.5rem] p-10 text-center shadow-[0_8px_30px_rgb(125,211,252,0.15)] overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 via-transparent to-blue-50/30 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full mb-6 border border-sky-200"
              >
                <Heart size={36} className="text-sky-500" fill="#7DD3FC" />
              </motion.div>

              <h2 className="text-2xl md:text-3xl font-black text-stone-700 mb-3 tracking-tight">
                매칭이 완료되었습니다
              </h2>
              <p className="text-base text-stone-500 mb-8 leading-relaxed">
                자리에서 대기해주시면<br className="sm:hidden" /> 사회자가 안내하도록 할게요!
              </p>

              {/* Celebrate Button */}
              <motion.button
                onClick={celebrate}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm transition-all shadow-lg ${
                  hasCelebrated
                    ? 'bg-sky-100 text-sky-600 border border-sky-200'
                    : 'bg-gradient-to-r from-sky-400 to-blue-500 text-white hover:shadow-xl hover:shadow-sky-200/50'
                }`}
              >
                <Volume2 size={18} />
                {hasCelebrated ? '다시 축하하기' : '축하 효과 재생'}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Timer Control Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-2xl"
        >
          <div className={`bg-white border rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ${
            isTimerFinished
              ? 'border-rose-300 bg-gradient-to-br from-rose-50 to-white animate-pulse'
              : 'border-sky-200'
          }`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className={`p-3 rounded-2xl ${isTimerFinished ? 'bg-rose-100' : 'bg-sky-100'}`}>
                <Timer size={22} className={isTimerFinished ? 'text-rose-500' : 'text-sky-500'} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-stone-700">대화 타이머</h3>
                <p className="text-xs text-stone-400">대화 시간을 설정하고 관리하세요</p>
              </div>
            </div>

            {/* Timer Display */}
            <div className="flex flex-col items-center gap-8">
              {/* Big Timer */}
              <div className={`text-7xl md:text-8xl font-black font-mono tracking-tight transition-all duration-300 ${
                isTimerFinished
                  ? 'text-rose-500'
                  : timeLeft <= 30
                    ? 'text-amber-500'
                    : 'text-stone-700'
              }`}>
                {formatTime(timeLeft)}
              </div>

              {/* Minutes Setting */}
              <div className="flex items-center gap-3 bg-stone-50 rounded-2xl p-2">
                <button
                  onClick={() => handleMinutesChange(timerMinutes - 1)}
                  disabled={isTimerRunning}
                  className="w-10 h-10 rounded-xl bg-white border border-stone-200 text-stone-500 font-bold text-lg hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  -
                </button>
                <div className="flex items-center gap-2 px-4">
                  <input
                    type="number"
                    value={timerMinutes}
                    onChange={(e) => handleMinutesChange(parseInt(e.target.value) || 1)}
                    disabled={isTimerRunning}
                    className="w-14 text-center py-2 font-bold text-xl bg-transparent disabled:text-stone-400"
                    min={1}
                    max={60}
                  />
                  <span className="text-sm font-medium text-stone-400">분</span>
                </div>
                <button
                  onClick={() => handleMinutesChange(timerMinutes + 1)}
                  disabled={isTimerRunning}
                  className="w-10 h-10 rounded-xl bg-white border border-stone-200 text-stone-500 font-bold text-lg hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  +
                </button>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-3">
                <motion.button
                  onClick={startTimer}
                  disabled={isTimerRunning}
                  whileHover={!isTimerRunning ? { scale: 1.02 } : {}}
                  whileTap={!isTimerRunning ? { scale: 0.98 } : {}}
                  className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm transition-all ${
                    isTimerRunning
                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-lg shadow-green-200/50 hover:shadow-xl'
                  }`}
                >
                  <Play size={20} />
                  Start
                </motion.button>
                <motion.button
                  onClick={resetTimer}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm bg-stone-100 text-stone-600 hover:bg-stone-200 transition-all"
                >
                  <RotateCcw size={20} />
                  Reset
                </motion.button>
              </div>
            </div>

            {/* Manual Feedback Override Button */}
            {isTimerRunning && (
              <motion.button
                onClick={() => { setShowFeedbackModal(true); setFeedbackSent(false); setSelectedRound(null); }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-6 w-full py-3 bg-violet-100 text-violet-600 border border-violet-200 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-violet-200 transition-all"
              >
                <MessageCircle size={16} />
                인연의 잔상 수동 발송
              </motion.button>
            )}

            {/* Timer Finished Alert */}
            <AnimatePresence>
              {isTimerFinished && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-8 space-y-3"
                >
                  <div className="p-5 bg-rose-100 border border-rose-200 rounded-2xl flex items-center justify-center gap-3">
                    <Volume2 size={22} className="text-rose-500 animate-pulse" />
                    <span className="font-bold text-rose-600">대화 시간이 종료되었습니다</span>
                  </div>
                  {!showFeedbackModal && (
                    <motion.button
                      onClick={() => { setShowFeedbackModal(true); setFeedbackSent(false); setSelectedRound(null); }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3.5 bg-gradient-to-r from-violet-400 to-purple-500 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg"
                    >
                      <MessageCircle size={18} />
                      인연의 잔상 발송하기
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* The Final Command Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-2xl mt-8"
        >
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(245,158,11,0.1)] relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-100/30 via-transparent to-yellow-100/20 pointer-events-none" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-200 to-yellow-200 border border-amber-300">
                  <Sparkles size={22} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-amber-900">The Final Command</h3>
                  <p className="text-xs text-amber-600">최종 시그니처 리포트 발송</p>
                </div>
              </div>

              {/* Survey Stats Badge */}
              {surveyStats && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-2 bg-white/80 border border-amber-200 px-4 py-2.5 rounded-2xl">
                    <MessageCircle size={14} className="text-amber-600" />
                    <span className="text-sm font-bold text-amber-800">
                      설문 응답: {surveyStats.feedbackCount}/{surveyStats.expectedTotal} 완료
                    </span>
                  </div>
                  <div className="bg-white/80 border border-amber-200 px-3 py-2.5 rounded-2xl">
                    <span className="text-sm font-bold text-amber-600">{surveyStats.completionRate}%</span>
                  </div>
                </div>
              )}

              {/* Send Button */}
              {!finalSent ? (
                <motion.button
                  onClick={() => setShowFinalConfirm(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-200/50 hover:shadow-xl transition-all"
                >
                  <Sparkles size={18} />
                  최종 리포트 발송하기
                </motion.button>
              ) : (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full py-4 rounded-2xl bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center gap-2 border border-amber-300"
                >
                  <Check size={18} />
                  시그니처 리포트 발송 완료
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Final Report Confirm Modal */}
      <AnimatePresence>
        {showFinalConfirm && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFinalConfirm(false)}
            />
            <motion.div
              className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-[70] bg-white/95 backdrop-blur-xl border border-amber-200 rounded-[2rem] p-8 shadow-2xl"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-full mb-5 border border-amber-200">
                  <Sparkles size={28} className="text-amber-500" />
                </div>

                <h3 className="text-xl font-bold text-stone-700 mb-2">The Signature</h3>
                <p className="text-sm text-stone-500 mb-6 leading-relaxed">
                  모든 유저에게 최종 시그니처 리포트를<br />전송할까요?
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFinalConfirm(false)}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold bg-stone-100 text-stone-500 hover:bg-stone-200 transition-all"
                  >
                    취소
                  </button>
                  <motion.button
                    onClick={handleSendFinalReport}
                    disabled={isSendingFinal}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-[2] py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-200/50 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSendingFinal ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    {isSendingFinal ? '발송 중...' : '발송하기'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Feedback Dispatch Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFeedbackModal(false)}
            />
            <motion.div
              className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-[70] bg-white/95 backdrop-blur-xl border border-purple-200 rounded-[2rem] p-8 shadow-2xl"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full mb-5 border border-purple-200">
                  <MessageCircle size={28} className="text-purple-500" />
                </div>

                <h3 className="text-xl font-bold text-stone-700 mb-2">인연의 잔상</h3>
                <p className="text-sm text-stone-500 mb-6">
                  방금 종료된 대화는 몇 번째 인연이었나요?
                </p>

                {/* Round Selection Grid */}
                <div className="grid grid-cols-5 gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((round) => (
                    <motion.button
                      key={round}
                      onClick={() => setSelectedRound(round)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`py-3 rounded-xl font-bold text-lg transition-all ${
                        selectedRound === round
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-200/50'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {round}
                    </motion.button>
                  ))}
                </div>

                {/* Send Button */}
                {!feedbackSent ? (
                  <motion.button
                    onClick={handleSendFeedback}
                    disabled={selectedRound === null || isSending}
                    whileHover={selectedRound !== null ? { scale: 1.02 } : {}}
                    whileTap={selectedRound !== null ? { scale: 0.98 } : {}}
                    className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      selectedRound === null || isSending
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-200/50 hover:shadow-xl'
                    }`}
                  >
                    {isSending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    {isSending ? '발송 중...' : `${selectedRound ? selectedRound + '회차 ' : ''}인연의 잔상 발송`}
                  </motion.button>
                ) : (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full py-4 rounded-2xl bg-emerald-100 text-emerald-600 font-bold text-sm flex items-center justify-center gap-2 border border-emerald-200"
                  >
                    <Check size={18} />
                    {selectedRound}회차 발송 완료
                  </motion.div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="mt-4 text-sm text-stone-400 hover:text-stone-600 transition-colors"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
