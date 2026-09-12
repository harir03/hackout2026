# AltGrade Engine — Engineering & Architecture Spec

Status: Production engineering spec and reference build guide. Written for Antigravity (GEMINI.md + Skills + Workflows).

---

## 1. Project Brief (drop this into GEMINI.md verbatim)

```
AltGrade is an AI-powered alternate credit scoring system for
credit-invisible individuals and MSMEs in India. It scores users 0-850 using six
consented alternate data sources (UPI/bank, telecom, e-commerce, geolocation,
psychometric questionnaire, merchant/GST) instead of traditional credit history.

Stack: FastAPI (Python 3.11) backend, React + TypeScript + shadcn/ui frontend,
PostgreSQL for audit trail, ChromaDB for RAG, Redis for caching/session state only.
ML: XGBoost + LightGBM blend, isotonic calibration, SHAP for explainability,
Fairlearn for bias auditing.

This is a prototype build using SYNTHETIC data only — no real UPI/AA/telecom API
access exists at this stage. Every data source is Faker-generated with realistic
distributions. Never claim "real production data" anywhere in code, comments, or UI.

Conventions: TypeScript strict mode, Python type hints + Pydantic v2 everywhere,
async def for all I/O-bound FastAPI routes, no inline styles in React (Tailwind only).
```

---

## 2. Stack Decisions (with reasoning)

| Layer | Choice | Why |
|---|---|---|
| Frontend components | **shadcn/ui** (not TailAdmin this time) | TailAdmin ships finished pages you import as a dependency. shadcn/ui copies component source directly into your repo — you own and edit the actual files, which is exactly the "custom files for this project" approach you asked for, and it means an agent editing the code is editing your code, not a black box. Built on Radix UI primitives, so keyboard nav, focus management, and ARIA come built-in — solves the accessibility gap from earlier without you doing it by hand. |
| Frontend base | **shadcn-admin** (free, MIT, ~6k GitHub stars) as the starting skeleton | Sidebar, command palette, theming, TanStack Table already wired. You customize from here instead of building chrome from zero. |
| Charts | **Recharts** | Official shadcn/ui chart examples use it; works cleanly for the score gauge, SHAP horizontal bar, and score-distribution donut on the dashboard. |
| Backend | **FastAPI**, `async def` routes | I/O-bound fan-out (6 simultaneous data fetches) is the canonical async use case. |
| 6-worker coordination | **`asyncio.gather()`**, not Redis Pub/Sub | This is a correction to the deck's stated architecture (see §7, Council Notes). Pub/Sub is for cross-process/distributed messaging. Your 6 workers run inside one request-response cycle in one process — `asyncio.gather()` fans them out and waits for all to finish with far less code and no extra moving part to deploy. |
| Redis | Cache + session state + rate limiting only | Still useful — just not as the worker-coordination mechanism. Cache SHAP computations per user-session, store partial dashboard state, rate-limit the scoring endpoint. |
| DB | PostgreSQL | Audit trail (users, scores, shap_values, feedback) — matches the deck. |
| Vector store | ChromaDB | Local, embedded, zero infra to stand up — right choice for an embedded RAG layer. |
| ML | XGBoost (Tier 1) + XGBoost/LightGBM blend (Tier 2) | Matches the deck; both are standard, well-supported gradient boosting libraries with native SHAP support. |
| Explainability | SHAP (TreeExplainer) | TreeExplainer is fast on tree-based models — sub-second per prediction, fine for a live demo. |
| Fairness | **Fairlearn**, not AIF360 | Fairlearn is sklearn-native and considered the more usable of the two in independent comparisons — faster to wire into your XGBoost pipeline. AIF360 has more mitigation algorithms but a steeper API and is less actively the "easy" pick for a solo build. |
| Calibration | `CalibratedClassifierCV` (Tier 1) + `IsotonicRegression` (Tier 2 blend) | Matches the deck's "isotonic calibration" claim — `CalibratedClassifierCV` only works on a single estimator (Tier 1), the Tier 2 blend needs a standalone `IsotonicRegression` fit on the averaged probability. |

---

## 3. Reference Implementation to Study First

Before writing your own pipeline, have the agent read through this repo's structure (don't copy verbatim, but the module layout maps almost 1:1 onto what you need):

**`explainable-credit-scoring`** (`https://github.com/chukant20-cyber/explainable-credit-scoring`) — explainability-first credit scoring framework: `data_preprocessing/ → model_training/ → explanation_generation/ → fairness_evaluation/ → statistical_testing/`, each with a `run_all_*.py`. This is the exact pipeline shape for D1-D6 → Tier1/Tier2 → SHAP → Fairlearn. Note: its fairness module is built on AIF360, not Fairlearn — use it for the pipeline structure only, the fairness implementation in §2 should still follow Fairlearn as recommended. It's also a small individual repo, not a vetted production dependency — read it, don't import it.

A published benchmark on this same approach (XGBoost + SHAP on Home Credit / LendingClub / UCI Credit Card datasets) reports AUC of roughly 0.89–0.92 and Brier scores of 0.12–0.15 — use these as realistic reference numbers if a judge asks "what accuracy does this kind of model actually get," instead of inventing one.

---

## 4. Synthetic Data Layer (Faker-based)

No real AA/UPI/telecom API access exists for a prototype build — be upfront about this in code comments and on the "simulated" label in the UI (the deck already does this correctly on Slide 10, keep it that way).

Generate one Faker-based generator per worker, each producing realistic *distributions*, not just random noise — this matters because your Tier 1/Tier 2 models need signal to actually learn from:

```python
# data_synth/generators.py
from faker import Faker
import numpy as np

fake = Faker("en_IN")  # India locale — names, addresses, phone formats

def gen_telecom_history(user_id: str, months: int = 24) -> dict:
    # Bias on-time-payment rate around a Beta distribution so "good" and
    # "risky" synthetic users actually separate — uniform random defeats the model.
    on_time_rate = np.random.beta(a=8, b=2)  # skewed toward reliable payers
    payments = np.random.binomial(1, on_time_rate, months)
    return {"user_id": user_id, "months_tracked": months,
            "on_time_payments": int(payments.sum()), "on_time_rate": on_time_rate}
```

Repeat this pattern for D1 (UPI/bank — inflow trend + balance volatility), D3 (e-commerce — purchase frequency + return rate), D4 (location — address-change count over 24mo), D5 (questionnaire — 30 Likert-scale answers scored against a rubric), D6 (merchant/GST — filing regularity %). Each generator should accept a hidden `risk_profile` parameter (`low` / `medium` / `high`) so you can generate labeled training data where the label is known, then train the model to recover that signal from the 6 worker outputs — this is what makes the "10,000 simulated applicants" score distribution on Slide 10 honest rather than arbitrary.

---

## 5. Backend — Worker Fan-Out Pattern

```python
# api/routes/score.py
import asyncio
from fastapi import APIRouter

router = APIRouter()

async def fetch_d1_bank(user_id: str) -> dict: ...
async def fetch_d2_telecom(user_id: str) -> dict: ...
async def fetch_d3_ecommerce(user_id: str) -> dict: ...
async def fetch_d4_location(user_id: str) -> dict: ...
async def fetch_d5_questionnaire(user_id: str) -> dict: ...
async def fetch_d6_merchant(user_id: str) -> dict: ...

@router.post("/score/{user_id}")
async def score_user(user_id: str, consented_sources: list[str]):
    tasks = {
        "D1": fetch_d1_bank(user_id) if "D1" in consented_sources else None,
        "D2": fetch_d2_telecom(user_id) if "D2" in consented_sources else None,
        "D3": fetch_d3_ecommerce(user_id) if "D3" in consented_sources else None,
        "D4": fetch_d4_location(user_id) if "D4" in consented_sources else None,
        "D5": fetch_d5_questionnaire(user_id) if "D5" in consented_sources else None,
        "D6": fetch_d6_merchant(user_id) if "D6" in consented_sources else None,
    }
    active = {k: v for k, v in tasks.items() if v is not None}
    results = await asyncio.gather(*active.values())
    worker_data = dict(zip(active.keys(), results))
    # → Consolidator: contradiction check → Fairness Filter → Tier 1/2 model → SHAP
    ...
```

This single block replaces the deck's "Redis Pub/Sub signals completion of all 6 workers" line in actual code. Each `fetch_*` function is just a synthetic-data call here (or a real `httpx.AsyncClient` call later if you wire up real APIs) — `asyncio.gather` waits for all of them and returns when the slowest one finishes, which is the real mechanism behind your "30 seconds" claim.

---

## 6. ML + Explainability + Fairness Skeleton

```python
# ml/train.py
import numpy as np
import xgboost as xgb
import lightgbm as lgb
from sklearn.isotonic import IsotonicRegression
import shap
from fairlearn.metrics import MetricFrame, demographic_parity_ratio

# Tier 2 — full footprint
xgb_model = xgb.XGBClassifier(...)
lgb_model = lgb.LGBMClassifier(...)
xgb_model.fit(X_train, y_train)
lgb_model.fit(X_train, y_train)

blended_train_probs = np.mean(
    [xgb_model.predict_proba(X_train)[:, 1], lgb_model.predict_proba(X_train)[:, 1]],
    axis=0,
)  # CalibratedClassifierCV can't wrap a blend, IsotonicRegression can
calibrator = IsotonicRegression(out_of_bounds="clip")
calibrator.fit(blended_train_probs, y_train)

explainer = shap.TreeExplainer(xgb_model)
shap_values = explainer.shap_values(X_user)  # per-prediction, sub-second

# Fairness audit — run after every scoring batch, not just at training time
dpr = demographic_parity_ratio(y_pred, sensitive_features=demographic_col)
if dpr < 0.8:  # the 80% rule, matches deck's "DIR audit <80% → red flag"
    flag_for_review()
```

Keep gender/religion/caste **out of the feature matrix entirely** (pre-processing fairness layer in the deck) — Fairlearn's `demographic_parity_ratio` only needs the sensitive attribute as a *side input* for auditing, never as a model feature.

---

## 7. RAG Advisor (ChromaDB + Gemini API)

- Chunk RBI guideline PDFs with **400–500 token chunks, 10–20% overlap** (50–100 tokens) — this is the standard recursive-splitting starting point; tune only if retrieval misses on testing.
- One ChromaDB collection for `rbi_guidelines`, one for `lending_precedents`, matching the deck's Slide 10 schema.
- Embeddings and generation both run on the Gemini API — one key, simpler for a solo build. Generation model: `gemini-2.5-flash`. Do not use any `gemini-2.0-*` model — deprecated June 1, 2026, already past that date. Newer preview models (3 Flash, 3.1 Flash-Lite) are also free-tier, but check the exact model-id string in Google AI Studio before hardcoding one — they move fast.
- Retrieval flow: embed query → top-k similarity search → inject chunks into the prompt → generate. Keep top-k small (3–5); large k adds noise, not accuracy.
- Be careful with the phrase "zero hallucinations" — RAG reduces hallucination risk by grounding in retrieved text, it doesn't mathematically guarantee zero. The accurate statement is "every answer is grounded in retrieved RBI source chunks, not freely generated".

---

## 8. Frontend Build Map

| Component Area | Component | Notes |
|---|---|---|
| Consent Screen | shadcn `Switch` + `Checkbox` group | Each data source = one toggle, all default off (opt-in, not opt-out — required for DPDP framing) |
| Score Bands | Recharts `RadialBarChart` or custom SVG gauge | 0–850 with the 5 color bands |
| SHAP Breakdown | Recharts horizontal `BarChart`, sorted by `|shap_value|` | Green for positive, amber/red for negative |
| RAG Advisor | shadcn `Card` + chat-style message list | Simple input → response list, no need for a full chat SDK |
| Score Distribution | Recharts `PieChart` or `BarChart` | Label "Simulated" directly on the chart title, not just in a footnote |
| Dashboard Shell | shadcn-admin sidebar + `DataTable` | Loan officer view: applicant list with score, status, SHAP-link |

---

## 9. Phased Build Sequence (for Antigravity workflows)

Write these as separate prompts/workflows — matches how you already work:

1. **Scaffold** — clone shadcn-admin, strip unused pages, set up FastAPI skeleton with `/score` route stub, Postgres schema migration.
2. **Synthetic data generators** — all 6 Faker generators with risk-profile biasing (§4). Generate 2,000–10,000 synthetic applicants to a CSV/Parquet for training.
3. **ML training pipeline** — Tier 1 (3-signal) and Tier 2 (6-signal) models, isotonic calibration, save artifacts.
4. **SHAP + Fairlearn integration** — wire explainer into the scoring route, add the fairness audit step.
5. **Consolidator + hard blocks** — contradiction-flagging logic between workers, wilful-defaulter cap-at-200 rule.
6. **RAG layer** — chunk + embed a small real set of RBI Fair Practices Code / DPDP Act excerpts into ChromaDB, wire retrieval into an advisor endpoint.
7. **Frontend wiring** — consent screen → score reveal → SHAP breakdown → RAG advisor → loan-officer dashboard, in that order.
8. **Visual QA pass** — run the live build through defect checklist (overflow, contrast, alignment).

---

## 10. Technical Architecture Notes

1. **Redis Pub/Sub → `asyncio.gather()`** for the 6-worker fan-out. Pub/Sub is a distributed-systems tool for cross-process messaging; your 6 workers live in one request handler. `asyncio.gather()` is the textbook-correct pattern and is dramatically less code to build and debug. Redis stays in the stack, just doing cache/session/rate-limit work instead.
2. **Population Statistics Framing** — A TransUnion CIBIL report puts India's credit-eligible population at ~1,036 million, with only ~277 million actively using formal credit: "over 750 million credit-eligible Indians aren't actively using formal credit" is a defensible, sourced claim.
3. **"Zero hallucinations" (RAG Advisor)** — reworded above to "grounded in retrieved source chunks".
4. **AIF360 vs Fairlearn** — Fairlearn over AIF360 for time-to-implement; noted in §2 with reasoning for modular fairness.
5. **TailAdmin → shadcn/ui** — shadcn/ui copies component source directly into your repo — you own and edit the actual files, and built-in Radix UI primitives provide accessible keyboard nav and ARIA.
6. **`CalibratedClassifierCV` on a blended model** — `CalibratedClassifierCV` wraps a single estimator's own internal cross-validation; it can't take an already-averaged XGBoost+LightGBM probability array as input. Tier 1 (single XGBoost) keeps `CalibratedClassifierCV`. Tier 2 (the blend) needs a standalone `IsotonicRegression` fit directly on the blended probabilities instead — fixed in §6.
7. **RAG generation model** — picked after asking: Gemini API (`gemini-2.5-flash`) for generation, Gemini embeddings for retrieval, one key for both. Note for future reference: `gemini-2.0-*` models were deprecated June 1, 2026 — don't let any generated code default to one from older examples or training data.
