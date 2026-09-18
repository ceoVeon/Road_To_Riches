"use client";
import { useState } from "react";
import { GameState } from "@/lib/types";
import { actions } from "@/lib/roomService";
import Overlay from "./Overlay";

export default function BankruptModal({
  state, roomId, playerId, onManage,
}: { state: GameState; roomId: string; playerId: string; onManage: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (state.pending.kind !== "BANKRUPT") return null;
  const p = state.pending;
  const me = state.players[playerId];
  const creditorName = p.creditor ? state.players[p.creditor]?.name : "ธนาคาร";

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await fn(); } catch (e: any) { setError(e.message || "ทำรายการไม่สำเร็จ"); } finally { setBusy(false); }
  }

  return (
    <Overlay>
      <div className="w-[380px] max-w-full bg-paper-hi rounded-[22px] shadow-deep overflow-hidden border border-paper-line animate-pop-in">
        <div className="px-5 py-3.5 text-white" style={{ background: "var(--ink)" }}>
          <h3 className="m-0 text-[1.05rem]">เงินไม่พอชำระ</h3>
        </div>
        <div className="px-5 py-4 text-center">
          {error && <div className="bg-seal/10 text-seal border border-seal/30 px-3 py-2 rounded-lg text-sm mb-2.5">{error}</div>}
          <p className="text-ink-soft text-[.88rem]">
            <b className="text-ink">{me.name}</b> เงินสดขาดอยู่{" "}
            <b className="num text-seal">{p.amountOwed.toLocaleString()}</b> บาท ที่ต้องจ่ายให้ {creditorName}
            <br />ขายบ้าน/โรงแรม หรือจำนองที่ดินเพื่อหาเงินเพิ่ม หรือประกาศล้มละลายหากไม่สามารถชำระได้
          </p>
          <div className="flex gap-2 pt-3.5">
            <button
              className="flex-1 border-none rounded-lg py-2.5 px-4 text-sm font-semibold bg-transparent border border-paper-line text-ink hover:border-ink-soft"
              onClick={onManage}
            >
              จัดการทรัพย์สิน
            </button>
            <button
              className="flex-1 border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-wait"
              style={{ background: "var(--seal)" }}
              disabled={busy}
              onClick={() => run(() => actions.declareBankrupt(roomId, playerId))}
            >
              ประกาศล้มละลาย
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
