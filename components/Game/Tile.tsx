"use client";

import { TileDef, PropertyState, isPropertyTile } from "@/lib/types";
import { TileVisualPos } from "@/lib/layout";

const TYPE_META: Record<string, { badge: string; badgeText: string; stamp: string }> = {
  START: {
    badge: "linear-gradient(135deg, rgba(245,198,82,.92), rgba(225,160,42,.82))",
    badgeText: "#594018",
    stamp: "GO",
  },
  JAIL: {
    badge: "linear-gradient(135deg, rgba(63,72,67,.92), rgba(38,45,42,.86))",
    badgeText: "#fffdf5",
    stamp: "🔒",
  },
  GO_TO_JAIL: {
    badge: "linear-gradient(135deg, rgba(181,67,55,.92), rgba(137,47,40,.84))",
    badgeText: "#fffaf4",
    stamp: "🚔",
  },
  SPECIAL: {
    badge: "linear-gradient(135deg, rgba(70,117,91,.9), rgba(47,91,68,.82))",
    badgeText: "#fffdf5",
    stamp: "🅿",
  },
  CHANCE: {
    badge: "linear-gradient(135deg, rgba(218,172,65,.92), rgba(181,133,37,.82))",
    badgeText: "#594018",
    stamp: "?",
  },
  TREASURE: {
    badge: "linear-gradient(135deg, rgba(83,139,99,.92), rgba(55,108,72,.84))",
    badgeText: "#fffdf5",
    stamp: "🎁",
  },
  TAX: {
    badge: "linear-gradient(135deg, rgba(204,126,63,.92), rgba(168,91,43,.84))",
    badgeText: "#fffdf5",
    stamp: "%",
  },
};

const WATERCOLOUR_WASH: Record<string, string> = {
  red: "linear-gradient(135deg, rgba(191,78,66,.78), rgba(224,137,120,.48))",
  orange: "linear-gradient(135deg, rgba(213,133,62,.78), rgba(235,181,111,.48))",
  yellow: "linear-gradient(135deg, rgba(218,178,67,.78), rgba(239,210,124,.48))",
  green: "linear-gradient(135deg, rgba(75,132,92,.78), rgba(139,183,135,.48))",
  blue: "linear-gradient(135deg, rgba(76,119,165,.78), rgba(137,171,203,.48))",
  purple: "linear-gradient(135deg, rgba(128,91,145,.78), rgba(176,142,188,.48))",
  pink: "linear-gradient(135deg, rgba(194,104,129,.78), rgba(226,157,174,.48))",
  brown: "linear-gradient(135deg, rgba(139,101,67,.78), rgba(190,153,112,.48))",
};

type TileProps = {
  tile: TileDef;
  pos: TileVisualPos;
  propertyState?: PropertyState;
  ownerColor?: string;
  onClick: () => void;
};

export default function Tile({ tile, pos, propertyState, ownerColor, onClick }: TileProps) {
  const isCorner = pos.side === "corner";
  const isLeft = pos.side === "left";
  const isRight = pos.side === "right";
  const owned = Boolean(propertyState?.ownerId);
  const meta = TYPE_META[tile.type];

  const watercolorBase =
    ownerColor ||
    undefined;

  const tileClass = [
    "relative",
    "flex",
    "min-w-0",
    "min-h-0",
    "overflow-hidden",
    "cursor-pointer",
    "text-ink",
    "rounded-[4px]",
    "border",
    "border-[rgba(76,62,45,.16)]",
    "bg-[rgba(249,245,232,.92)]",
    "transition-[transform,filter,box-shadow]",
    "duration-200",
    "ease-out",
    "hover:z-[2]",
    "hover:-translate-y-[1px]",
    "hover:brightness-[1.035]",
    "hover:shadow-[0_3px_8px_rgba(71,56,38,.16)]",
    "active:translate-y-0",
    "text-[0.42rem]",
    "sm:text-[0.52rem]",
    "md:text-[0.62rem]",
    "lg:text-[0.72rem]",
    propertyState?.mortgaged ? "grayscale-[.7] brightness-90" : "",
    isCorner ? "items-center justify-center text-center" : "",
  ].join(" ");

  const boxShadow = owned
    ? `inset 0 0 0 2px ${ownerColor || "var(--gold)"}, inset 0 0 14px rgba(255,255,255,.18), 0 0 0 1px rgba(66,53,38,.08)`
    : "inset 0 0 12px rgba(126,101,70,.045), 0 0 0 1px rgba(66,53,38,.035)";

  const getWash = () => {
    if (!watercolorBase) return undefined;

    if (
      watercolorBase.startsWith("#") ||
      watercolorBase.startsWith("rgb") ||
      watercolorBase.startsWith("hsl") ||
      watercolorBase.startsWith("var(")
    ) {
      return watercolorBase;
    }

    return WATERCOLOUR_WASH[watercolorBase] || watercolorBase;
  };

  const wash = getWash();

  const Houses = ({ side = "center" }: { side?: "left" | "center" | "right" }) => {
    if (!propertyState || (!propertyState.houses && !propertyState.hotel)) return null;

    const justify =
      side === "left"
        ? "justify-start"
        : side === "right"
          ? "justify-end"
          : "justify-center";

    if (propertyState.hotel) {
      return (
        <div className={`flex items-center max-w-full overflow-hidden ${justify}`}>
          <span className="relative flex-none w-[12px] h-[15px] md:w-[15px] md:h-[18px] xl:w-[18px] xl:h-[21px] rounded-[1px] border border-seal bg-[linear-gradient(180deg,#FF9A9E,#FECFEF)] shadow-[0_1px_2px_rgba(50,35,20,.18)]">
            <span className="absolute left-[30%] right-[30%] bottom-0 h-[45%] rounded-t-[1px] bg-seal" />
          </span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-[clamp(1px,.18vw,3px)] max-w-full overflow-hidden ${justify}`}>
        {Array.from({ length: propertyState.houses }).map((_, index) => (
          <span
            key={index}
            className="relative flex-none w-[6px] h-[8px] md:w-[8px] md:h-[10px] xl:w-[10px] xl:h-[12px] rounded-[1px] border border-felt bg-[linear-gradient(90deg,#84FAB0,#8FD3F4)] shadow-[0_1px_2px_rgba(50,35,20,.15)]"
          >
            <span className="absolute left-[30%] right-[30%] bottom-0 h-[50%] bg-felt" />
          </span>
        ))}
      </div>
    );
  };

  const WatercolorTexture = () => (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-[.5] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 20%, rgba(255,255,255,.5) 0 1px, transparent 2px), radial-gradient(circle at 78% 65%, rgba(112,88,59,.06) 0 1px, transparent 2px), radial-gradient(circle at 45% 85%, rgba(255,255,255,.42) 0 1px, transparent 2px)",
          backgroundSize: "7px 7px, 11px 11px, 9px 9px",
        }}
      />
      <div className="pointer-events-none absolute -inset-[15%] rounded-[35%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,.2),transparent_68%)]" />
    </>
  );

  if (isPropertyTile(tile)) {
    if (isCorner) {
      return (
        <div
          className={`${tileClass} flex-col`}
          data-tile-id={tile.id}
          style={{
            gridColumnStart: pos.col,
            gridRowStart: pos.row,
            boxShadow,
          }}
          onClick={onClick}
        >
          <WatercolorTexture />

          <div
            className="relative z-[1] flex w-full h-6 md:h-8 xl:h-14 justify-center overflow-hidden"
            style={{
              background: owned
                ? `linear-gradient(180deg, ${ownerColor || "var(--gold)"}, rgba(255,255,255,.12))`
                : "rgba(255,255,255,.2)",
              borderBottom: owned
                ? "none"
                : "1px solid rgba(93,73,49,.12)",
            }}
          >
            <Houses />
          </div>

          <div className="relative z-[1] flex flex-1 min-h-0 w-full items-center justify-center px-[2px] text-center font-semibold leading-tight break-words text-[clamp(.42rem,1.05vw,.72rem)]">
            {tile.name}
          </div>

          <div className="relative z-[1] pb-[2px] text-center text-ink-soft text-[clamp(.38rem,.8vw,.66rem)]">
            {tile.price.toLocaleString()}
          </div>
        </div>
      );
    }

    if (isLeft) {
      return (
        <div
          className={tileClass}
          data-tile-id={tile.id}
          style={{
            gridColumnStart: pos.col,
            gridRowStart: pos.row,
            boxShadow,
          }}
          onClick={onClick}
        >
          <WatercolorTexture />

          <div className="relative z-[1] flex w-full h-full min-w-0">
            <div className="flex items-center justify-center min-w-0 whitespace-nowrap text-ink-soft leading-none rotate-90 w-[22%] sm:w-[18%] md:w-[15%] lg:w-[12%] text-[clamp(.38rem,.8vw,.66rem)]">
              {tile.price.toLocaleString()}
            </div>

            <div className="flex flex-1 min-w-0 items-center justify-center px-[2px] text-center font-semibold leading-tight break-words rotate-90 text-[clamp(.4rem,1vw,.72rem)]">
              {tile.name}
            </div>

            <div
              className="flex justify-center flex-none w-6 md:w-8 xl:w-14"
              style={{
                background: owned
                  ? `linear-gradient(-90deg, ${ownerColor || "var(--gold)"}, rgba(255,255,255,.1))`
                  : "rgba(255,255,255,.16)",
                borderLeft: owned
                  ? "none"
                  : "1px solid rgba(93,73,49,.12)",
              }}
            >
              <div className="flex rotate-90">
                <Houses side="center" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (isRight) {
      return (
        <div
          className={tileClass}
          data-tile-id={tile.id}
          style={{
            gridColumnStart: pos.col,
            gridRowStart: pos.row,
            boxShadow,
          }}
          onClick={onClick}
        >
          <WatercolorTexture />

          <div
            className="relative z-[1] flex flex-none justify-center w-6 md:w-8 xl:w-14"
            style={{
              background: owned
                ? `linear-gradient(-90deg, rgba(255,255,255,.1), ${ownerColor || "var(--gold)"})`
                : "rgba(255,255,255,.16)",
              borderRight: owned
                ? "none"
                : "1px solid rgba(93,73,49,.12)",
            }}
          >
            <div className="flex -rotate-90">
              <Houses side="center" />
            </div>
          </div>

          <div className="flex flex-1 min-w-0 items-center justify-center px-[2px] text-center font-semibold leading-tight break-words -rotate-90 text-[clamp(.4rem,1vw,.72rem)]">
            {tile.name}
          </div>

          <div className="flex items-center justify-center min-w-0 whitespace-nowrap text-ink-soft leading-none -rotate-90 w-[22%] sm:w-[18%] md:w-[15%] lg:w-[12%] text-[clamp(.38rem,.8vw,.66rem)]">
            {tile.price.toLocaleString()}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`${tileClass} flex-col`}
        data-tile-id={tile.id}
        style={{
          gridColumnStart: pos.col,
          gridRowStart: pos.row,
          boxShadow,
        }}
        onClick={onClick}
      >
        <WatercolorTexture />

        <div
          className="relative z-[1] flex w-full justify-center h-6 md:h-8 xl:h-14 overflow-hidden"
          style={{
            background: owned
              ? `linear-gradient(180deg, ${ownerColor || "var(--gold)"}, rgba(255,255,255,.08))`
              : "rgba(255,255,255,.2)",
            borderBottom: owned
              ? "none"
              : "1px solid rgba(93,73,49,.12)",
          }}
        >
          <Houses />
        </div>

        <div className="relative z-[1] flex flex-1 min-h-0 items-center justify-center px-[2px] text-center font-semibold leading-tight break-words text-[clamp(.4rem,1vw,.72rem)]">
          {tile.name}
        </div>

        <div className="relative z-[1] pb-[2px] text-center text-ink-soft text-[clamp(.38rem,.8vw,.66rem)]">
          {tile.price.toLocaleString()}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${tileClass} flex-col items-center justify-center gap-[clamp(1px,.35vw,6px)] bg-[rgba(239,234,216,.82)]`}
      data-tile-id={tile.id}
      style={{
        gridColumnStart: pos.col,
        gridRowStart: pos.row,
        boxShadow,
      }}
      onClick={onClick}
    >
      <WatercolorTexture />

      {meta?.stamp && (
        <div
          className="relative z-[1] flex flex-none items-center justify-center rounded-full font-bold shadow-[0_1px_3px_rgba(62,45,28,.2)] w-[clamp(14px,3.2vw,34px)] h-[clamp(14px,3.2vw,34px)] text-[clamp(.42rem,1vw,.88rem)] border border-[rgba(74,54,32,.12)]"
          style={{
            background: meta.badge,
            color: meta.badgeText,
          }}
        >
          {meta.stamp}
        </div>
      )}

      <div
        className={`relative z-[1] flex items-center justify-center max-w-full px-[2px] text-center leading-tight break-words text-[clamp(.4rem,1vw,.72rem)] ${
          isCorner ? "font-semibold" : ""
        }`}
      >
        {tile.name}
      </div>
    </div>
  );
}