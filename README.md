# AltGrade — Alternate Credit Scoring & AI Financial Inclusion Engine

> **PSB Hackathon 2026 — Problem Statement 1 (PS1)**  
> AI-powered alternate credit scoring for credit-invisible individuals, farmers, and MSMEs in India — built with explainable ML, local RAG advisory, multi-signal conflict resolution, and multilingual voice interaction.

---

## 🔑 Demo Accounts & Login Credentials

Use the following pre-configured credentials to test different applicant profiles, scoring tiers, and officer dashboard capabilities.

| User Email | Password | Profile / Profession | Tonal Behavioral Footprint | Expected Outcome & Score |
|:---|:---|:---|:---|:---|
| `admin@altgrade.in` | `Password@123` | Credit Officer / Admin | Full supervisory access to decision log, knowledge audit, & risk analytics | **Admin Dashboard Access** |
| `admin@altgrade.com` | `Password@123` | Credit Officer / Admin | Full supervisory access | **Admin Dashboard Access** |
| `testadmin@altgrade.in` | `Password@123` | Credit Officer (Mock) | Simulated risk officer view | **Admin Dashboard Access** |
| `testhari@altgrade.in` | `Password@123` | Salaried / Individual | High UPI income, low volatility, complete bank statement | **750 (Excellent)** — *Rejected (Override testing)* |
| `farmer@altgrade.in` | `Password@123` | Farmer / Agriculturalist | Ancestral village stability (34 yrs), zero e-commerce penalty, KCC & PM-Kisan discipline | **710 (Excellent)** — **APPROVED** |
| `msme@altgrade.in` | `Password@123` | MSME Merchant | Active GST filings, medium turnover, digital payment QR footprint | **610 (Fair)** — **APPROVED** |

---

## 🚀 Setup & Execution Guide

### Option 1: Easiest Setup via PowerShell Script (`dev.ps1`)

The root directory contains a PowerShell orchestration script for simple one-command management:

```powershell
# Launch entire stack (PostgreSQL, Redis, Backend FastAPI, Frontend Vite)
.\dev.ps1 dev

# Launch infrastructure services only (PostgreSQL + Redis via Docker)
.\dev.ps1 infra

# Execute database migrations
.\dev.ps1 migrate

# Launch backend only (FastAPI on port 8000)
.\dev.ps1 backend

# Launch frontend only (Vite on port 5173)
.\dev.ps1 frontend

# Stop all background docker services
.\dev.ps1 stop
```

---

### Option 2: Manual Step-by-Step Setup

#### 1. Infrastructure Services (PostgreSQL & Redis)
Ensure Docker Desktop is running, then start the containers:
```bash
docker compose up -d
```

#### 2. Backend Setup (FastAPI Python 3.11)
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run Alembic migrations
python -m alembic upgrade head

# Start FastAPI dev server
python -m uvicorn app.main:app --reload --port 8000
```

#### 3. RAG Knowledge Base Ingestion (ChromaDB + Ollama)
```bash
# Ensure Ollama is running locally with nomic-embed-text and phi3:mini models pulled:
ollama pull nomic-embed-text
ollama pull phi3:mini

# Ingest RBI Guidelines and Lending Precedents into ChromaDB:
curl -X POST http://localhost:8000/api/advisor/ingest
```

#### 4. Frontend Setup (React + TypeScript + Tailwind CSS)
```bash
cd frontend

# Install node dependencies
npm install

# Launch Vite development server
npm run dev
```
The frontend will be live at `http://localhost:5173`.

---

## 🌟 What Makes AltGrade Unique & Innovative?

### 1. Dynamic Behavioral Persona Auto-Detection
AltGrade does not apply a rigid, one-size-fits-all model. Instead, it dynamically detects applicant demographic and economic personas based on raw behavioral signals:
* **🌾 Farmers & Agriculturalists**: AltGrade detects agricultural footprints (ancestral village location stability, zero e-commerce purchases, offline keypad phone recharges, and PM-Kisan / KCC discipline). It **completely removes penalties for lack of e-commerce spend**, heavily weighting 30+ year village residence stability and post-harvest promptness to grant fair credit access (**710 / Approved**).
* **🏬 MSMEs & Micro-Merchants**: Evaluates GST filing regularity, QR payment frequency, invoice settlement timelines, and shop/stock insurance coverage instead of personal credit bureau scores.
* **💼 Salaried / Gig Economy Workers**: Evaluates balance volatility, minimum balance ratio, and recurring utility bill promptness.

### 2. Multi-Signal Conflict Engine (The Consolidator)
When data sources return conflicting signals (e.g., Worker D1 shows steady UPI income but Worker D3 shows frequent late-night impulse/distress purchases), AltGrade **never averages out the contradiction**. Instead, the **Consolidator Engine** logs explicit signal conflicts, calculates a combined magnitude, and factors an internal "character consistency score" into the final decision.

### 3. Native Multilingual Voice Questionnaire & Outbound AI Callback
Recognizing low functional literacy in rural India, AltGrade features a fully localized voice interface:
* **In-Browser Voice Q&A**: Uses Web Speech API with pre-loaded native voices (`hi-IN`, `te-IN`, `en-IN`). Applicants can listen to questions and speak answers in Hindi, Telugu, or English.
* **Outbound AI Phone Officer**: Integrates with **Vapi AI** to initiate automated telephony calls directly to an applicant's mobile phone, conducting structured voice interviews in their preferred language.

---

## 🤖 Machine Learning Engine (In-Depth Architecture)

AltGrade's scoring engine runs a 5-phase ML pipeline designed for high accuracy, statistical calibration, and strict fairness compliance.

```
+-----------------------------------------------------------------------------------+
|                            6 PARALLEL DATA WORKERS                                |
|  [D1: Bank/UPI] [D2: Telecom] [D3: E-Com] [D4: Location] [D5: Psych] [D6: GST]    |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
|                           TWO-TIER FEATURE BUILDER                                |
|   Tier 1 (16 Features): D2 + D4 + D5 (For Zero-History Credit Invisible Users)    |
|   Tier 2 (34 Features): D1 + D2 + D3 + D4 + D5 + D6 (Full Digital Footprint)       |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
|                        3-LAYER BIAS & FAIRNESS MITIGATION                         |
|   Pre-processing: PII Removal | In-processing: Reweighting | Post: DIR 80% Audit |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
|                    ENSEMBLE BLENDING & ISOTONIC CALIBRATION                       |
|   XGBoost (50%) + LightGBM (50%) ---> Isotonic Regression (Probability Mapping)   |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
|                        CONSOLIDATOR & HARD CAP ENGINE                             |
|   Wilful Defaulter (Cap 200) | High EMI (Cap 350) | Signal Conflict Detection   |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
|                        FINAL SCORE (0–850) & SHAP REASONING                       |
|   Fair Practices Explainability Code + Local & Global SHAP Point Breakdown        |
+-----------------------------------------------------------------------------------+
```

### Phase 1: Feature Extraction & Two-Tier Architecture
* **Tier 1 (16 Features)**: Designed for zero-history users. Evaluates Telecom on-time rate, trend, plan value, active months, location address changes, years at current address, metro status, home ownership, and psychometric engagement metrics.
* **Tier 2 (34 Features)**: Blends bank monthly inflow, inflow trend, balance volatility, UPI transaction count, min balance ratio, e-commerce purchase frequency, return rate, spend trend, category diversity, and GST merchant filing regularity.

### Phase 2: Ensemble Model Blending
AltGrade runs **XGBoost** and **LightGBM** independently in parallel:
* **XGBoost**: Handles dense tabular ratio features (bank inflow trends, GST turnover ratios) with `max_depth=3`, `subsample=0.7`, `learning_rate=0.08`.
* **LightGBM**: Handles sparse behavioral and categorical signals (psychometric response patterns, e-commerce diversity) with `max_depth=3`, `colsample_bytree=0.5`.
* Predictions are blended 50/50: $P_{\text{blend}} = \frac{P_{\text{XGB}} + P_{\text{LGBM}}}{2}$.

### Phase 3: Isotonic Regression Calibration
Standard decision tree ensembles output uncalibrated probabilities that cluster near extremes. AltGrade applies non-parametric **Isotonic Regression Calibration** over predicted probabilities:
$$\min \sum_{i=1}^n (y_i - \hat{p}_i)^2 \quad \text{subject to} \quad \hat{p}_i \le \hat{p}_j \quad \text{whenever} \quad y_i \le y_j$$
This maps raw model outputs directly to empirical default rates, satisfying **Basel III Capital Reserve** and **RBI Model Governance** guidelines.

### Phase 4: Non-Linear Score Mapping (0–850 Scale)
Calibrated probabilities are mapped to credit bands:
* **750–850**: Excellent (Low Risk)
* **650–749**: Good (Medium-Low Risk)
* **550–649**: Fair (Medium Risk)
* **450–549**: Poor (High Risk)
* **0–449**: Not Eligible

### Phase 5: Consolidator Hard Caps & Overrides
* **Wilful Defaulters**: Hard-capped at **200 points** regardless of alternate data strength (RBI CERSAI mandate).
* **High EMI Burden**: Hard-capped at **350 points** if debt-to-income exceeds safety thresholds.
* **Location Reweighting**: If location instability (-10 pts) is accompanied by strong psychometric financial discipline (+5 pts), the location penalty is automatically reduced by up to 30%.

---

## 📚 RAG Credit Advisor (Local LLM Architecture)

Post-assessment, applicants and credit officers can interact with the **RAG Credit Advisor**, an AI assistant grounded in regulatory frameworks and lending precedents.

```
[User Question (Hindi / Telugu / English)]
                       │
                       ▼
    [ChromaDB Vector Retrieval (Cosine Distance)]
    ├── rbi_guidelines (RBI Fair Practices Code §6.3, DPDP Act 2023)
    └── lending_precedents (Resolved grievance tickets)
                       │
                       ▼
 [Prompt Construction + Applicant Score Context + SHAP Factors]
                       │
                       ▼
     [Ollama Local LLM: phi3:mini (3.8B, 2048 ctx)]
     (Fallback: Gemini 2.5 Flash if Ollama offline)
                       │
                       ▼
 [Grounded, Multilingual Response with Regulatory Citations]
```

### Key RAG Features
1. **Zero Data Leakage & Offline Capable**: Runs completely locally via **Ollama (`phi3:mini`)** and **ChromaDB**, using `nomic-embed-text` embeddings. No applicant PII leaves the server.
2. **Automatic Language Detection & Mirroring**: The RAG prompt enforces strict language matching. If an applicant asks a question in Hindi ("मेरा स्कोर 610 क्यों है?"), the advisor responds in Hindi with structured bold headings and actionable steps.
3. **Regulatory Grounding**: Every answer cites specific legal sections (e.g., *RBI Fair Practices Code §6.3* or *DPDP Act 2023 §12*).
4. **Resilient Fallback**: If local Ollama is offline, the advisor gracefully falls back to Google's `gemini-2.5-flash` API.

---

## 🔒 Identity & Security Architecture

AltGrade implements bank-grade identity verification prior to scoring:
* **PAN Verification**: Format validation and Sandbox API sandbox integration.
* **Aadhaar OTP**: Simulated 2-factor authentication with time-windowed OTP verification.
* **DeepFace Liveness Audit**: Computer-vision liveness detection using head rotation, eye blink verification, and facial embedding match.
* **DPDP Act 2023 Compliance**: Granular per-source consent toggles. Users can grant/revoke consent for individual data sources at any step.

---

## 🛠️ System Stack Overview

| Layer | Technologies & Frameworks |
|:---|:---|
| **Frontend UI** | React 18, TypeScript (Strict Mode), Tailwind CSS, Lucide Icons, Vite |
| **Backend API** | FastAPI (Async Python 3.11), Pydantic v2, Alembic, Uvicorn |
| **Machine Learning** | XGBoost, LightGBM, Scikit-Learn, SHAP, Isotonic Regression |
| **Vector DB & RAG** | ChromaDB (Embedded), Ollama (`phi3:mini`, `nomic-embed-text`), Google GenAI |
| **Relational Storage** | PostgreSQL (Dockerized / Supabase compatible) |
| **Cache & Task Queue** | Redis, Celery worker orchestration |
| **Voice & Telephony** | Web Speech API (Native SpeechSynthesis/Recognition), Vapi AI Outbound Telephony |
| **Identity & CV** | DeepFace, OpenCV, Sandbox.co.in API integration |

---

## 📋 PS1 Compliance & Regulatory Audit

| Hackathon Requirement | AltGrade Implementation Status |
|:---|:---|
| **Telecom & Utility Payment Signals** | **Worker D2**: 24-month payment promptness, plan value, data volume |
| **E-Commerce Purchase Patterns** | **Worker D3**: Return rate, spend trend, category diversity index |
| **Geolocation Stability** | **Worker D4**: District-level residence tenure (no raw GPS tracking) |
| **Psychometric Risk Assessment** | **Worker D5**: 15-question financial responsibility survey |
| **Merchant & Business Footprint** | **Worker D6**: GST filing regularity, shop longevity, turnover |
| **Bank Cash Flow Analysis** | **Worker D1**: UPI frequency, balance volatility, minimum balance ratio |
| **Explainable AI Mandate** | **SHAP Framework**: Feature-level point attribution per decision |
| **Fair Lending Enforcement** | **3-Layer Bias Audit**: Disparate Impact Ratio (DIR) 80% rule enforcement |
| **Privacy Compliance** | **DPDP Act 2023**: Granular consent gates, no unconsented data processing |
if we win this then  i might throw a party 

---

## 📄 License & Attribution

Developed for **PSB Hackathon 2026 (Problem Statement 1 - Alternate Credit Scoring)**.  
Built by Team AltGrade.
