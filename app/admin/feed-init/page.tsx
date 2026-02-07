"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { ImageIcon, RefreshCw, CheckCircle, AlertCircle, ArrowLeft, FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseDriveFileName } from "@/lib/utils/feed-parser";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

const { colors, borderRadius } = DESIGN_TOKENS;

export default function FeedInitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState("01");
  const [sessionDate, setSessionDate] = useState("");
  const [scanStatus, setScanStatus] = useState<string[]>([]);
  const [rawSession, setRawSession] = useState("");

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // users는 supabase, system_settings는 RLS 우회 API 사용
      const [{ data: uData }, phaseRes] = await Promise.all([
        supabase.from("users").select("*").order("real_name"),
        fetch('/api/admin/phase', { cache: 'no-store' })
      ]);
      setUsers(uData || []);

      const phaseData = await phaseRes.json();
      const rawSess = phaseData.success ? (phaseData.settings?.current_session || "01") : "01";
      const raw = String(rawSess);
      setRawSession(raw);
      console.log("📋 current_session 원본값:", raw);
      if (raw.includes('_')) {
        setSessionDate(raw.split('_')[0]);
        setCurrentSession(raw.split('_').pop()!.padStart(2, '0'));
      } else {
        setCurrentSession(raw.padStart(2, '0'));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSync = async () => {
    if (!API_KEY || !FOLDER_ID) return alert("환경변수 설정 누락");
    setLoading(true);
    const logs: string[] = [];
    const addLog = (msg: string) => { logs.push(msg); setScanStatus([...logs]); };

    try {
      // 1단계: 루트 폴더의 모든 항목 가져오기
      addLog(`🔍 루트 폴더(${FOLDER_ID.slice(0, 8)}...) 스캔 중...`);
      const rootRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&fields=files(id,name,mimeType)&pageSize=1000&key=${API_KEY}`
      );
      const rootData = await rootRes.json();
      if (rootData.error) {
        addLog(`❌ Drive API 에러: ${rootData.error.message}`);
        setLoading(false);
        return;
      }
      const rootItems = rootData.files || [];
      const rootFolders = rootItems.filter((f: any) => f.mimeType === "application/vnd.google-apps.folder");
      const rootImages = rootItems.filter((f: any) => f.mimeType?.startsWith("image/"));
      addLog(`📂 루트: 폴더 ${rootFolders.length}개 [${rootFolders.map((f: any) => f.name).join(", ")}], 이미지 ${rootImages.length}개`);

      // 2단계: 날짜 폴더 찾기
      let targetFolderId = FOLDER_ID;
      let folderName = "루트";
      if (sessionDate) {
        const dateFolder = rootFolders.find((f: any) => f.name === sessionDate);
        if (dateFolder) {
          targetFolderId = dateFolder.id;
          folderName = sessionDate;
          addLog(`✅ '${sessionDate}' 폴더 발견 (ID: ${dateFolder.id.slice(0, 12)}...)`);
        } else {
          addLog(`⚠️ '${sessionDate}' 폴더 없음! 루트에서 스캔`);
        }
      } else {
        addLog(`⚠️ sessionDate 비어있음 → 루트에서 스캔`);
      }

      // 3단계: 대상 폴더의 모든 파일 가져오기
      addLog(`🔍 ${folderName} 폴더(${targetFolderId.slice(0, 8)}...) 내부 스캔 중...`);
      const filesRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${targetFolderId}'+in+parents&fields=files(id,name,mimeType)&pageSize=1000&key=${API_KEY}`
      );
      const filesData = await filesRes.json();
      if (filesData.error) {
        addLog(`❌ Drive API 에러: ${filesData.error.message}`);
        setLoading(false);
        return;
      }
      const allFiles = filesData.files || [];
      const imageFiles = allFiles.filter((f: any) => f.mimeType?.startsWith("image/"));
      addLog(`📸 ${folderName}: 전체 ${allFiles.length}개, 이미지 ${imageFiles.length}개`);

      setDriveFiles(imageFiles);
      addLog(`✅ 완료: ${imageFiles.length}개 이미지 로드`);
    } catch (e: any) {
      addLog(`❌ 에러: ${e.message}`);
    } finally { setLoading(false); }
  };

  // 날짜 포맷: "2026-02-07" → "2월 7일"
  const formatDate = (d: string) => {
    if (!d) return "";
    const parts = d.split("-");
    if (parts.length === 3) {
      return `${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
    }
    return d;
  };

  return (
    <main className="min-h-screen p-8 font-serif antialiased" style={{ backgroundColor: colors.primary, color: "white" }}>
      <div className="max-w-5xl mx-auto space-y-10">
        <motion.header
          className="flex justify-between items-end"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-4">
            <motion.button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-2 text-[10px] text-white/40 uppercase font-black tracking-widest hover:text-white transition-colors"
              whileHover={{ x: -3 }}
            >
              <ArrowLeft size={12} /> Back to Gateway
            </motion.button>
            <h1 className="text-4xl italic tracking-tighter" style={{ color: colors.accent }}>Feed Initializer</h1>
            <p className="text-[10px] font-sans font-black uppercase tracking-[0.3em] opacity-40 italic">Me Before You Control Center</p>
          </div>
          <motion.button
            onClick={handleSync}
            disabled={loading}
            className="px-10 py-5 font-sans font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl disabled:opacity-30"
            style={{ backgroundColor: colors.accent, borderRadius: "2rem" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <ImageIcon size={16} />} Scan & Sync Drive
          </motion.button>
        </motion.header>

        {/* 현재 세션 정보 배너 */}
        <motion.div
          className="flex items-center gap-4 px-8 py-5 border border-white/10"
          style={{ backgroundColor: "#1e1e1e", borderRadius: borderRadius.onboarding }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <FolderOpen size={20} className="text-white/40" />
          <div className="flex-1">
            <p className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-white/40 mb-1">현재 세션</p>
            <p className="text-lg font-bold">
              {sessionDate ? (
                <><span style={{ color: colors.accent }}>{formatDate(sessionDate)}</span> <span className="text-white/60">{parseInt(currentSession)}회차</span></>
              ) : (
                <span className="text-white/60">{currentSession}회차</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-white/40 mb-1">Drive 폴더</p>
            <p className="text-sm font-mono text-white/60">{sessionDate || "루트"}/</p>
          </div>
          {driveFiles.length > 0 && (
            <div className="text-right pl-4 border-l border-white/10">
              <p className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-white/40 mb-1">스캔 결과</p>
              <p className="text-sm font-bold text-green-400">{driveFiles.length}개 이미지</p>
            </div>
          )}
        </motion.div>

        {/* 스캔 로그 */}
        {scanStatus.length > 0 && (
          <motion.div
            className="px-6 py-4 border border-white/10 text-xs font-mono space-y-1"
            style={{ backgroundColor: "#0a0a0a", borderRadius: "1rem" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-[9px] font-sans font-black uppercase tracking-widest text-white/30 mb-2">Scan Log</p>
            {scanStatus.map((log, i) => (
              <p key={i} className="text-white/70">{log}</p>
            ))}
          </motion.div>
        )}

        {/* 디버그: 스캔된 파일 목록 + DB 유저 수 */}
        {driveFiles.length > 0 && (
          <motion.div
            className="px-6 py-4 border border-white/10 text-xs font-mono space-y-2"
            style={{ backgroundColor: "#111", borderRadius: "1rem" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-white/40 font-sans font-black uppercase tracking-widest text-[9px] mb-2">
              DB 유저: <span className="text-white">{users.length}명</span> · Drive 이미지: <span className="text-white">{driveFiles.length}개</span> · session: <span className="text-yellow-400">{rawSession}</span> · 날짜폴더: <span className={sessionDate ? "text-green-400" : "text-red-400"}>{sessionDate || "없음"}</span>
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {driveFiles.map((f, i) => {
                const info = parseDriveFileName(f.name);
                const matched = info && users.some(u =>
                  String(u.real_name).trim() === info.realName &&
                  String(u.phone_suffix).trim() === info.phoneSuffix
                );
                return (
                  <p key={i} className={matched ? "text-green-400" : "text-red-400"}>
                    {matched ? "✅" : "❌"} {f.name}
                    {info ? ` → ${info.realName}/${info.phoneSuffix} (S${info.session})` : " → 파싱실패"}
                    {info && !matched && ` [DB에 없음]`}
                  </p>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div
          className="border border-white/5 overflow-hidden shadow-2xl"
          style={{ backgroundColor: "#161616", borderRadius: borderRadius.onboarding }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5 text-[9px] font-sans font-black uppercase tracking-[0.3em] text-white/40">
                <th className="p-8">Participant</th>
                <th className="p-8 text-center">S 01</th>
                <th className="p-8 text-center">S 02</th>
                <th className="p-8 text-center">S 03</th>
                <th className="p-8 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u, idx) => {
                const userFiles = driveFiles.filter(f => {
                  const info = parseDriveFileName(f.name);
                  return info && info.realName === String(u.real_name).trim() && info.phoneSuffix === String(u.phone_suffix).trim();
                });
                return (
                  <motion.tr
                    key={u.id}
                    className="hover:bg-white/[0.02] transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.03 }}
                  >
                    <td className="p-8">
                      <p className="text-lg font-bold">{u.nickname}</p>
                      <p className="text-[10px] opacity-30 font-sans font-medium uppercase tracking-widest mt-1">{u.real_name} · {u.phone_suffix}</p>
                    </td>
                    {[1, 2, 3].map(num => {
                      const sessStr = String(num).padStart(2, '0');
                      const exists = userFiles.some(f => parseDriveFileName(f.name)?.session === sessStr);
                      return (
                        <td key={num} className="p-8 text-center">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 + idx * 0.03 + num * 0.05, type: "spring" }}
                          >
                            {exists ? (
                              <CheckCircle size={20} className="text-green-500 mx-auto opacity-80 shadow-[0_0_15px_rgba(34,197,94,0.3)]" />
                            ) : (
                              <AlertCircle size={20} className="text-white/10 mx-auto" />
                            )}
                          </motion.div>
                        </td>
                      );
                    })}
                    <td className="p-8 text-right">
                      <span className={`text-[9px] font-sans font-black uppercase tracking-widest ${userFiles.length >= 3 ? 'text-green-500' : ''}`} style={{ color: userFiles.length >= 3 ? undefined : colors.accent }}>
                        {userFiles.length} / 3 Found
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      </div>
    </main>
  );
}
