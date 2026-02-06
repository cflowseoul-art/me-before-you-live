"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Sparkles, Fingerprint, Users, Zap, Brain, Radio, Loader2 } from "lucide-react";

export default function FinalReportPage({ params }: { params: any }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (params) {
      params.then((p: any) => setUserId(p.id));
    }
  }, [params]);

  // Check is_final_report_open flag and redirect if not open
  useEffect(() => {
    if (!userId) return;

    const checkAccess = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'is_final_report_open')
        .single();

      if (data?.value !== 'true') {
        router.replace(`/1on1/report/${userId}`);
        return;
      }

      // Fetch user info
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userData) setUser(userData);
      setIsLoading(false);
    };

    checkAccess();

    // Realtime: if admin closes, redirect back
    const channel = supabase
      .channel('final_report_access')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'system_settings',
      }, (payload) => {
        const row = payload.new as { key: string; value: string };
        if (row.key === 'is_final_report_open' && row.value !== 'true') {
          router.replace(`/1on1/report/${userId}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-amber-400 animate-spin" size={40} />
      </div>
    );
  }

  const sections = [
    {
      icon: <Fingerprint size={20} className="text-amber-400" />,
      tag: "IDENTITY",
      title: "The Aura Card",
      subtitle: "인연의 잔상",
      description: "당신만의 시그니처 아우라 카드",
    },
    {
      icon: <Zap size={20} className="text-amber-400" />,
      tag: "SCARCITY",
      title: "The Lone Pioneer",
      subtitle: "1/10의 고집",
      description: "당신만이 선택한 독보적 가치관",
    },
    {
      icon: <Radio size={20} className="text-amber-400" />,
      tag: "THE ECHO",
      title: "The Feedback",
      subtitle: "당신이 남긴 온도",
      description: "대화 상대가 남긴 당신의 매력 키워드",
    },
    {
      icon: <Brain size={20} className="text-amber-400" />,
      tag: "PARADOX",
      title: "Persona Paradox",
      subtitle: "매력적 모순",
      description: "의도와 인상 사이, 반전 매력의 증명",
    },
    {
      icon: <Users size={20} className="text-amber-400" />,
      tag: "INSTINCT",
      title: "Subconscious Frequency",
      subtitle: "무의식적 끌림",
      description: "당신의 본능이 향한 이상형 분석",
    },
  ];

  return (
    <div className="min-h-screen font-serif pb-24 antialiased select-none bg-black text-white">
      {/* Header */}
      <motion.header
        className="text-center pt-20 pb-12 px-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-6 shadow-[0_0_40px_rgba(245,158,11,0.3)]"
        >
          <Sparkles size={28} className="text-white" />
        </motion.div>
        <p className="text-[10px] font-sans font-black tracking-[0.4em] uppercase mb-3 text-amber-400">The Signature</p>
        <h1 className="text-3xl italic font-bold tracking-tight mb-2 text-white">{user?.nickname}님의 시그니처</h1>
        <p className="text-sm text-amber-200/50 mt-4 leading-relaxed max-w-md mx-auto">
          오늘 이 공간에서 당신이 증명한 가치를<br />가장 아름다운 방식으로 복원했습니다.
        </p>
        <div className="h-px w-12 mx-auto bg-amber-500/30 mt-6" />
      </motion.header>

      {/* Section Placeholders */}
      <section className="max-w-xl mx-auto px-6 space-y-6">
        {sections.map((section, idx) => (
          <motion.div
            key={section.tag}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + idx * 0.1 }}
            className="bg-gradient-to-br from-stone-900 to-stone-950 border border-amber-500/20 rounded-[2rem] p-7 relative overflow-hidden"
          >
            {/* Subtle gold accent */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

            <div className="flex items-center gap-2 mb-3">
              {section.icon}
              <span className="text-[9px] font-sans font-black uppercase tracking-[0.3em] text-amber-500/70">
                {section.tag}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">{section.title}</h3>
            <p className="text-sm text-amber-200/40 mb-4">{section.subtitle}</p>

            {/* Placeholder content */}
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-amber-500/20 rounded-2xl">
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {section.icon}
              </motion.div>
              <p className="text-xs text-amber-500/40 mt-3">{section.description}</p>
              <p className="text-[10px] text-amber-500/25 mt-1">Coming Soon</p>
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
