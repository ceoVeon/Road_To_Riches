// ค่าคงที่เกี่ยวกับจังหวะเวลาแอนิเมชัน
// รวมไว้ที่เดียวเพื่อให้ DiceTray (แอนิเมชันลูกเต๋า), Board (แอนิเมชันตัวเดิน)
// และ GameScreen (การหน่วงแสดง Modal ผลลัพธ์) ใช้ค่าเดียวกันเสมอ ไม่หลุดจังหวะกัน

export const DICE_TICK_MS = 150;
export const DICE_TICKS = 8;
// ระยะเวลารวมของแอนิเมชันลูกเต๋าสั่น ก่อนจะหยุดที่ค่าจริง
export const DICE_ROLL_MS = DICE_TICK_MS * DICE_TICKS;

// ระยะเวลาต่อ 1 ช่องของแอนิเมชันตัวเดินเดินบนกระดาน
export const TOKEN_STEP_MS = 400;

// เวลาสำรองเพิ่มเติมหลังแอนิเมชันจบ ก่อนเผย Modal ผลลัพธ์ (กันความรู้สึกกระชาก)
export const SETTLE_BUFFER_MS = 1000;
