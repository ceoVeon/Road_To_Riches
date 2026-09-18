"use client";
import { useEffect, useRef, useState } from "react";

/**
 * ข้อ 3: ตัวเลข (โดยเฉพาะเงินสด) ที่ไล่ค่าขึ้น/ลงแบบนุ่มนวลเมื่อ value เปลี่ยน
 * แทนที่จะกระโดดเปลี่ยนค่าทันทีเหมือนเดิม พร้อมกระพริบสีเขียว/แดงบอกทิศทาง
 * (เขียว = ได้เงินเพิ่ม, แดง = เสียเงิน) ให้รู้สึกถึงการเปลี่ยนแปลงชัดเจนขึ้น
 *
 * ใช้ requestAnimationFrame ไล่ค่าเอง ไม่พึ่งไลบรารีเสริม เพื่อให้เบาและใช้ที่ไหนก็ได้
 * ที่ต้องแสดงตัวเลขที่เปลี่ยนบ่อย (เงินสดผู้เล่นในแถบผู้เล่น, ใน Modal รายละเอียดผู้เล่น ฯลฯ)
 */
export default function AnimatedNumber({
  value,
  duration = 700,
  className = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const displayRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayRef.current;
    if (from === value) return;

    setFlash(value > from ? "up" : "down");
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlash(null), duration + 250);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — ไล่เร็วช่วงแรกแล้วชะลอนุ่มนวลตอนใกล้ถึงค่าจริง
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (value - from) * eased);
      displayRef.current = current;
      setDisplay(current);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  useEffect(() => () => {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
  }, []);

  return (
    <span
      className={`${className} transition-colors duration-300 ${
        flash === "up" ? "text-emerald-600" : flash === "down" ? "text-seal" : ""
      }`}
    >
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
