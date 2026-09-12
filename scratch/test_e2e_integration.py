import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def test_mascot():
    print("1. Testing Chatbot Status & Mascot...")
    req = urllib.request.Request(f"{BASE_URL}/chat/status")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("   /chat/status:", data["status"], "ollama_online:", data["ollama_online"])

    payload = json.dumps({"message": "લોન કેવી રીતે મેળવવી?", "language": "gu"}).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/chat/mascot",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("   /chat/mascot (gu) reply:", data["reply"][:60], "...")

def test_personalization():
    print("\n2. Testing Personalization & Persona Segmentation for Farmer...")
    req = urllib.request.Request(f"{BASE_URL}/personalize/farmer@altgrade.in")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("   Persona:", data["segment"]["name"])
        print("   Health Status:", data["health"]["status"], f"({data['health']['status_label']})")
        print("   Stability Score:", data["health"]["stability_score"])
        print("   Schemes Matched:", len(data["recommendations"]))
        for r in data["recommendations"][:2]:
            print(f"     - {r['scheme_name']} ({r['match_score']}% match)")

def test_officer_alerts():
    print("\n3. Testing Loan Officer Alerts Banner Endpoint...")
    req = urllib.request.Request(f"{BASE_URL}/personalize/alerts/officer")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"   Officer Alerts Count: {len(data['alerts'])}")
        for a in data["alerts"]:
            print(f"     • [{a['urgency'].upper()}] {a['name']}: {a['message'][:50]}... -> Action: {a['action']}")

def test_underwriter_simulation():
    print("\n4. Testing Underwriter Restructuring Simulator...")
    payload = json.dumps({
        "user_id": "farmer@altgrade.in",
        "loan_amount": 150000,
        "tenure_months": 36,
        "annual_interest_rate": 7.0,
        "moratorium_months": 2,
        "behavioral_improvements": ["kcc_holder"]
    }).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/personalize/simulate",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"   Monthly EMI: ₹{data['monthly_emi']:.2f}")
        print(f"   FOIR Ratio: {data['foir_ratio_pct']:.1f}% (Affordable: {data['is_affordable']})")
        print(f"   Score Impact: {data['score_delta']} pts (Projected: {data['projected_score']})")
        print(f"   Schedule: {data['repayment_schedule_type']}")
        print(f"   Guidance: {data['guidance']}")

if __name__ == "__main__":
    test_mascot()
    test_personalization()
    test_officer_alerts()
    test_underwriter_simulation()
    print("\nALL BACKEND & PERSONALIZATION MODULES VERIFIED SUCCESSFULLY!")
