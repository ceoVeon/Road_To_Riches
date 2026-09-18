"use client";
import { useEffect, useState } from "react";
import { GameState, Card } from "@/lib/types";
import { actions } from "@/lib/roomService";
import Overlay from "./Overlay";

export default function CardModal({ state, roomId, playerId, card }: { state: GameState; roomId: string; playerId: string; card: Card }) {
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setFlipped(false);
    const t = setTimeout(() => setFlipped(true), 150);
    return () => clearTimeout(t);
  }, [card.id]);

  async function ack() {
    if (busy) return;
    setBusy(true);
    try { await actions.acknowledgeCard(roomId, playerId); } catch { /* เดี๋ยว state ใหม่จะแก้ปัญหาเอง */ } finally { setBusy(false); }
  }

  return (
    <Overlay>
      <div>
        <div className="w-[210px] mx-auto perspective-800" style={{ aspectRatio: "3/4.2" }}>
          <div
            className={`relative w-full h-full preserve-3d transition-transform duration-[550ms] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
          >
            <div
              className="absolute inset-0 rounded-xl backface-hidden flex flex-col items-center justify-center text-center p-4 shadow-[0_10px_24px_rgba(0,0,0,0.35)] text-gold-bright font-display text-[1.05rem] border-2 border-gold-bright/40"
              style={{ background: "linear-gradient(135deg, var(--felt), var(--felt-deep))" }}
            >
              {card.deck === "CHANCE" ? <>ประตู<br />ดวง</> : <>หีบ<br />สมบัติ</>}
            </div>
            <div
              className="absolute inset-0 rounded-xl backface-hidden flex flex-col items-center justify-center text-center p-4 shadow-[0_10px_24px_rgba(0,0,0,0.35)] bg-paper-hi border-2 border-paper-line text-ink [transform:rotateY(180deg)]"
            >
              <div className="font-display text-base mb-2">{card.title}</div>
              <div className="text-[.83rem] text-ink-soft">{card.description}</div>
            </div>
          </div>
        </div>
        <div className="text-center mt-3.5">
          <button
            className="border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-felt-deep hover:brightness-105 disabled:opacity-60 disabled:cursor-wait"
            style={{ background: "linear-gradient(180deg, var(--gold-bright), var(--gold))" }}
            disabled={busy}
            onClick={ack}
          >
            {busy ? "กำลังดำเนินการ..." : "รับทราบ"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
