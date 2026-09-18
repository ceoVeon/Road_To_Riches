"use client";
import { useState } from "react";
import { GameState } from "@/lib/types";
import { BOARD } from "@/lib/boardData";
import { actions } from "@/lib/roomService";
import Overlay from "./Overlay";

/**
 * ข้อ 4: การประมูลจะปิด Modal / จบลงก็ต่อเมื่อผู้เล่นทุกคนที่ร่วมประมูลกดถอนตัวครบทุกคนแล้ว
 * เท่านั้น (ดู resolveAuctionIfDone ใน gameEngine.ts) แม้แต่ผู้ที่กำลังเสนอราคาสูงสุดอยู่
 * (ผู้นำราคา) ก็ต้องกดถอนตัวเองด้วยเพื่อ "ยืนยัน" ว่าจะไม่เสนอราคาเพิ่มแล้ว การถอนตัวของ
 * ผู้นำราคาไม่ได้แปลว่ายกเลิกราคาที่ตนเสนอไปแล้ว — ถ้าไม่มีใครเสนอสูงกว่าอีกจนครบทุกคน
 * ถอนตัว ผู้นำราคาคนล่าสุดก็ยังคงชนะการประมูลตามปกติ
 */
export default function AuctionModal({ state, roomId, playerId }: { state: GameState; roomId: string; playerId: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (state.pending.kind !== "AUCTION") return null;
  const p = state.pending;
  const tile = BOARD[p.tileId];
  const iAmLeader = p.leaderId === playerId;
  const iAmIn = p.activeBidders.includes(playerId);
  const nextBid = p.currentBid + 100;
  const canBid = iAmIn && !iAmLeader && state.players[playerId].cash >= nextBid;
  const waitingCount = p.activeBidders.length;

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await fn(); } catch (e: any) { setError(e.message || "ทำรายการไม่สำเร็จ"); } finally { setBusy(false); }
  }

  return (
    <Overlay>
      <div className="w-[380px] max-w-full bg-paper-hi rounded-[22px] shadow-deep overflow-hidden border border-paper-line animate-pop-in">
        <div className="px-5 py-3.5 flex justify-between items-center text-white" style={{ background: "var(--felt)" }}>
          <h3 className="m-0 text-[1.05rem]">เปิดประมูล — {tile.name}</h3>
        </div>
        <div className="px-5 py-4">
          {error && <div className="bg-seal/10 text-seal border border-seal/30 px-3 py-2 rounded-lg text-sm mb-2.5">{error}</div>}
          <div className="flex items-center justify-between gap-2.5 bg-paper border border-dashed border-paper-line rounded-lg px-3.5 py-3 my-2">
            <span>ราคาประมูลสูงสุด</span>
            <span className="num font-display text-[1.4rem] text-felt">{p.currentBid.toLocaleString()}</span>
          </div>
          {/* ข้อ 4: บอกกติกาให้ชัดเจนว่าประมูลจะจบเมื่อไร กันงงว่าทำไม Modal ยังไม่ปิดทั้ง ๆ
              ที่เหลือผู้นำราคาคนเดียว */}
          <p className="text-[.72rem] text-ink-soft bg-gold/10 border border-gold/30 rounded-lg px-3 py-2 my-2 leading-relaxed">
            การประมูลจะจบก็ต่อเมื่อผู้เล่นทุกคนกดถอนตัวครบทุกคน (ตอนนี้เหลือ {waitingCount} คนที่ยังไม่ถอนตัว)
            แม้เป็นผู้เสนอราคาสูงสุดอยู่ก็ต้องกดถอนตัวเพื่อยืนยันว่าจะไม่เสนอราคาเพิ่มแล้ว
          </p>
          <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
            {state.turnOrder.map((id) => {
              const pl = state.players[id];
              if (!pl || pl.status === "BANKRUPT") return null;
              const isLeader = p.leaderId === id;
              const folded = p.passedIds.includes(id);
              return (
                <li
                  key={id}
                  className={`flex justify-between text-[.83rem] px-2 py-1.5 rounded-md bg-paper ${isLeader ? "bg-gold/15 font-semibold" : ""} ${folded && !isLeader ? "opacity-50 line-through" : ""}`}
                >
                  <span>
                    {pl.name}
                    {isLeader && folded && (
                      <span className="text-[.65rem] text-ink-soft font-normal"> (ถอนตัวแล้ว — เป็นผู้นำราคา)</span>
                    )}
                  </span>
                  <span className="num">
                    {isLeader ? p.currentBid.toLocaleString() : folded ? "ถอนตัว" : "กำลังประมูล"}
                  </span>
                </li>
              );
            })}
          </ul>
          {iAmIn ? (
            <div className="flex flex-col gap-2 pt-3.5">
              {iAmLeader && (
                <p className="text-[.78rem] text-ink-soft m-0">
                  ตอนนี้ท่านเป็นผู้เสนอราคาสูงสุดอยู่ กดถอนตัวเพื่อยืนยันราคานี้และรอผู้เล่นคนอื่นถอนตัวให้ครบ
                </p>
              )}
              <div className="flex gap-2">
                <button
                  className="flex-1 border-none rounded-lg py-2.5 px-4 text-sm font-semibold bg-transparent border border-paper-line text-ink hover:border-ink-soft disabled:opacity-50 disabled:cursor-wait"
                  disabled={busy}
                  onClick={() => run(() => actions.foldAuction(roomId, playerId))}
                >
                  {iAmLeader ? "ถอนตัว (ยืนยันราคา)" : "ถอนตัว"}
                </button>
                {!iAmLeader && (
                  <button
                    className="flex-1 border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-felt-deep disabled:opacity-45 disabled:cursor-not-allowed hover:brightness-105"
                    style={{ background: "linear-gradient(180deg, var(--gold-bright), var(--gold))" }}
                    disabled={!canBid || busy}
                    onClick={() => run(() => actions.placeBid(roomId, playerId))}
                  >
                    เสนอราคา +100 ({nextBid.toLocaleString()})
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[.82rem] text-ink-soft mt-3">
              {iAmLeader
                ? `ท่านถอนตัวแล้ว และกำลังเป็นผู้เสนอราคาสูงสุดอยู่ที่ ${p.currentBid.toLocaleString()} บาท รอผู้เล่นคนอื่นถอนตัวให้ครบเพื่อยืนยันชนะการประมูล`
                : "ท่านถอนตัวจากการประมูลนี้แล้ว"}
            </p>
          )}
        </div>
      </div>
    </Overlay>
  );
}
