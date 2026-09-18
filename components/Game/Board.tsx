"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { GameState } from "@/lib/types";
import { BOARD, tokenEmoji } from "@/lib/boardData";
import { getRingLayout, ringPosition } from "@/lib/layout";
import { DICE_ROLL_MS, TOKEN_STEP_MS } from "@/lib/animTiming";
import Tile from "./Tile";
import DeedPreviewModal from "./modals/DeedPreviewModal";

const TOKEN_SIZE = 35;
const STEP_MS = TOKEN_STEP_MS;

type Coord = {
  left: number;
  top: number;
};

type BoardSize = {
  width: number;
  height: number;
};

export default function Board({
  state,
  roomId,
  playerId,
  children,
}: {
  state: GameState;
  roomId: string;
  playerId: string;
  children?: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const [boardSize, setBoardSize] = useState<BoardSize>({
    width: 0,
    height: 0,
  });

  const [tokenPos, setTokenPos] = useState<Record<string, Coord>>({});

  const [hopping, setHopping] = useState<Record<string, boolean>>({});

  const [viewTile, setViewTile] = useState<number | null>(null);

  const prevPosRef = useRef<Record<string, number>>({});

  const timersRef = useRef<Record<string, number>>({});

  // ใช้เทียบว่ารอบนี้เป็นผลจากการทอยลูกเต๋าใหม่หรือไม่ (เช่น การ์ด MOVE_TO ไม่นับ)
  // เพื่อหน่วงจังหวะให้ตัวเดินเริ่มขยับ "หลัง" แอนิเมชันลูกเต๋าสั่นจบก่อน — กันปัญหา
  // ตัวเดินวิ่งถึงจุดหมายเร็วกว่าลูกเต๋าที่ยังหมุนอยู่ (ข้อ 1)
  const prevDiceSeqRef = useRef<number | null>(null);

  // =========================================================
  // วัดขนาดพื้นที่ Board
  // =========================================================

  useEffect(() => {
    const el = wrapRef.current;

    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();

      setBoardSize({
        width: rect.width,
        height: rect.height,
      });
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(el);

    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();

      window.removeEventListener("resize", measure);
    };
  }, []);

  // =========================================================
  // ตรวจสอบว่ากระดานมี 40 ช่อง
  // =========================================================

  useEffect(() => {
    if (BOARD.length !== 40) {
      console.warn(`[Board] Expected 40 tiles, but received ${BOARD.length}`);
    }
  }, []);

  // =========================================================
  // Responsive Layout
  // =========================================================

  const layout =
    boardSize.width > 0 && boardSize.height > 0
      ? getRingLayout(boardSize.width, boardSize.height)
      : null;

  // =========================================================
  // Grid
  //
  // Corner = 2fr
  // Normal tile = 1fr
  //
  // จึงทำให้ Corner ใหญ่กว่าช่องปกติ
  // แต่ช่องด้านบน/ล่าง และซ้าย/ขวา
  // ไม่จำเป็นต้องเป็น square
  // =========================================================

  const gridStyle: React.CSSProperties = layout
    ? {
        gridTemplateColumns: `2fr repeat(${layout.x}, 1fr) 2fr`,

        gridTemplateRows: `2fr repeat(${layout.y}, 1fr) 2fr`,

        width: "100%",
        height: "100%",
      }
    : {};

  // =========================================================
  // ข้อ 4: ขนาดจริงของกรอบกระดาน
  //
  // เดิม boardRef ถูกบังคับให้ยืดเต็ม 100% ของพื้นที่ที่วัดได้ (wrapRef) เสมอ โดยไม่สนใจ
  // ค่า layout.boardWidth/boardHeight ที่คำนวณไว้แล้วว่าพอดีเป็นสี่เหลี่ยมจัตุรัสตามจำนวน
  // คอลัมน์/แถวจริง — พอ aspect ratio ของพื้นที่ไม่ตรงกับ cols/rows พอดี การยืดเต็มนี้ทำให้
  // ตาราง CSS Grid (fr-based) ต้องปัดเศษกระจายพื้นที่ส่วนเกินไปตกอยู่ที่แทร็กสุดท้าย (ขวา/ล่าง)
  // ทำให้ขอบกระดานงอกเกินพื้นที่จริงไปเล็กน้อย ("ตกขอบ") จึงเปลี่ยนมากำหนดขนาดกระดานให้เท่ากับ
  // layout.boardWidth/boardHeight ตรง ๆ (ซึ่งการันตีว่า <= พื้นที่ที่มีเสมอ) แล้วปล่อยให้ wrapRef
  // (flex + items-center + justify-center) จัดกึ่งกลางส่วนที่เหลือให้เอง
  // =========================================================

  const boardStyle: React.CSSProperties = layout
    ? { width: layout.boardWidth, height: layout.boardHeight }
    : { width: "100%", height: "100%" };

  // =========================================================
  // Player Positions Dependency
  // =========================================================

  const positions = Object.values(state.players)
    .map((p) => `${p.id}:${p.position}:${p.status}`)
    .join(",");

  // =========================================================
  // Token Position / Animation
  // =========================================================

  useEffect(() => {
    const boardEl = boardRef.current;

    if (!boardEl) return;

    if (!boardSize.width || !boardSize.height) {
      return;
    }

    if (!layout) return;

    // -------------------------------------------------------
    // หา center ของ Tile
    // -------------------------------------------------------

    function coordsForTile(tileId: number): Coord | null {
      const el = boardEl!.querySelector(
        `[data-tile-id="${tileId}"]`,
      ) as HTMLElement | null;

      if (!el) return null;

      const tileRect = el.getBoundingClientRect();

      const boardRect = boardEl!.getBoundingClientRect();

      return {
        left: tileRect.left - boardRect.left + tileRect.width / 2,

        top: tileRect.top - boardRect.top + tileRect.height / 2,
      };
    }

    // -------------------------------------------------------
    // Group players ที่อยู่ช่องเดียวกัน
    // -------------------------------------------------------

    const byTile: Record<number, string[]> = {};

    Object.values(state.players).forEach((p) => {
      if (p.status === "BANKRUPT") {
        return;
      }

      (byTile[p.position] ||= []).push(p.id);
    });

    // -------------------------------------------------------
    // Final positions
    // -------------------------------------------------------

    const finalPos: Record<string, Coord> = {};

    Object.entries(byTile).forEach(([tileId, ids]) => {
      const base = coordsForTile(Number(tileId));

      if (!base) return;

      ids.forEach((id, index) => {
        const angle = (index / Math.max(ids.length, 1)) * Math.PI * 2;

        const spread = ids.length > 1 ? 9 : 0;

        finalPos[id] = {
          left: base.left + Math.cos(angle) * spread,

          top: base.top + Math.sin(angle) * spread,
        };
      });
    });

    // -------------------------------------------------------
    // ตรวจว่ารอบนี้มีการทอยลูกเต๋าใหม่หรือไม่ (เทียบ rollSeq)
    // -------------------------------------------------------

    const diceChanged =
      !!state.dice && state.dice.rollSeq !== prevDiceSeqRef.current;

    prevDiceSeqRef.current = state.dice?.rollSeq ?? prevDiceSeqRef.current;

    // -------------------------------------------------------
    // Update players
    // -------------------------------------------------------

    Object.values(state.players).forEach((p) => {
      if (p.status === "BANKRUPT") {
        return;
      }

      const previous = prevPosRef.current[p.id];

      prevPosRef.current[p.id] = p.position;

      // ---------------------------------------------------
      // Clear existing timer (ทั้ง interval และ timeout ที่อาจค้างอยู่)
      // ---------------------------------------------------

      if (timersRef.current[p.id]) {
        window.clearInterval(timersRef.current[p.id]);
        window.clearTimeout(timersRef.current[p.id]);

        delete timersRef.current[p.id];
      }

      // ---------------------------------------------------
      // Initial position / no movement
      // ---------------------------------------------------

      if (previous === undefined || previous === p.position) {
        const final = finalPos[p.id];

        if (final) {
          setTokenPos((current) => ({
            ...current,
            [p.id]: final,
          }));
        }

        return;
      }

      // ---------------------------------------------------
      // จำนวนช่องที่เดินไปข้างหน้า
      // ---------------------------------------------------

      const diff = (p.position - previous + BOARD.length) % BOARD.length;

      // ---------------------------------------------------
      // Teleport
      //
      // > 12 ช่อง = ไม่ animation
      // ---------------------------------------------------

      if (diff === 0 || diff > 12) {
        const final = finalPos[p.id];

        if (final) {
          setTokenPos((current) => ({
            ...current,
            [p.id]: final,
          }));
        }

        return;
      }

      // ---------------------------------------------------
      // Start animation
      //
      // ถ้าการเคลื่อนที่นี้มาจากการทอยลูกเต๋ารอบใหม่ (ของผู้เล่นที่กำลังเดิน)
      // ให้รอจนแอนิเมชันลูกเต๋าสั่นจบก่อน (DICE_ROLL_MS) แล้วค่อยเริ่มขยับตัวเดิน
      // ป้องกันปัญหาตัวเดินถึงจุดหมายก่อนลูกเต๋าจะหยุดหมุน
      // ---------------------------------------------------

      const startHopping = () => {
        setHopping((current) => ({
          ...current,
          [p.id]: true,
        }));

        let step = 0;

        const timer = window.setInterval(() => {
          step += 1;

          const tileId = (previous + step) % BOARD.length;

          const coord = coordsForTile(tileId);

          if (coord) {
            setTokenPos((current) => ({
              ...current,
              [p.id]: coord,
            }));
          }

          // ------------------------------------------------
          // Animation complete
          // ------------------------------------------------

          if (step >= diff) {
            window.clearInterval(timer);

            delete timersRef.current[p.id];

            setHopping((current) => ({
              ...current,
              [p.id]: false,
            }));

            const final = finalPos[p.id];

            if (final) {
              setTokenPos((current) => ({
                ...current,
                [p.id]: final,
              }));
            }
          }
        }, STEP_MS);

        timersRef.current[p.id] = timer;
      };

      const shouldWaitForDice = diceChanged && p.id === state.currentPlayerId;

      if (shouldWaitForDice) {
        timersRef.current[p.id] = window.setTimeout(startHopping, DICE_ROLL_MS);
      } else {
        startHopping();
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, boardSize.width, boardSize.height]);

  // =========================================================
  // Cleanup
  // =========================================================

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timer) => {
        window.clearInterval(timer);
        window.clearTimeout(timer);
      });
    };
  }, []);

  // =========================================================
  // Render
  // =========================================================

  return (
    <div
      ref={wrapRef}
      className="
        w-full
        h-full
        min-w-0
        min-h-0
        flex
        items-center
        justify-center
      "
    >
      {/* ===================================================
          Board
          =================================================== */}

      <div
        ref={boardRef}
        className="
          relative
          bg-felt
          shadow-[inset_0_0_0_6px_var(--felt-deep),0_16px_40px_rgba(29,66,60,0.45)]
          rounded
          max-w-full
          max-h-full
          overflow-hidden
        "
        style={boardStyle}
      >
        {/* =================================================
            Grid
            ================================================= */}

        <div
          className="
            absolute
            p-2
            grid
            gap-1
            rounded
          "
          style={gridStyle}
        >
          {/* ==============================================
              Center Board
              ============================================== */}

          <div
            className="
              board-felt-texture
              rounded-xl
              min-w-0
              min-h-0
              m-1
              overflow-hidden
              border
              border-dashed
              border-gold/25
              shadow-[inset_0_2px_14px_rgba(0,0,0,0.28)]
              z-[3]
            "
            style={{
              gridColumn: "2 / -2",
              gridRow: "2 / -2",
            }}
          >
            <div className="w-full h-full min-w-0 min-h-0 overflow-y-auto overflow-x-hidden p-[clamp(5px,1vw,12px)] scrollbar-thin">
              <div className="w-full min-h-full min-w-0 flex items-center justify-center">
                {children}
              </div>
            </div>
          </div>

          {/* ==============================================
              40 Tiles
              ============================================== */}

          {layout &&
            BOARD.map((tile) => {
              const pos = ringPosition(tile.id, layout.x, layout.y);

              return (
                <Tile
                  key={tile.id}
                  tile={tile}
                  pos={pos}
                  propertyState={
                    "group" in tile ? state.properties[tile.id] : undefined
                  }
                  ownerColor={
                    "group" in tile && state.properties[tile.id]?.ownerId
                      ? state.players[state.properties[tile.id].ownerId!]?.color
                      : undefined
                  }
                  onClick={() => setViewTile(tile.id)}
                />
              );
            })}
        </div>

        {/* =================================================
            Tokens
            ================================================= */}

        <div
          className="
            absolute
            inset-0
            pointer-events-none
            z-[5]
          "
        >
          {Object.values(state.players)
            .filter((p) => p.status !== "BANKRUPT")
            .map((p) => {
              const pos = tokenPos[p.id];

              return (
                <div
                  key={p.id}
                  className={`
                    absolute
                    rounded-full
                    border-2
                    border-paper-hi
                    shadow-[0_2px_5px_rgba(0,0,0,0.5)]
                    flex
                    items-center
                    justify-center
                    text-[13px]
                    leading-none
                    transition-all
                    ease-linear

                    ${hopping[p.id] ? "animate-token-hop" : ""}
                  `}
                  style={{
                    width: TOKEN_SIZE,

                    height: TOKEN_SIZE,

                    background: p.color,

                    left: (pos?.left ?? 0) + "px",

                    top: (pos?.top ?? 0) + "px",

                    transform: "translate(-50%, -50%)",

                    transitionDuration: `${STEP_MS}ms`,
                  }}
                  title={p.name}
                >
                  {tokenEmoji(p.tokenIcon)}
                </div>
              );
            })}
        </div>
      </div>

      {/* ===================================================
          Deed Modal
          =================================================== */}

      {viewTile !== null && (
        <DeedPreviewModal
          state={state}
          tileId={viewTile}
          onClose={() => setViewTile(null)}
        />
      )}
    </div>
  );
}
