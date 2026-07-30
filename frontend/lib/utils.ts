import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistanceToNow(dateInput: Date | string): string {
  let date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  // If the parsed date is derived from a string missing 'Z', it might have been parsed as local.
  // We can enforce UTC by appending 'Z' to the string if it lacks timezone info.
  if (typeof dateInput === 'string' && !dateInput.endsWith('Z') && !dateInput.includes('+') && !dateInput.includes('-')) {
    // If it looks like "2026-06-05T16:09:59" or "2026-06-05 16:09:59", append Z
    date = new Date(dateInput.replace(' ', 'T') + 'Z');
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
