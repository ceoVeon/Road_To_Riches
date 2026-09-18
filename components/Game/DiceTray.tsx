"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { DiceRoll } from "@/lib/types";
import { DICE_TICK_MS, DICE_TICKS } from "@/lib/animTiming";

import Dice1 from "./DiceFace/1.png";
import Dice2 from "./DiceFace/2.png";
import Dice3 from "./DiceFace/3.png";
import Dice4 from "./DiceFace/4.png";
import Dice5 from "./DiceFace/5.png";
import Dice6 from "./DiceFace/6.png";

const DICE_FACES = [null, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

function diceFace(v: number) {
  return DICE_FACES[v] || Dice1;
}

/**
 * แสดงลูกเต๋าคู่พร้อมแอนิเมชันสั่น/สุ่มหน้าสั้น ๆ ก่อนหยุดที่ค่าจริง
 */
export default function DiceTray({
  dice,
  size = "md",
}: {
  dice: DiceRoll | null;
  size?: "sm" | "md";
}) {
  const [rollingFaces, setRollingFaces] = useState<[number, number] | null>(null);
  const [shown, setShown] = useState<DiceRoll | null>(dice);
  const lastSeq = useRef<number | null>(dice?.rollSeq ?? null);

  useEffect(() => {
    if (!dice) {
      setShown(null);
      return;
    }

    if (lastSeq.current === dice.rollSeq) {
      setShown(dice);
      return;
    }

    lastSeq.current = dice.rollSeq;

    let ticks = 0;

    const iv = window.setInterval(() => {
      setRollingFaces([
        1 + Math.floor(Math.random() * 6),
        1 + Math.floor(Math.random() * 6),
      ]);

      ticks += 1;

      if (ticks >= DICE_TICKS) {
        window.clearInterval(iv);
        setRollingFaces(null);
        setShown(dice);
      }
    }, DICE_TICK_MS);

    return () => window.clearInterval(iv);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dice?.rollSeq]);

  const faces = rollingFaces
    ? rollingFaces
    : shown
      ? [shown.d1, shown.d2]
      : null;

  if (!faces) return null;

  const dim = size === "sm" ? "w-9 h-9" : "w-12 h-12";

  const total = !rollingFaces && shown ? shown.d1 + shown.d2 : null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex gap-1 items-center justify-center">
        {faces.map((v, i) => (
          <div
            key={i}
            className={`${dim} relative ${
              rollingFaces ? "animate-dice-shake" : "animate-pop-in"
            }`}
          >
            <Image
              src={diceFace(v)}
              alt={`ลูกเต๋า ${v}`}
              fill
              sizes="48px"
              className="object-contain"
            />
          </div>
        ))}
      </div>

      {total !== null && (
        <div className="text-[.88rem] text-paper">
          รวม <b className="text-gold font-display num">{total}</b> แต้ม
        </div>
      )}
    </div>
  );
}