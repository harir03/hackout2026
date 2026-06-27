import httpx
import numpy as np

async def generate(token: str, rng: np.random.Generator, risk_profile: str) -> dict:
    if token.startswith("mock-gmail-token-"):
        return _mock_gmail_data(rng, risk_profile)

    headers = {"Authorization": f"Bearer {token}"}
    q = "subject:order confirmed OR from:flipkart.com OR from:amazon.in OR from:meesho.com"
    url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages?q={q}"

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers, timeout=5.0)
            if res.status_code != 200:
                return _mock_gmail_data(rng, risk_profile)
            
            messages_data = res.json()
            messages = messages_data.get("messages", [])
            total_messages = len(messages)
            
            if total_messages == 0:
                return _empty_gmail_data()

            unique_senders = set()
            return_emails_count = 0
            
            # Sample a few messages to inspect details (limit to 10 for performance)
            sample_size = min(total_messages, 10)
            for msg in messages[:sample_size]:
                msg_id = msg.get("id")
                msg_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}"
                msg_res = await client.get(msg_url, headers=headers, timeout=2.0)
                if msg_res.status_code == 200:
                    msg_detail = msg_res.json()
                    snippet = msg_detail.get("snippet", "").lower()
                    if "return" in snippet or "cancel" in snippet or "refund" in snippet:
                        return_emails_count += 1
                    
                    headers_list = msg_detail.get("payload", {}).get("headers", [])
                    for h in headers_list:
                        if h.get("name", "").lower() == "from":
                            from_val = h.get("value", "").lower()
                            if "flipkart" in from_val:
                                unique_senders.add("flipkart.com")
                            elif "amazon" in from_val:
                                unique_senders.add("amazon.in")
                            elif "meesho" in from_val:
                                unique_senders.add("meesho.com")

            purchase_frequency = max(1, int(total_messages / 6))
            category_diversity = max(1, len(unique_senders))
            return_rate = float(return_emails_count / sample_size) if sample_size > 0 else 0.0
            
            spend_multiplier = {
                "low": 2000.0,
                "medium": 1200.0,
                "high": 600.0
            }.get(risk_profile, 1200.0)
            
            avg_spend = float(purchase_frequency * spend_multiplier * rng.uniform(0.8, 1.2))
            
            return {
                "ecom_purchase_frequency": purchase_frequency,
                "ecom_return_rate": round(return_rate, 4),
                "ecom_avg_monthly_spend": round(avg_spend, 2),
                "ecom_spend_trend": round(float(rng.uniform(-0.05, 0.05)), 6),
                "ecom_account_age_months": int(rng.integers(12, 48)),
                "ecom_category_diversity": category_diversity,
                "source": "gmail"
            }
    except Exception:
        return _mock_gmail_data(rng, risk_profile)

def _mock_gmail_data(rng: np.random.Generator, risk_profile: str) -> dict:
    purchase_frequency = {
        "low": int(rng.integers(6, 15)),
        "medium": int(rng.integers(3, 8)),
        "high": int(rng.integers(1, 4))
    }.get(risk_profile, 5)

    return_rate = {
        "low": float(rng.uniform(0.01, 0.05)),
        "medium": float(rng.uniform(0.05, 0.12)),
        "high": float(rng.uniform(0.12, 0.25))
    }.get(risk_profile, 0.08)

    avg_spend = {
        "low": float(rng.uniform(5000, 15000)),
        "medium": float(rng.uniform(2500, 7000)),
        "high": float(rng.uniform(800, 3000))
    }.get(risk_profile, 4000.0)

    spend_trend = {
        "low": float(rng.uniform(0.01, 0.05)),
        "medium": float(rng.uniform(-0.02, 0.02)),
        "high": float(rng.uniform(-0.08, -0.01))
    }.get(risk_profile, 0.0)

    account_age = int(rng.integers(12, 60))
    category_diversity = {
        "low": int(rng.integers(3, 6)),
        "medium": int(rng.integers(2, 4)),
        "high": int(rng.integers(1, 3))
    }.get(risk_profile, 3)

    return {
        "ecom_purchase_frequency": purchase_frequency,
        "ecom_return_rate": round(return_rate, 4),
        "ecom_avg_monthly_spend": round(avg_spend, 2),
        "ecom_spend_trend": round(spend_trend, 6),
        "ecom_account_age_months": account_age,
        "ecom_category_diversity": category_diversity,
        "source": "gmail"
    }

def _empty_gmail_data() -> dict:
    return {
        "ecom_purchase_frequency": 0,
        "ecom_return_rate": 0.0,
        "ecom_avg_monthly_spend": 0.0,
        "ecom_spend_trend": 0.0,
        "ecom_account_age_months": 0,
        "ecom_category_diversity": 0,
        "source": "gmail"
    }
