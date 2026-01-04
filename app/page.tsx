"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FEATURES, ANIMALS } from "@/app/constants";
import { PostgrestError } from "@supabase/supabase-js";

export default function Onboarding() {
  const router = useRouter();
  const [feature, setFeature] = useState("");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateNickname = (selectedFeature: string) => {
    const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const newNickname = `${selectedFeature} ${randomAnimal}`;
    setNickname(newNickname);
  };

  const handleSaveNickname = async () => {
    if (!nickname) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .insert({ nickname, balance: 1000 })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // 1단계: 닉네임 설정 시 저장 로직 변경 (경매 페이지와 형식 통일)
        const userData = { id: data.id, nickname: data.nickname, balance: data.balance };
        localStorage.setItem("auction_user", JSON.stringify(userData));
      }

      alert("성공적으로 저장되었습니다! 경매장으로 이동합니다.");
      router.push("/auction");
    } catch (error) {
      const pgError = error as PostgrestError;
      // 23505: Unique violation (중복된 닉네임)
      if (pgError.code === "23505") {
        alert("이미 존재하는 닉네임입니다. 다시 생성해주세요!");
      } else {
        console.error("Error saving nickname:", pgError.message);
        alert("저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-indigo-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8">
        <h1 className="text-2xl font-bold text-center text-indigo-900 mb-8">
          Me Before You
        </h1>

        {!nickname ? (
          <div className="space-y-6">
            <p className="text-center text-slate-600">
              당신의 외모 강점을 하나 선택해주세요.
              <br />
              AI가 당신에게 어울리는 닉네임을 지어드립니다.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFeature(f);
                    generateNickname(f);
                  }}
                  className="p-4 rounded-xl bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-500">당신의 닉네임은</p>
              <h2 className="text-3xl font-black text-indigo-600">
                "{nickname}"
              </h2>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => generateNickname(feature)}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                disabled={isLoading}
              >
                다시 짓기
              </button>
              <button
                onClick={handleSaveNickname}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:bg-indigo-400"
                disabled={isLoading}
              >
                {isLoading ? "저장 중..." : "결정하기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}