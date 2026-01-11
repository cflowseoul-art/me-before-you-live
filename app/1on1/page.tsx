// "use client";

// import { useState, useEffect } from "react";
// import { supabase } from "@/lib/supabase";

// export default function UserReportPage() {
//   const [user, setUser] = useState<any>(null);
//   const [matches, setMatches] = useState<any[]>([]);
//   const [aiAnalysis, setAiAnalysis] = useState("");
//   const [loading, setLoading] = useState(true);

//   const generateReportAndMatch = async (currUser: any) => {
//     // 1. 매칭 알고리즘 (유사도 기반)
//     // 실제 운영 시에는 Edge Function이나 서버 로직에서 연산하는 것이 좋으나, 여기선 클라이언트 예시로 구현
//     const { data: allUsers } = await supabase.from("users").select("*").neq("id", currUser.id);
//     const { data: allBids } = await supabase.from("bids").select("*");

//     // 유저별 가치관 투자 합계 계산 로직 (단순화)
//     const userScores = allUsers?.map(u => {
//       const score = allBids?.filter(b => b.user_id === u.id)
//         .reduce((acc, curr) => acc + curr.amount, 0) || 0;
//       return { ...u, similarityScore: score };
//     }).sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 3);

//     setMatches(userScores || []);

//     // 2. AI 리포트 (따뜻한 감성 + 확률 표현 + 쿠션어)
//     // *실제 서비스 시 OpenAI API 연동 권장*
//     const templates = [
//       "조심스럽게 당신의 마음을 들여다보니, 당신은 아마도 87%의 확률로 '사람의 온기'를 가장 소중히 여기는 다정한 여행가일지도 몰라요. 비록 경매라는 치열한 순간이었지만, 당신이 선택한 가치관들은 주변을 밝게 비추는 따스한 빛을 닮아 있네요. 어쩌면 당신과 비슷한 92%의 결을 가진 분들과 대화하며 더 큰 행복을 찾으실 수 있을 것 같아요.",
//       "당신의 선택을 조심레 살펴보면, 94%의 확률로 '자신의 성장'과 '내면의 평화'를 조화롭게 가꾸시는 분일 가능성이 무척 높으셔요. 긍정적인 에너지가 당신의 입찰 내역마다 가득 묻어 있어서 보는 저도 마음이 참 포근해집니다. 당신의 멋진 가치관을 공유할 수 있는 소중한 인연들을 3분이나 모셔왔어요!"
//     ];
//     setAiAnalysis(templates[Math.floor(Math.random() * templates.length)]);
//     setLoading(false);
//   };

//   useEffect(() => {
//     const stored = localStorage.getItem("auction_user");
//     if (stored) {
//       const parsed = JSON.parse(stored);
//       setUser(parsed);
//       generateReportAndMatch(parsed);
//     }
//   }, []);

//   if (loading) return (
//     <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center font-serif italic text-gray-400">
//       당신의 가치관을 조심스럽게 분석 중입니다...
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif p-6 pb-20 antialiased">
//       <div className="max-w-xl mx-auto space-y-12">
        
//         {/* 1. AI 감성 리포트 섹션 */}
//         <section className="mt-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
//           <header className="text-center mb-10">
//             <div className="h-[1px] w-12 bg-[#A52A2A] mx-auto mb-6 opacity-30"></div>
//             <p className="text-[10px] font-sans font-black tracking-[0.4em] text-[#A52A2A] uppercase mb-2">Soul Report</p>
//             <h1 className="text-3xl italic tracking-tighter leading-tight">{user.nickname} 님의 영혼의 빛깔</h1>
//           </header>

//           <div className="bg-white p-10 rounded-[3.5rem] border border-[#EEEBDE] shadow-[0_40px_100px_rgba(0,0,0,0.03)] relative overflow-hidden">
//              <div className="absolute top-0 right-0 p-6 opacity-5 font-sans font-black text-6xl italic">98%</div>
//              <p className="text-sm leading-[1.8] text-gray-500 font-light break-keep">
//                {aiAnalysis}
//              </p>
//           </div>
//         </section>

//         {/* 2. 매칭 섹션: 비슷한 가치관을 가진 3인 */}
//         <section className="animate-in fade-in slide-in-from-bottom-10 delay-300 duration-1000">
//           <h3 className="text-[10px] font-sans font-black tracking-[0.3em] text-gray-300 uppercase text-center mb-8 italic">Destined Connections</h3>
//           <div className="grid grid-cols-1 gap-4">
//             {matches.map((match, idx) => (
//               <div key={match.id} className="bg-[#FCF9F2]/50 p-6 rounded-[2.5rem] border border-[#F0EDE4] flex items-center justify-between group active:scale-95 transition-all">
//                 <div className="flex items-center gap-4">
//                   <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#A52A2A] font-bold shadow-sm border border-[#EEEBDE]">
//                     {idx + 1}
//                   </div>
//                   <div>
//                     <h4 className="text-lg italic font-medium tracking-tight">{match.nickname} 님</h4>
//                     <p className="text-[10px] text-gray-400 font-sans tracking-widest uppercase">매칭 확률 90% 이상</p>
//                   </div>
//                 </div>
//                 <button className="bg-[#1A1A1A] text-white px-5 py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase hover:bg-[#A52A2A] transition-colors shadow-lg">
//                   대화하기
//                 </button>
//               </div>
//             ))}
//           </div>
//           <p className="text-center mt-8 text-[11px] text-gray-300 italic px-6 break-keep">
//             혹시 실례가 되지 않는다면, 당신과 닮은 결을 가진 이분들과<br/>따뜻한 대화를 나누어 보시는 건 어떨까요?
//           </p>
//         </section>

//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OneOnOneGatePage() {
  const router = useRouter();

  useEffect(() => {
    // 1. 기존에 저장해둔 내 정보를 가져옵니다.
    const stored = localStorage.getItem("auction_user");
    
    if (stored) {
      const parsed = JSON.parse(stored);
      // 2. 내 고유 ID를 가지고 로딩 페이지로 즉시 이동합니다.
      // 예: /1on1/loading/ae686c99-xxxx...
      router.replace(`/1on1/loading/${parsed.id}`);
    } else {
      // 만약 유저 정보가 없다면 메인이나 로그인으로 보냅니다.
      alert("유저 정보를 찾을 수 없습니다. 다시 로그인 해주세요.");
      router.replace("/");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center font-serif italic text-gray-400">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>당신의 기록을 불러오고 있습니다...</p>
      </div>
    </div>
  );
}