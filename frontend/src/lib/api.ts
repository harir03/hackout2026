import axios from 'axios'
import type { ScoreResponse, AdvisorResponse, DashboardOverview } from './types'

const api = axios.create({ baseURL: '/api' })

export async function fetchScore(
  userId: string,
  consentedSources: string[]
): Promise<ScoreResponse> {
  const { data } = await api.post<ScoreResponse>('/score', {
    user_id: userId,
    consented_sources: consentedSources,
  })
  return data
}

export async function fetchScoreById(userId: string): Promise<ScoreResponse> {
  const { data } = await api.get<ScoreResponse>(`/score/${userId}`)
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
