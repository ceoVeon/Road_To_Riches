export type LayoutMode = "ring";

export interface TileVisualPos {
  col: number;
  row: number;
  side: "top" | "bottom" | "left" | "right" | "corner";
}

export interface RingLayout {
  // จำนวนช่องด้านบน/ล่าง ไม่รวม Corner
  x: number;

  // จำนวนช่องด้านซ้าย/ขวา ไม่รวม Corner
  y: number;

  // จำนวน grid column / row ทั้งหมด รวม Corner
  cols: number;
  rows: number;

  // ขนาดช่องสี่เหลี่ยมจัตุรัส
  tileSize: number;

  // ขนาด board จริง
  boardWidth: number;
  boardHeight: number;
}

export const TILE_COUNT = 40;

// 4 Corner + 36 ช่องธรรมดา
//
// 2X + 2Y + 4 = 40
// X + Y = 18
const SIDE_SUM = (TILE_COUNT - 4) / 2;

// จำกัดไม่ให้ด้านใดด้านหนึ่งสั้นเกินไป
//
// 5 + 13 = 18
// จึงมีตั้งแต่ 5 ถึง 13
const MIN_SIDE = 5;
const MAX_SIDE = 13;

/**
 * เลือกจำนวนช่อง X/Y ให้เหมาะกับ aspect ratio
 *
 * X = ช่องด้านบน/ล่าง
 * Y = ช่องด้านซ้าย/ขวา
 *
 * IMPORTANT:
 * ทุกช่องเป็น square
 * ดังนั้นเราจะเลือก X/Y จากอัตราส่วนของ "จำนวนช่อง"
 * ไม่ได้บังคับให้ board ยืดเต็มทั้ง width/height
 */
export function getRingShape(
  width: number,
  height: number
): { x: number; y: number } {
  if (width <= 0 || height <= 0) {
    return {
      x: 9,
      y: 9,
    };
  }

  const aspect = width / height;

  let bestX = 9;
  let bestDifference = Infinity;

  for (let x = MIN_SIDE; x <= MAX_SIDE; x++) {
    const y = SIDE_SUM - x;

    const cols = x + 2;
    const rows = y + 2;

    // อัตราส่วนของ board ถ้าทุกช่องเป็น square
    const boardAspect = cols / rows;

    // ใช้ log ratio เพื่อให้ portrait/landscape สมมาตรกัน
    const difference = Math.abs(
      Math.log(boardAspect / aspect)
    );

    if (difference < bestDifference) {
      bestDifference = difference;
      bestX = x;
    }
  }

  return {
    x: bestX,
    y: SIDE_SUM - bestX,
  };
}

/**
 * คำนวณ Layout จริง
 *
 * ทุกช่องเป็น square:
 *
 * tileSize = min(
 *   width / cols,
 *   height / rows
 * )
 *
 * ดังนั้นจะไม่มีกรณี:
 *
 * width !== height
 *
 * สำหรับ tile ใด ๆ
 */
export function getRingLayout(
  width: number,
  height: number
): RingLayout {
  const { x, y } = getRingShape(
    width,
    height
  );

  const cols = x + 2;
  const rows = y + 2;

  // ช่องทุกช่องต้องเป็นสี่เหลี่ยม
  // ปัดเศษลง (floor) เป็นพิกเซลเต็มเสมอ — ถ้าปล่อยเป็นทศนิยม ตอนนำ boardWidth/boardHeight
  // ไปกำหนดเป็นขนาดจริงของกระดาน (แทนการยืดเต็ม 100% ของพื้นที่แบบเดิม) การปัดเศษของเบราว์เซอร์
  // ระหว่างค่า tileSize คูณจำนวนคอลัมน์/แถวจำนวนมาก (สูงสุด 15 แทร็ก) จะสะสมความคลาดเคลื่อนไป
  // ตกอยู่ที่แทร็กสุดท้าย ทำให้ขอบล่าง/ขวาของกระดานเกินพื้นที่จริงไปเล็กน้อย ("ตกขอบ") — การ floor
  // และคำนวณ boardWidth/boardHeight จาก tileSize ที่ปัดแล้วโดยตรง การันตีว่าค่าที่ได้จะไม่มีวันเกิน
  // ขนาดพื้นที่ที่มีจริง (width/height) เลย
  const tileSize = Math.floor(
    Math.min(
      width / cols,
      height / rows
    )
  );

  return {
    x,
    y,
    cols,
    rows,
    tileSize,

    boardWidth: tileSize * cols,
    boardHeight: tileSize * rows,
  };
}

/**
 * ตำแหน่งช่องทั้ง 40 ช่อง
 *
 * ID:
 *
 *               10 ... 19
 *            20           9
 *            21           8
 *            ...          ...
 *            29           1
 *               30 ... 39
 *                    0
 *
 * โดยรูปจริงจะขึ้นอยู่กับ X/Y
 *
 * 0  = bottom-right corner
 * 1..Y = right
 * Y+1 = top-right corner
 * ... = top
 * ... = top-left corner
 * ... = left
 * ... = bottom-left corner
 * ... = bottom
 */
export function ringPosition(
  id: number,
  x: number,
  y: number
): TileVisualPos {
  if (
    id < 0 ||
    id >= TILE_COUNT
  ) {
    throw new Error(
      `Invalid tile id: ${id}`
    );
  }

  const cols = x + 2;
  const rows = y + 2;

  // -----------------------------------------
  // 0 = Bottom Right Corner
  // -----------------------------------------
  if (id === 0) {
    return {
      col: cols,
      row: rows,
      side: "corner",
    };
  }

  // -----------------------------------------
  // Right
  // -----------------------------------------
  //
  // 1 ... Y
  //
  if (id <= y) {
    return {
      col: cols,
      row: rows - id,
      side: "right",
    };
  }

  // -----------------------------------------
  // Top Right Corner
  // -----------------------------------------
  const topRight = y + 1;

  if (id === topRight) {
    return {
      col: cols,
      row: 1,
      side: "corner",
    };
  }

  // -----------------------------------------
  // Top
  // -----------------------------------------
  //
  // X ช่อง
  //
  const topStart = topRight + 1;
  const topEnd = topStart + x - 1;

  if (id <= topEnd) {
    const index = id - topStart;

    return {
      col: cols - 1 - index,
      row: 1,
      side: "top",
    };
  }

  // -----------------------------------------
  // Top Left Corner
  // -----------------------------------------
  const topLeft = topEnd + 1;

  if (id === topLeft) {
    return {
      col: 1,
      row: 1,
      side: "corner",
    };
  }

  // -----------------------------------------
  // Left
  // -----------------------------------------
  //
  // Y ช่อง
  //
  const leftStart = topLeft + 1;
  const leftEnd = leftStart + y - 1;

  if (id <= leftEnd) {
    const index = id - leftStart;

    return {
      col: 1,
      row: 2 + index,
      side: "left",
    };
  }

  // -----------------------------------------
  // Bottom Left Corner
  // -----------------------------------------
  const bottomLeft = leftEnd + 1;

  if (id === bottomLeft) {
    return {
      col: 1,
      row: rows,
      side: "corner",
    };
  }

  // -----------------------------------------
  // Bottom
  // -----------------------------------------
  //
  // X ช่อง
  //
  const bottomStart = bottomLeft + 1;
  const index = id - bottomStart;

  return {
    col: 2 + index,
    row: rows,
    side: "bottom",
  };
}
