"use client";
import { useState } from "react";
import { GameState } from "@/lib/types";
import { actions } from "@/lib/roomService";
import { tokenEmoji } from "@/lib/boardData";
import Overlay from "./Overlay";

export default function JailModal({ state, roomId, playerId }: { state: GameState; roomId: string; playerId: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const me = state.players[playerId];

  async function run(fn: () => Promise<void>) {
    if (busy) return; // กันกดซ้ำรัว ๆ ระหว่างรอผลจากเซิร์ฟเวอร์
    setBusy(true);
    setError("");
    try { await fn(); } catch (e: any) { setError(e.message || "ทำรายการไม่สำเร็จ"); } finally { setBusy(false); }
  }

  return (
    <Overlay>
      <div className="w-[380px] max-w-full bg-paper-hi rounded-[22px] shadow-deep overflow-hidden border border-paper-line animate-pop-in">
        <div className="px-5 py-3.5 text-white" style={{ background: "var(--seal)" }}>
          <h3 className="m-0 text-[1.05rem]">ติดคุก</h3>
        </div>
        <div className="px-5 py-4">
          {error && <div className="bg-seal/10 text-seal border border-seal/30 px-3 py-2 rounded-lg text-sm mb-2.5">{error}</div>}
          <div className="flex gap-4 items-center">
            <div className="relative w-[58px] h-[58px] rounded-full overflow-hidden flex-none jail-bars">
              <div className="w-full h-full rounded-full flex items-center justify-center text-2xl" style={{ background: me.color }}>
                {tokenEmoji(me.tokenIcon)}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-semibold">{me.name}</div>
              <div className="text-[.82rem] text-ink-soft">
                ติดคุกมาแล้ว {me.jailTurns} ตา — ทอย Double เพื่อออกฟรี หรือจ่ายค่าปรับ{" "}
                {me.jailTurns >= 2 ? "(ตานี้ต้องจ่าย หากทอยไม่ได้ Double)" : ""}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap pt-4">
            <button
              className="border-none rounded-lg py-2.5 px-4 text-sm font-semibold bg-transparent border border-paper-line text-ink hover:border-ink-soft disabled:opacity-50 disabled:cursor-wait"
              disabled={busy}
              onClick={() => run(() => actions.rollForJail(roomId, playerId))}
            >
              ทอยเพื่อออก (Double)
            </button>
            <button
              className="border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-white disabled:opacity-45 disabled:cursor-not-allowed hover:brightness-110"
              style={{ background: "var(--seal)" }}
              disabled={me.cash < 500 || busy}
              onClick={() => run(() => actions.payJailFine(roomId, playerId))}
            >
              จ่ายค่าปรับ 500
            </button>
            {me.jailFreeCards > 0 && (
              <button
                className="w-full border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-felt-deep hover:brightness-105 disabled:opacity-50 disabled:cursor-wait"
                style={{ background: "linear-gradient(180deg, var(--gold-bright), var(--gold))" }}
                disabled={busy}
                onClick={() => run(() => actions.useJailFreeCard(roomId, playerId))}
              >
                ใช้บัตรออกจากคุกฟรี ({me.jailFreeCards})
              </button>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  );
}
