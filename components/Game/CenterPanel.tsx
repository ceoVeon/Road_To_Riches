"use client";
import { useEffect, useState } from "react";
import { GameState } from "@/lib/types";
import { actions } from "@/lib/roomService";
import { DICE_LOCK_COST } from "@/lib/boardData";
import DiceTray from "./DiceTray";

type Parity = "EVEN" | "ODD" | null;
type Range = "LOW" | "HIGH" | null;

/** นับถอยหลังเวลาที่เหลือของเทิร์นปัจจุบัน จาก state.turnDeadline (ข้อ 5) */
function useCountdown(deadline: number | null): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : null,
  );
  useEffect(() => {
    if (!deadline) { setSecondsLeft(null); return; }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const iv = window.setInterval(tick, 500);
    return () => window.clearInterval(iv);
  }, [deadline]);
  return secondsLeft;
}

/**
 * แผงควบคุมหลัก — สถานะเทิร์น / ลูกเต๋า / ปุ่มการกระทำ
 *
 * Layout: หน้าจอแนวนอน (คอม, จอกว้าง > สูง) แผงนี้จะอยู่ "ตรงกลาง" ระหว่างแผงผู้เล่น (ซ้าย)
 * กับแผงบันทึกเกม (ขวา) โดยจัดองศาความสูงให้เท่ากับอีกสองแผง (มือถือ, จอสูง > กว้าง)
 * ทั้งสามแผงจะเรียงต่อกันเป็นแนวตั้งยาวลงมาแทน
 */
export default function CenterPanel({
  state,
  roomId,
  playerId,
  onOpenManage,
  settling,
}: {
  state: GameState;
  roomId: string;
  playerId: string;
  onOpenManage: () => void;
  // ข้อ 2: true ระหว่างที่ลูกเต๋ากำลังสั่น/ตัวเดินกำลังเดินอยู่บนกระดาน (ยังไม่ "นิ่ง")
  // ใช้ปิดปุ่ม "จัดการทรัพย์สิน" และ "จบตา" ไว้ชั่วคราว กันผู้เล่นแทรกทำรายการ
  // ก่อนที่ผลของการทอยตาปัจจุบันจะแสดงจบครบถ้วนบนกระดานเสียก่อน
  settling: boolean;
}) {
  const currentPlayer = state.currentPlayerId
    ? state.players[state.currentPlayerId]
    : null;
  const isMyTurn = currentPlayer?.id === playerId;

  const [error, setError] = useState("");
  const [rolling, setRolling] = useState(false);
  const me = state.players[playerId];
  const secondsLeft = useCountdown(state.turnDeadline);
  const canRoll =
    isMyTurn &&
    state.pending.kind === "NONE" &&
    !currentPlayer?.inJail &&
    (!state.hasRolledThisTurn || state.canRollAgain);
  // หมายเหตุ: ตัดเงื่อนไข !me.inJail ออก — เดิมถ้าทอยออกจากคุกไม่สำเร็จ (ยังไม่ครบ 3 ตา)
  // ผู้เล่นจะ "ค้าง" ไม่มีปุ่มให้กดต่อเลย เพราะ canRoll ก็เท็จ (ยังติดคุก) และ canEndTurn ก็เท็จ
  // (เดิมบังคับต้องไม่ติดคุก) ทำให้เกมเดินต่อไม่ได้ — จบตาได้ทันทีที่ทอยของตานี้เสร็จแล้วก็พอ
  const canEndTurn =
    isMyTurn &&
    state.hasRolledThisTurn &&
    !state.canRollAgain &&
    state.pending.kind === "NONE";
  const [busy, setBusy] = useState(false);
  const [selParity, setSelParity] = useState<Parity>(null);
  const [selRange, setSelRange] = useState<Range>(null);
  const lockCost = (selParity ? DICE_LOCK_COST : 0) + (selRange ? DICE_LOCK_COST : 0);
  const myActiveLock = state.diceLock?.playerId === playerId ? state.diceLock : null;
  async function run(fn: () => Promise<void>) {
    if (busy) return; // กันการกดปุ่มซ้ำรัว ๆ ระหว่างรอผลจากเซิร์ฟเวอร์ (แก้ข้อ 1)
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e: any) {
      setError(e.message || "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function rollNow() {
    if (rolling) return; // กันการกดซ้ำรัว ๆ ระหว่างรอผลจากเซิร์ฟเวอร์ (แก้ข้อ 1)
    setRolling(true);
    setError("");
    try {
      await actions.rollDice(roomId, playerId);
    } catch (e: any) {
      setError(e.message || "ทอยลูกเต๋าไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setRolling(false);
    }
  }

  function lockLabel(parity: Parity, range: Range) {
    const parts: string[] = [];
    if (parity) parts.push(parity === "EVEN" ? "คู่" : "คี่");
    if (range) parts.push(range === "LOW" ? "ต่ำ" : "สูง");
    return parts.join(" + ") || "ไม่ล็อค";
  }

  async function activateLock() {
    if (lockCost === 0) return;
    await run(async () => {
      await actions.activateDiceLock(roomId, playerId, selParity, selRange);
      setSelParity(null);
      setSelRange(null);
    });
  }

  return (
    <div
      className="
        order-1 landscape:order-2
        w-full max-w-[380px] mx-auto
        landscape:w-[320px] landscape:max-w-[320px] landscape:mx-0 landscape:h-full landscape:min-h-0
        min-w-0 flex flex-col landscape:justify-center
        bg-paper/95 backdrop-blur-sm rounded-2xl border border-paper-line shadow-deep
        overflow-hidden animate-pop-in
      "
    >
      <div className="flex flex-col items-center gap-2.5 px-3.5 sm:px-4 py-3.5">
        {/* ===============================================
            สถานะเทิร์น
            =============================================== */}
        <div className="w-full flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[.58rem] md:text-[.78rem] uppercase tracking-wide text-paper-line font-semibold">
              ตาที่ {state.turnNumber}
            </div>
            <div className="text-[.68rem] md:text-[.88rem] font-semibold text-paper-line truncate">
              ตาของ <span className="text-gold">{currentPlayer?.name || "-"}</span>
            </div>
          </div>
          {secondsLeft !== null && (
            <div
              className={`font-display shrink-0 text-[.8rem] md:text-[1rem] font-bold px-2.5 pt-1.5 pb-1 rounded-full border ${
                secondsLeft <= 15
                  ? "text-seal border-seal/40 bg-paper-hi animate-bounce"
                  : "text-gold border-paper-line bg-paper-hi"
              }`}
              title="เวลาที่เหลือของเทิร์นนี้ ถ้าหมดเวลาระบบจะทำรายการปลอดภัยให้อัตโนมัติ"
            >
              ⏱ {secondsLeft}s
            </div>
          )}
        </div>

        <DiceTray dice={state.dice} />

        {/* ===============================================
            ข้อ 1-2: ล็อคผลลูกเต๋าก่อนทอย — เลือกคู่/คี่ และ/หรือ สูง/ต่ำ
            เสียเงินครั้งละ DICE_LOCK_COST ต่อ 1 ตัวเลือก มีผลกับการทอยครั้งถัดไปครั้งเดียว
            แสดงเฉพาะตอนที่ตัวเองกำลังจะทอย (ก่อนกดปุ่มทอย) เท่านั้น
            =============================================== */}
        {canRoll && (
          myActiveLock ? (
            <div className="w-full flex items-center justify-between gap-2 bg-gold/15 border border-gold/40 rounded-lg px-3 py-1.5">
              <span className="text-[.58rem] md:text-[.78rem] text-paper">
                ล็อคผล :{" "}
                <b className="text-gold">{lockLabel(myActiveLock.parity, myActiveLock.range)}</b>
                {" - ทอยได้เลย"}
              </span>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-1.5 bg-paper-hi/60 border border-paper-line rounded-lg px-2.5 py-2">
              {/* <div className="text-[.68rem] text-ink-soft">
                ล็อคผลลูกเต๋า (จ่าย {DICE_LOCK_COST}฿ ต่อ 1 ตัวเลือก — เลือกได้ทั้งสองอย่างพร้อมกัน)
              </div> */}
              <div className="flex gap-1.5">
                {(["EVEN", "ODD"] as const).map((p) => (
                  <button
                    key={p}
                    className={`flex-1 rounded-md py-1.5 text-[.58rem] md:text-[.72rem] font-semibold transition ${
                      selParity === p
                        ? "bg-gold text-ink"
                        : "bg-paper text-ink"
                    }`}
                    disabled={busy}
                    onClick={() => setSelParity(selParity === p ? null : p)}
                  >
                    {p === "EVEN" ? "คู่" : "คี่"}
                  </button>
                ))}
                {(["LOW", "HIGH"] as const).map((r) => (
                  <button
                    key={r}
                    className={`flex-1 rounded-md py-1.5 text-[.58rem] md:text-[.72rem] font-semibold transition ${
                      selRange === r
                        ? "border-paer bg-gold text-ink"
                        : "border-paper-line bg-paper text-ink hover:border-gold"
                    }`}
                    disabled={busy}
                    onClick={() => setSelRange(selRange === r ? null : r)}
                  >
                    {r === "LOW" ? "ต่ำ" : "สูง"}
                  </button>
                ))}
              </div>
              <button
                className="w-full rounded-md py-1.5 text-[.58rem] md:text-[.78rem] font-semibold text-felt-deep disabled:hidden disabled:cursor-not-allowed hover:brightness-105 transition"
                style={{ background: "linear-gradient(180deg, var(--gold-bright), var(--gold))" }}
                disabled={busy || lockCost === 0 || (me?.cash ?? 0) < lockCost}
                title={lockCost === 0 ? "เลือกอย่างน้อยหนึ่งตัวเลือกก่อน" : `จ่าย ${lockCost} บาท ล็อคผลลูกเต๋าครั้งถัดไปเป็น "${lockLabel(selParity, selRange)}"`}
                onClick={activateLock}
              >
                {lockCost > 0 ? `ล็อค ${lockLabel(selParity, selRange)} (${lockCost}฿)` : "เลือกตัวเลือกที่ต้องการล็อค"}
              </button>
            </div>
          )
        )}

        {error && (
          <div className="w-full bg-seal/10 text-seal border border-seal/30 px-3 py-2 rounded-lg text-[.78rem]">
            {error}
          </div>
        )}

        {canRoll && (
          <button
            className="w-full border-none rounded-lg px-4 py-2 text-[.68rem] md:text-[.78rem] font-semibold text-felt-deep hover:brightness-105 disabled:opacity-60 disabled:cursor-wait transition"
            style={{
              background:
                "linear-gradient(180deg, var(--gold-bright), var(--gold))",
            }}
            disabled={rolling || settling}
            title={settling ? "รอแอนิเมชันตัวเดิน/ลูกเต๋าของตาที่แล้วให้จบก่อน" : undefined}
            onClick={rollNow}
          >
            {rolling
              ? "กำลังทอย..."
              : settling
                ? "รอแอนิเมชันจบก่อน..."
                : state.canRollAgain
                  ? "ทอยอีกครั้ง (Double)"
                  : "ทอยลูกเต๋า"}
          </button>
        )}

        {/* ข้อ 2: ระหว่างลูกเต๋า/ตัวเดินยังเคลื่อนไหวอยู่ (settling) ห้ามกด "จัดการทรัพย์สิน"
            หรือ "จบตา" จนกว่าแอนิเมชันของตาปัจจุบันจะแสดงผลจบก่อน กันผลลัพธ์บนกระดานสับสน */}
        <div className="w-full flex flex-col gap-2">
          <button
            className="w-full border-none rounded-lg py-2.5 px-3 text-[.68rem] md:text-[.78rem] font-semibold text-felt-deep disabled:hidden disabled:cursor-not-allowed hover:brightness-105 transition"
            style={{
              background:
                "linear-gradient(180deg, var(--gold-bright), var(--gold))",
            }}
            disabled={!isMyTurn || settling}
            title={
              !isMyTurn
                ? "จัดการทรัพย์สินได้เฉพาะในเทิร์นของตัวเองเท่านั้น"
                : settling
                  ? "รอแอนิเมชันตัวเดิน/ลูกเต๋าจบก่อน"
                  : undefined
            }
            onClick={onOpenManage}
          >
            จัดการทรัพย์สิน
          </button>
                    <button
            className="w-full border-none rounded-lg py-2.5 px-3 text-[.68rem] md:text-[.78rem] font-semibold text-felt-deep disabled:hidden disabled:cursor-not-allowed hover:brightness-105 transition"
            style={{
              background:
                "linear-gradient(180deg, var(--gold-bright), var(--gold))",
            }}
            disabled={!canEndTurn || busy || settling}
            title={canEndTurn && settling ? "รอแอนิเมชันตัวเดิน/ลูกเต๋าจบก่อน" : undefined}
            onClick={() => run(() => actions.endTurn(roomId, playerId))}
          >
            จบตา
          </button>
        </div>

        {!isMyTurn && (
          <p className="text-[.68rem] md:text-[.86rem] text-paper text-center m-0">
            รอผู้เล่นคนอื่นดำเนินการ...
          </p>
        )}
        {/* ข้อ 2: ตอนเป็นตาของตัวเองแต่ปุ่มต่าง ๆ ถูกซ่อนไว้ชั่วคราวเพราะแอนิเมชันยังไม่จบ
            แสดงข้อความอธิบายไว้ กันหน้าจอดูโล่งว่างเปล่าจนดูเหมือนเกมค้าง */}
        {isMyTurn && settling && (
          <p className="text-[.68rem] md:text-[.86rem] text-paper text-center m-0 animate-pulse">
            กำลังแสดงผลการทอย รอสักครู่...
          </p>
        )}
      </div>
    </div>
  );
}
