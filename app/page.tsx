"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FEATURES, ANIMALS } from "@/app/constants";

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: 기본정보, 2: 특징선택, 3: 확정
  const [realName, setRealName] = useState("");
  const [phoneSuffix, setPhoneSuffix] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [feature, setFeature] = useState("");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [existingUser, setExistingUser] = useState<any>(null);

  // 중복 확인
  const handleInitialCheck = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("real_name", realName)
      .eq("phone_suffix", phoneSuffix)
      .single();

    if (data) {
      setExistingUser(data);
      setShowConflictModal(true);
    } else {
      setStep(2);
    }
    setIsLoading(false);
  };

  // 닉네임 생성 (특징 선택 시 호출)
  const generateNickname = (selectedFeature: string) => {
    const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    setNickname(`${selectedFeature} ${randomAnimal}`);
    setFeature(selectedFeature);
    setStep(3);
  };

  // 최종 저장
  const handleFinalSave = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("users")
      .insert({ real_name: realName, phone_suffix: phoneSuffix, nickname, gender, balance: 1000 })
      .select().single();

    if (!error && data) {
      localStorage.setItem("auction_user", JSON.stringify(data));
      router.push("/auction");
    }
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6 antialiased">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-10 border border-[#EEEBDE] shadow-xl relative overflow-hidden">
        
        <header className="text-center mb-12">
          <h1 className="text-3xl font-serif italic mb-2">Me Before You</h1>
          <p className="text-[9px] font-serif italic uppercase tracking-[0.3em] text-[#A52A2A]">Identity Collection</p>
        </header>

        {/* Step 1: 기본 정보 */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <input type="text" placeholder="실명" value={realName} onChange={(e) => setRealName(e.target.value)} className="w-full p-4 border rounded-xl outline-none focus:border-[#A52A2A]" />
            <input type="text" placeholder="전화번호 뒷자리 4자리" maxLength={4} value={phoneSuffix} onChange={(e) => setPhoneSuffix(e.target.value.replace(/[^0-9]/g, ""))} className="w-full p-4 border rounded-xl outline-none focus:border-[#A52A2A]" />
            <div className="grid grid-cols-2 gap-2">
              {["남성", "여성"].map(g => (
                <button key={g} onClick={() => setGender(g)} className={`p-4 rounded-xl border text-sm transition-all ${gender === g ? 'bg-[#FDF8F8] border-[#A52A2A] font-bold' : 'border-gray-100'}`}>{g}</button>
              ))}
            </div>
            <button disabled={!realName || phoneSuffix.length < 4 || !gender || isLoading} onClick={handleInitialCheck} className="w-full py-5 bg-[#1A1A1A] text-white rounded-2xl font-bold uppercase tracking-widest disabled:opacity-20">NEXT</button>
          </div>
        )}

        {/* Step 2: 특징 선택 */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <p className="text-center text-[10px] text-gray-400 tracking-widest uppercase">자신있는 매력 포인트를 선택하세요</p>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(f => (
                <button key={f} onClick={() => generateNickname(f)} className="p-4 border border-[#F0EDE4] rounded-xl text-sm hover:border-[#A52A2A] transition-all">{f}</button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: 닉네임 확정 */}
        {step === 3 && (
          <div className="space-y-10 animate-in zoom-in-95 text-center">
            <div className="space-y-2">
              <p className="text-[10px] italic text-[#A52A2A] tracking-widest uppercase">Suggested Name</p>
              <h2 className="text-4xl font-serif italic">"{nickname}"</h2>
            </div>
            <div className="space-y-3">
              <button onClick={handleFinalSave} disabled={isLoading} className="w-full py-5 bg-[#1A1A1A] text-white rounded-2xl font-black tracking-widest uppercase shadow-lg">참가하기</button>
              <button onClick={() => setStep(2)} className="text-[10px] text-gray-400 underline tracking-widest uppercase">다시 선택</button>
            </div>
          </div>
        )}

        {/* 🚨 중복 대응 모달 */}
        {showConflictModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl">
              <p className="text-[#A52A2A] font-bold text-sm mb-2">중복 정보 감지</p>
              <h3 className="text-xl font-serif italic mb-6">"{existingUser.nickname}"님으로 <br/>다시 입장하시겠습니까?</h3>
              <div className="space-y-3">
                <button onClick={() => { localStorage.setItem("auction_user", JSON.stringify(existingUser)); router.push("/auction"); }} className="w-full py-4 bg-[#1A1A1A] text-white rounded-xl font-bold">네, 이대로 입장할게요</button>
                <button onClick={async () => { await supabase.from("users").delete().eq("id", existingUser.id); setShowConflictModal(false); setStep(2); }} className="w-full py-4 bg-white border border-gray-200 text-gray-400 rounded-xl text-sm">아니오, 새로 만들래요</button>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-50">
                <p className="text-[11px] font-medium text-[#1A1A1A] leading-relaxed opacity-80">
                  만약, 가입한 적이 없다면 <br/>
                  <span className="border-b border-[#1A1A1A]/30 pb-0.5">스태프에게 알려주세요!</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}