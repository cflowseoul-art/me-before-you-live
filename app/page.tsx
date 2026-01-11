"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FEATURES, ANIMALS } from "@/app/constants";
import { PostgrestError } from "@supabase/supabase-js";

export default function Onboarding() {
  const router = useRouter();
  const [gender, setGender] = useState<string | null>(null); // 성별 상태 추가
  const [feature, setFeature] = useState("");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateNickname = (selectedFeature: string) => {
    const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const newNickname = `${selectedFeature} ${randomAnimal}`;
    setNickname(newNickname);
  };

  const handleReset = () => {
    setGender(null);
    setFeature("");
    setNickname("");
  };

  const handleSaveNickname = async () => {
    if (!nickname || !gender) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .insert({ 
          nickname, 
          gender, // 성별 데이터 포함
          balance: 1000 
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const userData = { id: data.id, nickname: data.nickname, balance: data.balance, gender: data.gender };
        localStorage.setItem("auction_user", JSON.stringify(userData));
      }
      router.push("/auction");
    } catch (error) {
      const pgError = error as PostgrestError;
      alert(pgError.code === "23505" ? "이미 누군가 사용 중인 닉네임입니다." : "잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FDFDFD] p-6 antialiased text-[#1A1A1A]">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.03)] border border-[#EEEBDE] p-10 md:p-14 relative overflow-hidden">
        
        <header className="text-center mb-16 relative">
          <h1 className="text-4xl font-serif italic tracking-tight mb-2" style={{ fontFamily: "serif" }}>
            Me Before You
          </h1>
          <div className="h-[1px] w-32 bg-[#A52A2A] mx-auto mb-4 opacity-60"></div>
          <p className="text-[10px] font-serif italic uppercase tracking-[0.4em] text-[#A52A2A]/80">
            Identity Collection
          </p>
        </header>

        {/* 1단계: 성별 선택 */}
        {!gender ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <p className="text-center text-xs font-medium text-gray-400 leading-loose tracking-widest uppercase">
              당신의 성별을 선택해주세요.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {["남성", "여성"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className="py-6 rounded-2xl border border-[#F0EDE4] text-sm font-semibold hover:border-[#A52A2A] hover:bg-[#FDF8F8] transition-all duration-500 active:scale-95"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        ) : !nickname ? (
          /* 2단계: 특징 선택 */
          <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-1000">
            <p className="text-center text-xs font-medium text-gray-400 leading-loose tracking-widest uppercase">
              {gender} 참가자님, <br />자신있는 외모 특징을 선택해주세요.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFeature(f);
                    generateNickname(f);
                  }}
                  className="py-5 rounded-2xl border border-[#F0EDE4] text-sm font-semibold hover:border-[#A52A2A] hover:bg-[#FDF8F8] transition-all duration-500 active:scale-95"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* 3단계: 닉네임 확인 */
          <div className="space-y-12 animate-in zoom-in-95 duration-700 text-center">
            <div className="space-y-3">
              <p className="text-[10px] font-serif italic uppercase tracking-[0.2em] text-[#D1D1D1]">Suggested Name</p>
              <h2 className="text-4xl font-serif italic font-medium tracking-tight text-[#1A1A1A]">
                "{nickname}"
              </h2>
            </div>

            <div className="space-y-3 pt-6">
              <button
                onClick={handleSaveNickname}
                disabled={isLoading}
                className="w-full py-5 rounded-2xl bg-[#1A1A1A] text-white text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#A52A2A] transition-all shadow-lg active:scale-[0.98] disabled:bg-gray-200"
              >
                {isLoading ? "Saving..." : "확인"}
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => generateNickname(feature)}
                  className="flex-1 py-4 text-[10px] font-bold text-gray-400 hover:text-[#1A1A1A] transition-colors tracking-widest uppercase border border-transparent hover:border-[#EEEBDE] rounded-xl"
                  disabled={isLoading}
                >
                  재시도
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-4 text-[10px] font-bold text-gray-400 hover:text-[#A52A2A] transition-colors tracking-widest uppercase border border-transparent hover:border-[#FDF8F8] rounded-xl"
                  disabled={isLoading}
                >
                  처음부터 다시
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-14 flex justify-center gap-1.5 opacity-30">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${!gender ? 'bg-[#FFD700]' : 'bg-gray-300'}`}></div>
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${gender && !nickname ? 'bg-[#FFD700]' : 'bg-gray-300'}`}></div>
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${nickname ? 'bg-[#FFD700]' : 'bg-gray-300'}`}></div>
        </footer>
      </div>
    </main>
  );
}