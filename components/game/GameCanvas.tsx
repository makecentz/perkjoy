"use client";

import { useEffect, useRef } from "react";
import { characterCrops, employees, eventLabels, GAME_HEIGHT, GAME_WIDTH } from "@/lib/game/config";
import type { CharacterId, OfficeEvent, Position } from "@/types/game";

type Props = {
  activeEmployeeIds: string[];
  automationSeconds: number;
  events: OfficeEvent[];
  feedback: { label: string; x: number; y: number; perfect: boolean } | null;
  inventory: string | null;
  player: Position;
  reducedMotion: boolean;
};

const sheetUrl = "/game/characters/perkjoy-character-sheet.png";

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

type Sprites = Record<CharacterId, HTMLCanvasElement>;

function transparentCrop(image: HTMLImageElement, character: CharacterId) {
  const crop = characterCrops[character];
  const canvas = document.createElement("canvas");
  canvas.width = crop.sw;
  canvas.height = crop.sh;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return canvas;
  context.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh);
  const pixels = context.getImageData(0, 0, crop.sw, crop.sh);
  const visited = new Uint8Array(crop.sw * crop.sh);
  const queue: number[] = [];
  const background = (index: number) => {
    const offset = index * 4;
    const red = pixels.data[offset];
    const green = pixels.data[offset + 1];
    const blue = pixels.data[offset + 2];
    return red > 220 && green > 213 && blue > 202 && Math.max(red, green, blue) - Math.min(red, green, blue) < 45;
  };
  for (let x = 0; x < crop.sw; x += 1) { queue.push(x, (crop.sh - 1) * crop.sw + x); }
  for (let y = 0; y < crop.sh; y += 1) { queue.push(y * crop.sw, y * crop.sw + crop.sw - 1); }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    if (visited[index] || !background(index)) continue;
    visited[index] = 1;
    pixels.data[index * 4 + 3] = 0;
    const x = index % crop.sw;
    const y = Math.floor(index / crop.sw);
    if (x > 0) queue.push(index - 1);
    if (x < crop.sw - 1) queue.push(index + 1);
    if (y > 0) queue.push(index - crop.sw);
    if (y < crop.sh - 1) queue.push(index + crop.sw);
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function drawCharacter(context: CanvasRenderingContext2D, sprites: Sprites, character: CharacterId, position: Position, height: number, bob = 0) {
  const crop = characterCrops[character];
  const width = height * (crop.sw / crop.sh);
  context.save();
  context.shadowColor = "rgba(16,31,46,.14)";
  context.shadowBlur = 7;
  context.shadowOffsetY = 4;
  context.drawImage(sprites[character], position.x - width / 2, position.y - height + bob, width, height);
  context.restore();
}

function drawOffice(context: CanvasRenderingContext2D) {
  const gradient = context.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  gradient.addColorStop(0, "#fffaf1");
  gradient.addColorStop(1, "#f2eadc");
  context.fillStyle = gradient;
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  context.strokeStyle = "rgba(49,65,61,.07)";
  context.lineWidth = 1;
  for (let x = 20; x < GAME_WIDTH; x += 40) {
    context.beginPath(); context.moveTo(x, 75); context.lineTo(x, GAME_HEIGHT); context.stroke();
  }
  for (let y = 95; y < GAME_HEIGHT; y += 40) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(GAME_WIDTH, y); context.stroke();
  }

  context.fillStyle = "#16354f";
  context.fillRect(0, 0, GAME_WIDTH, 68);
  context.fillStyle = "rgba(255,255,255,.08)";
  context.fillRect(0, 65, GAME_WIDTH, 3);

  const rooms = [
    [22, 88, 178, 404, "RECEPTION"],
    [218, 88, 345, 185, "MAIN OFFICE"],
    [581, 88, 357, 185, "BREAK ROOM"],
    [218, 291, 345, 201, "MANAGER OFFICE"],
    [581, 291, 357, 201, "SUPPLY + TEAM AREA"],
  ] as const;
  rooms.forEach(([x, y, width, height, label]) => {
    roundedRect(context, x, y, width, height, 16);
    context.fillStyle = "rgba(255,255,255,.78)";
    context.fill();
    context.strokeStyle = "rgba(39,67,61,.14)";
    context.stroke();
    context.fillStyle = "#72817b";
    context.font = "800 10px sans-serif";
    context.fillText(label, x + 14, y + 20);
  });

  const desks = [[290, 137], [463, 137], [650, 142], [790, 142], [304, 355], [640, 358], [787, 358]];
  desks.forEach(([x, y], index) => {
    context.fillStyle = index % 2 ? "#d8b78c" : "#cda77a";
    roundedRect(context, x - 42, y - 18, 84, 34, 7); context.fill();
    context.fillStyle = "#40515a";
    roundedRect(context, x - 13, y - 30, 28, 18, 3); context.fill();
    context.fillStyle = "#26383d";
    context.fillRect(x - 2, y - 12, 4, 9);
  });

  context.fillStyle = "#ee7962";
  roundedRect(context, 54, 128, 112, 54, 10); context.fill();
  context.fillStyle = "rgba(255,255,255,.88)";
  context.font = "900 12px sans-serif";
  context.fillText("PERKJOY LOCAL", 66, 150);
  context.font = "600 9px sans-serif";
  context.fillText("Delivery check-in", 66, 166);

  context.fillStyle = "#7ead8e";
  [190, 564, 926].forEach((x) => { context.beginPath(); context.arc(x, 470, 18, 0, Math.PI * 2); context.fill(); });
}

function drawEventBubble(context: CanvasRenderingContext2D, event: OfficeEvent, position: Position, time: number) {
  const definition = eventLabels[event.type];
  const warning = event.remaining <= 7;
  const pulse = warning ? 1 + Math.sin(time / 120) * .04 : 1;
  context.save();
  context.translate(position.x, position.y - 112);
  context.scale(pulse, pulse);
  roundedRect(context, -49, -27, 98, 52, 13);
  context.fillStyle = warning ? "#fff0ec" : "rgba(255,255,255,.96)";
  context.fill();
  context.strokeStyle = warning ? "#ef6a50" : definition.color;
  context.lineWidth = 2;
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = "#172e43";
  context.font = "900 11px sans-serif";
  context.fillText(event.stage === "pickup" ? "RILEY" : definition.label.toUpperCase(), 0, -9);
  context.font = "19px sans-serif";
  context.fillText(definition.icon, -25, 14);
  context.fillStyle = warning ? "#c9442e" : "#344f49";
  context.font = "900 14px monospace";
  context.fillText(`00:${Math.max(0, Math.ceil(event.remaining)).toString().padStart(2, "0")}`, 17, 12);
  context.restore();
}

export function GameCanvas({ activeEmployeeIds, automationSeconds, events, feedback, inventory, player, reducedMotion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Props>({ activeEmployeeIds, automationSeconds, events, feedback, inventory, player, reducedMotion });

  useEffect(() => {
    sceneRef.current = { activeEmployeeIds, automationSeconds, events, feedback, inventory, player, reducedMotion };
  }, [activeEmployeeIds, automationSeconds, events, feedback, inventory, player, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = new Image();
    image.src = sheetUrl;
    let sprites: Sprites | null = null;
    let frame = 0;
    let active = true;

    const draw = (time: number) => {
      if (!active) return;
      const scene = sceneRef.current;
      drawOffice(context);
      const bob = scene.reducedMotion ? 0 : Math.sin(time / 260) * 1.6;

      scene.activeEmployeeIds.forEach((id, index) => {
        const employee = employees.find((item) => item.id === id);
        if (!employee || !sprites) return;
        drawCharacter(context, sprites, employee.character, employee.position, employee.character === "sam" ? 82 : 91, bob * (index % 2 ? -1 : 1));
        context.textAlign = "center";
        context.font = "800 10px sans-serif";
        context.fillStyle = "#253b45";
        context.fillText(employee.name, employee.position.x, employee.position.y + 15);
      });

      const pickup = scene.events.some((event) => event.stage === "pickup");
      if (pickup && sprites) drawCharacter(context, sprites, "riley", { x: 108, y: 302 }, 98, bob);

      scene.events.forEach((event) => {
        const employee = employees.find((item) => item.id === event.employeeId);
        const position = event.stage === "pickup" ? { x: 108, y: 302 } : employee?.position;
        if (position) drawEventBubble(context, event, position, time);
      });

      if (sprites) drawCharacter(context, sprites, "jordan", scene.player, 106, bob * .6);
      if (scene.inventory) {
        context.fillStyle = "#f36f55";
        roundedRect(context, scene.player.x + 22, scene.player.y - 92, 42, 26, 8); context.fill();
        context.fillStyle = "white"; context.textAlign = "center"; context.font = "900 9px sans-serif";
        context.fillText("LOCAL", scene.player.x + 43, scene.player.y - 75);
      }

      if (scene.automationSeconds > 0) {
        context.strokeStyle = `rgba(255,195,54,${.5 + Math.sin(time / 150) * .25})`;
        context.lineWidth = 6;
        context.strokeRect(5, 73, GAME_WIDTH - 10, GAME_HEIGHT - 78);
      }

      if (scene.feedback) {
        const age = (time / 16) % 100;
        context.save();
        context.textAlign = "center";
        context.font = "900 17px sans-serif";
        context.fillStyle = scene.feedback.perfect ? "#c68412" : "#34705b";
        context.fillText(scene.feedback.label, scene.feedback.x, scene.feedback.y - 128 - Math.min(18, age / 5));
        if (scene.feedback.perfect && !scene.reducedMotion) {
          const colors = ["#f36f55", "#f5c85b", "#4b8c70", "#4fa9df"];
          for (let i = 0; i < 24; i += 1) {
            context.fillStyle = colors[i % colors.length];
            const angle = (i / 24) * Math.PI * 2;
            const radius = 32 + (time / 9 + i * 7) % 68;
            context.fillRect(scene.feedback.x + Math.cos(angle) * radius, scene.feedback.y - 80 + Math.sin(angle) * radius, 5, 8);
          }
        }
        context.restore();
      }

      frame = requestAnimationFrame(draw);
    };
    image.onload = () => {
      sprites = {
        alex: transparentCrop(image, "alex"),
        taylor: transparentCrop(image, "taylor"),
        jordan: transparentCrop(image, "jordan"),
        riley: transparentCrop(image, "riley"),
        sam: transparentCrop(image, "sam"),
      };
      frame = requestAnimationFrame(draw);
    };
    return () => { active = false; cancelAnimationFrame(frame); };
  }, []);

  return <canvas ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT} aria-label="PerkJoy Office Rush office play field" />;
}
