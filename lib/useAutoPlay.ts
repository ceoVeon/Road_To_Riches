"use client";
import { useEffect, useRef } from "react";
import { GameState } from "./types";
import * as engine from "./gameEngine";
import { dispatchAutoAction } from "./roomService";
import { BOT_THINK_MIN_MS, BOT_THINK_MAX_MS } from "./boardData";

function randomThinkDelay() {
  return BOT_THINK_MIN_MS + Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS);
}

/**
 * ทำงานอยู่เบื้องหลังในทุกแท็บ/เบราว์เซอร์ที่เปิดห้องนี้อยู่ (ไม่ต้องมี Server แยก):
 * 1) ถ้าตาไหนเป็นของบอท หรือมีเหตุการณ์ค้างที่บอทต้องตัดสินใจ (ซื้อที่ดิน/ประมูล/การ์ด/ล้มละลาย)
 *    จะสุ่มหน่วงเวลาสั้น ๆ ให้ดูเหมือนกำลังคิด แล้วสั่ง Action ที่เหมาะสมให้อัตโนมัติ (ข้อ 4)
 * 2) ถ้าถึงกำหนดเวลาของ state.turnDeadline แล้วยังไม่มีใครทำอะไร (ผู้เล่นจริงเผลอ/หลุดออกไป)
 *    จะเลือก Action ที่ปลอดภัยที่สุดให้แทน เพื่อไม่ให้เกมค้างรอทั้งห้อง (ข้อ 5)
 *
 * เพราะ Action ทุกตัวถูกตรวจสอบซ้ำอีกชั้นใน Firebase transaction (requireCurrentPlayer,
 * เช็ค pending ฯลฯ) การที่หลายแท็บอาจช่วยกันลองยิง Action เดียวกันพร้อมกันจึงปลอดภัย
 * — จะมีแค่ครั้งแรกที่สำเร็จ ที่เหลือจะถูกปฏิเสธเงียบ ๆ
 */
export function useAutoPlay(state: GameState | null | undefined, roomId: string) {
  const scheduledSigRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!state || state.status !== "PLAYING") {
      scheduledSigRef.current = null;
      return;
    }

    const signature = JSON.stringify({
      pending: state.pending,
      current: state.currentPlayerId,
      rolled: state.hasRolledThisTurn,
      canAgain: state.canRollAgain,
      dice: state.dice?.rollSeq ?? null,
      turn: state.turnNumber,
    });

    // ----- 1) หาว่ามีบอทตัวไหนต้องเดินหรือไม่ -----
    let botScheduled = false;
    for (const p of Object.values(state.players)) {
      if (!p.isBot || p.status === "BANKRUPT") continue;
      const action = engine.getAutoAction(state, p.id, { aggressive: true });
      if (action) {
        if (scheduledSigRef.current !== signature) {
          scheduledSigRef.current = signature;
          const delay = randomThinkDelay();
          timerRef.current = window.setTimeout(() => {
            dispatchAutoAction(roomId, p.id, action).catch(() => {});
          }, delay);
        }
        botScheduled = true;
        break;
      }
    }
    if (botScheduled) return;

    // ----- 2) ไม่มีบอทต้องเดิน -> เฝ้าดูว่าหมดเวลาของผู้เล่นจริงหรือยัง -----
    if (!state.turnDeadline) return;

    const fireTimeout = () => {
      const latest = state; // อ่านจาก state ตอนตั้งเวลา — เพียงพอเพราะ dispatch จะ validate ซ้ำอีกชั้นอยู่ดี
      let actorId: string | null = null;
      if (latest.pending.kind === "BUY_DECISION" || latest.pending.kind === "CARD" || latest.pending.kind === "BANKRUPT") {
        actorId = latest.pending.playerId;
      } else if (latest.pending.kind === "AUCTION") {
        // เลือกผู้ประมูลคนแรกที่ยังไม่ใช่ผู้นำราคาปัจจุบัน ให้เป็นคนตัดสินใจก่อน (บิดหรือถอนตัว)
        // ข้อ 4: แต่ถ้าเหลือแค่ผู้นำราคาคนเดียวที่ยังไม่กดถอนตัว (คนอื่นถอนหมดแล้ว) ก็ต้อง
        // เลือกผู้นำราคาคนนั้นมาบังคับถอนตัวให้ด้วย ไม่งั้นการประมูลจะค้างรอเขาคนเดียวตลอดไป
        // เพราะกฎใหม่ต้องรอให้ "ทุกคน" กดถอนตัวครบก่อนถึงจะจบประมูลได้
        const auction = latest.pending;
        actorId =
          auction.activeBidders.find((id) => id !== auction.leaderId) ??
          auction.activeBidders[0] ??
          null;
      } else if (latest.pending.kind === "NONE") {
        actorId = latest.currentPlayerId;
      }
      if (!actorId) return;
      const action = engine.getAutoAction(latest, actorId, { aggressive: false });
      if (action) dispatchAutoAction(roomId, actorId, action).catch(() => {});
    };

    const msLeft = state.turnDeadline - Date.now();
    if (msLeft <= 0) {
      fireTimeout();
    } else {
      timerRef.current = window.setTimeout(fireTimeout, msLeft + 50);
    }

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, roomId]);
}
