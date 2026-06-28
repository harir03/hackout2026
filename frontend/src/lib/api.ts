import axios from 'axios'
import type { ScoreResponse, AdvisorResponse, DashboardOverview } from './types'

const api = axios.create({ baseURL: '/api' })

export async function fetchScore(
  userId: string,
  sources: string[],
  consentId?: string,
  phone?: string,
  answers?: string
): Promise<ScoreResponse> {
  const { data } = await api.post<ScoreResponse>('/score', {
    user_id: userId,
    consented_sources: sources,
    consent_id: consentId,
    phone: phone,
    answers: answers ? JSON.parse(answers) : undefined,
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

export async function fetchDashboard(adminEmail?: string): Promise<DashboardOverview> {
  const { data } = await api.get<DashboardOverview>('/dashboard/overview', {
    params: { admin_email: adminEmail }
  })
  return data
}

export async function verifyPan(
  pan: string,
  phone: string,
  email?: string
): Promise<{
  pan: string
  name: string
  dob: string
  entity_type: string
  aadhaar_linked: boolean
  status: string
}> {
  const { data } = await api.post('/identity/pan', { pan, phone, email })
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

export async function submitDecision(
  userId: string,
  decision: string,
  interestRate: number,
  terms: string
): Promise<{ status: string; user_id: string; decision: string }> {
  const { data } = await api.post('/dashboard/decision', {
    user_id: userId,
    decision,
    interest_rate: interestRate,
    terms,
  })
  return data
}

export async function submitKnowledge(
  userId: string,
  officerNotes: string,
  chatHistory: Array<{ role: string; content: string }>
): Promise<{ status: string; user_id: string }> {
  const { data } = await api.post('/dashboard/knowledge', {
    user_id: userId,
    officer_notes: officerNotes,
    chat_history: chatHistory,
  })
  return data
}

export async function uploadBankStatement(
  userId: string,
  consentId: string,
  file: File
): Promise<ScoreResponse> {
  const formData = new FormData()
  formData.append('user_id', userId)
  formData.append('consent_id', consentId)
  formData.append('file', file)
  
  const { data } = await api.post<ScoreResponse>('/score/upload-statement', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return data
}
