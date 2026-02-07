"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, Clock, LogOut } from "lucide-react";
import { getAuth, clearAuth } from "@/lib/utils/auth-storage";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

const { colors } = DESIGN_TOKENS;

export default function ReportHubPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; nickname: string; real_name: string } | null>(null);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.replace("/");
      return;
    }
    setUser({ id: auth.id, nickname: auth.nickname, real_name: auth.real_name });
  }, [router]);

  if (!user) return null;

  const cards = [
    {
      icon: <BookOpen size={24} />,
      title: "1on1 리포트 보기",
      desc: "상대방과의 가치관 정합성 및 대화 전략",
      href: `/1on1/report/${user.id}`,
      gradient: "from-sky-400 to-blue-500",
      bgLight: "bg-sky-50",
      borderColor: "border-sky-200",
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
    },
    {
      icon: <Sparkles size={24} />,
      title: "시그니처 리포트",
      desc: "나만의 아우라 카드와 타인의 시선이 담긴 자아 도록",
      href: `/final_report/${user.id}`,
      gradient: "from-amber-400 to-yellow-500",
      bgLight: "bg-amber-50",
      borderColor: "border-amber-200",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6 antialiased"
      style={{ backgroundColor: colors.background }}
    >
      <motion.div
        className="max-w-md w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.header
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <p
            className="text-[9px] font-sans font-black uppercase tracking-[0.4em] mb-3"
            style={{ color: colors.accent }}
          >
            Report Hub
          </p>
          <h1 className="text-3xl font-serif italic font-bold tracking-tight mb-4" style={{ color: colors.primary }}>
            Before We Meet
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>
            오늘 <span className="font-bold" style={{ color: colors.primary }}>{user.real_name}</span>님이 증명한
            <br />
            가치들이 여기에 기록되어 있습니다.
          </p>
          <div className="h-px w-12 mx-auto mt-6" style={{ backgroundColor: colors.soft }} />
        </motion.header>

        {/* Cards */}
        <div className="space-y-4">
          {cards.map((card, idx) => (
            <motion.button
              key={card.href}
              onClick={() => router.push(card.href)}
              className={`w-full p-6 rounded-[2.5rem] border ${card.borderColor} ${card.bgLight} text-left transition-all shadow-sm hover:shadow-md`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.15, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0`}>
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold mb-1" style={{ color: colors.primary }}>
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>
                    {card.desc}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Expiry Notice */}
        <motion.div
          className="mt-8 text-center flex items-center justify-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Clock size={12} style={{ color: colors.muted }} />
          <p className="text-[10px] font-sans" style={{ color: colors.muted }}>
            이 리포트는 행사 종료 후 24시간 뒤에 자동 삭제됩니다
          </p>
        </motion.div>

        {/* Logout */}
        <motion.button
          onClick={() => { clearAuth(); window.location.href = "/"; }}
          className="mt-6 mx-auto flex items-center justify-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.2em] transition-colors hover:opacity-70"
          style={{ color: colors.muted }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <LogOut size={12} /> 로그아웃
        </motion.button>
      </motion.div>
    </main>
  );
}
