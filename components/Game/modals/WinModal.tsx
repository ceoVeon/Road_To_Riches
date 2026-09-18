"use client";
import { useState } from "react";
import { GameState } from "@/lib/types";
import { actions } from "@/lib/roomService";
import Overlay from "./Overlay";

export default function WinModal({
  state, roomId, playerId, rankings,
}: { state: GameState; roomId: string; playerId: string; rankings: { playerId: string; netWorth: number }[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isHost = state.hostId === playerId;

  async function backToLobby() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      // ข้อ 5: จบเกมแล้วกลับไปห้องรอของห้องเดิม ไม่ใช่หน้าแรกหรือหน้าสร้างห้อง
      // ไม่ต้อง router.push เพราะยังอยู่ URL /room/[roomId] เดิม — พอสถานะห้องเปลี่ยนเป็น WAITING
      // หน้าเดิมจะสลับไปแสดง Lobby ให้เองโดยอัตโนมัติ
      await actions.resetToLobby(roomId, playerId);
    } catch (e: any) {
      setError(e.message || "กลับไปห้องรอไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay>
      <div className="w-[420px] max-w-full bg-paper-hi rounded-[22px] shadow-deep overflow-hidden border border-paper-line animate-pop-in">
        <div className="text-center px-6 pt-6 pb-2">
          <div
            className="w-[58px] h-[58px] rounded-full mx-auto mb-2.5 flex items-center justify-center text-2xl shadow-[0_6px_14px_rgba(0,0,0,0.35)]"
            style={{ background: "radial-gradient(circle at 35% 30%, var(--gold-bright), var(--gold) 65%, var(--gold-deep) 100%)" }}
          >
            🏆
          </div>
          <h2 className="m-0">จบเกมแล้ว</h2>
          <p className="text-ink-soft mt-1 mb-0">ผู้ชนะคือผู้เล่นคนสุดท้ายที่ไม่ล้มละลาย</p>
          <table className="w-full border-collapse mt-3 text-[.83rem]">
            <thead>
              <tr>
                <th className="text-left font-medium text-ink-soft text-[.72rem] py-1.5 px-1.5 border-b border-paper-line">อันดับ</th>
                <th className="text-left font-medium text-ink-soft text-[.72rem] py-1.5 px-1.5 border-b border-paper-line">ผู้เล่น</th>
                <th className="text-left font-medium text-ink-soft text-[.72rem] py-1.5 px-1.5 border-b border-paper-line">มูลค่าทรัพย์สินสุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r, i) => {
                const pl = state.players[r.playerId];
                return (
                  <tr key={r.playerId} className={i === 0 ? "font-bold text-felt" : ""}>
                    <td className="py-1.5 px-1.5 border-b border-dotted border-paper-line">{i + 1}</td>
                    <td className="py-1.5 px-1.5 border-b border-dotted border-paper-line">{pl?.name}</td>
                    <td className="num py-1.5 px-1.5 border-b border-dotted border-paper-line">{r.netWorth.toLocaleString()} บาท</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {error && (
            <div className="bg-seal/10 text-seal border border-seal/30 px-3 py-2 rounded-lg text-sm mt-3">{error}</div>
          )}
          {isHost ? (
            <button
              className="w-full border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-felt-deep hover:brightness-105 disabled:opacity-60 disabled:cursor-wait my-4"
              style={{ background: "linear-gradient(180deg, var(--gold-bright), var(--gold))" }}
              disabled={busy}
              onClick={backToLobby}
            >
              {busy ? "กำลังกลับไปห้องรอ..." : "กลับไปห้องรอ (เล่นใหม่)"}
            </button>
          ) : (
            <p className="text-[.82rem] text-ink-soft my-4">รอหัวห้องกดกลับไปห้องรอเพื่อเริ่มเกมใหม่...</p>
          )}
        </div>
      </div>
    </Overlay>
  );
}
