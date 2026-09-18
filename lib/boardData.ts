import { GroupId, PropertyTileDef, TileDef } from "./types";

function round10(n: number) { return Math.round(n / 10) * 10; }
function round50(n: number) { return Math.round(n / 50) * 50; }

function prop(id: number, name: string, group: GroupId, price: number): PropertyTileDef {
  const rent = round10(price * 0.08);
  const rentHouse: [number, number, number, number] = [
    round10(price * 0.4),
    round10(price * 1.1),
    round10(price * 3.0),
    round10(price * 4.5),
  ];
  const rentHotel = round10(price * 5.5);
  const housePrice = round50(price * 0.5);
  return {
    id, type: "PROPERTY", name, group, price,
    housePrice, rent, rentHouse, rentHotel, canBuild: true,
  };
}

function utility(id: number, name: string, type: "ELECTRICITY" | "WATER"): PropertyTileDef {
  const price = 1500;
  return {
    id, type, name, group: "utility", price,
    housePrice: 0, rent: 200, rentHouse: [200, 200, 200, 200], rentHotel: 200, canBuild: false,
  };
}

// ลำดับตรงกับโปรโตไทป์ต้นฉบับ 40 ช่อง (0..39)
export const BOARD: TileDef[] = [
  { id: 0, type: "START", name: "เริ่มต้น" },
  prop(1, "คลองสาน", "brown", 800),
  prop(2, "ตลาดพลู", "brown", 900),
  { id: 3, type: "CHANCE", name: "ประตูดวง" },
  prop(4, "หัวลำโพง", "purple", 1000),
  prop(5, "สามย่าน", "purple", 1100),
  utility(6, "การไฟฟ้า", "ELECTRICITY"),
  prop(7, "เยาวราช", "lightblue", 1200),
  prop(8, "สำเพ็ง", "lightblue", 1300),
  prop(9, "บางรัก", "lightblue", 1400),
  { id: 10, type: "JAIL", name: "เยี่ยมคุก" },
  prop(11, "สยาม", "pink", 1600),
  prop(12, "ราชประสงค์", "pink", 1700),
  prop(13, "ชิดลม", "pink", 1800),
  { id: 14, type: "TAX", name: "ภาษี" },
  prop(15, "ทองหล่อ", "orange", 2000),
  prop(16, "เอกมัย", "orange", 2100),
  { id: 17, type: "TREASURE", name: "หีบสมบัติ" },
  prop(18, "พระโขนง", "orange", 2200),
  utility(19, "การประปา", "WATER"),
  { id: 20, type: "SPECIAL", name: "จุดพักผ่อน" },
  prop(21, "สีลม", "red", 2400),
  prop(22, "สาทร", "red", 2500),
  { id: 23, type: "CHANCE", name: "ประตูดวง" },
  prop(24, "บางนา", "red", 2600),
  prop(25, "อารีย์", "yellow", 2800),
  prop(26, "ลาดพร้าว", "yellow", 2900),
  { id: 27, type: "TREASURE", name: "หีบสมบัติ" },
  prop(28, "รัชดา", "yellow", 3000),
  prop(29, "เจริญกรุง", "green", 3200),
  { id: 30, type: "GO_TO_JAIL", name: "ไปเข้าคุก" },
  prop(31, "วงเวียนใหญ่", "green", 3300),
  prop(32, "ท่าพระ", "green", 3400),
  { id: 33, type: "CHANCE", name: "ประตูดวง" },
  prop(34, "สุขุมวิท", "darkblue", 3600),
  prop(35, "เพลินจิต", "darkblue", 3700),
  { id: 36, type: "TREASURE", name: "หีบสมบัติ" },
  prop(37, "เอกชัย", "darkblue", 3800),
  { id: 38, type: "TAX", name: "ภาษี" },
  prop(39, "อโศก", "darkblue", 4000),
];

export const TILE_COUNT = BOARD.length;

export const GROUP_COLOR_VAR: Record<GroupId, string> = {
  brown: "--group-brown", purple: "--group-purple", lightblue: "--group-lightblue",
  pink: "--group-pink", orange: "--group-orange", red: "--group-red",
  yellow: "--group-yellow", green: "--group-green", darkblue: "--group-darkblue",
  utility: "--ink-soft",
};

export const START_CASH = 15000;
export const SALARY = 2000;
export const JAIL_FINE = 500;
export const MORTGAGE_INTEREST = 100;
export const MAX_CONSECUTIVE_DOUBLES = 3;
// ข้อ 2: เอาการแจกโฉนดเริ่มต้นออกแล้ว — ทุกแปลงเริ่มเกมเป็นของธนาคารทั้งหมด (ไม่ใช้ค่านี้อีกต่อไป)
export const MAX_HOUSES = 4;

//ล็อคผล
// ข้อ 1-2: ค่าใช้จ่ายในการล็อคผลลูกเต๋าก่อนทอย ต่อ 1 ตัวเลือก (คู่/คี่ หรือ สูง/ต่ำ)
// ถ้าเลือกทั้งคู่พร้อมกัน (เช่น คู่+ต่ำ) จะเสีย DICE_LOCK_COST * 2
export const DICE_LOCK_COST = 500;

// เวลาสูงสุด (วินาที) ที่ผู้เล่น/บอทมีเพื่อตัดสินใจก่อนที่ระบบจะเลือก Action ปลอดภัยให้อัตโนมัติ
export const TURN_SECONDS = 60;
// ช่วงเวลาสุ่ม (มิลลิวินาที) ที่บอทจะ "คิด" ก่อนลงมือ ให้ดูเป็นธรรมชาติ ไม่เร็วจนแปลก
export const BOT_THINK_MIN_MS = 700;
export const BOT_THINK_MAX_MS = 1800;

export const AVATAR_COLORS = [
  "#D1685A", "#6FB8D9", "#7FB88A", "#E6C15A",
  "#9B7BC4", "#ED9E5B", "#E38FBB", "#4C6FA0",
];

export const TOKEN_ICONS = ["ม้า", "หมวก", "เรือ", "รถ", "สุนัข", "แมว", "รองเท้า", "นาฬิกา"];

// ไอคอน (อีโมจิ) ที่แสดงจริงบนกระดาน/ลอบบี้ แทนตัวอักษรของชื่อตัวเดิน
export const TOKEN_ICON_EMOJI: Record<string, string> = {
  "ม้า": "🐴",
  "หมวก": "🎩",
  "เรือ": "⛵",
  "รถ": "🚗",
  "สุนัข": "🐕",
  "แมว": "🐈",
  "รองเท้า": "👞",
  "นาฬิกา": "⌚",
};

export function tokenEmoji(icon: string): string {
  return TOKEN_ICON_EMOJI[icon] || "🎲";
}
