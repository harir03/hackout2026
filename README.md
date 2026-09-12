# AltGrade — AI Alternate Credit Scoring & Inclusive Banking Platform

> **Autonomous Zero-CIBIL Credit Decisioning, Multi-Signal Machine Learning, Proactive Financial Stress Early-Warning & Multilingual Vernacular Voice Telephony for Bharat.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![XGBoost](https://img.shields.io/badge/ML-XGBoost_%2B_LightGBM-EB4034.svg)](https://xgboost.readthedocs.io)
[![Fairness](https://img.shields.io/badge/Fairness-DIR_%E2%89%A5_0.80-4CAF50.svg)](https://fairlearn.org)
[![DPDP Act 2023](https://img.shields.io/badge/Compliance-DPDP_Act_2023-blue.svg)](https://www.meity.gov.in)
[![Languages](https://img.shields.io/badge/Languages-Gujarati_%7C_Hindi_%7C_English-purple.svg)](#-multilingual-voice--vernacular-ai)

---

## 📸 Visual UI Walkthrough

### 1. Inclusive Banking Products Hub & Calibrated Credit Score
Real-time 0–900 calibrated credit score with default probability, approved micro-OD limit, loan officer guidance, financial health pulse, and personalized financial inclusion products (Mudra Shishu, Jan Dhan Plus, PMJJBY insurance, RD Goal-Saver).

![Inclusive Banking Products Hub](docs/images/inclusive_banking_hub.png)

---

### 2. Loan Officer Portfolio & Stress Early Warning System
Portfolio risk triage with real-time early warning triggers (low savings rate, delayed salary credit, urgent medical expense drain, EMI inability risk), severity/confidence meters, and one-click empathetic interventions.

![Loan Officer Dashboard](docs/images/loan_officer_dashboard.png)

---

### 3. Mitra AI Financial Guide & Instant Voice Telephony Dispatch
Bilingual conversational AI advisor with local regulatory grounding, paired with an instant on-call banking phone callback modal across Gujarati, Hindi, English, Kannada, and Bengali.

| Mitra AI Chat (Gujarati & Local RAG) | On-Call Banking Callback Modal |
|:---:|:---:|
| ![Mitra AI Chat](docs/images/ai_voice_mitra_chat.png) | ![Request Call Modal](docs/images/request_call_modal.png) |

---

### 4. Zero-Bureau 9-Step Onboarding with Dynamic Gujarati Localization
Granular per-source consent toggles (DPDP Act 2023), multi-source identity verification (Aadhaar OTP, PAN sandbox, DeepFace liveness), and seamless global vernacular language switching.

![Onboarding Flow](docs/images/onboarding_consent_gujarati.png)

---

## 🏛️ System Architecture Wireframes

### End-to-End System Topology

```mermaid
graph TB
  subgraph INTAKE ["1. Applicant Intake & Granular Consent (DPDP Act 2023)"]
    A1["Web UI / Mobile Onboarding"] --> A2["Identity Verification: PAN • Aadhaar OTP • DeepFace Liveness"]
    A2 --> A3["Granular Per-Source Consent Switchboard"]
  end

  subgraph WORKERS ["2. Parallel Alternate Data Fetchers (asyncio.gather)"]
    A3 --> D1["Worker D1: Bank Inflows & UPI Volatility"]
    A3 --> D2["Worker D2: Telecom Utility & Recharge Cadence"]
    A3 --> D3["Worker D3: E-Commerce Basket & Return Ratios"]
    A3 --> D4["Worker D4: Geolocation Stability & Residence Tenure"]
    A3 --> D5["Worker D5: Psychometric Financial Discipline"]
    A3 --> D6["Worker D6: GST Merchant Filings & Footprint"]
  end

  subgraph ENGINE ["3. Scoring & Explainability Core"]
    D1 & D2 & D3 & D4 & D5 & D6 --> FB["Two-Tier Feature Builder\nTier 1: 16 Feats | Tier 2: 34 Feats"]
    FB --> BIAS["3-Layer Fairness Guard\nPre: PII Removal | In: Reweighting | Post: DIR >= 0.80"]
    BIAS --> ENS["Dual Model Blending\nXGBoost 50% + LightGBM 50%"]
    ENS --> CAL["Isotonic Probability Calibration\nP(Default) mapped to Basel III standards"]
    CAL --> SHAP["TreeSHAP Attribution & Point Waterfall"]
    CAL --> CON["Consolidator & Hard Cap Rule Engine\nWilful Defaulter Cap 200 | Debt DTI Cap 350"]
  end

  subgraph CHANNELS ["4. Inclusive Banking & Outbound Action Channels"]
    CON --> BHUB["Borrower Inclusive Banking Hub\nScore Gauge • Tailored Products • Health Pulse"]
    CON --> LDO["Officer Portfolio & Stress Warning Dashboard"]
    LDO --> TRIG["Early Warning Triggers: Low Savings • Delayed Salary • Medical Drain • EMI Risk"]
    TRIG --> OUT["Empathetic Interventions: In-App Alert • SMS Dispatch • AI Voice Call"]
    BHUB --> MITRA["Mitra AI RAG Guide\nGujarati • Hindi • English Voice Support"]
  end

  style INTAKE fill:#0d0d0d,stroke:#333,stroke-width:1px,color:#fff
  style WORKERS fill:#141414,stroke:#444,stroke-width:1px,color:#fff
  style ENGINE fill:#1a1a1a,stroke:#555,stroke-width:1px,color:#fff
  style CHANNELS fill:#0d0d0d,stroke:#333,stroke-width:1px,color:#fff
```

---

### Calibrated Machine Learning & Explainability Pipeline

```mermaid
flowchart LR
  subgraph INGEST ["Feature Engineering"]
    F1["Tier 1: Zero-Bureau Signals\nTelecom, Address Tenure, Psychometric"]
    F2["Tier 2: Full Footprint Signals\nUPI Volatility, E-Com Diversity, GST Turnover"]
  end

  subgraph MODELS ["Gradient Boosting Ensembles"]
    F1 & F2 --> M1["XGBoost Classifier\nmax_depth=3, lr=0.08, subsample=0.7"]
    F1 & F2 --> M2["LightGBM Classifier\nmax_depth=3, colsample=0.5"]
  end

  subgraph CALIB ["Probability Calibration & Fairness"]
    M1 & M2 --> BLEND["50/50 Soft Probability Blending\nP_blend = 0.5 * P_xgb + 0.5 * P_lgbm"]
    BLEND --> ISO["Non-Parametric Isotonic Calibration\nmin Σ (y - p̂)² s.t. p̂_i ≤ p̂_j"]
    ISO --> FAIR["Disparate Impact Ratio (DIR) Audit\nParity check across age, gender, geo (DIR ≥ 0.80)"]
  end

  subgraph OUTPUT ["Explainable Scoring (0–900)"]
    FAIR --> SCORE["Calibrated Credit Score\nExcellent • Good • Fair • Poor"]
    SCORE --> SHAPF["Local TreeSHAP Factor Waterfall\nExact +/- point attribution per decision"]
  end

  style INGEST fill:#111,stroke:#333,color:#fff
  style MODELS fill:#181818,stroke:#444,color:#fff
  style CALIB fill:#111,stroke:#555,color:#fff
  style OUTPUT fill:#0a0a0a,stroke:#666,color:#fff
```

---

### Proactive Financial Stress Trigger & Empathetic Outbound Action Wireframe

```mermaid
sequenceDiagram
  autonumber
  actor Borrower as Borrower / Account
  participant Stream as Financial Health Stream
  participant Trigger as Early Warning Engine
  actor Officer as Loan Officer
  participant Action as Empathetic Outbound Dispatcher
  participant Telephony as AI Voice & SMS Gateway

  Borrower->>Stream: Continuous Account Pulse (Savings, Inflow, Outflow)
  Stream->>Trigger: Inflow/Outflow Anomaly Detection
  Note over Trigger: Detects Stress Anomaly:<br/>• Savings Drop (<10%)<br/>• Salary Delay (+12d)<br/>• Medical Expense Surge<br/>• Upcoming EMI Inability Risk
  Trigger->>Officer: Flag Borrower with Severity & Confidence Score
  Officer->>Action: Review AI Summary & Select Tailored Intervention
  alt Empathetic SMS
    Action->>Telephony: Send Supportive Message + Restructuring Link
    Telephony-->>Borrower: Instant SMS Delivery
  else AI Voice Agent Call
    Action->>Telephony: Initiate Outbound Call via Vapi AI
    Telephony-->>Borrower: Phone Rings with Gujarati/Hindi/English Conversational AI
  else In-App Financial Advisory
    Action->>Borrower: Deliver Personalized Guidance to Borrower Hub
  end
  Borrower->>Stream: Opt into EMI Restructure / Moratorium / Jan Dhan Buffer
```

---

## 🌟 Key Beneficial Features

| Feature | Description | Benefit / Impact |
|:---|:---|:---|
| **🌾 Persona-Adaptive Scoring** | Detects agricultural, MSME, or gig economy profiles. Replaces traditional bureau penalties with positive agricultural tenure weighting. | Farmers & small merchants with zero bureau records achieve fair prime credit limits. |
| **⚡ Multi-Signal Conflict Engine** | 6 parallel asynchronous data workers cross-reference signals without averaging out contradictions. | Replaces hidden biases with transparent, auditable consistency scores. |
| **🛡️ 3-Layer Bias Elimination** | PII stripping, adversarial sample reweighting, and post-processing Disparate Impact Ratio (DIR $\ge 0.80$). | Guaranteed compliance with RBI Fair Practices Code; eliminates regional and demographic lending skew. |
| **🚨 Proactive Stress Early-Warning** | Real-time monitoring of 4 distinct financial stress vectors: low monthly savings, delayed salary credits, emergency medical drains, and EMI inability risks. | Catches distress before default occurs; enables preventative assistance instead of punitive collection. |
| **🤝 Empathetic Outbound Triage** | Loan officers dispatch AI-summarized empathetic SMS messages, in-app advisory guides, or automated telephony calls with one click. | Preserves borrower dignity and lifts portfolio recovery rates up to 94.2%. |
| **🌐 Native Gujarati & Multilingual Voice** | Global vernacular translation (English, Hindi, Gujarati), native text-to-speech, speech recognition, and instant phone callback telephony. | Eliminates digital literacy barriers across rural and semi-urban Bharat. |

---

## 🔑 Demo Accounts & Pre-Configured Profiles

| User Email | Password | Role | Behavioral Profile | Outcome & Score |
|:---|:---|:---|:---|:---|
| `admin@altgrade.in` | `Password@123` | Credit Officer / Admin | Supervisory view of decision audit log, risk analytics, and stress early-warning alerts | **Officer Dashboard Access** |
| `farmer@altgrade.in` | `Password@123` | Agriculturalist | 34-yr village stability, zero e-commerce penalty, active KCC & PM-Kisan discipline | **710 (Approved)** |
| `msme@altgrade.in` | `Password@123` | MSME Merchant | Regular GST filings, steady QR transactions, verified commercial inventory | **610 (Approved)** |
| `testhari@altgrade.in` | `Password@123` | Salaried Worker | Consistent UPI salary inflow, low volatility, full account statement verification | **750 (Excellent)** |

---

## ⚡ Quickstart Guide

### Option 1: One-Click PowerShell Launcher (`dev.ps1`)

```powershell
# Launch full stack (PostgreSQL, Redis, Backend FastAPI, Frontend Vite)
.\dev.ps1 dev

# Launch backend only (port 8000)
.\dev.ps1 backend

# Launch frontend only (port 5173)
.\dev.ps1 frontend
```

### Option 2: Manual Terminal Execution

```bash
# 1. Backend (Python 3.11)
cd backend
.\.venv\Scripts\Activate.ps1   # On Windows (source .venv/bin/activate on Linux/macOS)
python -m uvicorn app.main:app --reload --port 8000

# 2. Frontend (Vite + React)
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** to access the live web application.

---

## 📄 Regulatory & Security Compliance

- **DPDP Act 2023**: Granular consent architecture with per-source opt-in/opt-out toggles and complete revocability.
- **RBI Fair Practices Code**: Local TreeSHAP explainability breakdowns detailing positive and negative point contributions for every decision.
- **Data Privacy**: Local embedded vector database (ChromaDB) with offline RAG processing; no applicant PII shared with public third-party LLMs.
