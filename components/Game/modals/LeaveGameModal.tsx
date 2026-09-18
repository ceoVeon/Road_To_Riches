"use client";
import { useState } from "react";
import { actions } from "@/lib/roomService";
import Overlay from "./Overlay";

/**
 * ยืนยันก่อนออกจากเกมจริง เพราะการออกจะถูกนับเป็น "ล้มละลายทันที" (ข้อ 3)
 * ทรัพย์สินทั้งหมดคืนธนาคาร และจะไม่สามารถกลับเข้ามาเล่นต่อในเกมนี้ได้อีก
 * จึงต้องมีการยืนยันชัดเจนก่อน กันการกดพลาด
 */
export default function LeaveGameModal({
  roomId,
  playerId,
  onClose,
}: {
  roomId: string;
  playerId: string;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmLeave() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await actions.leaveGame(roomId, playerId);
      // สำเร็จแล้ว state.pending/status จะเปลี่ยนไป ตัว Modal นี้จะถูกเอาออกจากการ render เองโดยผู้เรียก
    } catch (e: any) {
      setError(e.message || "ออกจากเกมไม่สำเร็จ");
      setBusy(false);
    }
  }

  return (
    <Overlay onClose={busy ? undefined : onClose}>
      <div className="w-[360px] max-w-full bg-paper-hi rounded-[22px] shadow-deep overflow-hidden border border-paper-line animate-pop-in">
        <div className="px-5 py-3.5 text-white" style={{ background: "var(--seal)" }}>
          <h3 className="m-0 text-[1.05rem]">ออกจากเกม</h3>
        </div>
        <div className="px-5 py-4">
          {error && (
            <div className="bg-seal/10 text-seal border border-seal/30 px-3 py-2 rounded-lg text-sm mb-2.5">
              {error}
            </div>
          )}
          <p className="text-ink-soft text-[.88rem] m-0">
            ถ้าออกจากเกมตอนนี้ ท่านจะ<b className="text-seal">ถูกนับว่าล้มละลายทันที</b> ทรัพย์สินทั้งหมด
            (เงินสด ที่ดิน บ้าน/โรงแรม) จะคืนกลับให้ธนาคาร และจะกลับเข้ามาเล่นต่อในเกมนี้ไม่ได้อีก
            ยืนยันจะออกจากเกมหรือไม่?
          </p>
          <div className="flex gap-2 pt-3.5">
            <button
              className="flex-1 border-none rounded-lg py-2.5 px-4 text-sm font-semibold bg-transparent border border-paper-line text-ink hover:border-ink-soft disabled:opacity-50 disabled:cursor-wait"
              disabled={busy}
              onClick={onClose}
            >
              ยกเลิก
            </button>
            <button
              className="flex-1 border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-wait"
              style={{ background: "var(--seal)" }}
              disabled={busy}
              onClick={confirmLeave}
            >
              {busy ? "กำลังออก..." : "ยืนยันออกจากเกม"}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
