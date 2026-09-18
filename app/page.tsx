"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom, findRoomByCode, getSavedName } from "@/lib/roomService";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState(getSavedName());
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { setError("กรุณากรอกชื่อผู้เล่น"); return; }
    setBusy(true); setError("");
    try {
      const { roomId } = await createRoom(name.trim());
      router.push(`/room/${roomId}`);
    } catch (e: any) {
      setError(e.message || "สร้างห้องไม่สำเร็จ");
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) { setError("กรุณากรอกชื่อผู้เล่น"); return; }
    if (!code.trim()) { setError("กรุณากรอกรหัสห้อง"); return; }
    setBusy(true); setError("");
    try {
      const roomId = await findRoomByCode(code);
      if (!roomId) { setError("ไม่พบห้องรหัสนี้"); setBusy(false); return; }
      router.push(`/room/${roomId}?name=${encodeURIComponent(name.trim())}`);
    } catch (e: any) {
      setError(e.message || "เข้าร่วมห้องไม่สำเร็จ");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[460px] bg-paper watercolor-card shadow-deep border border-paper-line px-8 pt-8 pb-6 animate-fade-in relative">
        <div className="w-[52px] h-[52px] mx-auto mb-3 rounded-full flex items-center justify-center text-[22px] font-display font-bold text-felt-deep shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)]"
          style={{ background: "radial-gradient(circle at 35% 30%, var(--gold-bright), var(--gold) 55%, var(--gold-deep) 100%)" }}>
          ศ
        </div>
        <h1 className="m-0 mb-1 text-[2rem] text-center text-felt">ทางเดินเศรษฐี</h1>
        <p className="text-center text-ink-soft m-0 mb-6 text-sm">เกมกระดานซื้อขายทรัพย์สิน เล่นออนไลน์กับเพื่อน 2–6 คน</p>

        <div className="flex gap-1.5 mb-5 bg-paper-hi rounded-lg p-1 border border-paper-line">
          <button
            className={`flex-1 border-none py-2.5 rounded-md text-sm font-semibold ${mode === "create" ? "bg-felt text-paper-hi" : "bg-transparent text-ink-soft"}`}
            onClick={() => setMode("create")}
          >
            สร้างห้องใหม่
          </button>
          <button
            className={`flex-1 border-none py-2.5 rounded-md text-sm font-semibold ${mode === "join" ? "bg-felt text-paper-hi" : "bg-transparent text-ink-soft"}`}
            onClick={() => setMode("join")}
          >
            เข้าร่วมห้อง
          </button>
        </div>

        {error && (
          <div className="bg-seal/10 text-seal border border-seal/30 px-3 py-2 rounded-lg text-sm mb-3.5">
            {error}
          </div>
        )}

        <div className="mb-3.5">
          <label className="block text-[.82rem] text-ink-soft mb-1.5">ชื่อผู้เล่น</label>
          <input
            className="w-full px-3 py-2.5 rounded-lg border border-paper-line bg-paper-hi text-base font-inherit text-ink focus:outline focus:outline-2 focus:outline-gold focus:outline-offset-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น สมชาย"
            maxLength={20}
          />
        </div>

        {mode === "join" && (
          <div className="mb-3.5">
            <label className="block text-[.82rem] text-ink-soft mb-1.5">รหัสห้อง</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg border border-paper-line bg-paper-hi text-base font-inherit text-ink focus:outline focus:outline-2 focus:outline-gold focus:outline-offset-1"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="เช่น 4F2A9"
              maxLength={6}
            />
          </div>
        )}

        <button
          className="w-full border-none rounded-lg px-4 py-3 text-[.92rem] font-semibold tracking-wide text-felt-deep transition-all hover:brightness-105 hover:-translate-y-px disabled:opacity-45 disabled:cursor-not-allowed disabled:translate-y-0"
          style={{ background: "linear-gradient(180deg, var(--gold-bright), var(--gold))" }}
          disabled={busy}
          onClick={mode === "create" ? handleCreate : handleJoin}
        >
          {mode === "create" ? "สร้างห้องและเข้าสู่ห้องรอ" : "เข้าร่วมห้อง"}
        </button>
      </div>
    </div>
  );
}
