"use client";
import { GameState } from "@/lib/types";
import { BOARD } from "@/lib/boardData";
import { isPropertyTile } from "@/lib/types";
import Overlay from "./Overlay";

export default function DeedPreviewModal({ state, tileId, onClose }: { state: GameState; tileId: number; onClose: () => void }) {
  const tile = BOARD[tileId];
  if (!isPropertyTile(tile)) {
    return (
      <Overlay onClose={onClose}>
        <div className="w-[300px] bg-paper-hi rounded-[22px] shadow-deep border border-paper-line overflow-hidden animate-pop-in">
          <div className="px-5 py-3.5 flex justify-between items-center text-white" style={{ background: "var(--felt)" }}>
            <h3 className="m-0 text-[1.05rem]">{tile.name}</h3>
            <button className="bg-transparent border-none text-inherit text-lg opacity-80" onClick={onClose}>✕</button>
          </div>
          <div className="px-5 py-4 text-ink-soft text-[.85rem]">
            ช่องนี้ไม่ใช่ที่ดินที่สามารถซื้อได้
          </div>
        </div>
      </Overlay>
    );
  }
  const ps = state.properties[tileId];
  const owner = ps.ownerId ? state.players[ps.ownerId] : null;

  return (
    <Overlay onClose={onClose}>
      <div className="w-[290px] sm:w-[340px] md:w-[360px] lg:w-[360px] xl:w-[370px] 2xl:w-[380px]  max-w-full bg-paper-hi rounded-[22px] shadow-deep relative overflow-hidden border border-paper-line animate-pop-in">
        <div className="px-5 pt-4 pb-2.5 text-white" style={{ background: owner ? owner.color : "var(--felt)" }}>
          <p className="text-[.7rem] opacity-85 m-0 mb-0.5">โฉนดที่ดิน{ps.mortgaged ? " (ติดจำนอง)" : ""}</p>
          <h3 className="m-0 text-[1.25rem]">{tile.name}</h3>
        </div>
        <div className="px-5 py-3.5">
          <div className="flex justify-between text-[.63rem] md:text-[.83rem] py-1.5 border-b border-dotted border-paper-line">
            <span>เจ้าของ</span><b className="font-display">{owner ? owner.name : "ยังไม่มีเจ้าของ"}</b>
          </div>
          <div className="flex justify-between text-[.63rem] md:text-[.83rem] py-1.5 border-b border-dotted border-paper-line">
            <span>ราคาที่ดิน</span><b className="num font-display">{tile.price.toLocaleString()}</b>
          </div>
          {tile.type === "PROPERTY" && (
            <>
              <div className="flex justify-between text-[.63rem] md:text-[.83rem] py-1.5 border-b border-dotted border-paper-line">
                <span>ค่าเช่าพื้นฐาน</span><b className="num font-display">{tile.rent.toLocaleString()}</b>
              </div>
              <div className="flex justify-between text-[.63rem] md:text-[.83rem] py-1.5 border-b border-dotted border-paper-line">
                <span>ค่าเช่า (บ้าน 1–4)</span><b className="num font-display">{tile.rentHouse.map((n) => n.toLocaleString()).join(" / ")}</b>
              </div>
              <div className="flex justify-between text-[.63rem] md:text-[.83rem] py-1.5 border-b border-dotted border-paper-line">
                <span>ค่าเช่า (โรงแรม)</span><b className="num font-display">{tile.rentHotel.toLocaleString()}</b>
              </div>
              <div className="flex justify-between text-[.63rem] md:text-[.83rem] py-1.5 border-b border-dotted border-paper-line">
                <span>ราคาสร้างบ้าน/โรงแรม</span><b className="num font-display">{tile.housePrice.toLocaleString()}</b>
              </div>
              <div className="flex justify-between text-[.63rem] md:text-[.83rem] py-1.5 border-b border-dotted border-paper-line">
                <span>สิ่งปลูกสร้าง</span><b className="font-display">{ps.hotel ? "โรงแรม" : `บ้าน ${ps.houses} หลัง`}</b>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-1.5">
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
