"use client";

import { useState } from "react";
// 방금 만든 데이터 리스트들을 불러옵니다.
import { FEATURES, ADJECTIVES, ANIMALS } from "./constants";

export default function Onboarding() {
  const [feature, setFeature] = useState("");
  const [nickname, setNickname] = useState("");

  const generateNickname = () => {
    // constants.ts에서 불러온 리스트를 활용해 랜덤 생성
    const randomAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const newNickname = `${randomAdj} ${feature} ${randomAnimal}`;
    setNickname(newNickname);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 transition-all">
        <h1 className="text-2xl font-bold text-center mb-2 text-slate-800">미비포유 (Me Before You)</h1>
        <p className="text-center text-slate-500 mb-8 font-medium">나를 알고 너를 아는 데이터 탐색</p>

        {!nickname ? (
          <>
            <div className="space-y-4">
              <label className="block font-semibold text-slate-700">당신의 가장 큰 외모 장점은?</label>
              <div className="grid grid-cols-2 gap-3">
                {FEATURES.map((item) => (
                  <button
                    key={item}
                    onClick={() => setFeature(item)}
                    className={`p-3 rounded-lg border text-sm transition ${
                      feature === item ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!feature}
              className="w-full mt-10 bg-indigo-600 text-white py-4 rounded-xl font-bold disabled:bg-slate-200 transition-all active:scale-95 shadow-lg shadow-indigo-100"
              onClick={generateNickname}
            >
              오늘의 페르소나 생성하기
            </button>
          </>
        ) : (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="py-10 bg-indigo-50 rounded-2xl border-2 border-dashed border-indigo-200">
              <p className="text-sm text-indigo-500 font-medium mb-2">분석 완료! 당신의 닉네임은</p>
              <h2 className="text-xl font-black text-indigo-900 px-4">"{nickname}"</h2>
            </div>
            <button
              className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold transition-all active:scale-95"
              onClick={() => alert("이제 DB에 저장하고 다음 단계로 가볼까요?")}
            >
              이 이름으로 참여하기
            </button>
          </div>
        )}
      </div>
    </main>
  );
}