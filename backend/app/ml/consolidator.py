from typing import Any

WILFUL_DEFAULTER_CAP = 200
HIGH_EMI_BURDEN_CAP = 350
WORKER_CONFLICT_THRESHOLD = 50.0


def apply_hard_caps(
    score: int,
    applicant_flags: dict[str, Any],
) -> tuple[int, list[str]]:
    applied_caps = []

    if applicant_flags.get("is_wilful_defaulter", False):
        score = min(score, WILFUL_DEFAULTER_CAP)
        applied_caps.append(f"RBI wilful defaulter: capped at {WILFUL_DEFAULTER_CAP}")

    if applicant_flags.get("high_emi_burden", False):
        score = min(score, HIGH_EMI_BURDEN_CAP)
        applied_caps.append(f"EMI burden exceeds threshold: capped at {HIGH_EMI_BURDEN_CAP}")

    return score, applied_caps


def detect_worker_conflicts(
    shap_details: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    worker_nets: dict[str, float] = {}
    worker_neg_totals: dict[str, float] = {}
    worker_pos_totals: dict[str, float] = {}
    for feat in shap_details:
        w = feat["worker"]
        worker_nets[w] = worker_nets.get(w, 0.0) + feat["points"]
        if feat["points"] < 0:
            worker_neg_totals[w] = worker_neg_totals.get(w, 0.0) + feat["points"]
        else:
            worker_pos_totals[w] = worker_pos_totals.get(w, 0.0) + feat["points"]

    workers = list(worker_nets.keys())
    conflicts = []

    for i in range(len(workers)):
        for j in range(i + 1, len(workers)):
            w_a, w_b = workers[i], workers[j]
            net_a, net_b = worker_nets[w_a], worker_nets[w_b]

            if net_a * net_b >= 0:
                continue

            combined_magnitude = abs(net_a) + abs(net_b)
            if combined_magnitude < WORKER_CONFLICT_THRESHOLD:
                continue

            pos_worker = w_a if net_a > 0 else w_b
            neg_worker = w_b if net_a > 0 else w_a

            conflicts.append({
                "positive_worker": pos_worker,
                "positive_net_points": round(max(net_a, net_b), 1),
                "negative_worker": neg_worker,
                "negative_net_points": round(min(net_a, net_b), 1),
                "combined_magnitude": round(combined_magnitude, 1),
                "description": f"{pos_worker} ({max(net_a, net_b):+.1f} pts) contradicts {neg_worker} ({min(net_a, net_b):+.1f} pts)",
            })

    MIXED_SIGNAL_THRESHOLD = 4.0
    if not conflicts:
        mixed_workers = []
        for w in workers:
            neg_total = abs(worker_neg_totals.get(w, 0.0))
            if neg_total >= MIXED_SIGNAL_THRESHOLD and worker_nets[w] > 0:
                mixed_workers.append((w, worker_nets[w], worker_neg_totals[w]))

        if mixed_workers:
            mixed_workers.sort(key=lambda x: abs(x[2]))
            strongest_pos = max(workers, key=lambda w: worker_nets[w])

            for w, net, neg_total in mixed_workers:
                if w == strongest_pos:
                    continue
                conflicts.append({
                    "positive_worker": strongest_pos,
                    "positive_net_points": round(worker_nets[strongest_pos], 1),
                    "negative_worker": w,
                    "negative_net_points": round(neg_total, 1),
                    "combined_magnitude": round(worker_nets[strongest_pos] + abs(neg_total), 1),
                    "description": f"{strongest_pos} ({worker_nets[strongest_pos]:+.1f} pts) has mixed signals with {w} (net {net:+.1f}, but {neg_total:.1f} pts in negative features)",
                })

            if not conflicts and mixed_workers:
                w, net, neg_total = mixed_workers[-1]
                second_strongest = sorted(workers, key=lambda wk: worker_nets[wk], reverse=True)
                other = second_strongest[1] if len(second_strongest) > 1 else second_strongest[0]
                conflicts.append({
                    "positive_worker": other,
                    "positive_net_points": round(worker_nets[other], 1),
                    "negative_worker": w,
                    "negative_net_points": round(neg_total, 1),
                    "combined_magnitude": round(worker_nets[other] + abs(neg_total), 1),
                    "description": f"{w} has internal contradictions: net {net:+.1f} pts overall, but {neg_total:.1f} pts in negative features",
                })

    conflicts.sort(key=lambda c: -c["combined_magnitude"])
    return conflicts


def apply_tier1_reweight(
    shap_details: list[dict[str, Any]],
    score: int,
) -> tuple[int, str | None]:
    loc_net = 0.0
    psych_net = 0.0

    for feat in shap_details:
        if feat["worker"] == "Location":
            loc_net += feat["points"]
        elif feat["worker"] == "Questionnaire":
            psych_net += feat["points"]

    if loc_net < -10.0 and psych_net > 5.0:
        penalty_reduction = min(abs(loc_net) * 0.3, 30.0)
        adjusted_score = score + int(penalty_reduction)
        reason = (
            f"Location instability ({loc_net:+.1f} pts) moderated by "
            f"strong questionnaire ({psych_net:+.1f} pts): +{int(penalty_reduction)} pts"
        )
        return adjusted_score, reason

    return score, None


def run_consolidator(
    score: int,
    shap_details: list[dict[str, Any]],
    applicant_flags: dict[str, Any],
    tier: str = "tier2",
) -> dict[str, Any]:
    score, hard_cap_reasons = apply_hard_caps(score, applicant_flags)

    reweight_reason = None
    if tier == "tier1":
        score, reweight_reason = apply_tier1_reweight(shap_details, score)

    conflicts = detect_worker_conflicts(shap_details)

    return {
        "final_score": score,
        "hard_caps_applied": hard_cap_reasons,
        "signal_conflicts": conflicts,
        "tier1_reweight": reweight_reason,
        "has_conflicts": len(conflicts) > 0,
        "has_hard_cap": len(hard_cap_reasons) > 0,
    }
