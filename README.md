# AltGrade - Alternate Credit Scoring
> AI-powered alternate credit scoring for individuals and MSMEs with no credit history — built for underserved India.

---

## The Problem

Over 500 million Indians and countless MSMEs are locked out of formal credit — not because they're financially irresponsible, but because they've never borrowed before. Banks require credit history to give loans, but you need a loan to build credit history. AltGrade breaks this cycle.

---

## What We Built

A consent-gated alternate credit scoring system that evaluates loan eligibility using six everyday data signals instead of traditional credit history. The system produces an explainable 0–850 score with per-feature reasoning, a RAG-based loan advisor, and a fairness audit — all in under 60 seconds.

---

## How It Works

### 1. Consent Layer
The user explicitly consents to each data source individually before anything is accessed. Partial consent is handled gracefully — the system scores with whatever is available, adjusting the score ceiling based on data completeness. Compliant with India's DPDP Act 2023.

### 2. Six Parallel Data Workers
Six workers fire simultaneously, each with a single responsibility:

| Worker | Data Source | Key Signal |
|--------|-------------|------------|
| D1 | UPI & Bank Cash Flow | Income regularity, EMI patterns, balance trend |
| D2 | Telecom & Utility Bills | 24-month payment consistency |
| D3 | E-Commerce Behavior | Return rate, basket growth, EMI purchase ratio |
| D4 | Geolocation Stability | District-level home/work stability (no GPS coordinates stored) |
| D5 | Psychometric Questionnaire | Financial responsibility, risk tolerance, future orientation |
| D6 | Merchant & GST Ratings | Business longevity, fulfillment consistency (MSME path) |

### 3. Two-Tier Feature Architecture
- **Tier 1** — Zero history users: D2 + D4 + D5 only. Simpler model, lower ceiling, still fair.
- **Tier 2** — Users with some digital footprint: Full D1–D6. Blended ensemble model.

### 4. Blended ML Engine
XGBoost and LightGBM run independently and their predictions are blended for higher accuracy. Isotonic calibration converts the raw output into a true probability — so a 70% default risk score actually reflects a 70% historical default rate, not just a relative number.

### 5. Three-Layer Fairness Enforcement
- **Pre-processing** — Gender, religion, caste, and ethnicity are removed before any model sees the data
- **In-processing** — Training samples are reweighted to prevent systematic group bias
- **Post-processing** — Disparate Impact Ratio audit checks that no demographic group's approval rate falls below 80% of the highest group's rate (four-fifths rule)

Geolocation is included per PS1 specification but capped at 5% feature weight and restricted to district-level precision to mitigate proxy discrimination risk.

### 6. Scoring (0–850)
```
750–850  Excellent   →  Best loan terms
650–749  Good        →  Standard terms
550–649  Fair        →  Higher interest rate
450–549  Poor        →  Small loan only
< 450    Not eligible →  Improvement plan provided
```
Hard blocks apply regardless of score — RBI wilful defaulters are capped at 200 with no override.

### 7. SHAP Explainability
Every score comes with a plain-language breakdown of which data points helped and which hurt. Required by RBI Fair Practices Code. If rejected, the user sees exactly what to improve and by how much.

### 8. RAG-Based Loan Advisor
Post-score, users can ask natural language questions. The advisor answers strictly from a knowledge base of RBI guidelines and lending precedents — no hallucinations, fully grounded responses.

---

## Handling Data Inconsistency

When workers return conflicting signals — for example, D1 shows stable income but D3 shows high-frequency distress purchases — the Consolidator layer flags the contradiction explicitly rather than averaging it away. Each data point carries its source and confidence score. Conflicts are logged, documented, and surfaced to the scoring engine as a separate feature (internal consistency score), which itself feeds into the Character component of the final score.

---

## Architecture Overview

```
User-Consent (DPDP Compliant)
        ↓
6 Parallel Data Workers (Celery + Redis)
        ↓
Consolidator — merge, conflict detection
        ↓
Validator Gate — completeness check, partial consent routing
        ↓
Two-Tier Feature Builder
        ↓
3-Layer Fairness Enforcement
        ↓
XGBoost + LightGBM Blend → Isotonic Calibration
        ↓
SHAP Explanation Generator
        ↓
0–850 Score + RAG Advisor
        ↓
React Dashboard (Vercel) ←→ FastAPI Backend (Render)
```

**Databases:**
- PostgreSQL — all decisions with full audit trail
- ChromaDB — RAG knowledge base
- Redis — worker coordination and caching

---

## Why This Architecture

**Most alternate credit systems pick one or two data signals.** ICA uses six simultaneously, cross-validates them against each other, and treats contradictions as signal rather than noise. The blend of XGBoost and LightGBM is specifically chosen because XGBoost handles structured financial ratios better while LightGBM handles sparse behavioral features better — together they cover the full alternate data feature space.

The consent-first design isn't just legal compliance — it's a trust mechanism. A first-generation borrower who understands exactly what data is being used and why is more likely to complete the application and engage honestly with the questionnaire.

---

## What Makes AltGrade Unique & Innovative

### 1. Automated Behavioral Persona & Profile Auto-Detection
AltGrade does not apply a rigid, one-size-fits-all model. Instead, it dynamically detects applicant demographic and economic personas based on raw behavioral signals:

- **🌾 Farmers & Agriculturalists**:
  - **Signal Pattern**: Zero e-commerce footprint, 2G/keypad phone telecom recharge behavior (recharges via local offline retail outlets), ancestral village location stability (30+ years in same village), and PM-Kisan / KCC discipline.
  - **Dynamic Adaptation**: AltGrade completely removes e-commerce and digital recharge penalties for farmers. Instead, it heavily weights **ancestral location stability** (34+ years zero address moves), PM-Kisan Direct Benefit Transfers, and Kisan Credit Card (KCC) post-harvest repayment promptness — producing an **Approved** rating (**710 / Excellent**).

---

### 2. Isotonic Calibration for True Empirical Default Probabilities
- **The Problem**: Standard tree-based ensemble models (XGBoost and LightGBM) excel at ranking risk, but their raw probability outputs are inherently uncalibrated — clustering near 0 or 1. A raw model score of 0.80 does not mean an 80% default rate.
- **The Solution**: AltGrade applies non-parametric **Isotonic Regression Calibration** post-ensemble blending.
- **Mathematical Rigor**: Isotonic calibration fits a monotonic non-decreasing step function $y = f(x)$ over out-of-fold predicted probabilities:
  $$\min \sum_{i=1}^n (y_i - \hat{p}_i)^2 \quad \text{subject to} \quad \hat{p}_i \le \hat{p}_j \quad \text{whenever} \quad y_i \le y_j$$
- **Banking Governance**: Converts abstract model scores into true calibrated default probabilities. A score of 700 maps directly to a 70% empirical non-default probability in historical data, satisfying strict RBI Model Risk Governance and Basel III Capital Reserve requirements.

---

### 3. Dual-Tier Scoring & Consolidator Engine
- **Tier 1 (Zero-History Users)**: D2 (Telecom) + D4 (Location) + D5 (Psychometrics). Evaluates credit-invisible individuals fairly without requiring a bank account.
- **Tier 2 (Full Digital Footprint)**: Blends D1–D6 for comprehensive multi-signal risk assessment.
- **Signal Conflict Detection**: When signals contradict (e.g., high income on D1 vs distress purchases on D3), the Consolidator flags the anomaly rather than smoothing it away, feeding an internal "character consistency score" directly into the final rating.

---

### 4. 3-Layer Bias Mitigation & SHAP Auditability
- **Pre-processing**: Strips demographic PII (gender, caste, religion, ethnicity) prior to model ingestion.
- **In-processing**: Reweights training samples to prevent group bias.
- **Post-processing**: Automated Disparate Impact Ratio (DIR) audit enforcing the 80% (Four-Fifths) rule across demographic subgroups.
- **SHAP Explainability**: Plain-language attribution (+/- points per feature) compliant with RBI Fair Practices Code.

---

## Dataset

This prototype uses synthetically generated data modelled on Indian alternate data patterns — UPI inflow distributions, telecom payment consistency rates, and psychometric response profiles calibrated to Indian microfinance research. Production deployment requires real Account Aggregator sourced data with RBI Financial Information User registration.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Tailwind CSS — deployed on Vercel |
| Backend | FastAPI, Python 3.12 — deployed on Render |
| ML | XGBoost, LightGBM, SHAP, scikit-learn |
| Queue | Celery + Redis |
| Databases | PostgreSQL, ChromaDB |
| Explainability | SHAP global summary + local force plots |
| Fairness | Disparate Impact Ratio audit (four-fifths rule) |

---

## PS1 Compliance Checklist

| Requirement | Implementation |
|-------------|----------------|
| Phone bill payment consistency | D2 Worker |
| E-commerce purchase behavior | D3 Worker |
| Geolocation stability | D4 Worker (district-level only) |
| Questionnaire-based risk | D5 Psychometric Worker |
| Merchant ratings | D6 Worker |
| Bank account cash flow | D1 UPI/Bank Worker |
| Psychometric & behavioral risk models | Isotonic-calibrated XGBoost + LightGBM blend |
| Consent-based data flow | DPDP-compliant per-source consent screen |
| Privacy & encryption compliance | No PII stored, derived scores only, purpose limitation enforced |
| Responsible lending practices | Hard blocks, DIR fairness audit, SHAP rejection explanations |

---

## Known Limitations

**Synthetic data only.** All data sources (UPI, telecom, e-commerce, geolocation, psychometric, merchant/GST) are Faker-generated with realistic biased distributions. No real Account Aggregator, CERSAI, or telecom API access exists at this stage. Production deployment requires RBI Financial Information User registration and live AA integration.

**Session-based consent.** Consent selections are stored in-browser for the duration of the session and passed to the scoring endpoint as request parameters. There is no server-side consent persistence, withdrawal audit trail, or consent receipt generation. A production system would store consent records in PostgreSQL with timestamps, purpose codes, and revocation history per DPDP Act 2023 Section 6.

**Gemini API key required for advisor.** The RAG-based credit advisor requires a valid `GEMINI_API_KEY` environment variable (Gemini 2.5 Flash). Without it, the advisor endpoint returns a 503 response. ChromaDB collections must be indexed via `POST /advisor/ingest` before the advisor can answer questions. The advisor reduces but does not eliminate the risk of inaccurate responses.

---

## Setup & Launch

### Easiest Way: Using PowerShell Script

The root directory contains a helper script `dev.ps1` to orchestrate local setup and execution:

- **Launch Full Stack (Docker Compose, Backend, Frontend)**:
  ```powershell
  .\dev.ps1 dev
  ```
- **Launch Infrastructure Only (PostgreSQL + Redis)**:
  ```powershell
  .\dev.ps1 infra
  ```
- **Run Alembic Migrations**:
  ```powershell
  .\dev.ps1 migrate
  ```
- **Launch Backend Only**:
  ```powershell
  .\dev.ps1 backend
  ```
- **Launch Frontend Only**:
  ```powershell
  .\dev.ps1 frontend
  ```
- **Stop Infrastructure**:
  ```powershell
  .\dev.ps1 stop
  ```

### Manual Steps

#### 1. Backend Server Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Set up virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   # Windows
   .\.venv\Scripts\activate
   # Linux/Mac
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. Start the required Docker services:
   ```bash
   docker compose up -d
   ```
4. Run database migrations:
   ```bash
   python -m alembic upgrade head
   ```
5. Run the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

#### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```

---

## Demo Accounts

Use the following login credentials to test different user profiles and dashboard flows. The password is the same for all demo accounts.

| User Email | Password | Role / Profile Type | Expected Score & Loan Outcome |
|------------|----------|---------------------|-------------------------------|
| `admin@altgrade.in` | `Password@123` | Administrator | Accesses full credit officer decision dashboard |
| `admin@altgrade.com` | `Password@123` | Administrator | Accesses full credit officer decision dashboard |
| `testadmin@altgrade.in` | `Password@123` | Administrator | Accesses full credit officer decision dashboard (mock view) |
| `testhari@altgrade.in` | `Password@123` | Individual / Salaried | Static Score: **750 (Excellent)**<br>Outcome: **Rejected** (rejection testing override) |
| `farmer@altgrade.in` | `Password@123` | Farmer / Agriculturalist | Estimated Score: **710 (Excellent)**<br>Outcome: **Approved** (34-yr village location stability, zero e-commerce penalty, KCC/PM-Kisan discipline) |
| `msme@altgrade.in` | `Password@123` | MSME Merchant | Estimated Score: **610 (Fair)**<br>Outcome: **Approved** (smartphone, literate, valid GST) |
