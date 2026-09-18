"use client";
import { useEffect, useState } from "react";
import { GameState } from "@/lib/types";
import { TILE_COUNT, tokenEmoji } from "@/lib/boardData";
import { DICE_ROLL_MS, SETTLE_BUFFER_MS, TOKEN_STEP_MS } from "@/lib/animTiming";
import { useAutoPlay } from "@/lib/useAutoPlay";
import Board from "./Board";
import CenterPanel from "./CenterPanel";
import BuyModal from "./modals/BuyModal";
import AuctionModal from "./modals/AuctionModal";
import CardModal from "./modals/CardModal";
import JailModal from "./modals/JailModal";
import BankruptModal from "./modals/BankruptModal";
import WinModal from "./modals/WinModal";
import ManageModal from "./modals/ManageModal";
import LeaveGameModal from "./modals/LeaveGameModal";
import PlayerDetailModal from "./modals/PlayerDetailModal";
import PropertyStatsPanel from "./PropertyStatsPanel";
import LogPanel from "./LogPanel";

/**
 * คำนวณว่าตอนนี้ควร "หน่วง" การแสดง Modal ผลลัพธ์ (ซื้อที่ดิน/การ์ด/ล้มละลาย/ประมูล/คุก/จบเกม) อยู่
 * หรือไม่ และควรบล็อกปุ่ม "จัดการทรัพย์สิน"/"จบตา"/"ทอยอีกครั้ง" หรือไม่ เพื่อรอให้แอนิเมชัน
 * ลูกเต๋า + ตัวเดินเดินบนกระดานเล่นจบก่อน (แก้ข้อ 1, 2)
 *
 * ข้อควรระวังสำคัญ (บั๊กที่ทำให้เวอร์ชันก่อนหน้าไม่ทำงาน): ห้ามคำนวณ "delay ต้องหน่วงเท่าไร"
 * ไว้ใน useEffect แล้วอ่านผลจาก ref ตอน return ของ render เดียวกัน เพราะ useEffect รันหลัง
 * render เสร็จเสมอ — เฟรมแรกที่ตำแหน่ง/ลูกเต๋าเปลี่ยน (จังหวะที่ต้องหน่วงมากที่สุด) จะยังอ่านค่า
 * ref เก่า (ที่ยังไม่ถูกอัปเดต) ได้ผลเป็น "ไม่ต้องหน่วง" เสมอ ทำให้ Modal โผล่/ปุ่มกดได้ทันที
 * ไม่ถูกบล็อกเลยสักครั้ง จึงต้องคำนวณ diff ของตำแหน่ง "ในระหว่าง render ตรง ๆ" แล้วเรียก
 * setState ทันทีถ้าค่าจริงเปลี่ยน (รูปแบบที่ React รองรับอย่างเป็นทางการ — React จะ re-render
 * ซ้ำด้วยค่าใหม่ก่อน paint จริงให้เอง ผู้ใช้จะไม่เห็นเฟรมที่ยังไม่ทันอัปเดตเลย)
 */
function useSettlingPending(state: GameState): boolean {
  const [snapshot, setSnapshot] = useState<{ positions: Record<string, number>; diceSeq: number | null }>(
    () => {
      const positions: Record<string, number> = {};
      Object.values(state.players).forEach((p) => { positions[p.id] = p.position; });
      return { positions, diceSeq: state.dice?.rollSeq ?? null };
    },
  );
  const [holdUntil, setHoldUntil] = useState(0);
  const [, forceTick] = useState(0);

  const currentPositions: Record<string, number> = {};
  Object.values(state.players).forEach((p) => { currentPositions[p.id] = p.position; });
  const currentDiceSeq = state.dice?.rollSeq ?? null;

  const playerIds = new Set([...Object.keys(currentPositions), ...Object.keys(snapshot.positions)]);
  const positionsChanged = [...playerIds].some((id) => currentPositions[id] !== snapshot.positions[id]);
  const diceSeqChanged = currentDiceSeq !== snapshot.diceSeq;

  // คำนวณ "สด" ระหว่าง render เลย ไม่รอ useEffect — ให้ผลลัพธ์มีผลตั้งแต่เฟรมแรกที่ค่าจริงเปลี่ยน
  if (positionsChanged || diceSeqChanged) {
    const diceChanged = diceSeqChanged && currentDiceSeq !== null;
    let maxDelay = 0;
    Object.values(state.players).forEach((p) => {
      const prevPos = snapshot.positions[p.id];
      if (prevPos === undefined || prevPos === p.position) return;

      // ถ้าเป็นตัวเดินของผู้เล่นปัจจุบันและมาจากการทอยลูกเต๋ารอบใหม่ ต้องรอแอนิเมชัน
      // ลูกเต๋าสั่นจบก่อน (ตรงกับที่ Board.tsx หน่วงเริ่ม hop ด้วย DICE_ROLL_MS เช่นกัน)
      let delay = SETTLE_BUFFER_MS;
      if (diceChanged && p.id === state.currentPlayerId) delay += DICE_ROLL_MS;

      const diff = (p.position - prevPos + TILE_COUNT) % TILE_COUNT;
      if (diff > 0 && diff <= 12) delay += diff * TOKEN_STEP_MS;

      if (delay > maxDelay) maxDelay = delay;
    });

    setSnapshot({ positions: currentPositions, diceSeq: currentDiceSeq });
    if (maxDelay > 0) setHoldUntil(Date.now() + maxDelay);
  }

  const settling = Date.now() < holdUntil;

  // ตั้งเวลาไว้ "สะกิด" ให้ re-render อีกครั้งพอดีตอนครบกำหนด เพื่อให้ settling กลับเป็น false
  // (ตัว state holdUntil เองไม่ต้องเปลี่ยนค่า แค่ต้องมี re-render เกิดขึ้นตอนนั้นเพื่อคำนวณใหม่)
  useEffect(() => {
    if (!settling) return;
    const msLeft = Math.max(0, holdUntil - Date.now());
    const t = window.setTimeout(() => forceTick((n) => n + 1), msLeft + 30);
    return () => window.clearTimeout(t);
  }, [settling, holdUntil]);

  return settling;
}

export default function GameScreen({
  state,
  roomId,
  playerId,
}: {
  state: GameState;
  roomId: string;
  playerId: string;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  // ดูหมายเหตุใน PropertyStatsPanel.tsx: ต้องเก็บ state นี้ไว้ที่นี่ (นอก backdrop-blur)
  // ไม่ใช่ในแผงผู้เล่นเอง ไม่งั้น Modal ที่เป็น position: fixed จะถูกจำกัดพื้นที่แสดงผล
  // อยู่แค่ในกรอบแผงผู้เล่น แทนที่จะเต็มจอเหมือน Modal อื่น ๆ
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const current = state.currentPlayerId
    ? state.players[state.currentPlayerId]
    : null;
  const settling = useSettlingPending(state);
  useAutoPlay(state, roomId);

  const me = state.players[playerId];
  // ปุ่ม "ออกจากเกม" ใช้ได้เฉพาะตอนกำลังเล่นอยู่จริง และผู้เล่นยังไม่ล้มละลาย/ยังไม่ชนะไปแล้ว
  const canLeave = state.status === "PLAYING" && me && me.status !== "BANKRUPT" && me.status !== "WINNER";

  // เมื่อออกจากเกมสำเร็จ (สถานะเปลี่ยนเป็นล้มละลายจริงแล้วผ่าน state จาก Firebase) ให้ปิด Modal
  // ยืนยันการออกจากเกมทิ้งไปเองอัตโนมัติ ไม่ต้องรอผู้เล่นกดปิดเอง
  useEffect(() => {
    if (!canLeave) setLeaveOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLeave]);

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* =====================================================
          Top Bar — เอกลักษณ์เกม + สถานะห้อง + เทิร์นปัจจุบัน + แถบผู้เล่น
          ให้ข้อมูลสำคัญมองเห็นได้ตลอดเวลา โดยไม่รบกวนพื้นที่กระดาน
          ===================================================== */}
      <header
        className="flex items-center justify-between gap-3 px-3.5 sm:px-5 py-2 sm:py-2.5 border-b-2 border-gold flex-none flex-wrap z-20 shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
        style={{
          background: "linear-gradient(180deg, var(--felt), var(--felt-deep))",
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex-none flex items-center justify-center text-felt-deep font-display font-bold text-sm shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)]"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, var(--gold-bright), var(--gold) 55%, var(--gold-deep) 100%)",
            }}
          >
            ศ
          </div>
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <h1 className="m-0 text-paper-hi text-[1.02rem] sm:text-[1.25rem] font-semibold leading-none whitespace-nowrap">
              ทางเดินเศรษฐี
            </h1>
            <span className="text-gold-bright text-[.68rem] sm:text-[.78rem] border border-gold px-2.5 pt-1.5 pb-1 rounded-full leading-none whitespace-nowrap">
              ห้อง {state.roomCode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* แถบตัวเดินผู้เล่นทั้งหมด — เห็นลำดับเทิร์นและใครกำลังเล่นอยู่แบบรวดเร็ว */}
          <div className="hidden sm:flex items-center gap-1.5">
            {state.turnOrder.map((id) => {
              const p = state.players[id];
              if (!p) return null;
              const isTurn = state.currentPlayerId === id;
              const bankrupt = p.status === "BANKRUPT";
              return (
                <div
                  key={id}
                  title={p.name}
                  className={`w-6 h-6 rounded-full flex-none flex items-center justify-center text-[11px] leading-none transition-all duration-150 ${
                    isTurn
                      ? "ring-2 ring-gold-bright scale-110 shadow-[0_0_6px_rgba(255,255,255,0.35)]"
                      : "ring-1 ring-paper-hi/25"
                  } ${bankrupt ? "opacity-30 grayscale" : ""}`}
                  style={{ background: p.color }}
                >
                  {tokenEmoji(p.tokenIcon)}
                </div>
              );
            })}
          </div>

          {/* ข้อ 3: ปุ่ม "ออกจากเกม" อยู่ขวาสุดของ Navbar เสมอ — กดแล้วต้องยืนยันก่อน
              เพราะจะถูกนับเป็นล้มละลายทันที (ไม่ใช่แค่ออกจากหน้าจอเฉย ๆ) */}
          {canLeave && (
            <button
              className="shrink-0 text-[.68rem] sm:text-[.76rem] font-semibold text-white px-2.5 sm:px-3.5 py-1.5 rounded-full border border-seal/50 hover:brightness-110 transition"
              style={{ background: "var(--seal)" }}
              onClick={() => setLeaveOpen(true)}
              title="ออกจากเกม — จะถูกนับเป็นล้มละลายทันที"
            >
              ออกจากเกม
            </button>
          )}
        </div>
      </header>

      {/* =====================================================
          พื้นที่กระดาน — HUD ควบคุมทั้งหมดถูกวางไว้ "กลางกระดาน" เท่านั้น
          จึงไม่มีการบังหรือทับตัวกระดาน/ช่องต่าง ๆ เลย
          ===================================================== */}
      <div className="relative flex-1 min-h-0 min-w-0">
        <Board state={state} roomId={roomId} playerId={playerId}>
          {/* จอแนวนอน (กว้าง > สูง): เรียงเป็นแถว 3 คอลัมน์ สูงเท่ากัน — ผู้เล่น | ควบคุม | บันทึก
              จอแนวตั้ง (สูง > กว้าง): เรียงเป็นแนวตั้งยาวลงมา — ควบคุม > ผู้เล่น > บันทึก (เลื่อนดูได้) */}
          <div className="flex flex-col w-full landscape:max-h-[333px] self-stretch min-w-0 landscape:flex-row justify-center gap-2.5 sm:gap-3 pointer-events-auto">
            <PropertyStatsPanel state={state} playerId={playerId} onSelectPlayer={setSelectedPlayerId} />
            <CenterPanel
              state={state}
              roomId={roomId}
              playerId={playerId}
              onOpenManage={() => setManageOpen(true)}
              settling={settling}
            />
            <LogPanel state={state} />
          </div>
        </Board>
      </div>

      {!settling &&
        state.pending.kind === "BUY_DECISION" &&
        state.pending.playerId === playerId && (
          <BuyModal
            state={state}
            roomId={roomId}
            playerId={playerId}
            tileId={state.pending.tileId}
          />
        )}
      {!settling && state.pending.kind === "AUCTION" && (
        <AuctionModal state={state} roomId={roomId} playerId={playerId} />
      )}
      {!settling && state.pending.kind === "CARD" && state.pending.playerId === playerId && (
        <CardModal
          state={state}
          roomId={roomId}
          playerId={playerId}
          card={state.pending.card}
        />
      )}
      {!settling &&
        state.players[playerId]?.inJail &&
        state.currentPlayerId === playerId &&
        state.pending.kind === "NONE" &&
        !state.hasRolledThisTurn && (
          <JailModal state={state} roomId={roomId} playerId={playerId} />
        )}
      {!settling &&
        state.pending.kind === "BANKRUPT" &&
        state.pending.playerId === playerId && (
          <BankruptModal
            state={state}
            roomId={roomId}
            playerId={playerId}
            onManage={() => setManageOpen(true)}
          />
        )}
      {!settling && state.pending.kind === "GAME_OVER" && (
        <WinModal state={state} roomId={roomId} playerId={playerId} rankings={state.pending.rankings} />
      )}
      {/* ข้อ 4: ต้องวาง ManageModal ไว้ "ล่างสุด" ของ JSX เสมอ เพื่อให้ซ้อนทับอยู่บนสุด
          (ลำดับ DOM หลังกว่า = z-index สูงกว่าเมื่อไม่ได้กำหนด z-index ต่างกันชัดเจน)
          เดิมวางไว้บนสุดของไฟล์ ทำให้ตอนเปิดจาก BankruptModal มันไปโผล่ "หลัง" Modal ล้มละลาย
          กดปุ่มจัดการทรัพย์สินใด ๆ ข้างในไม่ได้เลย เพราะโดน BankruptModal บังอยู่ */}
      {manageOpen && (
        <ManageModal
          state={state}
          roomId={roomId}
          playerId={playerId}
          onClose={() => setManageOpen(false)}
        />
      )}
      {/* ข้อ 1: Modal รายละเอียดผู้เล่น — ต้อง render ตรงนี้ (ระดับบนสุดของ GameScreen)
          ไม่ใช่ในตัว PropertyStatsPanel เอง เพราะแผงนั้นมี backdrop-blur-sm (backdrop-filter)
          ซึ่งจะกลายเป็น containing block ของลูกหลานที่เป็น position: fixed ทำให้ Modal
          แสดงผลถูกจำกัดอยู่แค่ในกรอบเล็ก ๆ ของแผงผู้เล่นแทนที่จะเต็มจอกลางหน้าจอเหมือน
          Modal อื่น ๆ ทั้งหมด */}
      {selectedPlayerId && state.players[selectedPlayerId] && (
        <PlayerDetailModal
          state={state}
          targetPlayerId={selectedPlayerId}
          viewerId={playerId}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
      {/* ปุ่ม "ออกจากเกม" ต้องกดใช้งานได้ทุกเมื่อ ไม่ว่าจะมี Modal อื่นค้างอยู่หรือไม่ก็ตาม
          จึงวางไว้ล่างสุดของ JSX เพื่อให้ซ้อนทับอยู่บนสุดเสมอ (เหนือแม้แต่ ManageModal) */}
      {leaveOpen && (
        <LeaveGameModal
          roomId={roomId}
          playerId={playerId}
          onClose={() => setLeaveOpen(false)}
        />
      )}
    </div>
  );
}
