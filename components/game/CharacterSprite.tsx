import type { CSSProperties } from "react";
import { characterCrops } from "@/lib/game/config";
import type { CharacterId } from "@/types/game";

export function CharacterSprite({ character, className = "", style }: { character: CharacterId; className?: string; style?: CSSProperties }) {
  const crop = characterCrops[character];
  return (
    <svg className={className} style={style} viewBox={`0 0 ${crop.sw} ${crop.sh}`} role="img" aria-label={`${character} PerkJoy character`}>
      <image href="/game/characters/perkjoy-character-sheet.png" x={-crop.sx} y={-crop.sy} width="1536" height="1024" />
    </svg>
  );
}
