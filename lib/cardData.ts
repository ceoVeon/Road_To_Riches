import { Card } from "./types";

export const CHANCE_CARDS: Card[] = [
  { id: "c1", deck: "CHANCE", title: "ได้รับเงินปันผล", description: "ธนาคารจ่ายเงินปันผลให้ท่าน 500 บาท", action: "ADD_MONEY", value: 500 },
  { id: "c2", deck: "CHANCE", title: "เสียค่าปรับจราจร", description: "ท่านฝ่าฝืนกฎจราจร เสียค่าปรับ 200 บาท", action: "SUB_MONEY", value: 200 },
  { id: "c3", deck: "CHANCE", title: "ถูกจับกุม", description: "ท่านถูกจับ ให้เดินไปยังช่องคุกทันที", action: "GO_TO_JAIL" },
  { id: "c4", deck: "CHANCE", title: "ประชุมผู้ถือหุ้น", description: "ทุกคนจ่ายให้ท่านคนละ 100 บาท", action: "COLLECT_FROM_ALL", value: 100 },
  { id: "c5", deck: "CHANCE", title: "บริจาคการกุศล", description: "ท่านบริจาคเงินให้ทุกคน คนละ 100 บาท", action: "PAY_ALL", value: 100 },
  { id: "c6", deck: "CHANCE", title: "บัตรออกจากคุกฟรี", description: "เก็บบัตรนี้ไว้ใช้ออกจากคุกได้ฟรีในอนาคต", action: "GET_OUT_OF_JAIL_FREE" },
];

export const TREASURE_CARDS: Card[] = [
  { id: "t1", deck: "TREASURE", title: "ขุดพบสมบัติ", description: "ท่านขุดพบหีบสมบัติเก่า ได้รับเงิน 1,000 บาท", action: "ADD_MONEY", value: 1000 },
  { id: "t2", deck: "TREASURE", title: "คืนภาษี", description: "กรมสรรพากรคืนภาษีให้ท่าน 300 บาท", action: "ADD_MONEY", value: 300 },
  { id: "t3", deck: "TREASURE", title: "ค่าซ่อมแซมบ้าน", description: "ท่านต้องซ่อมแซมบ้าน เสียเงิน 400 บาท", action: "SUB_MONEY", value: 400 },
  { id: "t4", deck: "TREASURE", title: "ถูกล็อตเตอรี่", description: "ท่านถูกรางวัลเล็ก ๆ ได้รับเงิน 2,000 บาท", action: "ADD_MONEY", value: 2000 },
  { id: "t5", deck: "TREASURE", title: "ค่ารักษาพยาบาล", description: "ท่านป่วยกะทันหัน เสียค่ารักษา 300 บาท", action: "SUB_MONEY", value: 300 },
  { id: "t6", deck: "TREASURE", title: "บัตรออกจากคุกฟรี", description: "เก็บบัตรนี้ไว้ใช้ออกจากคุกได้ฟรีในอนาคต", action: "GET_OUT_OF_JAIL_FREE" },
];

export const ALL_CARDS: Record<string, Card> = Object.fromEntries(
  [...CHANCE_CARDS, ...TREASURE_CARDS].map((c) => [c.id, c])
);
