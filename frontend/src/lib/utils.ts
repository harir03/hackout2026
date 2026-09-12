import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}



/**
 * Initials from a display name: first character of the first word + first
 * character of the last word. One word only: first two characters. Empty: `?`.
 */
export function getDisplayNameInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  const first = parts[0][0] ?? ''
  const last = parts[parts.length - 1]?.[0] ?? ''
  return (first + last).toUpperCase()
}

/**
 * Get pre-filled callback phone number from environment variables
 */
export function getDefaultPhone(): string {
  const envPhone = (import.meta as any).env?.VITE_CALLBACK_PHONE || (import.meta as any).env?.VITE_DEFAULT_PHONE
  return (envPhone || '9876543215').trim()
}

/**
 * Mask phone number for presenting to user: e.g. "9876543215" -> "+91 98••••••15"
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 10) {
    const last10 = digits.slice(-10)
    const first2 = last10.slice(0, 2)
    const last2 = last10.slice(-2)
    return `+91 ${first2}••••••${last2}`
  }
  if (digits.length > 4) {
    return `${digits.slice(0, 2)}••••${digits.slice(-2)}`
  }
  return phone
}

