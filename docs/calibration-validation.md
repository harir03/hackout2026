# Model Calibration Validation Report

## Model Performance (AUC)
- **AUC (Tier 1 Model — Give Me Some Credit)**: 0.8682
- **AUC (Tier 2 Model — Home Credit Default Risk)**: 0.7428
> Comparable published approaches report AUC of 0.79–0.92 (Home Credit benchmark studies)

## 1. Give Me Some Credit Dataset (Tier 1 Validation)
### Brier Score Comparison
- **Raw XGBoost Brier Score**: 0.048697
- **Calibrated XGBoost Brier Score**: 0.048631
- **Improvement**: 0.14% reduction in probability error

### Calibration Curve (Predicted vs Observed Default Rate)
| Bin | Uncalibrated Predicted | Calibrated Predicted | Observed Outcome Rate |
|---|---|---|---|
| 1 | 0.0282 | 0.0266 | 0.0259 |
| 2 | 0.1352 | 0.1355 | 0.1427 |
| 3 | 0.2487 | 0.2464 | 0.2373 |
| 4 | 0.3459 | 0.3408 | 0.3310 |
| 5 | 0.4487 | 0.4474 | 0.4810 |
| 6 | 0.5483 | 0.5497 | 0.5563 |
| 7 | 0.6407 | 0.6342 | 0.6360 |
| 8 | 0.7404 | 0.7385 | 0.8000 |
| 9 | 0.8333 | 0.8403 | 0.7692 |

## 2. Home Credit Default Risk Dataset (Tier 2 Validation)
### Brier Score Comparison
- **Raw Blended Model Brier Score**: 0.068713
- **Calibrated Blended Model Brier Score**: 0.068568
- **Improvement**: 0.21% reduction in probability error

### Overall Calibration Curve
| Bin | Raw Blended Predicted | Calibrated Predicted | Observed Outcome Rate |
|---|---|---|---|
| 1 | 0.0505 | 0.0441 | 0.0450 |
| 2 | 0.1371 | 0.1435 | 0.1403 |
| 3 | 0.2385 | 0.2424 | 0.2579 |
| 4 | 0.3355 | 0.3357 | 0.3295 |
| 5 | 0.4341 | 0.4308 | 0.4057 |
| 6 | 0.5176 | 0.5738 | 0.5692 |

### Per-Risk-Band Calibration (Tier 2 Stratified Analysis)
| Risk Band | Mean Predicted Probability | Observed Default Rate | Band Brier Score |
|---|---|---|---|
| Low Risk | 0.0227 | 0.0246 | 0.023947 |
| Medium Risk | 0.0607 | 0.0599 | 0.056102 |
| High Risk | 0.1741 | 0.1743 | 0.137413 |

## Conclusion and Scope Limitation
This validates that the calibration methodology (CalibratedClassifierCV for Tier 1, IsotonicRegression for the Tier 2 blend) is implemented correctly — it does not validate model accuracy for Indian credit-invisible populations, since neither dataset contains that population. That validation requires real production outcomes or an institutional data partnership.