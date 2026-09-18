"use client";
import { useEffect, useRef } from "react";
import { GameState } from "@/lib/types";
const KIND_BORDER: Record<string, string> = {
  info: "border-l-gold",
  warn: "border-l-[var(--group-orange)]",
  danger: "border-l-seal",
  money: "border-l-[var(--group-green)]",
};
export default function LogPanel({ state }: { state: GameState }) {
  const logs = [...state.logs].slice(-60);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const lastLogId = logs[logs.length - 1]?.id;
  useEffect(() => {
    const container = logContainerRef.current;
    if (!container || !lastLogId) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [lastLogId]);
  return (
    <div className=" order-3 w-full max-w-[380px] mx-auto landscape:w-[350px] landscape:max-w-[350px] landscape:mx-0 landscape:h-full landscape:min-h-0 min-w-0 flex flex-col bg-paper/95 backdrop-blur-sm rounded-2xl border border-paper-line shadow-deep overflow-hidden animate-pop-in portrait:max-h-64 ">
      <div className="flex-none px-3.5 sm:px-4 pt-3 pb-2 border-b border-dashed border-paper-line">
        <div className="text-[0.8rem] xl:text-[1rem] font-bold text-gold uppercase tracking-wide">
          บันทึกเกม
        </div>
      </div>
      <div
        ref={logContainerRef}
        className=" flex-1 landscape:min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin m-3 portrait:max-h-[120px] rounded-lg "
      >
        {logs.length === 0 ? (
          <div className="text-[.78rem] text-ink-soft text-center py-8">
            ยังไม่มีเหตุการณ์ในเกมนี้
          </div>
        ) : (
          <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
            {logs.map((l) => (
              <li
                key={l.id}
                className={`text-[.78rem] leading-snug px-2.5 py-1.5 bg-paper-hi border-l-[3px] rounded-md ${KIND_BORDER[l.kind || "info"]}`}
              >
                {l.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
