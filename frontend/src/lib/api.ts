import axios from 'axios'
import type { ScoreResponse, AdvisorResponse, DashboardOverview, EligibilityResponse, LoanApplicationResponse } from './types'

const api = axios.create({ baseURL: '/api' })

export async function fetchScore(
  userId: string,
  sources: string[],
  consentId?: string,
  phone?: string,
  answers?: string,
  timeTakenMs?: number,
  changesCount?: number,
  locationHistory?: string
): Promise<ScoreResponse> {
  const { data } = await api.post<ScoreResponse>('/score', {
    user_id: userId,
    consented_sources: sources,
    consent_id: consentId,
    phone: phone,
    answers: answers ? JSON.parse(answers) : undefined,
    time_taken_ms: timeTakenMs,
    changes_count: changesCount,
    location_history: locationHistory ? JSON.parse(locationHistory) : undefined,
  })
  return data
}

export async function fetchScoreById(userId: string, consentId?: string): Promise<ScoreResponse> {
  const { data } = await api.get<ScoreResponse>(`/score/${userId}`, {
    params: { consent_id: consentId },
  })
  return data
}

export async function requestOutboundCall(
  userId: string,
  phone: string,
  language: string,
  profession: string
): Promise<{ status: string; message: string; call_id?: string }> {
  const { data } = await api.post('/vapi/outbound-call', {
    user_id: userId,
    phone,
    language,
    profession,
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

export async function fetchApplicantProfile(userId: string): Promise<{
  user_id: string
  score: number
  risk_band: string
  tier: string
  shap_details: Array<{ label: string; points: number; worker: string }>
  signal_conflicts: Array<{ description: string }>
  hard_caps_applied: string[]
}> {
  const { data } = await api.get(`/advisor/profile/${encodeURIComponent(userId)}`)
  return data
}

export async function fetchUserNotifications(userId: string): Promise<{
  has_notification: boolean
  user_id: string
  decision?: string
  interest_rate?: number
  terms?: string
  timestamp?: string
}> {
  const { data } = await api.get(`/dashboard/notifications/${encodeURIComponent(userId)}`)
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
  email?: string,
  name?: string
): Promise<{
  pan: string
  name: string
  dob: string
  entity_type: string
  aadhaar_linked: boolean
  status: string
}> {
  const { data } = await api.post('/identity/pan', { pan, phone, email, name })
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
  terms: string,
  notes: string = '',
  loanAmount?: number
): Promise<{ status: string; user_id: string; decision: string }> {
  const { data } = await api.post('/dashboard/decision', {
    user_id: userId,
    decision,
    interest_rate: interestRate,
    terms,
    notes,
    loan_amount: loanAmount,
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

export interface DecisionRecord {
  user_id: string
  decision: string
  interest_rate: number
  terms: string
  notes: string
  timestamp: string
}

export async function fetchAllDecisions(): Promise<DecisionRecord[]> {
  const { data } = await api.get<{ decisions: DecisionRecord[] }>('/dashboard/decisions')
  return data.decisions
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

export async function fetchEligibility(
  userId: string,
  score: number,
  band: string
): Promise<EligibilityResponse> {
  const { data } = await api.get<EligibilityResponse>(
    `/eligibility/${encodeURIComponent(userId)}`,
    { params: { score, band } }
  )
  return data
}

export async function submitLoanApplication(params: {
  userId: string
  score: number
  riskBand: string
  loanAmount: number
  tenureMonths: number
  monthlyEmi: number
  interestRate: number
  phone: string
  name: string
}): Promise<LoanApplicationResponse> {
  const { data } = await api.post<LoanApplicationResponse>('/eligibility/apply', {
    user_id: params.userId,
    score: params.score,
    risk_band: params.riskBand,
    loan_amount: params.loanAmount,
    tenure_months: params.tenureMonths,
    monthly_emi: params.monthlyEmi,
    interest_rate: params.interestRate,
    phone: params.phone,
    name: params.name,
  })
  return data
}

export async function submitInterviewSummary(
  userId: string,
  summary: string
): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>('/eligibility/interview/summary', {
    user_id: userId,
    summary,
  })
  return data
}

export async function fetchInterviewSummary(
  userId: string
): Promise<{ summary: string; status: string }> {
  const { data } = await api.get<{ summary: string; status: string }>(
    `/eligibility/interview/summary/${encodeURIComponent(userId)}`
  )
  return data
}

