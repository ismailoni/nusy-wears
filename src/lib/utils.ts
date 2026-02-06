import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type FirestoreTimestampLike = {
  toDate: () => Date
}

export function formatFirestoreTimestamp(
  value: unknown,
  locale: string = "en-NG",
  options?: Intl.DateTimeFormatOptions,
  fallback: string = ""
): string {
  if (!value) {
    return fallback
  }

  let date: Date | null = null

  if (value instanceof Date) {
    date = value
  } else if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed
    }
  } else if (typeof value === "object") {
    const maybeTimestamp = value as FirestoreTimestampLike
    if (typeof maybeTimestamp?.toDate === "function") {
      const parsed = maybeTimestamp.toDate()
      if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
        date = parsed
      }
    }
  }

  if (!date) {
    return fallback
  }

  return new Intl.DateTimeFormat(locale, options).format(date)
}
