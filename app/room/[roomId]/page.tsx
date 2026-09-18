"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { GameState } from "@/lib/types";
import {
  subscribeRoom, getOrCreateLocalPlayerId, joinRoom, attachPresence, getSavedName,
} from "@/lib/roomService";
import Lobby from "@/components/Lobby/Lobby";
import GameScreen from "@/components/Game/GameScreen";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const search = useSearchParams();
  const roomId = params.roomId;
  const [state, setState] = useState<GameState | null | undefined>(undefined);
  const [playerId, setPlayerId] = useState<string>("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    if (!roomId) return;
    const pid = getOrCreateLocalPlayerId(roomId);
    setPlayerId(pid);
    const unsub = subscribeRoom(roomId, setState);
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    if (state === undefined || !playerId || !roomId) return;
    if (state && !state.players[playerId]) {
      const nameFromQuery = search.get("name");
      const name = nameFromQuery || getSavedName() || "ผู้เล่น";
      joinRoom(roomId, name)
        .then(() => attachPresence(roomId, playerId))
        .catch((e) => setJoinError(e.message || "เข้าร่วมห้องไม่สำเร็จ"));
    } else if (state && state.players[playerId]) {
      attachPresence(roomId, playerId);
    }
  }, [state, playerId, roomId, search]);

  if (state === undefined) {
    return <CenterMsg text="กำลังเชื่อมต่อห้อง..." />;
  }
  if (state === null) {
    return <CenterMsg text="ไม่พบห้องนี้ อาจถูกลบไปแล้ว" />;
  }
  if (joinError) {
    return <CenterMsg text={joinError} />;
  }
  if (!state.players[playerId]) {
    return <CenterMsg text="กำลังเข้าร่วมห้อง..." />;
  }

  if (state.status === "WAITING" || state.status === "STARTING") {
    return <Lobby state={state} roomId={roomId} playerId={playerId} />;
  }
  return <GameScreen state={state} roomId={roomId} playerId={playerId} />;
}

function CenterMsg({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[460px] bg-paper watercolor-card shadow-deep border border-paper-line px-8 py-8 text-center">
        <p className="text-ink-soft m-0">{text}</p>
      </div>
    </div>
  );
}
