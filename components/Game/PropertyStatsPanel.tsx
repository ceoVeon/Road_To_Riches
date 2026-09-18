"use client";

import { GameState } from "@/lib/types";
import { tokenEmoji } from "@/lib/boardData";
import AnimatedNumber from "./AnimatedNumber";

/**
 * แผงรายชื่อผู้เล่น (ย่อ)
 *
 * ข้อ 1: รายละเอียดเชิงลึกของผู้เล่น (ที่ดิน, บ้าน, โรงแรม, มูลค่าทั้งหมด, การ์ดที่มี ฯลฯ)
 * ถูกย้ายออกไปแสดงใน PlayerDetailModal แทน — เปิดได้โดยกดที่แถวรายชื่อผู้เล่นคนนั้น
 * แผงนี้จึงเหลือแค่ข้อมูลที่ต้องเห็นตลอดเวลาแบบเร็ว ๆ: อวตาร ชื่อ สถานะ และเงินสด (มี
 * แอนิเมชันไล่ตัวเลขตอนเงินเปลี่ยน ตามข้อ 3)
 *
 * หมายเหตุสำคัญ: ตัว PlayerDetailModal เอง "ไม่ได้" render อยู่ในไฟล์นี้ (ต่างจากเดิม)
 * เพราะแผงนี้ (div ห่อนอกสุด) มีคลาส backdrop-blur-sm ซึ่งเป็น backdrop-filter — และ
 * filter/backdrop-filter/transform บนตัวใดก็ตามจะกลายเป็น "containing block" ใหม่ให้กับ
 * ลูกหลานที่เป็น position: fixed ทันที ทำให้ Modal (ที่ใช้ position: fixed inset-0 เพื่อคลุม
 * ทั้งจอ) ถูกจำกัดพื้นที่ให้แสดงแค่ในกรอบของแผงนี้แทนที่จะเต็มจอเหมือน Modal อื่น ๆ
 * จึงต้องยก state และการ render Modal ขึ้นไปไว้ที่ GameScreen.tsx (ระดับเดียวกับ Modal อื่น
 * ที่ไม่มี filter/transform ครอบ) แล้วส่ง onSelectPlayer ลงมาเป็น callback แทน
 *
 * Layout: หน้าจอแนวนอน (คอม) — แผงนี้ขยายออกไปอยู่ "ด้านซ้าย" ของแผงควบคุม สูงเต็มพื้นที่
 * และเลื่อนดูภายในตัวเองได้หากรายชื่อยาว
 * หน้าจอแนวตั้ง (มือถือ) — แผงนี้จะต่อเป็นแนวยาวลงมาใต้แผงควบคุม
 */
export default function PropertyStatsPanel({
  state,
  playerId,
  onSelectPlayer,
}: {
  state: GameState;
  playerId: string;
  onSelectPlayer: (targetPlayerId: string) => void;
}) {
  const players = state.turnOrder.map((id) => state.players[id]).filter(Boolean);

  return (
    <div
      className="
        order-2 landscape:order-1
        w-full max-w-[380px] mx-auto
        landscape:w-[350px] landscape:max-w-[350px] landscape:mx-0 landscape:h-full landscape:min-h-0
        min-w-0 flex flex-col
        bg-paper/95 backdrop-blur-sm rounded-2xl border border-paper-line shadow-deep
        overflow-hidden animate-pop-in
      "
    >
      <div className="flex-none px-3.5 sm:px-4 pt-3 pb-2 border-b border-dashed border-paper-line">
        <div className="text-[.7rem] xl:text-[1rem] font-bold text-gold uppercase tracking-wide">
          ผู้เล่น
        </div>
      </div>

      <div className="flex-1 landscape:min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin px-3 py-2.5 flex flex-col gap-2">
        {players.map((p) => {
          const isTurn = state.currentPlayerId === p.id;
          const bankrupt = p.status === "BANKRUPT";

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPlayer(p.id)}
              title={`ดูรายละเอียดของ ${p.name}`}
              className={`min-w-0 text-left rounded-xl p-2.5 transition-colors cursor-pointer hover:brightness-[1.03] active:scale-[0.99] ${
                isTurn
                  ? "border-2 border-gold bg-paper shadow-sm"
                  : "border border-paper-line bg-paper"
              } ${bankrupt ? "opacity-45" : ""}`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex-none flex items-center justify-center text-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_3px_rgba(0,0,0,0.25)]"
                  style={{ background: p.color }}
                >
                  {tokenEmoji(p.tokenIcon)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[.68rem] md:text-[.78rem] flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">
                      {p.id === playerId ? `${p.name} (ท่าน)` : p.name}
                    </span>

                    {isTurn && (
                      <span className="animate-pulse text-[.6rem] bg-gold-bright text-ink px-2 pt-1 pb-0.5 rounded-full font-normal">
                        กำลังเล่น...
                      </span>
                    )}

                    {p.isHost && (
                      <span className="text-[.6rem] bg-peach text-felt-deep px-2 pt-1 pb-0.5 rounded-full font-normal">
                        หัวห้อง
                      </span>
                    )}

                    {p.inJail && (
                      <span className="text-[.6rem] bg-seal text-white px-2 pt-1 pb-0.5 rounded-full font-normal">
                        ในคุก
                      </span>
                    )}

                    {bankrupt && (
                      <span className="text-[.6rem] bg-ink text-white px-2 pt-1 pb-0.5 rounded-full font-normal">
                        ล้มละลาย
                      </span>
                    )}
                  </div>

                  <div className="text-[.68rem] md:text-[.78rem] text-ink-soft">
                    เงิน{" "}
                    <AnimatedNumber value={p.cash} className="font-semibold tracking-wide text-felt" />{" "}
                    บาท
                  </div>
                </div>

                <span className="text-ink-soft/60 text-[.9rem] flex-none">›</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
