"use client";
import { useState } from "react";
import { GameState } from "@/lib/types";
import { BOARD } from "@/lib/boardData";
import { isPropertyTile } from "@/lib/types";
import { actions } from "@/lib/roomService";
import Overlay from "./Overlay";

export default function BuyModal({ state, roomId, playerId, tileId }: { state: GameState; roomId: string; playerId: string; tileId: number }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const tile = BOARD[tileId];
  const me = state.players[playerId];
  if (!isPropertyTile(tile)) return null;
  const canAfford = me.cash >= tile.price;

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await fn(); } catch (e: any) { setError(e.message || "ทำรายการไม่สำเร็จ"); } finally { setBusy(false); }
  }

  return (
    <Overlay>
      <div className="w-[340px] max-w-full bg-paper-hi rounded-[22px] shadow-deep relative overflow-hidden border border-paper-line animate-pop-in">
        <div className="px-5 pt-4 pb-2.5 text-white" style={{ background: "var(--felt)" }}>
          <p className="text-[.7rem] opacity-85 m-0 mb-0.5">ที่ดินว่าง — ท่านตกลงบนช่องนี้</p>
          <h3 className="m-0 text-[1.25rem]">{tile.name}</h3>
        </div>
        <div className="px-5 py-3.5">
          {error && <div className="bg-seal/10 text-seal border border-seal/30 px-3 py-2 rounded-lg text-sm mb-2.5">{error}</div>}
          <div className="flex justify-between text-[.83rem] py-1.5 border-b border-dotted border-paper-line">
            <span>ราคาที่ดิน</span><b className="num font-display">{tile.price.toLocaleString()}</b>
          </div>
          {tile.type === "PROPERTY" && (
            <>
              <div className="flex justify-between text-[.83rem] py-1.5 border-b border-dotted border-paper-line">
                <span>ค่าเช่าพื้นฐาน</span><b className="num font-display">{tile.rent.toLocaleString()}</b>
              </div>
              <div className="flex justify-between text-[.83rem] py-1.5 border-b border-dotted border-paper-line">
                <span>ค่าเช่า (บ้าน 1–4)</span><b className="num font-display">{tile.rentHouse.map((n) => n.toLocaleString()).join(" / ")}</b>
              </div>
              <div className="flex justify-between text-[.83rem] py-1.5 border-b border-dotted border-paper-line">
                <span>ค่าเช่า (โรงแรม)</span><b className="num font-display">{tile.rentHotel.toLocaleString()}</b>
              </div>
            </>
          )}
          <div className="flex justify-between text-[.83rem] py-1.5 border-b border-dotted border-paper-line">
            <span>เงินสดของท่าน</span><b className="num font-display">{me.cash.toLocaleString()}</b>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-1.5">
          <button
            className="flex-1 border-none rounded-lg py-2.5 px-4 text-sm font-semibold bg-transparent border border-paper-line text-ink hover:border-ink-soft disabled:opacity-50 disabled:cursor-wait"
            disabled={busy}
            onClick={() => run(() => actions.declineProperty(roomId, playerId))}
          >
            ไม่ซื้อ (เปิดประมูล)
          </button>
          <button
            className="flex-1 border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-felt-deep disabled:opacity-45 disabled:cursor-not-allowed hover:brightness-105"
            style={{ background: "linear-gradient(180deg, var(--gold-bright), var(--gold))" }}
            disabled={!canAfford || busy}
            onClick={() => run(() => actions.buyProperty(roomId, playerId))}
          >
            ซื้อที่ดิน
          </button>
        </div>
      </div>
    </Overlay>
  );
}
