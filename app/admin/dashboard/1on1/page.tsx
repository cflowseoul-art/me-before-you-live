"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Users, Settings, Play, RotateCcw, Timer, Volume2, Heart } from "lucide-react";
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
  }, [timerMinutes]);

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

  // Fetch match count
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from("matches").select("id");
      if (!error && data) setMatchCount(data.length);
      setIsLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("admin_1on1_dashboard_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
          <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 px-4 py-2 rounded-full">
            <Users size={14} className="text-sky-500" />
            <span className="text-[10px] font-black uppercase font-sans tracking-widest text-sky-600">{matchCount} Matched</span>
          </div>
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

            {/* Timer Finished Alert */}
            <AnimatePresence>
              {isTimerFinished && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-8 p-5 bg-rose-100 border border-rose-200 rounded-2xl flex items-center justify-center gap-3"
                >
                  <Volume2 size={22} className="text-rose-500 animate-pulse" />
                  <span className="font-bold text-rose-600">대화 시간이 종료되었습니다</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
