import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripSiteSuffix(teamName: string): string {
  return teamName.replace(/\s*\(아산\)\s*|\s*\(화성\)\s*/g, '').trim();
}