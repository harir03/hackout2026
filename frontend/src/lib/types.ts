export interface ShapFeature {
  worker: string
  label: string
  points: number
  direction: string
  feature_value: number
  explanation: string
}

export interface SignalConflict {
  positive_worker: string
  positive_net_points: number
  negative_worker: string
  negative_net_points: number
  combined_magnitude: number
  description: string
}

export interface ScoreResponse {
  user_id: string
  score: number
  risk_band: string
  tier: string
  model_version: string
  shap_details: ShapFeature[]
  signal_conflicts: SignalConflict[]
  hard_caps_applied: string[]
  tier1_reweight: string | null
  has_conflicts: boolean
  has_hard_cap: boolean
  consent_id?: string
  ecom_source?: string
}

export interface SourceChunk {
  id: string
  source: string
  excerpt: string
}

export interface AdvisorResponse {
  answer: string
  question: string
  sources: SourceChunk[]
  applicant_context_used: boolean
}

export interface ConsentState {
  d1_bank: boolean
  d2_telecom: boolean
  d3_ecommerce: boolean
  d4_location: boolean
  d5_questionnaire: boolean
  d6_merchant: boolean
}

export interface BandCount {
  band: string
  count: number
  percentage: number
}

export interface ConflictApplicant {
  user_id: string
  score: number
  band: string
  conflicts: string[]
}

export interface FairnessResult {
  demographic_parity_ratio: number
  passes_four_fifths: boolean
  last_audit: string
}

export interface DashboardOverview {
  total_scored: number
  approval_rate: number
  conflict_count: number
  hard_cap_count: number
  band_distribution: BandCount[]
  flagged_applicants: ConflictApplicant[]
  fairness: FairnessResult
}

export interface LoanTier {
  tenure_months: number
  monthly_emi: number
  total_repayment: number
}

export interface EligibilityResponse {
  user_id: string
  score: number
  risk_band: string
  is_eligible: boolean
  max_loan_amount: number
  interest_rate_annual: number
  tenure_options: LoanTier[]
}

export interface LoanApplicationResponse {
  application_id: string
  status: string
  message: string
}
