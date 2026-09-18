"use client";
import { useState } from "react";
import { GameState } from "@/lib/types";
import { BOARD } from "@/lib/boardData";
import { isPropertyTile } from "@/lib/types";
import { actions } from "@/lib/roomService";
import Overlay from "./Overlay";

export default function ManageModal({
  state, roomId, playerId, onClose,
}: { state: GameState; roomId: string; playerId: string; onClose: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const me = state.players[playerId];
  const myTiles = me.properties.map((id) => BOARD[id]).filter(isPropertyTile);
  const isMyTurn = state.currentPlayerId === playerId;
  // ข้อ 3: สร้างบ้านได้เทิร์นละ 1 หลัง และไม่เกิน 3 หลังต่อการวนกระดาน 1 รอบ
  const houseQuotaLeftThisTurn = Math.max(0, 1 - me.housesBuiltThisTurn);
  const houseQuotaLeftThisLap = Math.max(0, 3 - me.housesBuiltThisLap);
  const canBuildAnyHouse = isMyTurn && houseQuotaLeftThisTurn > 0 && houseQuotaLeftThisLap > 0;

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await fn(); } catch (e: any) { setError(e.message || "ทำรายการไม่สำเร็จ"); } finally { setBusy(false); }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="w-[440px] max-w-full bg-paper-hi rounded-[22px] shadow-deep overflow-hidden border border-paper-line animate-pop-in">
        <div className="px-5 py-3.5 flex justify-between items-center text-white" style={{ background: "var(--felt)" }}>
          <h3 className="m-0 text-[1.05rem]">จัดการทรัพย์สินของ {me.name}</h3>
          <button className="bg-transparent border-none text-inherit text-lg opacity-80" onClick={onClose}>✕</button>
        </div>
        <div className="px-5 py-4">
          {!isMyTurn && (
            <div className="bg-gold/15 text-ink border border-gold/40 px-3 py-2 rounded-lg text-[.8rem] mb-2.5">
              ยังไม่ใช่เทิร์นของท่าน — ดูข้อมูลได้ แต่จัดการทรัพย์สินได้เฉพาะในเทิร์นของตัวเองเท่านั้น
            </div>
          )}
          {isMyTurn && (
            <div className="text-[.78rem] text-ink-soft mb-2.5">
              โควตาสร้างบ้าน: เทิร์นนี้เหลือ {houseQuotaLeftThisTurn} หลัง / รอบวนนี้เหลือ {houseQuotaLeftThisLap} หลัง (สูงสุด 3 หลังต่อรอบ)
            </div>
          )}
          {error && <div className="bg-seal/10 text-seal border border-seal/30 px-3 py-2 rounded-lg text-sm mb-2.5">{error}</div>}
          {myTiles.length === 0 && <p className="text-ink-soft text-[.85rem]">ท่านยังไม่มีที่ดินเป็นของตนเอง</p>}
          <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto scrollbar-thin">
            {myTiles.map((tile) => {
              const ps = state.properties[tile.id];
              const canBuild = tile.canBuild && !ps.mortgaged;
              return (
                <div className="border border-paper-line rounded-lg px-3 py-2.5 bg-paper" key={tile.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="font-semibold text-[.9rem] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: me.color }} />
                      {tile.name}
                      {ps.mortgaged && <span className="text-[.7rem] text-seal">(จำนอง)</span>}
                    </div>
                    <span className="text-[.78rem] text-ink-soft">
                      {ps.hotel ? "โรงแรม" : ps.houses > 0 ? `บ้าน ${ps.houses}/4` : "ที่ดินเปล่า"}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {canBuild && !ps.hotel && ps.houses < 4 && (
                      <button
                        className="border-none rounded-md py-1.5 px-3 text-[.8rem] font-semibold text-felt-deep hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(180deg, var(--gold-bright), var(--gold))" }}
                        disabled={busy || !canBuildAnyHouse}
                        title={!isMyTurn ? "จัดการทรัพย์สินได้เฉพาะในเทิร์นของตัวเองเท่านั้น" : !canBuildAnyHouse ? "ครบโควตาสร้างบ้านแล้ว" : undefined}
                        onClick={() => run(() => actions.buildHouse(roomId, playerId, tile.id))}
                      >
                        สร้างบ้าน ({tile.housePrice.toLocaleString()})
                      </button>
                    )}
                    {canBuild && !ps.hotel && ps.houses === 4 && (
                      <button
                        className="border-none rounded-md py-1.5 px-3 text-[.8rem] font-semibold text-felt-deep hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(180deg, var(--gold-bright), var(--gold))" }}
                        disabled={busy || !isMyTurn}
                        title={!isMyTurn ? "จัดการทรัพย์สินได้เฉพาะในเทิร์นของตัวเองเท่านั้น" : undefined}
                        onClick={() => run(() => actions.buildHotel(roomId, playerId, tile.id))}
                      >
                        สร้างโรงแรม ({tile.housePrice.toLocaleString()})
                      </button>
                    )}
                    {(ps.houses > 0 || ps.hotel) && (
                      <button
                        className="border-none rounded-md py-1.5 px-3 text-[.8rem] font-semibold bg-transparent border border-paper-line text-ink hover:border-ink-soft disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={busy || !isMyTurn}
                        title={!isMyTurn ? "จัดการทรัพย์สินได้เฉพาะในเทิร์นของตัวเองเท่านั้น" : undefined}
                        onClick={() => run(() => actions.sellBuilding(roomId, playerId, tile.id))}
                      >
                        ขายสิ่งปลูกสร้าง (คืน 50%)
                      </button>
                    )}
                    {!ps.mortgaged && ps.houses === 0 && !ps.hotel && (
                      <button
                        className="border-none rounded-md py-1.5 px-3 text-[.8rem] font-semibold bg-transparent border border-paper-line text-ink hover:border-ink-soft disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={busy || !isMyTurn}
                        title={!isMyTurn ? "จัดการทรัพย์สินได้เฉพาะในเทิร์นของตัวเองเท่านั้น" : undefined}
                        onClick={() => run(() => actions.mortgageProperty(roomId, playerId, tile.id))}
                      >
                        จำนอง (+{Math.floor(tile.price / 2).toLocaleString()})
                      </button>
                    )}
                    {ps.mortgaged && (
                      <button
                        className="border-none rounded-md py-1.5 px-3 text-[.8rem] font-semibold text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: "var(--seal)" }}
                        disabled={busy || !isMyTurn}
                        title={!isMyTurn ? "จัดการทรัพย์สินได้เฉพาะในเทิร์นของตัวเองเท่านั้น" : undefined}
                        onClick={() => run(() => actions.redeemProperty(roomId, playerId, tile.id))}
                      >
                        ไถ่ถอน ({(Math.floor(tile.price / 2) + 100).toLocaleString()})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Overlay>
  );
}
