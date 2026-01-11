// app/1on1/_components/MatchingCard.tsx

// 'export' 이 단어가 반드시 붙어 있어야 외부(page.tsx)에서 가져다 쓸 수 있습니다!
export function MatchingCard({ index, nickname, matchType }: any) {
  return (
    <div className="bg-[#FCF9F2]/50 p-6 rounded-[2.5rem] border border-[#F0EDE4] flex items-center justify-between group active:scale-95 transition-all">
      <div className="flex items-center gap-4">
        {/* 추천 순위 숫자 */}
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#A52A2A] font-bold shadow-sm border border-[#EEEBDE]">
          {index}
        </div>
        <div>
          {/* 페르소나 닉네임 */}
          <h4 className="text-lg italic font-medium tracking-tight">{nickname} 님</h4>
          <p className="text-[10px] text-gray-400 font-sans tracking-widest uppercase">{matchType}</p>
        </div>
      </div>
      <button className="bg-[#1A1A1A] text-white px-5 py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase hover:bg-[#A52A2A] transition-colors shadow-lg">
        대화하기
      </button>
    </div>
  );
}