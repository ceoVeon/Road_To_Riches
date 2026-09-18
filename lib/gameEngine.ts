import {
  BOARD, TILE_COUNT, START_CASH, SALARY, JAIL_FINE, MORTGAGE_INTEREST,
  MAX_CONSECUTIVE_DOUBLES, MAX_HOUSES, AVATAR_COLORS, TOKEN_ICONS,
  DICE_LOCK_COST,
} from "./boardData";
import { CHANCE_CARDS, TREASURE_CARDS, ALL_CARDS } from "./cardData";
import {
  GameState, Player, PropertyState, PendingKind, LogEntry, Transaction,
  isPropertyTile, PropertyTileDef, Card,
} from "./types";

// ===================== Utility =====================

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
function nid(prefix = "id"): string { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type DiceParity = "EVEN" | "ODD" | null;
type DiceRange = "LOW" | "HIGH" | null;

// ข้อ 1-2: หาผลรวมลูกเต๋าที่เป็นไปได้ทั้งหมด ตามเงื่อนไขคู่/คี่ (parity) และ/หรือ สูง/ต่ำ (range)
// ไม่ล็อคอะไรเลย (null, null) จะได้ผลรวมทั้งหมด 2–12 (สุ่มเท่ากันทุกค่าตามที่ปรับไว้ก่อนหน้า)
function allowedDiceSums(parity: DiceParity, range: DiceRange): number[] {
  const all = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return all.filter((s) => {
    if (parity === "EVEN" && s % 2 !== 0) return false;
    if (parity === "ODD" && s % 2 === 0) return false;
    if (range === "LOW" && s > 7) return false;
    if (range === "HIGH" && s < 7) return false;
    return true;
  });
}

// สุ่มผลรวม "เท่า ๆ กัน" จากชุดผลรวมที่อนุญาต แล้วค่อยสุ่มว่าลูกเต๋า 2 ลูกหน้าไหนรวมกันได้ผลรวมนั้น
// (ดูคอมเมนต์เดิม: ตั้งใจให้ผลรวมมีโอกาสออกเท่ากันทุกค่า ไม่ใช่กระจายแบบสามเหลี่ยมแบบลูกเต๋าจริง)
function rollDicePair(sums: number[] = allowedDiceSums(null, null)): { d1: number; d2: number } {
  const sum = sums[Math.floor(Math.random() * sums.length)];
  const pairs: Array<[number, number]> = [];
  for (let a = 1; a <= 6; a++) {
    const b = sum - a;
    if (b >= 1 && b <= 6) pairs.push([a, b]);
  }
  const [d1, d2] = pairs[Math.floor(Math.random() * pairs.length)];
  return { d1, d2 };
}

function describeLock(parity: DiceParity, range: DiceRange): string {
  const parts: string[] = [];
  if (parity) parts.push(parity === "EVEN" ? "คู่" : "คี่");
  if (range) parts.push(range === "LOW" ? "ต่ำ" : "สูง");
  return parts.join("+") || "ไม่ล็อค";
}

function pushLog(state: GameState, text: string, kind: LogEntry["kind"] = "info") {
  if (!Array.isArray(state.logs)) state.logs = [];
  state.logs.push({ id: nid("log"), turn: state.turnNumber, text, kind, ts: Date.now() });
  if (state.logs.length > 200) state.logs = state.logs.slice(-200);
}

function pushTx(state: GameState, type: string, amount: number, from: string, to: string) {
  if (!Array.isArray(state.transactions)) state.transactions = [];
  state.transactions.push({ id: nid("tx"), type, amount, from, to, ts: Date.now() });
  if (state.transactions.length > 300) state.transactions = state.transactions.slice(-300);
}

// Firebase Realtime Database จะ "ตัดทิ้ง" ฟิลด์ที่เป็น array/object ว่างเปล่าโดยอัตโนมัติ
// เมื่ออ่านข้อมูลกลับมา ฟิลด์เหล่านั้นจะกลายเป็น undefined แทนที่จะเป็น []
// ฟังก์ชันนี้ซ่อม state ที่อ่านมาจาก Firebase ให้ฟิลด์ array กลับมาเป็น [] เสมอ
// ต้องเรียกใช้ทุกครั้งที่อ่าน state จาก Firebase (get/onValue/runTransaction)
export function normalizeState(state: GameState): GameState {
  if (!Array.isArray(state.turnOrder)) state.turnOrder = [];
  if (!Array.isArray(state.chanceDeck)) state.chanceDeck = [];
  if (!Array.isArray(state.treasureDeck)) state.treasureDeck = [];
  if (!Array.isArray(state.logs)) state.logs = [];
  if (!Array.isArray(state.transactions)) state.transactions = [];
  if (state.turnDeadline === undefined) state.turnDeadline = null;
  if (state.currentPlayerId === undefined) state.currentPlayerId = null;
  if (state.dice === undefined) state.dice = null;
  if (state.diceLock === undefined) state.diceLock = null;
  if (state.diceLock) {
    // เช่นเดียวกับ ownerId — Firebase ตัดฟิลด์ที่เป็น null ทิ้ง ต้องซ่อมกลับทุกครั้งที่อ่าน
    if (state.diceLock.parity === undefined) state.diceLock.parity = null;
    if (state.diceLock.range === undefined) state.diceLock.range = null;
  }
  if (state.players) {
    Object.values(state.players).forEach((p) => {
      if (!Array.isArray(p.properties)) p.properties = [];
      // ผู้เล่นเก่าจากก่อนอัปเดตกฎ (ข้อ 2, 3) อาจไม่มีฟิลด์เหล่านี้ ให้ตั้งค่าเริ่มต้นเป็น 0
      if (p.laps === undefined) p.laps = 0;
      if (p.housesBuiltThisTurn === undefined) p.housesBuiltThisTurn = 0;
      if (p.housesBuiltThisLap === undefined) p.housesBuiltThisLap = 0;
    });
  }
  // ---------------------------------------------------------------------
  // Firebase Realtime Database จะ "ตัดทิ้ง" ฟิลด์ใด ๆ ที่มีค่าเป็น null ทันทีตอนบันทึก
  // (ไม่ใช่แค่ array/object ว่าง) เช่น properties[i].ownerId: null ของที่ดินที่ยังไม่มีเจ้าของ
  // จะหายไปจากข้อมูลที่บันทึกจริง พอนี้ค่ากลับมาจะเป็น undefined แทนที่จะเป็น null
  // ทำให้เงื่อนไขแบบ `ownerId === null` ในโค้ดตรวจไม่เจอ เข้าใจผิดว่าที่ดินมีเจ้าของ (เป็น undefined)
  // แล้วพยายามอ่าน state.players[undefined].cash จนพัง — นี่คือสาเหตุของ
  // "Cannot read properties of undefined (reading 'cash')" ต้องซ่อมฟิลด์เหล่านี้กลับเป็น null เสมอ
  // ---------------------------------------------------------------------
  if (state.properties) {
    Object.values(state.properties).forEach((ps) => {
      if (ps.ownerId === undefined) ps.ownerId = null;
    });
  }
  if (state.pending) {
    const pend = state.pending as PendingKind & { leaderId?: string | null; creditor?: string | null; activeBidders?: string[]; passedIds?: string[] };
    if (pend.kind === "AUCTION") {
      if (!Array.isArray(pend.activeBidders)) pend.activeBidders = [];
      if (!Array.isArray(pend.passedIds)) pend.passedIds = [];
      if (pend.leaderId === undefined) pend.leaderId = null;
    }
    if (pend.kind === "BANKRUPT" && pend.creditor === undefined) pend.creditor = null;
  }
  return state;
}

function tileDef(id: number) { return BOARD[id]; }

export function propertyDef(id: number): PropertyTileDef | null {
  const t = tileDef(id);
  return t && isPropertyTile(t) ? t : null;
}

function groupTileIds(group: string): number[] {
  return BOARD.filter((t) => isPropertyTile(t) && t.group === group).map((t) => t.id);
}

function currentRent(state: GameState, tileId: number): number {
  const def = propertyDef(tileId)!;
  const p = state.properties[tileId];
  if (p.mortgaged) return 0;
  if (def.type !== "PROPERTY") return def.rent; // utility ราคาคงที่แบบง่าย
  if (p.hotel) return def.rentHotel;
  if (p.houses > 0) return def.rentHouse[p.houses - 1];
  // เจ้าของครบกลุ่ม (monopoly) แต่ยังไม่มีบ้าน -> ค่าเช่า x2
  const ids = groupTileIds(def.group);
  const ownsAll = ids.every((id) => state.properties[id].ownerId === p.ownerId);
  return ownsAll ? def.rent * 2 : def.rent;
}

function activePlayers(state: GameState): Player[] {
  return state.turnOrder.map((id) => state.players[id]).filter((p) => p && p.status !== "BANKRUPT");
}

function netWorth(state: GameState, playerId: string): number {
  const p = state.players[playerId];
  let total = p.cash;
  for (const tid of p.properties) {
    const def = propertyDef(tid)!;
    const ps = state.properties[tid];
    total += ps.mortgaged ? Math.floor(def.price / 2) : def.price;
    total += ps.houses * def.housePrice;
    if (ps.hotel) total += 4 * def.housePrice;
  }
  return total;
}

// ===================== Room / lifecycle =====================

export function createInitialGameState(roomId: string, roomCode: string, host: Player): GameState {
  const properties: Record<number, PropertyState> = {};
  BOARD.forEach((t) => {
    if (isPropertyTile(t)) properties[t.id] = { ownerId: null, houses: 0, hotel: false, mortgaged: false };
  });
  return {
    roomId, roomCode, status: "WAITING", hostId: host.id, createdAt: Date.now(),
    currentPlayerId: null, turnOrder: [], turnNumber: 0,
    dice: null, hasRolledThisTurn: false, canRollAgain: false, turnDeadline: null, diceLock: null,
    players: { [host.id]: host }, properties,
    pending: { kind: "NONE" },
    chanceDeck: shuffle(CHANCE_CARDS.map((c) => c.id)),
    treasureDeck: shuffle(TREASURE_CARDS.map((c) => c.id)),
    logs: [], transactions: [],
  };
}

export function makePlayer(id: string, name: string, isHost: boolean): Player {
  return {
    id, name, tokenIcon: TOKEN_ICONS[0], color: AVATAR_COLORS[0],
    cash: START_CASH, position: 0, properties: [], inJail: false, jailTurns: 0,
    consecutiveDoubles: 0, jailFreeCards: 0, status: "ACTIVE",
    isHost, isReady: isHost, isBot: false, connected: true, lastSeen: Date.now(),
    laps: 0, housesBuiltThisTurn: 0, housesBuiltThisLap: 0,
  };
}

export function addPlayer(state: GameState, player: Player): GameState {
  const s = clone(state);
  if (s.status !== "WAITING") throw new Error("เกมเริ่มไปแล้ว ไม่สามารถเข้าร่วมได้");
  if (Object.keys(s.players).length >= 6) throw new Error("ห้องเต็มแล้ว (สูงสุด 6 คน)");
  const usedColors = new Set(Object.values(s.players).map((p) => p.color));
  const usedIcons = new Set(Object.values(s.players).map((p) => p.tokenIcon));
  player.color = AVATAR_COLORS.find((c) => !usedColors.has(c)) || player.color;
  player.tokenIcon = TOKEN_ICONS.find((i) => !usedIcons.has(i)) || player.tokenIcon;
  s.players[player.id] = player;
  pushLog(s, `${player.name} เข้าร่วมห้อง`);
  return s;
}

export function setPlayerChoice(state: GameState, playerId: string, patch: Partial<Pick<Player, "name" | "color" | "tokenIcon" | "isReady">>): GameState {
  const s = clone(state);
  const p = s.players[playerId];
  if (!p) return s;
  if (patch.color && Object.values(s.players).some((o) => o.id !== playerId && o.color === patch.color)) {
    throw new Error("สีนี้ถูกเลือกแล้ว");
  }
  if (patch.tokenIcon && Object.values(s.players).some((o) => o.id !== playerId && o.tokenIcon === patch.tokenIcon)) {
    throw new Error("ตัวเดินนี้ถูกเลือกแล้ว");
  }
  Object.assign(p, patch);
  return s;
}

export function addBot(state: GameState): GameState {
  const s = clone(state);
  if (Object.keys(s.players).length >= 6) return s;
  const id = nid("bot");
  const bot = makePlayer(id, `บอท ${Object.keys(s.players).length + 1}`, false);
  bot.isBot = true; bot.isReady = true;
  return addPlayer(s, bot);
}

export function startGame(state: GameState, requesterId: string): GameState {
  const s = clone(state);
  if (s.hostId !== requesterId) throw new Error("เฉพาะเจ้าของห้องเท่านั้นที่เริ่มเกมได้");
  const players = Object.values(s.players);
  if (players.length < 2) throw new Error("ต้องมีผู้เล่นอย่างน้อย 2 คน");
  if (!players.every((p) => p.isReady)) throw new Error("ผู้เล่นบางคนยังไม่พร้อม");

  // ลำดับผู้เล่น: ทอยลูกเต๋าเสมือน (สุ่มถ่วงน้ำหนักด้วยแต้ม 2-12) แล้วเรียงจากมากไปน้อย
  const order = players
    .map((p) => ({ id: p.id, score: (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1) + Math.random() }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.id);

  s.turnOrder = order;
  s.currentPlayerId = order[0];
  s.status = "PLAYING";
  s.turnNumber = 1;
  s.hasRolledThisTurn = false;
  s.canRollAgain = false;

  // ข้อ 2: ไม่แจกโฉนดที่ดินให้ใครล่วงหน้าอีกต่อไป — ทุกแปลงเริ่มต้นเป็นของธนาคารทั้งหมด
  // ผู้เล่นต้องเดินไปเหยียบเองแล้วเลือกซื้อ/ประมูลตามกติกาปกติ (s.properties ถูกตั้งค่า
  // ownerId: null ไว้แล้วตั้งแต่ตอนสร้างห้อง จึงไม่ต้องทำอะไรเพิ่มตรงนี้)
  pushLog(s, `เริ่มเกม — ลำดับผู้เล่น: ${order.map((id) => s.players[id].name).join(" → ")}`);
  return s;
}

// ข้อ 5: จบเกมแล้วให้กลับไป "ห้องรอ" ของห้องเดิม ไม่ใช่หน้าแรก/หน้าสร้างห้อง
// รีเซ็ตสถานะการเล่นทั้งหมดกลับไปเหมือนก่อนเริ่มเกม แต่ยังคงรายชื่อผู้เล่น/ห้องเดิมไว้
// ให้ผู้เล่นกดพร้อม แล้วเริ่มเกมใหม่ได้ทันทีโดยไม่ต้องออกจากห้อง
export function resetToLobby(state: GameState, requesterId: string): GameState {
  const s = clone(state);
  if (s.hostId !== requesterId) throw new Error("เฉพาะเจ้าของห้องเท่านั้นที่เริ่มเกมใหม่ได้");
  if (s.status !== "FINISHED") throw new Error("เกมยังไม่จบ");

  const properties: Record<number, PropertyState> = {};
  BOARD.forEach((t) => {
    if (isPropertyTile(t)) properties[t.id] = { ownerId: null, houses: 0, hotel: false, mortgaged: false };
  });
  s.properties = properties;

  Object.values(s.players).forEach((p) => {
    p.cash = START_CASH;
    p.position = 0;
    p.properties = [];
    p.inJail = false;
    p.jailTurns = 0;
    p.consecutiveDoubles = 0;
    p.jailFreeCards = 0;
    p.status = "ACTIVE";
    p.laps = 0;
    p.housesBuiltThisTurn = 0;
    p.housesBuiltThisLap = 0;
    p.isReady = p.isHost || p.isBot; // หัวห้อง/บอทพร้อมอัตโนมัติ ผู้เล่นจริงคนอื่นต้องกดพร้อมใหม่
  });

  s.status = "WAITING";
  s.currentPlayerId = null;
  s.turnOrder = [];
  s.turnNumber = 0;
  s.dice = null;
  s.diceLock = null;
  s.hasRolledThisTurn = false;
  s.canRollAgain = false;
  s.turnDeadline = null;
  s.pending = { kind: "NONE" };
  s.chanceDeck = shuffle(CHANCE_CARDS.map((c) => c.id));
  s.treasureDeck = shuffle(TREASURE_CARDS.map((c) => c.id));
  s.logs = [];
  s.transactions = [];
  pushLog(s, "กลับสู่ห้องรอ — พร้อมเริ่มเกมใหม่ได้เลย");
  return s;
}

// ===================== Turn / dice =====================

function requireCurrentPlayer(state: GameState, playerId: string) {
  if (state.status !== "PLAYING") throw new Error("เกมยังไม่เริ่ม");
  if (state.currentPlayerId !== playerId) throw new Error("ยังไม่ถึงตาของท่าน");
  if (state.pending.kind !== "NONE") throw new Error("มีเหตุการณ์ค้างอยู่ที่ต้องจัดการก่อน");
}

// ข้อ 1: จัดการทรัพย์สิน (สร้าง/ขายบ้าน-โรงแรม, จำนอง/ไถ่ถอน) ได้เฉพาะในเทิร์นของตัวเองเท่านั้น
function requireOwnTurn(state: GameState, playerId: string) {
  if (state.status !== "PLAYING") throw new Error("เกมยังไม่เริ่ม");
  if (state.currentPlayerId !== playerId) throw new Error("จัดการทรัพย์สินได้เฉพาะในเทิร์นของตัวเองเท่านั้น");
}

// ===================== ล็อคผลลูกเต๋าก่อนทอย (ข้อ 1, 2) =====================
// เลือกล็อคได้ 2 แกนอิสระ: คู่/คี่ (parity) และ สูง/ต่ำ (range) — เลือกอย่างใดอย่างหนึ่ง
// หรือทั้งสองพร้อมกันก็ได้ (เช่น คู่+ต่ำ = ออกเฉพาะ 2,4,6) เสียเงินทันทีที่กดใช้ ครั้งละ
// DICE_LOCK_COST ต่อ 1 ตัวเลือกที่เปิด (เลือก 2 อย่าง = 2 เท่า) มีผลกับการทอย "ครั้งถัดไป"
// ครั้งเดียวเท่านั้น (การกดทอยปกติ ไม่ใช่การทอยออกจากคุก) แล้วถูกล้างทิ้งทันทีไม่ว่าผลจะเป็นอย่างไร

export function activateDiceLock(
  state: GameState,
  playerId: string,
  parity: DiceParity,
  range: DiceRange,
): GameState {
  const s = clone(state);
  requireCurrentPlayer(s, playerId);
  const player = s.players[playerId];
  if (player.inJail) throw new Error("อยู่ในคุก ต้องทอยเพื่อออกจากคุกก่อน จึงจะล็อคผลลูกเต๋าได้");
  if (s.hasRolledThisTurn && !s.canRollAgain) throw new Error("ทอยลูกเต๋าไปแล้วในตานี้ ล็อคไม่ทันแล้ว");
  if (s.diceLock) throw new Error("ล็อคผลลูกเต๋าไว้แล้ว กรุณาทอยลูกเต๋าก่อน");
  if (!parity && !range) throw new Error("ต้องเลือกอย่างน้อยหนึ่งตัวเลือก (คู่/คี่ หรือ สูง/ต่ำ)");
  const cost = (parity ? DICE_LOCK_COST : 0) + (range ? DICE_LOCK_COST : 0);
  if (player.cash < cost) throw new Error(`เงินไม่พอใช้ความสามารถนี้ (ต้องมีอย่างน้อย ${cost.toLocaleString()} บาท)`);
  player.cash -= cost;
  s.diceLock = { playerId, parity, range };
  pushTx(s, "DICE_LOCK", cost, playerId, "BANK");
  pushLog(s, `${player.name} จ่าย ${cost.toLocaleString()} บาท ล็อคผลลูกเต๋ารอบถัดไปเป็น "${describeLock(parity, range)}"`, "money");
  return s;
}

export function rollDice(state: GameState, playerId: string): GameState {
  const s = clone(state);
  requireCurrentPlayer(s, playerId);
  const player = s.players[playerId];

  if (player.inJail) {
    throw new Error("อยู่ในคุก โปรดจ่ายค่าปรับหรือทอยเพื่อออกจากคุกก่อน");
  }
  if (s.hasRolledThisTurn && !s.canRollAgain) {
    throw new Error("ทอยลูกเต๋าไปแล้วในตานี้");
  }

  const lock = s.diceLock && s.diceLock.playerId === playerId ? s.diceLock : null;
  const { d1, d2 } = rollDicePair(lock ? allowedDiceSums(lock.parity, lock.range) : undefined);
  if (lock) {
    pushLog(s, `${player.name} ใช้สิทธิ์ล็อค "${describeLock(lock.parity, lock.range)}" ที่จ่ายไว้`, "money");
    s.diceLock = null; // ใช้ได้ครั้งเดียว ไม่ว่าผลลูกเต๋าจะเป็นอย่างไร
  }
  const isDouble = d1 === d2;
  s.dice = { d1, d2, rolledAt: Date.now(), rollSeq: (s.dice?.rollSeq ?? 0) + 1 };
  s.hasRolledThisTurn = true;
  s.canRollAgain = false;

  if (isDouble) {
    player.consecutiveDoubles += 1;
    pushLog(s, `${player.name} ทอยได้ ${d1},${d2} — Double ครั้งที่ ${player.consecutiveDoubles}`);
    if (player.consecutiveDoubles >= MAX_CONSECUTIVE_DOUBLES) {
      pushLog(s, `${player.name} ทอย Double ติดต่อกัน 3 ครั้ง — เข้าคุกทันที!`, "danger");
      sendToJail(s, playerId);
      return s;
    }
  } else {
    player.consecutiveDoubles = 0;
    pushLog(s, `${player.name} ทอยได้ ${d1} และ ${d2} รวม ${d1 + d2} แต้ม`);
  }

  movePlayer(s, playerId, d1 + d2);
  if (isDouble && s.pending.kind === "NONE" && !player.inJail) {
    s.canRollAgain = true;
  }
  return s;
}

function movePlayer(state: GameState, playerId: string, steps: number) {
  const player = state.players[playerId];
  const old = player.position;
  const next = (old + steps) % TILE_COUNT;
  if (next < old) {
    player.cash += SALARY;
    pushTx(state, "SALARY", SALARY, "BANK", playerId);
    pushLog(state, `${player.name} เดินผ่านจุดเริ่มต้น ได้รับเงินเดือน ${SALARY.toLocaleString()} บาท`, "money");
    // เดินครบ 1 รอบกระดานแล้ว — ปลดล็อกสิทธิ์ซื้อที่ดิน (ข้อ 2) และรีเซ็ตโควตาสร้างบ้านต่อรอบ (ข้อ 3)
    player.laps += 1;
    player.housesBuiltThisLap = 0;
    if (player.laps === 1) {
      pushLog(state, `${player.name} เดินครบ 1 รอบแล้ว — เริ่มซื้อที่ดินได้`, "info");
    }
  }
  player.position = next;
  pushLog(state, `${player.name} เดินมาที่ "${tileDef(next).name}"`);
  landOnTile(state, playerId, next);
}

function landOnTile(state: GameState, playerId: string, tileId: number) {
  const tile = tileDef(tileId);
  const player = state.players[playerId];

  if (isPropertyTile(tile)) {
    const ps = state.properties[tileId];
    if (!ps.ownerId) {
      // ข้อ 2: ต้องเดินให้ครบ 1 รอบกระดานก่อนจึงจะมีสิทธิ์ซื้อที่ดินได้
      if (player.laps >= 1) {
        state.pending = { kind: "BUY_DECISION", tileId, playerId };
      } else {
        pushLog(state, `${player.name} ยังเดินไม่ครบ 1 รอบ — ยังซื้อที่ดินแปลงนี้ไม่ได้`, "info");
      }
    } else if (ps.ownerId !== playerId) {
      payRent(state, playerId, tileId);
    }
    return;
  }
  switch (tile.type) {
    case "TAX": {
      const amount = 300;
      player.cash -= amount;
      pushTx(state, "TAX", amount, playerId, "BANK");
      pushLog(state, `${player.name} เสียภาษี ${amount.toLocaleString()} บาท`, "warn");
      handleBankruptCheck(state, playerId, "BANK");
      break;
    }
    case "CHANCE":
      drawCard(state, playerId, "CHANCE");
      break;
    case "TREASURE":
      drawCard(state, playerId, "TREASURE");
      break;
    case "GO_TO_JAIL":
      sendToJail(state, playerId);
      break;
    case "JAIL":
    case "SPECIAL":
    case "START":
    default:
      break; // แวะพัก ไม่มีเหตุการณ์
  }
}

function payRent(state: GameState, payerId: string, tileId: number) {
  const ps = state.properties[tileId];
  if (ps.mortgaged || !ps.ownerId) return;
  const owner = state.players[ps.ownerId];
  const payer = state.players[payerId];
  const rent = currentRent(state, tileId);
  if (rent <= 0) return;
  payer.cash -= rent;
  owner.cash += rent;
  pushTx(state, "RENT_PAYMENT", rent, payerId, ps.ownerId);
  pushLog(state, `${payer.name} จ่ายค่าเช่า ${rent.toLocaleString()} บาทให้ ${owner.name} (${tileDef(tileId).name})`, "money");
  handleBankruptCheck(state, payerId, ps.ownerId);
}

// ===================== ซื้อ / ประมูลที่ดิน =====================

export function buyProperty(state: GameState, playerId: string): GameState {
  const s = clone(state);
  if (s.pending.kind !== "BUY_DECISION" || s.pending.playerId !== playerId) throw new Error("ไม่มีที่ดินให้ซื้อในขณะนี้");
  const { tileId } = s.pending;
  const def = propertyDef(tileId)!;
  const player = s.players[playerId];
  if (player.laps < 1) throw new Error("ต้องเดินให้ครบ 1 รอบกระดานก่อนจึงจะซื้อที่ดินได้"); // ข้อ 2
  if (player.cash < def.price) throw new Error("เงินไม่พอซื้อที่ดินนี้");
  player.cash -= def.price;
  s.properties[tileId].ownerId = playerId;
  player.properties.push(tileId);
  pushTx(s, "PROPERTY_PURCHASE", def.price, playerId, "BANK");
  pushLog(s, `${player.name} ซื้อที่ดิน "${def.name}" ราคา ${def.price.toLocaleString()} บาท`, "money");
  s.pending = { kind: "NONE" };
  return s;
}

export function declineProperty(state: GameState, playerId: string): GameState {
  const s = clone(state);
  if (s.pending.kind !== "BUY_DECISION" || s.pending.playerId !== playerId) throw new Error("ไม่มีที่ดินให้ตัดสินใจในขณะนี้");
  const { tileId } = s.pending;
  pushLog(s, `${s.players[playerId].name} ไม่ซื้อที่ดิน "${tileDef(tileId).name}" — เปิดประมูล`, "warn");
  const bidders = activePlayers(s).map((p) => p.id);
  s.pending = { kind: "AUCTION", tileId, currentBid: 0, leaderId: null, activeBidders: bidders, passedIds: [] };
  return s;
}

const AUCTION_STEP = 100;

export function placeBid(state: GameState, playerId: string): GameState {
  const s = clone(state);
  if (s.pending.kind !== "AUCTION") throw new Error("ไม่มีการประมูลอยู่ในขณะนี้");
  const p = s.pending;
  if (!p.activeBidders.includes(playerId)) throw new Error("ท่านไม่ได้อยู่ในการประมูลนี้แล้ว");
  const next = p.currentBid + AUCTION_STEP;
  if (s.players[playerId].cash < next) throw new Error("เงินไม่พอเสนอราคานี้");
  p.currentBid = next;
  p.leaderId = playerId;
  pushLog(s, `${s.players[playerId].name} เสนอราคา ${next.toLocaleString()} บาท`);
  resolveAuctionIfDone(s);
  return s;
}

export function foldAuction(state: GameState, playerId: string): GameState {
  const s = clone(state);
  if (s.pending.kind !== "AUCTION") throw new Error("ไม่มีการประมูลอยู่ในขณะนี้");
  const p = s.pending;
  if (!p.activeBidders.includes(playerId)) return s;
  p.activeBidders = p.activeBidders.filter((id) => id !== playerId);
  p.passedIds.push(playerId);
  pushLog(s, `${s.players[playerId].name} ถอนตัวจากการประมูล`);
  resolveAuctionIfDone(s);
  return s;
}

// ข้อ 4: การประมูลจะปิด Modal / จบลงก็ต่อเมื่อผู้เล่นทุกคนที่เข้าร่วมกดถอนตัวครบทุกคน
// (activeBidders ว่างเปล่า) เท่านั้น — ไม่ใช่ auto-จบทันทีที่เหลือผู้นำราคาแค่คนเดียวเหมือนเดิม
// ผู้นำราคา (leaderId) จึงยังคงต้องกดถอนตัวด้วยตนเองเพื่อ "ยืนยัน" ว่าจะไม่เสนอราคาเพิ่มแล้ว
// การถอนตัวของผู้นำราคาไม่ได้แปลว่ายกเลิกราคาที่ตนเสนอไปแล้ว (leaderId/currentBid ยังคงอยู่
// ไม่ถูกล้าง) เป็นเพียงการหยุดร่วมเสนอราคาเพิ่มเท่านั้น ถ้าไม่มีใครมาประมูลสูงกว่าอีกจนครบ
// ทุกคนถอนตัว ผู้นำราคาคนล่าสุดก็ยังชนะการประมูลไปตามปกติ
function resolveAuctionIfDone(state: GameState) {
  if (state.pending.kind !== "AUCTION") return;
  const p = state.pending;
  if (p.activeBidders.length > 0) return; // ยังมีคนไม่ได้กดถอนตัว รอต่อไป
  if (p.leaderId) {
    const def = propertyDef(p.tileId)!;
    const winner = state.players[p.leaderId];
    winner.cash -= p.currentBid;
    state.properties[p.tileId].ownerId = p.leaderId;
    winner.properties.push(p.tileId);
    pushTx(state, "AUCTION", p.currentBid, p.leaderId, "BANK");
    pushLog(state, `${winner.name} ชนะประมูล "${def.name}" ที่ราคา ${p.currentBid.toLocaleString()} บาท`, "money");
  } else {
    pushLog(state, `ไม่มีผู้เสนอราคา — ที่ดินยังคงเป็นของธนาคาร`);
  }
  state.pending = { kind: "NONE" };
}

// ===================== บ้าน / โรงแรม / จำนอง =====================

export function buildHouse(state: GameState, playerId: string, tileId: number): GameState {
  const s = clone(state);
  requireOwnTurn(s, playerId); // ข้อ 1
  const def = propertyDef(tileId);
  if (!def || !def.canBuild) throw new Error("สร้างสิ่งปลูกสร้างที่นี่ไม่ได้");
  const ps = s.properties[tileId];
  if (ps.ownerId !== playerId) throw new Error("ไม่ใช่เจ้าของที่ดินนี้");
  if (ps.mortgaged) throw new Error("ที่ดินติดจำนองอยู่");
  // หมายเหตุ: ตามข้อกำหนดล่าสุด ไม่บังคับต้องเป็นเจ้าของที่ดินครบกลุ่มสีก่อนจึงจะสร้างบ้านได้
  // (ตัดเงื่อนไข ownsAll ออก เพื่อให้ผู้เล่นสร้างบ้านบนที่ดินแปลงใดก็ได้ที่ตนเป็นเจ้าของ)
  const player = s.players[playerId];
  if (ps.hotel) throw new Error("ที่ดินนี้มีโรงแรมแล้ว");
  if (ps.houses >= MAX_HOUSES) throw new Error("มีบ้านครบ 4 หลังแล้ว ให้สร้างโรงแรมแทน");
  // ข้อ 3: จำกัดสร้างบ้านได้เทิร์นละ 1 หลัง และรวมไม่เกิน 3 หลังต่อการวนกระดาน 1 รอบ
  if (player.housesBuiltThisTurn >= 1) throw new Error("สร้างบ้านได้เทิร์นละ 1 หลังเท่านั้น");
  if (player.housesBuiltThisLap >= 3) throw new Error("สร้างบ้านได้ไม่เกิน 3 หลังต่อการวนกระดาน 1 รอบ ต้องรอรอบถัดไป");
  if (player.cash < def.housePrice) throw new Error("เงินไม่พอซื้อบ้าน");
  player.cash -= def.housePrice;
  ps.houses += 1;
  player.housesBuiltThisTurn += 1;
  player.housesBuiltThisLap += 1;
  pushTx(s, "HOUSE_PURCHASE", def.housePrice, playerId, "BANK");
  pushLog(s, `${player.name} สร้างบ้านที่ "${def.name}" (${ps.houses}/4)`, "money");
  return s;
}

export function buildHotel(state: GameState, playerId: string, tileId: number): GameState {
  const s = clone(state);
  requireOwnTurn(s, playerId); // ข้อ 1
  const def = propertyDef(tileId);
  if (!def || !def.canBuild) throw new Error("สร้างสิ่งปลูกสร้างที่นี่ไม่ได้");
  const ps = s.properties[tileId];
  if (ps.ownerId !== playerId) throw new Error("ไม่ใช่เจ้าของที่ดินนี้");
  if (ps.houses < MAX_HOUSES) throw new Error("ต้องมีบ้านครบ 4 หลังก่อน");
  const player = s.players[playerId];
  if (player.cash < def.housePrice) throw new Error("เงินไม่พอซื้อโรงแรม");
  player.cash -= def.housePrice;
  ps.houses = 0;
  ps.hotel = true;
  pushTx(s, "HOTEL_PURCHASE", def.housePrice, playerId, "BANK");
  pushLog(s, `${player.name} สร้างโรงแรมที่ "${def.name}"`, "money");
  return s;
}

export function sellBuilding(state: GameState, playerId: string, tileId: number): GameState {
  const s = clone(state);
  requireOwnTurn(s, playerId); // ข้อ 1
  const def = propertyDef(tileId);
  if (!def) throw new Error("ไม่พบที่ดิน");
  const ps = s.properties[tileId];
  if (ps.ownerId !== playerId) throw new Error("ไม่ใช่เจ้าของที่ดินนี้");
  const player = s.players[playerId];
  if (ps.hotel) {
    ps.hotel = false;
    ps.houses = MAX_HOUSES - 1;
    const refund = Math.floor(def.housePrice / 2);
    player.cash += refund;
    pushLog(s, `${player.name} ขายโรงแรมที่ "${def.name}" ได้ ${refund.toLocaleString()} บาท`, "money");
  } else if (ps.houses > 0) {
    ps.houses -= 1;
    const refund = Math.floor(def.housePrice / 2);
    player.cash += refund;
    pushLog(s, `${player.name} ขายบ้านที่ "${def.name}" ได้ ${refund.toLocaleString()} บาท`, "money");
  } else {
    throw new Error("ไม่มีบ้านหรือโรงแรมให้ขาย");
  }
  clearBankruptIfSolvent(s, playerId);
  return s;
}

export function mortgageProperty(state: GameState, playerId: string, tileId: number): GameState {
  const s = clone(state);
  requireOwnTurn(s, playerId); // ข้อ 1
  const def = propertyDef(tileId);
  if (!def) throw new Error("ไม่พบที่ดิน");
  const ps = s.properties[tileId];
  if (ps.ownerId !== playerId) throw new Error("ไม่ใช่เจ้าของที่ดินนี้");
  if (ps.houses > 0 || ps.hotel) throw new Error("ต้องขายบ้าน/โรงแรมออกก่อนจึงจะจำนองได้");
  if (ps.mortgaged) throw new Error("ที่ดินนี้จำนองอยู่แล้ว");
  const amount = Math.floor(def.price / 2);
  ps.mortgaged = true;
  s.players[playerId].cash += amount;
  pushTx(s, "MORTGAGE", amount, "BANK", playerId);
  pushLog(s, `${s.players[playerId].name} จำนองที่ดิน "${def.name}" ได้รับเงิน ${amount.toLocaleString()} บาท`, "money");
  clearBankruptIfSolvent(s, playerId);
  return s;
}

export function redeemProperty(state: GameState, playerId: string, tileId: number): GameState {
  const s = clone(state);
  requireOwnTurn(s, playerId); // ข้อ 1
  const def = propertyDef(tileId);
  if (!def) throw new Error("ไม่พบที่ดิน");
  const ps = s.properties[tileId];
  if (ps.ownerId !== playerId) throw new Error("ไม่ใช่เจ้าของที่ดินนี้");
  if (!ps.mortgaged) throw new Error("ที่ดินนี้ไม่ได้ติดจำนอง");
  const amount = Math.floor(def.price / 2) + MORTGAGE_INTEREST;
  const player = s.players[playerId];
  if (player.cash < amount) throw new Error("เงินไม่พอไถ่ถอน");
  player.cash -= amount;
  ps.mortgaged = false;
  pushTx(s, "MORTGAGE_REPAY", amount, playerId, "BANK");
  pushLog(s, `${player.name} ไถ่ถอนที่ดิน "${def.name}" เสีย ${amount.toLocaleString()} บาท`, "money");
  return s;
}

// ===================== การ์ด =====================

function drawCard(state: GameState, playerId: string, deck: "CHANCE" | "TREASURE") {
  const deckKey = deck === "CHANCE" ? "chanceDeck" : "treasureDeck";
  if (state[deckKey].length === 0) {
    state[deckKey] = shuffle((deck === "CHANCE" ? CHANCE_CARDS : TREASURE_CARDS).map((c) => c.id));
  }
  const cardId = state[deckKey].shift()!;
  state[deckKey].push(cardId);
  const card = ALL_CARDS[cardId];
  state.pending = { kind: "CARD", card, playerId };
}

export function acknowledgeCard(state: GameState, playerId: string): GameState {
  const s = clone(state);
  if (s.pending.kind !== "CARD" || s.pending.playerId !== playerId) throw new Error("ไม่มีการ์ดค้างอยู่");
  const { card } = s.pending;
  const player = s.players[playerId];
  s.pending = { kind: "NONE" };

  switch (card.action) {
    case "ADD_MONEY":
      player.cash += card.value || 0;
      pushTx(s, "CARD_REWARD", card.value || 0, "BANK", playerId);
      pushLog(s, `${player.name} ได้รับ ${(card.value || 0).toLocaleString()} บาทจากการ์ด "${card.title}"`, "money");
      break;
    case "SUB_MONEY":
      player.cash -= card.value || 0;
      pushTx(s, "CARD_PENALTY", card.value || 0, playerId, "BANK");
      pushLog(s, `${player.name} เสีย ${(card.value || 0).toLocaleString()} บาทจากการ์ด "${card.title}"`, "warn");
      handleBankruptCheck(s, playerId, "BANK");
      break;
    case "COLLECT_FROM_ALL":
      for (const other of activePlayers(s)) {
        if (other.id === playerId) continue;
        other.cash -= card.value || 0;
        player.cash += card.value || 0;
        pushTx(s, "CARD_REWARD", card.value || 0, other.id, playerId);
      }
      pushLog(s, `${player.name} ได้รับเงินจากผู้เล่นทุกคน คนละ ${(card.value || 0).toLocaleString()} บาท`, "money");
      break;
    case "PAY_ALL":
      for (const other of activePlayers(s)) {
        if (other.id === playerId) continue;
        player.cash -= card.value || 0;
        other.cash += card.value || 0;
        pushTx(s, "CARD_PENALTY", card.value || 0, playerId, other.id);
      }
      pushLog(s, `${player.name} จ่ายเงินให้ผู้เล่นทุกคน คนละ ${(card.value || 0).toLocaleString()} บาท`, "warn");
      break;
    case "GET_OUT_OF_JAIL_FREE":
      player.jailFreeCards += 1;
      pushLog(s, `${player.name} ได้รับบัตรออกจากคุกฟรี`);
      break;
    case "GO_TO_JAIL":
      sendToJail(s, playerId);
      break;
    case "MOVE_TO":
      if (card.target !== undefined) {
        player.position = card.target;
        pushLog(s, `${player.name} ถูกย้ายไปที่ "${tileDef(card.target).name}"`);
        landOnTile(s, playerId, card.target);
      }
      break;
  }
  return s;
}

// ===================== คุก =====================

function sendToJail(state: GameState, playerId: string) {
  const player = state.players[playerId];
  player.position = 10;
  player.inJail = true;
  player.jailTurns = 0;
  player.consecutiveDoubles = 0;
  state.canRollAgain = false;
  pushLog(state, `${player.name} ถูกส่งเข้าคุก`, "danger");
}

export function payJailFine(state: GameState, playerId: string): GameState {
  const s = clone(state);
  requireCurrentPlayer(s, playerId);
  const player = s.players[playerId];
  if (!player.inJail) throw new Error("ไม่ได้อยู่ในคุก");
  if (player.cash < JAIL_FINE) throw new Error("เงินไม่พอจ่ายค่าปรับ");
  player.cash -= JAIL_FINE;
  player.inJail = false;
  player.jailTurns = 0;
  pushTx(s, "JAIL_FINE", JAIL_FINE, playerId, "BANK");
  pushLog(s, `${player.name} จ่ายค่าปรับ ${JAIL_FINE} บาทเพื่อออกจากคุก`, "money");
  return s;
}

export function useJailFreeCard(state: GameState, playerId: string): GameState {
  const s = clone(state);
  requireCurrentPlayer(s, playerId);
  const player = s.players[playerId];
  if (!player.inJail) throw new Error("ไม่ได้อยู่ในคุก");
  if (player.jailFreeCards <= 0) throw new Error("ไม่มีบัตรออกจากคุกฟรี");
  player.jailFreeCards -= 1;
  player.inJail = false;
  player.jailTurns = 0;
  pushLog(s, `${player.name} ใช้บัตรออกจากคุกฟรี`);
  return s;
}

export function rollForJail(state: GameState, playerId: string): GameState {
  const s = clone(state);
  requireCurrentPlayer(s, playerId);
  const player = s.players[playerId];
  if (!player.inJail) throw new Error("ไม่ได้อยู่ในคุก");
  const { d1, d2 } = rollDicePair();
  s.dice = { d1, d2, rolledAt: Date.now(), rollSeq: (s.dice?.rollSeq ?? 0) + 1 };
  if (d1 === d2) {
    player.inJail = false;
    player.jailTurns = 0;
    pushLog(s, `${player.name} ทอยได้ Double (${d1},${d2}) — ออกจากคุกได้ฟรี!`, "money");
    s.hasRolledThisTurn = true;
    movePlayer(s, playerId, d1 + d2);
  } else {
    player.jailTurns += 1;
    pushLog(s, `${player.name} ทอยได้ (${d1},${d2}) — ยังไม่ใช่ Double`, "warn");
    if (player.jailTurns >= 3) {
      player.inJail = false;
      player.jailTurns = 0;
      player.cash -= JAIL_FINE;
      pushTx(s, "JAIL_FINE", JAIL_FINE, playerId, "BANK");
      pushLog(s, `${player.name} ครบ 3 ตาในคุก ถูกหักค่าปรับ ${JAIL_FINE} บาทและปล่อยตัว`, "warn");
      handleBankruptCheck(s, playerId, "BANK");
      s.hasRolledThisTurn = true;
      if (s.pending.kind === "NONE") movePlayer(s, playerId, d1 + d2);
    } else {
      s.hasRolledThisTurn = true;
    }
  }
  return s;
}

// ===================== ล้มละลาย =====================

function handleBankruptCheck(state: GameState, playerId: string, creditor: string) {
  const player = state.players[playerId];
  if (player.cash >= 0) return;
  const deficit = -player.cash;
  const liquidation = player.properties.reduce((sum, tid) => {
    const ps = state.properties[tid];
    if (ps.mortgaged) return sum;
    const def = propertyDef(tid)!;
    return sum + Math.floor(def.price / 2) + Math.floor((ps.houses * def.housePrice + (ps.hotel ? 4 * def.housePrice : 0)) / 2);
  }, 0);
  if (liquidation < deficit) {
    // ไม่สามารถชำระได้แม้ขาย/จำนองทั้งหมด -> รอผู้เล่นกดยืนยันล้มละลาย
    state.pending = { kind: "BANKRUPT", playerId, creditor: creditor === "BANK" ? null : creditor, amountOwed: deficit };
    pushLog(state, `${player.name} มีเงินไม่พอชำระแม้ขาย/จำนองทรัพย์สินทั้งหมด — ต้องประกาศล้มละลาย`, "danger");
  } else {
    state.pending = { kind: "BANKRUPT", playerId, creditor: creditor === "BANK" ? null : creditor, amountOwed: deficit };
    pushLog(state, `${player.name} เงินไม่พอ (ขาด ${deficit.toLocaleString()} บาท) — ต้องขาย/จำนองทรัพย์สิน`, "warn");
  }
}

function clearBankruptIfSolvent(state: GameState, playerId: string) {
  if (state.pending.kind === "BANKRUPT" && state.pending.playerId === playerId) {
    if (state.players[playerId].cash >= 0) {
      state.pending = { kind: "NONE" };
      pushLog(state, `${state.players[playerId].name} มีเงินเพียงพอแล้ว ดำเนินเกมต่อ`, "money");
    }
  }
}

export function declareBankrupt(state: GameState, playerId: string): GameState {
  const s = clone(state);
  if (s.pending.kind !== "BANKRUPT" || s.pending.playerId !== playerId) throw new Error("ไม่มีสถานะล้มละลายค้างอยู่");
  const creditor = s.pending.creditor;
  const player = s.players[playerId];

  for (const tid of player.properties) {
    const ps = s.properties[tid];
    ps.houses = 0; ps.hotel = false;
    if (creditor) {
      ps.ownerId = creditor; ps.mortgaged = false;
      s.players[creditor].properties.push(tid);
    } else {
      ps.ownerId = null; ps.mortgaged = false;
    }
  }
  player.properties = [];
  player.cash = 0;
  player.status = "BANKRUPT";
  pushLog(s, `${player.name} ประกาศล้มละลายและออกจากเกม`, "danger");
  s.pending = { kind: "NONE" };

  const remaining = activePlayers(s);
  if (remaining.length <= 1) {
    const winner = remaining[0];
    if (winner) { winner.status = "WINNER"; }
    const rankings = Object.values(s.players)
      .map((p) => ({ playerId: p.id, netWorth: netWorth(s, p.id) }))
      .sort((a, b) => b.netWorth - a.netWorth);
    s.status = "FINISHED";
    s.pending = { kind: "GAME_OVER", rankings };
    pushLog(s, `เกมจบแล้ว! ผู้ชนะคือ ${winner ? winner.name : "-"}`, "danger");
  } else if (s.currentPlayerId === playerId) {
    advanceTurn(s);
  }
  return s;
}

// ===================== ออกจากเกม =====================
// ผู้เล่นกดปุ่ม "ออกจากเกม" ด้วยตัวเองระหว่างกำลังเล่นอยู่ (ไม่ใช่ล้มละลายเพราะเงินไม่พอ)
// ให้ถือว่าล้มละลายทันที ทำงานได้ทุกช่วงจังหวะของเกม ไม่ว่าจะเป็นตาของใคร หรือมีเหตุการณ์
// ค้าง (pending) อะไรอยู่ก็ตาม เพื่อไม่ให้ผู้เล่นที่อยากออกต้องรอเทิร์นตัวเอง/รอเหตุการณ์ค้างจบก่อน
export function leaveGame(state: GameState, playerId: string): GameState {
  const s = clone(state);
  const player = s.players[playerId];
  if (!player) throw new Error("ไม่พบผู้เล่นนี้ในห้อง");
  if (s.status !== "PLAYING") throw new Error("ออกจากเกมระหว่างเล่นได้เฉพาะตอนกำลังเล่นอยู่เท่านั้น");
  if (player.status === "BANKRUPT" || player.status === "WINNER") return s; // ออกไปแล้ว/จบไปแล้ว ไม่ต้องทำซ้ำ

  // เคลียร์เหตุการณ์ค้าง (pending) ที่ชี้ไปยังผู้เล่นคนนี้โดยตรง ไม่ให้ค้างอ้างอิงผู้เล่นที่ออกไปแล้ว
  if (
    (s.pending.kind === "BUY_DECISION" || s.pending.kind === "CARD" || s.pending.kind === "BANKRUPT") &&
    s.pending.playerId === playerId
  ) {
    s.pending = { kind: "NONE" };
  } else if (s.pending.kind === "AUCTION") {
    const p = s.pending;
    if (p.leaderId === playerId) {
      // คนนำราคาออกจากเกมกลางคัน — ยกเลิกการประมูลครั้งนี้ ที่ดินยังคงเป็นของธนาคาร
      pushLog(s, `${player.name} ออกจากเกมระหว่างเป็นผู้นำการประมูล — ยกเลิกการประมูลครั้งนี้`, "warn");
      s.pending = { kind: "NONE" };
    } else if (p.activeBidders.includes(playerId)) {
      p.activeBidders = p.activeBidders.filter((id) => id !== playerId);
      if (!p.passedIds.includes(playerId)) p.passedIds.push(playerId);
      resolveAuctionIfDone(s);
    }
  }

  // คืนทรัพย์สินทั้งหมดให้ธนาคาร — นี่ไม่ใช่การล้มละลายเพราะติดหนี้ผู้เล่นคนอื่น จึงไม่ยกให้ใครเป็นพิเศษ
  for (const tid of player.properties) {
    const ps = s.properties[tid];
    ps.houses = 0;
    ps.hotel = false;
    ps.ownerId = null;
    ps.mortgaged = false;
  }
  player.properties = [];
  player.cash = 0;
  player.inJail = false;
  player.status = "BANKRUPT";
  pushLog(s, `${player.name} ออกจากเกม — ถือว่าล้มละลายและหลุดจากการแข่งขันทันที`, "danger");

  const remaining = activePlayers(s);
  if (remaining.length <= 1) {
    const winner = remaining[0];
    if (winner) winner.status = "WINNER";
    const rankings = Object.values(s.players)
      .map((pl) => ({ playerId: pl.id, netWorth: netWorth(s, pl.id) }))
      .sort((a, b) => b.netWorth - a.netWorth);
    s.status = "FINISHED";
    s.pending = { kind: "GAME_OVER", rankings };
    pushLog(s, `เกมจบแล้ว! ผู้ชนะคือ ${winner ? winner.name : "-"}`, "danger");
    return s;
  }

  // กันเกมค้าง: ถ้าตอนนี้ไม่มีเหตุการณ์ค้างเหลือแล้ว แต่ผู้เล่นที่ถือตาปัจจุบันอยู่ดันกลายเป็น
  // ผู้เล่นที่เพิ่งออกไป (ล้มละลาย) — ไม่ว่าจะออกไปตอนเป็นเจ้าของตาเอง หรือเป็นผู้นำประมูลที่ถูกยกเลิกไป
  // ให้ส่งต่อตาไปยังผู้เล่นคนถัดไปที่ยังเล่นอยู่ทันที ไม่ปล่อยให้เกมค้างรอผู้เล่นที่ไม่อยู่แล้ว
  if (s.pending.kind === "NONE") {
    const cp = s.currentPlayerId ? s.players[s.currentPlayerId] : null;
    if (!cp || cp.status === "BANKRUPT") {
      advanceTurn(s);
    }
  }

  return s;
}

// ===================== จบตา =====================

function advanceTurn(state: GameState) {
  const order = state.turnOrder;
  let idx = order.indexOf(state.currentPlayerId || "");
  for (let i = 0; i < order.length; i++) {
    idx = (idx + 1) % order.length;
    const p = state.players[order[idx]];
    if (p && p.status !== "BANKRUPT") {
      state.currentPlayerId = p.id;
      state.turnNumber += 1;
      state.hasRolledThisTurn = false;
      state.canRollAgain = false;
      // ข้อ 1: "ไม่" เคลียร์ state.dice ตรงนี้ — ปล่อยให้ค่าลูกเต๋าล่าสุดที่ทอยไปค้างแสดงผลอยู่
      // (ให้ทุกคนยังเห็นผลการทอยของผู้เล่นคนก่อนหน้าได้ แม้จะจบตาไปแล้ว) จนกว่าผู้เล่นคนถัดไป
      // จะทอยลูกเต๋าจริง ๆ (rollSeq เปลี่ยน) แอนิเมชันลูกเต๋าใน DiceTray ถึงจะเริ่มใหม่ทับค่าเดิม
      p.consecutiveDoubles = 0;
      p.housesBuiltThisTurn = 0; // ข้อ 3: โควตาสร้างบ้าน 1 หลัง/เทิร์น รีเซ็ตเมื่อเริ่มเทิร์นใหม่
      return;
    }
  }
}

export function endTurn(state: GameState, playerId: string): GameState {
  const s = clone(state);
  requireCurrentPlayer(s, playerId);
  if (!s.hasRolledThisTurn) throw new Error("ต้องทอยลูกเต๋าก่อนจบตา");
  if (s.canRollAgain) throw new Error("ท่านได้ Double ต้องทอยอีกครั้งก่อน");
  const player = s.players[playerId];
  pushLog(s, `${player.name} จบตาของตน`);
  advanceTurn(s);
  return s;
}

// ===================== Auto action (บอท / หมดเวลาเทิร์น) =====================

export type AutoAction =
  | { type: "ROLL" }
  | { type: "PAY_JAIL_FINE" }
  | { type: "ROLL_FOR_JAIL" }
  | { type: "BUY" }
  | { type: "DECLINE" }
  | { type: "ACK_CARD" }
  | { type: "PLACE_BID" }
  | { type: "FOLD_AUCTION" }
  | { type: "DECLARE_BANKRUPT" }
  | { type: "SELL_BUILDING"; tileId: number }
  | { type: "MORTGAGE"; tileId: number }
  | { type: "BUILD_HOUSE"; tileId: number }
  | { type: "END_TURN" };

/**
 * ตัดสินใจ Action ให้อัตโนมัติแทนผู้เล่น ใช้ได้ 2 กรณี:
 * - ผู้เล่นบอท (aggressive: true) — กล้าซื้อ/ประมูล/สร้างบ้านตามเงื่อนไขง่าย ๆ เพื่อให้เกมดำเนินไปได้จริง
 * - ผู้เล่นจริงที่ปล่อยเวลาหมด (aggressive: false) — เลือกทางเลือกที่ปลอดภัยที่สุด ไม่ใช้เงินของผู้เล่นโดยไม่ได้รับอนุญาต
 *
 * คืนค่า null แปลว่าไม่มี Action ใดที่ต้องทำตอนนี้สำหรับผู้เล่นคนนี้
 */
export function getAutoAction(
  state: GameState,
  playerId: string,
  opts: { aggressive: boolean } = { aggressive: true },
): AutoAction | null {
  const player = state.players[playerId];
  if (!player || player.status === "BANKRUPT" || player.status === "WINNER") return null;
  if (state.status !== "PLAYING") return null;

  // ----- เหตุการณ์ค้างที่ต้องให้ผู้เล่นคนนี้ตัดสินใจ -----
  if (state.pending.kind === "BUY_DECISION" && state.pending.playerId === playerId) {
    if (!opts.aggressive) return { type: "DECLINE" };
    const def = propertyDef(state.pending.tileId)!;
    const safetyBuffer = 800;
    return player.cash - def.price >= safetyBuffer ? { type: "BUY" } : { type: "DECLINE" };
  }

  if (state.pending.kind === "CARD" && state.pending.playerId === playerId) {
    return { type: "ACK_CARD" }; // ไม่ใช่ทางเลือก แค่ต้องกดรับทราบ
  }

  if (state.pending.kind === "AUCTION") {
    const p = state.pending;
    if (!p.activeBidders.includes(playerId)) return null;
    // ข้อ 4: ตอนนี้ผู้นำราคาก็ต้องกดถอนตัวเองด้วยเพื่อให้ประมูลจบได้ (ไม่ auto-จบให้อีกต่อไป)
    // เมื่อเป็นผู้นำราคาอยู่แล้ว ไม่มีเหตุผลต้องเสนอราคาแข่งกับตัวเอง จึงถอนตัวทันทีเพื่อ
    // "ล็อก" ราคาที่เสนอไว้ รอผู้เล่นคนอื่นตัดสินใจ ถ้ามีคนเสนอสูงกว่าภายหลังค่อยกลับมาลุ้นใหม่ไม่ได้
    // (บอทไม่ไล่บิดคืน) แต่เพียงพอสำหรับพฤติกรรมบอทที่เรียบง่ายและไม่ทำให้การประมูลค้าง
    if (p.leaderId === playerId) return { type: "FOLD_AUCTION" };
    if (!opts.aggressive) return { type: "FOLD_AUCTION" };
    const def = propertyDef(p.tileId)!;
    const nextBid = p.currentBid + AUCTION_STEP;
    const maxWilling = Math.floor(def.price * 0.9);
    if (nextBid <= maxWilling && player.cash - nextBid >= 300) return { type: "PLACE_BID" };
    return { type: "FOLD_AUCTION" };
  }

  if (state.pending.kind === "BANKRUPT" && state.pending.playerId === playerId) {
    // ขายสิ่งปลูกสร้างก่อน แล้วค่อยจำนองที่ดินตามลำดับกติกา ก่อนจะยอมล้มละลาย
    for (const tid of player.properties) {
      const ps = state.properties[tid];
      if (ps.hotel || ps.houses > 0) return { type: "SELL_BUILDING", tileId: tid };
    }
    for (const tid of player.properties) {
      const ps = state.properties[tid];
      if (!ps.mortgaged) return { type: "MORTGAGE", tileId: tid };
    }
    return { type: "DECLARE_BANKRUPT" };
  }

  if (state.pending.kind !== "NONE") return null; // เหตุการณ์อื่นไม่เกี่ยวกับผู้เล่นคนนี้
  if (state.currentPlayerId !== playerId) return null;

  // ----- ตาของผู้เล่นคนนี้เอง -----
  if (player.inJail && !state.hasRolledThisTurn) {
    if (opts.aggressive) {
      return player.cash >= JAIL_FINE * 3 ? { type: "PAY_JAIL_FINE" } : { type: "ROLL_FOR_JAIL" };
    }
    return { type: "ROLL_FOR_JAIL" }; // ปลอดภัยกว่า ไม่เสียเงินแทนผู้เล่นจริงโดยไม่ได้รับอนุญาต
  }

  if (!player.inJail && (!state.hasRolledThisTurn || state.canRollAgain)) {
    return { type: "ROLL" };
  }

  // ทอยจบแล้ว (หรือทอยไม่ได้เพราะยังติดคุกจากการทอยครั้งนี้) — เหลือแค่ปิดเทิร์น
  if (state.hasRolledThisTurn && !state.canRollAgain) {
    // ข้อ 3: บอทก็ต้องเคารพโควตาสร้างบ้านเทิร์นละ 1 หลัง และไม่เกิน 3 หลังต่อรอบวนเช่นกัน
    if (opts.aggressive && !player.inJail && player.housesBuiltThisTurn < 1 && player.housesBuiltThisLap < 3) {
      const buildBuffer = 1500;
      for (const tid of player.properties) {
        const def = propertyDef(tid);
        const ps = state.properties[tid];
        if (!def || !def.canBuild || ps.mortgaged || ps.hotel) continue;
        if (ps.houses < MAX_HOUSES && player.cash - def.housePrice >= buildBuffer) {
          return { type: "BUILD_HOUSE", tileId: tid };
        }
      }
    }
    return { type: "END_TURN" };
  }

  return null;
}

export { netWorth, currentRent, groupTileIds };
