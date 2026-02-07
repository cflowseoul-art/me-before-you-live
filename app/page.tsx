"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { FEATURES, ANIMALS } from "@/app/constants";
import { getAuth, setAuth, clearAuth } from "@/lib/utils/auth-storage";

export default function Onboarding() {
  const router = useRouter();
  
  // 상태 관리
  const [isSplash, setIsSplash] = useState(true); // 스플래시(무드보드) 노출 여부
  const [step, setStep] = useState(1); // 1: 기본정보, 2: 특징선택, 3: 확정
  const [realName, setRealName] = useState("");
  const [phoneSuffix, setPhoneSuffix] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [feature, setFeature] = useState("");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [existingUser, setExistingUser] = useState<any>(null);
  const [currentSessionId, setCurrentSessionId] = useState("");

  // Phase 기반 리다이렉트 유틸 (세션 인식)
  const redirectByPhase = useCallback(async (userId: string, userSessionId?: string) => {
    try {
      const res = await fetch('/api/admin/phase', { cache: 'no-store' });
      const data = await res.json();
      if (!data.success) return "/auction";

      const currentSession = data.settings?.current_session || "";
      const phase = data.settings?.current_phase || "auction";

      // 이전 회차 유저 → 무조건 report-hub
      if (userSessionId && currentSession && userSessionId !== currentSession) {
        return "/report-hub";
      }

      // 현재 회차 유저 → phase 따라 이동
      if (phase === "completed") return "/report-hub";
      if (phase === "report") return `/1on1/report/${userId}`;
      if (phase === "feed") return "/feed";
      return "/auction";
    } catch {
      return "/auction";
    }
  }, []);

  // 1. 페이지 로드 시: 항상 로그인 창 표시 (자동 리다이렉트 없음)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // 중복 확인 로직 (전체 세션에서 검색, 모달에서 회차 정보 표시)
  const handleInitialCheck = async () => {
    setIsLoading(true);

    // 현재 세션 가져오기
    let currentSession = "";
    try {
      const res = await fetch('/api/admin/phase', { cache: 'no-store' });
      const result = await res.json();
      if (result.success && result.settings?.current_session) {
        currentSession = result.settings.current_session;
      }
    } catch {}
    setCurrentSessionId(currentSession);

    // 전체에서 이름+전화번호 중복 검색 (가장 최근 것)
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("real_name", realName)
      .eq("phone_suffix", phoneSuffix)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setExistingUser(data);
      setShowConflictModal(true);
    } else {
      setStep(2);
    }
    setIsLoading(false);
  };

  // 닉네임 생성
  const generateNickname = (selectedFeature: string) => {
    const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    setNickname(`${selectedFeature} ${randomAnimal}`);
    setFeature(selectedFeature);
    setStep(3);
  };

  // 최종 저장
  const handleFinalSave = async () => {
    setIsLoading(true);

    // 현재 세션 번호 가져오기
    let currentSession = "01";
    try {
      const phaseRes = await fetch('/api/admin/phase', { cache: 'no-store' });
      const phaseData = await phaseRes.json();
      if (phaseData.success && phaseData.settings?.current_session) {
        currentSession = phaseData.settings.current_session;
      }
    } catch {}

    const { data, error } = await supabase
      .from("users")
      .insert({
        real_name: realName,
        phone_suffix: phoneSuffix,
        nickname,
        gender,
        balance: 1000,
        session_id: currentSession
      })
      .select().single();

    if (!error && data) {
      setAuth(data);
      const path = await redirectByPhase(data.id);
      router.push(path);
    }
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6 antialiased relative overflow-hidden">
      
      {/* 1. 스플래시 화면: 모바일 꽉 찬 화면 최적화 */}
<AnimatePresence>
  {isSplash && (
    <motion.div
      key="splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }} // 모바일은 스케일을 너무 크게 주면 깨지므로 1.05 권장
      transition={{ duration: 1.2, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FDFDFD]"
    >
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/main.jpg')",
          backgroundSize: "cover",      // 비율 유지하며 꽉 채움
          backgroundPosition: "center", // 중앙 기준 정렬
          backgroundRepeat: "no-repeat",
          height: "100%",               // 명시적으로 높이 100%
          width: "100%"
        }}
      />
      
      {/* 이미지 위 오버레이 (텍스트 가독성) */}
      <div className="absolute inset-0 bg-black/30 z-10" /> 

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 text-center"
      >
        <h1 className="text-white text-4xl font-serif italic tracking-wider drop-shadow-md">
          Before We Meet
        </h1>
        <p className="text-white/70 text-[10px] tracking-[0.4em] mt-2 uppercase">
          A Journey of Love
        </p>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      {/* 2. 온보딩 폼 컨테이너 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isSplash ? 0 : 1, y: isSplash ? 20 : 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="max-w-md w-full bg-white rounded-[3rem] p-10 border border-[#EEEBDE] shadow-xl relative z-10"
      >
        <header className="text-center mb-12">
          <h1 className="text-3xl font-serif italic mb-2">Before We Meet</h1>
          <p className="text-[9px] font-serif italic uppercase tracking-[0.3em] text-[#A52A2A]">Identity Collection</p>
        </header>

        {/* Step 1: 기본 정보 입력 */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 ml-1">Real Name</label>
              <input 
                type="text" 
                placeholder="실명" 
                value={realName} 
                onChange={(e) => setRealName(e.target.value)} 
                className="w-full p-4 border border-gray-100 rounded-xl outline-none focus:border-[#A52A2A] transition-colors" 
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 ml-1">Phone Suffix (4 digits)</label>
              <input 
                type="text" 
                placeholder="전화번호 뒷자리 4자리" 
                maxLength={4} 
                value={phoneSuffix} 
                onChange={(e) => setPhoneSuffix(e.target.value.replace(/[^0-9]/g, ""))} 
                className="w-full p-4 border border-gray-100 rounded-xl outline-none focus:border-[#A52A2A] transition-colors" 
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {["남성", "여성"].map(g => (
                <button 
                  key={g} 
                  onClick={() => setGender(g)} 
                  className={`p-4 rounded-xl border text-sm transition-all ${
                    gender === g ? 'bg-[#FDF8F8] border-[#A52A2A] font-bold text-[#A52A2A]' : 'border-gray-50 text-gray-400'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <button 
              disabled={!realName || phoneSuffix.length < 4 || !gender || isLoading} 
              onClick={handleInitialCheck} 
              className="w-full py-5 bg-[#1A1A1A] text-white rounded-2xl font-bold uppercase tracking-widest disabled:opacity-20 transition-opacity mt-4"
            >
              {isLoading ? "Checking..." : "NEXT"}
            </button>
          </div>
        )}

        {/* Step 2: 특징 선택 */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-center text-[10px] text-gray-400 tracking-widest uppercase">자신있는 매력 포인트를 선택하세요</p>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(f => (
                <button 
                  key={f} 
                  onClick={() => generateNickname(f)} 
                  className="p-4 border border-[#F0EDE4] rounded-xl text-sm hover:border-[#A52A2A] hover:bg-[#FDF8F8] transition-all"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: 닉네임 확정 */}
        {step === 3 && (
          <div className="space-y-10 animate-in zoom-in-95 duration-500 text-center">
            <div className="space-y-2">
              <p className="text-[10px] italic text-[#A52A2A] tracking-widest uppercase">Suggested Name</p>
              <h2 className="text-4xl font-serif italic text-[#1A1A1A]">"{nickname}"</h2>
            </div>
            <div className="space-y-3">
              <button 
                onClick={handleFinalSave} 
                disabled={isLoading} 
                className="w-full py-5 bg-[#1A1A1A] text-white rounded-2xl font-black tracking-widest uppercase shadow-lg active:scale-[0.98] transition-transform"
              >
                참가하기
              </button>
              <button 
                onClick={() => setStep(2)} 
                className="text-[10px] text-gray-400 underline tracking-widest uppercase"
              >
                다시 선택
              </button>
            </div>
          </div>
        )}

        {/* 🚨 중복 대응 모달 */}
        <AnimatePresence>
          {showConflictModal && existingUser && (() => {
            const isSameSession = existingUser.session_id === currentSessionId;
            // 세션 ID 파싱: "2026-02-07_01" → "2월 7일 1회차"
            const formatSession = (sid: string) => {
              if (!sid) return "알 수 없는 회차";
              if (sid.includes("_")) {
                const [dateStr, num] = sid.split("_");
                const d = new Date(dateStr + "T00:00:00");
                return `${d.getMonth() + 1}월 ${d.getDate()}일 ${parseInt(num)}회차`;
              }
              return `${sid}회차`;
            };

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl"
                >
                  <p className="text-[#A52A2A] font-bold text-sm mb-2">참가 이력 확인</p>
                  <div className="bg-[#FDF8F8] rounded-2xl px-4 py-3 mb-5 border border-[#A52A2A]/10">
                    <p className="text-[11px] font-bold" style={{ color: "#A52A2A" }}>
                      {formatSession(existingUser.session_id)} 참가자
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">닉네임: {existingUser.nickname}</p>
                  </div>

                  {isSameSession ? (
                    <>
                      <h3 className="text-lg font-serif italic mb-5">
                        이번 회차에 이미 참가하셨습니다.<br/>
                        다시 입장하시겠습니까?
                      </h3>
                      <div className="space-y-3">
                        <button
                          onClick={async () => {
                            setAuth(existingUser);
                            const path = await redirectByPhase(existingUser.id, existingUser.session_id);
                            router.push(path);
                          }}
                          className="w-full py-4 bg-[#1A1A1A] text-white rounded-xl font-bold"
                        >
                          네, 이대로 입장할게요
                        </button>
                        <button
                          onClick={() => { setShowConflictModal(false); }}
                          className="w-full py-4 bg-white border border-gray-200 text-gray-400 rounded-xl text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-serif italic mb-5">
                        이전 회차 참가 이력이 있습니다.<br/>
                        이번 회차에 새로 등록하시겠습니까?
                      </h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => { setShowConflictModal(false); setStep(2); }}
                          className="w-full py-4 bg-[#1A1A1A] text-white rounded-xl font-bold"
                        >
                          새로 등록하기
                        </button>
                        <button
                          onClick={async () => {
                            setAuth(existingUser);
                            const path = await redirectByPhase(existingUser.id, existingUser.session_id);
                            router.push(path);
                          }}
                          className="w-full py-4 bg-white border border-gray-200 text-gray-400 rounded-xl text-sm"
                        >
                          이전 회차로 입장하기
                        </button>
                      </div>
                    </>
                  )}

                  <div className="mt-8 pt-6 border-t border-gray-50">
                    <p className="text-[11px] font-medium text-[#1A1A1A] leading-relaxed opacity-80">
                      만약 가입한 적이 없다면 <br/>
                      <span className="border-b border-[#1A1A1A]/30 pb-0.5">스태프에게 알려주세요!</span>
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}