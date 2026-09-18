"use client";
import { GameState } from "@/lib/types";
import { BOARD, GROUP_COLOR_VAR, tokenEmoji } from "@/lib/boardData";
import { isPropertyTile } from "@/lib/types";
import { netWorth } from "@/lib/gameEngine";
import AnimatedNumber from "../AnimatedNumber";
import Overlay from "./Overlay";

/**
 * ข้อ 1: รายละเอียดผู้เล่น (ที่ดินที่ถือ, บ้าน/โรงแรมรวม, มูลค่าทั้งหมด, การ์ดที่มี ฯลฯ)
 * ย้ายมาไว้ใน Modal นี้ทั้งหมด เปิดได้โดยกดที่รายชื่อผู้เล่นใน PropertyStatsPanel
 * ดูได้ทุกคน (ไม่ใช่แค่ตัวเอง) แต่เป็นมุมมองอ่านอย่างเดียว ไม่มีปุ่มจัดการทรัพย์สินใด ๆ
 * (การจัดการจริงยังคงทำผ่านปุ่ม "จัดการทรัพย์สิน" + ManageModal เดิม เฉพาะเทิร์นของตัวเอง)
 */
export default function PlayerDetailModal({
  state,
  targetPlayerId,
  viewerId,
  onClose,
}: {
  state: GameState;
  targetPlayerId: string;
  viewerId: string;
  onClose: () => void;
}) {
  const p = state.players[targetPlayerId];
  if (!p) return null;

  const tiles = p.properties.map((id) => BOARD[id]).filter(isPropertyTile);
  let houses = 0;
  let hotels = 0;
  tiles.forEach((t) => {
    const ps = state.properties[t.id];
    if (ps.hotel) hotels += 1;
    else houses += ps.houses;
  });
  const worth = netWorth(state, p.id);
  const isTurn = state.currentPlayerId === p.id;
  const bankrupt = p.status === "BANKRUPT";

  return (
    <Overlay onClose={onClose}>
      <div className="w-[320px] max-w-full bg-paper-hi rounded-[22px] shadow-deep overflow-hidden border border-paper-line animate-pop-in">
        <div
          className="px-5 py-3.5 flex justify-between items-center text-white"
          style={{ background: p.color }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex-none flex items-center justify-center text-base bg-black/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)]"
            >
              {tokenEmoji(p.tokenIcon)}
            </div>
            <div className="min-w-0">
              <h3 className="m-0 text-[1.05rem] truncate">
                {p.id === viewerId ? `${p.name} (ท่าน)` : p.name}
              </h3>
              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                {isTurn && (
                  <span className="text-[.7rem] bg-white/90 text-felt-deep px-1.5 py-px rounded-full font-bold">
                    กำลังเล่น
                  </span>
                )}
                {p.isHost && (
                  <span className="text-[.7rem] bg-white/70 text-felt-deep px-1.5 py-px rounded-full">
                    หัวห้อง
                  </span>
                )}
                {p.inJail && (
                  <span className="text-[.7rem] bg-black/30 text-white px-1.5 py-px rounded-full">
                    ในคุก
                  </span>
                )}
                {bankrupt && (
                  <span className="text-[.7rem] bg-black/40 text-white px-1.5 py-px rounded-full">
                    ล้มละลาย
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          {/* สรุปภาพรวม — เงินสด/ที่ดิน/บ้าน/โรงแรม/มูลค่ารวม/การ์ด (ข้อ 1) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg py-2 px-1.5 text-center bg-paper-line/50">
              <div className="text-[.7rem] text-ink-soft leading-tight">ที่ดิน</div>
              <div className="text-[.88rem] font-bold font-display leading-tight num text-felt">
                {tiles.length}
              </div>
            </div>
            <div className="rounded-lg py-2 px-1.5 text-center bg-gold/15">
              <div className="text-[.7rem] text-ink-soft leading-tight">เงินสด</div>
              <AnimatedNumber
                value={p.cash}
                className="text-[.88rem] font-bold font-display leading-tight num block truncate text-gold"
              />
            </div>
            <div className="rounded-lg py-2 px-1.5 text-center bg-paper-line/50">
              <div className="text-[.7rem] text-ink-soft leading-tight">บ้าน</div>
              <div className="text-[.88rem] font-bold font-display leading-tight num text-felt">
                {houses}
              </div>
            </div>
            <div className="rounded-lg py-2 px-1.5 text-center bg-paper-line/50">
              <div className="text-[.7rem] text-ink-soft leading-tight">การ์ดออกคุกฟรี</div>
              <div className="text-[.88rem] font-bold font-display leading-tight num text-felt">
                {p.jailFreeCards}
              </div>
            </div>
            
            
            
            
            <div className="rounded-lg py-2 px-1.5 text-center bg-paper-line/50">
              <div className="text-[.7rem] text-ink-soft leading-tight">โรงแรม</div>
              <div className="text-[.88rem] font-bold font-display leading-tight num text-felt">
                {hotels}
              </div>
            </div>
            <div className="rounded-lg py-2 px-1.5 text-center bg-gold/15">
              <div className="text-[.7rem] text-ink-soft leading-tight">มูลค่ารวม</div>
              <AnimatedNumber
                value={worth}
                className="text-[.88rem] font-bold font-display leading-tight num block truncate text-gold"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-4">
          <button
            className="flex-1 border-none rounded-lg py-2.5 px-4 text-sm font-semibold bg-transparent border border-paper-line text-ink hover:border-ink-soft"
            onClick={onClose}
          >
            ปิด
          </button>
        </div>
      </div>
    </Overlay>
  );
}
