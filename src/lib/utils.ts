import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPeriodLabel(year: number, month: number, half: number): string {
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const monthName = monthNames[month - 1];
  const periodStr = half === 1 ? "1-15" : "16-" + getLastDay(year, month);
  return `${periodStr} ${monthName} ${year}`;
}

export function getLastDay(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getCurrentPeriod(): { year: number; month: number; half: number } {
  const now = new Date();
  const day = now.getDate();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    half: day <= 15 ? 1 : 2,
  };
}

export function getMonthName(month: number): string {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return monthNames[month - 1];
}
