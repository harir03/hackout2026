import axios from 'axios'
import type { ScoreResponse, AdvisorResponse, DashboardOverview } from './types'

const api = axios.create({ baseURL: '/api' })

export async function fetchScore(
  userId: string,
  consentedSources: string[],
  consentId?: string
): Promise<ScoreResponse> {
  const { data } = await api.post<ScoreResponse>('/score', {
    user_id: userId,
    consented_sources: consentedSources,
    consent_id: consentId,
  })
  return data
}

export async function fetchScoreById(userId: string, consentId?: string): Promise<ScoreResponse> {
  const { data } = await api.get<ScoreResponse>(`/score/${userId}`, {
    params: { consent_id: consentId },
  })
  return data
}

export async function submitConsent(
  userId: string,
  consentedSources: string[]
): Promise<{ consent_id: string; status: string }> {
  const { data } = await api.post<{ consent_id: string; status: string }>('/consent', {
    user_id: userId,
    consented_sources: consentedSources,
  })
  return data
}


export async function askAdvisor(
  userId: string,
  question: string
): Promise<AdvisorResponse> {
  const { data } = await api.post<AdvisorResponse>('/advisor/ask', {
    user_id: userId,
    question,
  })
  return data
}

export async function fetchDashboard(): Promise<DashboardOverview> {
  const { data } = await api.get<DashboardOverview>('/dashboard/overview')
  return data
}

export async function verifyPan(
  pan: string,
  phone: string
): Promise<{
  pan: string
  name: string
  dob: string
  entity_type: string
  aadhaar_linked: boolean
  status: string
}> {
  const { data } = await api.post('/identity/pan', { pan, phone })
  return data
}

export async function sendAadhaarOtp(
  aadhaar: string
): Promise<{ status: string; message: string }> {
  const { data } = await api.post('/identity/aadhaar/otp', { aadhaar })
  return data
}

export async function verifyAadhaarOtp(
  aadhaar: string,
  otp: string
): Promise<{ status: string; message: string }> {
  const { data } = await api.post('/identity/aadhaar/verify', { aadhaar, otp })
  return data
}

export async function checkLiveness(
  image: string
): Promise<{
  status: string
  face_detected: boolean
  confidence: number
  message: string
}> {
  const { data } = await api.post('/identity/liveness', { image })
  return data
}
