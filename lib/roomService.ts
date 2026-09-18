import { nanoid } from "nanoid";
import {
  ref, set, get, onValue, runTransaction, onDisconnect, off,
} from "firebase/database";
import { db } from "./firebase";
import { GameState, Player } from "./types";
import * as engine from "./gameEngine";
import { TURN_SECONDS } from "./boardData";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genRoomCode(): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  return s;
}

export function getOrCreateLocalPlayerId(roomId: string): string {
  if (typeof window === "undefined") return nanoid(10);
  const key = `sst_pid_${roomId}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = `p_${nanoid(10)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export function getSavedName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("sst_name") || "";
}
export function saveName(name: string) {
  if (typeof window !== "undefined") localStorage.setItem("sst_name", name);
}

function roomRef(roomId: string) { return ref(db, `rooms/${roomId}`); }
function codeIndexRef(code: string) { return ref(db, `roomCodes/${code}`); }

export async function createRoom(hostName: string): Promise<{ roomId: string; playerId: string }> {
  const roomId = nanoid(12);
  const playerId = getOrCreateLocalPlayerId(roomId);
  const host = engine.makePlayer(playerId, hostName, true);
  const code = genRoomCode();
  const state = engine.createInitialGameState(roomId, code, host);
  await set(roomRef(roomId), state);
  await set(codeIndexRef(code), roomId);
  saveName(hostName);
  return { roomId, playerId };
}

export async function findRoomByCode(code: string): Promise<string | null> {
  const snap = await get(codeIndexRef(code.toUpperCase().trim()));
  return snap.exists() ? (snap.val() as string) : null;
}

export async function joinRoom(roomId: string, name: string): Promise<string> {
  const playerId = getOrCreateLocalPlayerId(roomId);
  saveName(name);
  const snap = await get(roomRef(roomId));
  if (!snap.exists()) throw new Error("ไม่พบห้องนี้");
  const state = engine.normalizeState(snap.val() as GameState);
  if (state.players[playerId]) return playerId; // เข้าร่วมซ้ำ (reconnect)
  const player = engine.makePlayer(playerId, name, false);
  await dispatch(roomId, (s) => engine.addPlayer(s, player));
  return playerId;
}

export function subscribeRoom(roomId: string, cb: (state: GameState | null) => void) {
  const r = roomRef(roomId);
  onValue(r, (snap) => cb(snap.exists() ? engine.normalizeState(snap.val() as GameState) : null));
  return () => off(r);
}

export function attachPresence(roomId: string, playerId: string) {
  const connRef = ref(db, `rooms/${roomId}/players/${playerId}/connected`);
  const seenRef = ref(db, `rooms/${roomId}/players/${playerId}/lastSeen`);
  set(connRef, true);
  onDisconnect(connRef).set(false);
  onDisconnect(seenRef).set(Date.now());
}

// รันฟังก์ชันเกมภายใต้ Firebase transaction เพื่อลดปัญหา race condition
// (การ validate กติกาจริงยังทำในฝั่ง client ที่ dispatch แต่ transaction การันตีความเป็นอะตอมมิกของ state เดียวกัน)
async function dispatch(roomId: string, reducer: (s: GameState) => GameState): Promise<void> {
  let caughtError: Error | null = null;
  await runTransaction(roomRef(roomId), (current: GameState | null) => {
    if (!current) return current;
    try {
      const result = reducer(engine.normalizeState(current));
      // ต่ออายุ "นาฬิกาต่อเทิร์น" ทุกครั้งที่มี Action สำเร็จ ระหว่างเกมกำลังเล่นอยู่ (ข้อ 5)
      // ถ้าไม่มีใครทำอะไรก่อนหมดเวลา ตัวจับเวลาฝั่ง client จะเลือก Action ปลอดภัยให้อัตโนมัติ
      result.turnDeadline = result.status === "PLAYING" ? Date.now() + TURN_SECONDS * 1000 : null;
      return result;
    } catch (e) {
      caughtError = e as Error;
      return; // ยกเลิก transaction คงค่าเดิม
    }
  });
  if (caughtError) throw caughtError;
}

// ---------- Actions ที่ UI เรียกใช้ ----------
export const actions = {
  setChoice: (roomId: string, playerId: string, patch: Partial<Pick<Player, "name" | "color" | "tokenIcon" | "isReady">>) =>
    dispatch(roomId, (s) => engine.setPlayerChoice(s, playerId, patch)),
  addBot: (roomId: string) => dispatch(roomId, (s) => engine.addBot(s)),
  startGame: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.startGame(s, playerId)),
  rollDice: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.rollDice(s, playerId)),
  activateDiceLock: (roomId: string, playerId: string, parity: "EVEN" | "ODD" | null, range: "LOW" | "HIGH" | null) =>
    dispatch(roomId, (s) => engine.activateDiceLock(s, playerId, parity, range)),
  buyProperty: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.buyProperty(s, playerId)),
  declineProperty: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.declineProperty(s, playerId)),
  placeBid: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.placeBid(s, playerId)),
  foldAuction: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.foldAuction(s, playerId)),
  buildHouse: (roomId: string, playerId: string, tileId: number) => dispatch(roomId, (s) => engine.buildHouse(s, playerId, tileId)),
  buildHotel: (roomId: string, playerId: string, tileId: number) => dispatch(roomId, (s) => engine.buildHotel(s, playerId, tileId)),
  sellBuilding: (roomId: string, playerId: string, tileId: number) => dispatch(roomId, (s) => engine.sellBuilding(s, playerId, tileId)),
  mortgageProperty: (roomId: string, playerId: string, tileId: number) => dispatch(roomId, (s) => engine.mortgageProperty(s, playerId, tileId)),
  redeemProperty: (roomId: string, playerId: string, tileId: number) => dispatch(roomId, (s) => engine.redeemProperty(s, playerId, tileId)),
  acknowledgeCard: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.acknowledgeCard(s, playerId)),
  payJailFine: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.payJailFine(s, playerId)),
  useJailFreeCard: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.useJailFreeCard(s, playerId)),
  rollForJail: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.rollForJail(s, playerId)),
  declareBankrupt: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.declareBankrupt(s, playerId)),
  endTurn: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.endTurn(s, playerId)),
  // ปุ่ม "ออกจากเกม" — ผู้เล่นสละสิทธิ์เอง ถือว่าล้มละลายทันที ใช้ได้ทุกจังหวะของเกม
  leaveGame: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.leaveGame(s, playerId)),
  // ข้อ 5: กลับไปห้องรอของห้องเดิมหลังเกมจบ (ไม่ใช่หน้าแรก/หน้าสร้างห้อง)
  resetToLobby: (roomId: string, playerId: string) => dispatch(roomId, (s) => engine.resetToLobby(s, playerId)),
};

// เรียก Action ของจริงจากผลลัพธ์ของ engine.getAutoAction (ใช้ทั้งบอทและกรณีหมดเวลาเทิร์น)
export function dispatchAutoAction(roomId: string, playerId: string, action: engine.AutoAction): Promise<void> {
  switch (action.type) {
    case "ROLL": return actions.rollDice(roomId, playerId);
    case "PAY_JAIL_FINE": return actions.payJailFine(roomId, playerId);
    case "ROLL_FOR_JAIL": return actions.rollForJail(roomId, playerId);
    case "BUY": return actions.buyProperty(roomId, playerId);
    case "DECLINE": return actions.declineProperty(roomId, playerId);
    case "ACK_CARD": return actions.acknowledgeCard(roomId, playerId);
    case "PLACE_BID": return actions.placeBid(roomId, playerId);
    case "FOLD_AUCTION": return actions.foldAuction(roomId, playerId);
    case "DECLARE_BANKRUPT": return actions.declareBankrupt(roomId, playerId);
    case "SELL_BUILDING": return actions.sellBuilding(roomId, playerId, action.tileId);
    case "MORTGAGE": return actions.mortgageProperty(roomId, playerId, action.tileId);
    case "BUILD_HOUSE": return actions.buildHouse(roomId, playerId, action.tileId);
    case "END_TURN": return actions.endTurn(roomId, playerId);
    default: return Promise.resolve();
  }
}
