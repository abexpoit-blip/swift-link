import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * User-facing bot/crawler counter.
 * Raw crawler fetch counts look alarming to publishers, so member dashboards
 * show a damped figure (40% lower). Admin panels keep the raw value.
 */
export const BOT_DISPLAY_FACTOR = 0.6;

export function displayBotCount(raw: number | null | undefined): number {
  const n = Number(raw || 0);
  if (n <= 0) return 0;
  return Math.max(1, Math.round(n * BOT_DISPLAY_FACTOR));
}

