import type { Metadata } from "next";
import { OfficeRushGame } from "@/components/game/OfficeRushGame";

export const metadata: Metadata = {
  title: "PerkJoy: Office Rush — Employee Appreciation Game",
  description: "Think you can keep an entire office feeling appreciated? Play PerkJoy: Office Rush in your browser.",
  openGraph: {
    title: "PerkJoy: Office Rush — Employee Appreciation Game",
    description: "Think you can keep an entire office feeling appreciated? Play PerkJoy: Office Rush in your browser.",
    type: "website",
    images: [{ url: "/game/characters/perkjoy-character-sheet.png", width: 1536, height: 1024, alt: "PerkJoy Office Rush characters" }],
  },
};

export default function GamePage() { return <OfficeRushGame />; }
