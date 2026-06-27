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
