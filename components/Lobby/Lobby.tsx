"use client";
import { useState } from "react";
import { GameState } from "@/lib/types";
import { AVATAR_COLORS, TOKEN_ICONS, tokenEmoji } from "@/lib/boardData";
import { actions } from "@/lib/roomService";

export default function Lobby({ state, roomId, playerId }: { state: GameState; roomId: string; playerId: string }) {
  const [error, setError] = useState("");
  const me = state.players[playerId];
  const players = Object.values(state.players).sort((a, b) => (a.isHost ? -1 : 1));
  const usedColors = new Set(Object.values(state.players).filter((p) => p.id !== playerId).map((p) => p.color));
  const usedIcons = new Set(Object.values(state.players).filter((p) => p.id !== playerId).map((p) => p.tokenIcon));
  const allReady = players.every((p) => p.isReady);
  const canStart = me?.isHost && players.length >= 2 && allReady;

  async function run(fn: () => Promise<void>) {
    setError("");
    try { await fn(); } catch (e: any) { setError(e.message || "เกิดข้อผิดพลาด"); }
  }

  function copyCode() {
    navigator.clipboard?.writeText(state.roomCode).catch(() => {});
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[640px] bg-paper watercolor-card shadow-deep border border-paper-line animate-fade-in">
        <div className="px-7 pt-6 pb-4 border-b border-dashed border-paper-line flex justify-between items-start gap-3 flex-wrap">
          <div>
            <p className="m-0 mb-1 text-ink-soft text-[.82rem]">ห้องเล่นออนไลน์</p>
            <h2 className="m-0 text-[1.7rem]">รอผู้เล่นเข้าห้อง</h2>
          </div>
          <div
            className="inline-flex items-center gap-2 bg-felt text-gold-bright px-3.5 py-1.5 rounded-lg font-display text-base tracking-[2px] cursor-pointer"
            onClick={copyCode}
            title="กดเพื่อคัดลอก"
          >
            รหัสห้อง&nbsp;{state.roomCode}
          </div>
        </div>
        <div className="px-7 pt-5 pb-6">
          {error && <div className="bg-seal/10 text-seal border border-seal/30 px-3 py-2 rounded-lg text-sm mb-3.5">{error}</div>}

          <h3 className="font-normal text-ink-soft text-base m-0 mb-2.5">
            ผู้เล่นในห้อง ({players.length}/6)
          </h3>
          {players.map((p) => (
            <div key={p.id} className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg border mb-2 bg-paper-hi ${p.id === playerId ? "border-gold" : "border-paper-line"}`}>
              <div className="w-[38px] h-[38px] rounded-full flex-none flex items-center justify-center text-lg" style={{ background: p.color }}>
                {tokenEmoji(p.tokenIcon)}
              </div>
              <div className="font-semibold flex-1 min-w-0">
                {p.name} {p.isHost && <small className="font-normal text-ink-soft">(เจ้าของห้อง)</small>} {p.isBot && <small className="font-normal text-ink-soft">(บอท)</small>}
              </div>
              <div className={`text-xs px-2.5 py-1 rounded-full flex-none ${p.isReady ? "bg-[var(--group-green)]/15 text-[var(--group-green)]" : "bg-seal/10 text-seal"}`}>
                {p.isReady ? "พร้อม" : "กำลังตั้งค่า"}
              </div>
            </div>
          ))}

          {me && !me.isBot && (
            <>
              <p className="text-[.82rem] text-ink-soft mt-4 mb-1">เลือกสีตัวเดินของท่าน</p>
              <div className="flex gap-1.5 flex-wrap my-3.5">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-[30px] h-[30px] rounded-full border-2 ${me.color === c ? "border-ink shadow-[0_0_0_2px_var(--gold)]" : "border-transparent"}`}
                    style={{ background: c, opacity: usedColors.has(c) ? 0.25 : 1 }}
                    disabled={usedColors.has(c)}
                    onClick={() => run(() => actions.setChoice(roomId, playerId, { color: c }))}
                  />
                ))}
              </div>
              <p className="text-[.82rem] text-ink-soft mt-2.5 mb-1">เลือกตัวเดินของท่าน</p>
              <div className="flex gap-1.5 flex-wrap my-3.5">
                {TOKEN_ICONS.map((icon) => (
                  <button
                    key={icon}
                    className={`px-3 py-1.5 rounded-lg border text-lg ${me.tokenIcon === icon ? "bg-felt border-felt" : "bg-paper-hi border-paper-line"} disabled:opacity-30 disabled:cursor-not-allowed`}
                    disabled={usedIcons.has(icon)}
                    onClick={() => run(() => actions.setChoice(roomId, playerId, { tokenIcon: icon }))}
                    title={icon}
                  >
                    {tokenEmoji(icon)}
                  </button>
                ))}
              </div>

              <div className="flex gap-2.5 mt-4 flex-wrap">
                <button
                  className="border-none rounded-lg px-4 py-2.5 text-sm font-semibold bg-transparent border border-paper-line text-ink hover:border-ink-soft"
                  onClick={() => run(() => actions.setChoice(roomId, playerId, { isReady: !me.isReady }))}
                >
                  {me.isReady ? "ยกเลิกพร้อม" : "กดพร้อม"}
                </button>
                {me.isHost && (
                  <button
                    className="border-none rounded-lg px-4 py-2.5 text-sm font-semibold bg-transparent border border-paper-line text-ink hover:border-ink-soft disabled:opacity-45 disabled:cursor-not-allowed"
                    disabled={players.length >= 6}
                    onClick={() => run(() => actions.addBot(roomId))}
                  >
                    + เพิ่มผู้เล่นบอท
                  </button>
                )}
                {me.isHost && (
                  <button
                    className="flex-1 border-none rounded-lg px-4 py-2.5 text-[.92rem] font-semibold text-felt-deep disabled:opacity-45 disabled:cursor-not-allowed hover:brightness-105"
                    style={{ background: "linear-gradient(180deg, var(--gold-bright), var(--gold))" }}
                    disabled={!canStart}
                    onClick={() => run(() => actions.startGame(roomId, playerId))}
                  >
                    เริ่มเกม
                  </button>
                )}
              </div>
              {me.isHost && !canStart && (
                <p className="text-[.78rem] text-ink-soft mt-2">
                  ต้องมีผู้เล่นอย่างน้อย 2 คน และทุกคนต้องกดพร้อมก่อนจึงจะเริ่มเกมได้
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
