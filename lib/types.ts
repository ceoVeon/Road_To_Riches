// ===================== ประเภทข้อมูลหลักของเกม =====================

export type TileType =
  | "START"
  | "PROPERTY"
  | "ELECTRICITY"
  | "WATER"
  | "TAX"
  | "CHANCE"
  | "TREASURE"
  | "JAIL"
  | "GO_TO_JAIL"
  | "SPECIAL";

export type GroupId =
  | "brown" | "purple" | "lightblue" | "pink"
  | "orange" | "red" | "yellow" | "green" | "darkblue"
  | "utility";

export interface BaseTileDef {
  id: number; // ตำแหน่งถาวรบนกระดาน 0..N-1 (ลำดับการเดิน)
  type: TileType;
  name: string;
}

export interface PropertyTileDef extends BaseTileDef {
  type: "PROPERTY" | "ELECTRICITY" | "WATER";
  group: GroupId;
  price: number;
  housePrice: number;
  rent: number; // ไม่มีบ้าน
  rentHouse: [number, number, number, number]; // บ้าน 1-4
  rentHotel: number;
  canBuild: boolean;
}

export type TileDef = BaseTileDef | PropertyTileDef;

export function isPropertyTile(t: TileDef): t is PropertyTileDef {
  return t.type === "PROPERTY" || t.type === "ELECTRICITY" || t.type === "WATER";
}

export interface PropertyState {
  ownerId: string | null;
  houses: number; // 0-4
  hotel: boolean;
  mortgaged: boolean;
}

export type PlayerStatus = "ACTIVE" | "IN_JAIL" | "BANKRUPT" | "WINNER";

export interface Player {
  id: string;
  name: string;
  tokenIcon: string; // อีโมจิ/ตัวอักษรตัวเดิน
  color: string; // hex
  cash: number;
  position: number;
  properties: number[]; // tileId ที่เป็นเจ้าของ
  inJail: boolean;
  jailTurns: number;
  consecutiveDoubles: number;
  jailFreeCards: number;
  status: PlayerStatus;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  connected: boolean;
  lastSeen: number;
  // จำนวนรอบที่เดินผ่านจุดเริ่มต้นมาแล้ว (ใช้เช็คกฎ "ต้องวนกระดานครบ 1 รอบก่อนจึงซื้อที่ดินได้")
  laps: number;
  // จำนวนบ้านที่สร้างไปแล้วในเทิร์นนี้ (จำกัดไว้ที่ 1 หลัง/เทิร์น) — รีเซ็ตทุกครั้งที่เริ่มเทิร์นใหม่
  housesBuiltThisTurn: number;
  // จำนวนบ้านที่สร้างไปแล้วในรอบวนปัจจุบัน (จำกัดไว้ที่ 3 หลัง/รอบ) — รีเซ็ตทุกครั้งที่เดินผ่านจุดเริ่มต้น
  housesBuiltThisLap: number;
}

export type GameStatus = "WAITING" | "STARTING" | "PLAYING" | "PAUSED" | "FINISHED";

export interface Card {
  id: string;
  deck: "CHANCE" | "TREASURE";
  title: string;
  description: string;
  action:
    | "ADD_MONEY"
    | "SUB_MONEY"
    | "GO_TO_JAIL"
    | "MOVE_TO"
    | "COLLECT_FROM_ALL"
    | "PAY_ALL"
    | "GET_OUT_OF_JAIL_FREE";
  value?: number;
  target?: number;
}

export interface LogEntry {
  id: string;
  turn: number;
  text: string;
  kind?: "info" | "money" | "warn" | "danger";
  ts: number;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  from: string;
  to: string;
  ts: number;
}

export type PendingKind =
  | { kind: "NONE" }
  | { kind: "BUY_DECISION"; tileId: number; playerId: string }
  | { kind: "AUCTION"; tileId: number; currentBid: number; leaderId: string | null; activeBidders: string[]; passedIds: string[] }
  | { kind: "CARD"; card: Card; playerId: string }
  | { kind: "JAIL_DECISION"; playerId: string }
  | { kind: "BANKRUPT"; playerId: string; creditor: string | null; amountOwed: number }
  | { kind: "GAME_OVER"; rankings: { playerId: string; netWorth: number }[] };

export interface DiceRoll {
  d1: number;
  d2: number;
  rolledAt: number;
  rollSeq: number;
}

// ล็อคผลลูกเต๋าก่อนทอย — เลือกได้ทั้งคู่/คี่ (parity) และ/หรือ สูง/ต่ำ (range) พร้อมกัน
// เสียเงินแยกกันครั้งละ DICE_LOCK_COST ต่อ 1 ตัวเลือกที่เปิดใช้ (เลือก 2 อย่างพร้อมกัน = จ่าย 2 เท่า)
// ใช้ได้ครั้งเดียวกับการทอยลูกเต๋าปกติ (rollDice) ครั้งถัดไปของ playerId คนนั้นเท่านั้น แล้วถูกล้างทิ้งทันที
export interface DiceLock {
  playerId: string;
  parity: "EVEN" | "ODD" | null;
  range: "LOW" | "HIGH" | null;
}

export interface GameState {
  roomId: string;
  roomCode: string;
  status: GameStatus;
  hostId: string;
  createdAt: number;
  currentPlayerId: string | null;
  turnOrder: string[];
  turnNumber: number;
  dice: DiceRoll | null;
  hasRolledThisTurn: boolean;
  canRollAgain: boolean;
  // เวลา (epoch ms) ที่ผู้เล่นปัจจุบัน/ผู้ที่ต้องตัดสินใจต้องดำเนินการให้เสร็จก่อน
  // ไม่เช่นนั้นระบบจะเลือก Action ปลอดภัยให้อัตโนมัติ (ข้อ 5 — ตัวจับเวลาต่อเทิร์น)
  turnDeadline: number | null;
  // การล็อคผลลูกเต๋าที่จ่ายเงินไว้แล้ว รอใช้กับการทอยครั้งถัดไป (null = ไม่มีใครล็อคไว้)
  diceLock: DiceLock | null;
  players: Record<string, Player>;
  properties: Record<number, PropertyState>;
  pending: PendingKind;
  chanceDeck: string[]; // ลำดับ id การ์ดที่เหลือ
  treasureDeck: string[];
  logs: LogEntry[];
  transactions: Transaction[];
}
