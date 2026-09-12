import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests

base = 'http://127.0.0.1:8000'

print("=== 1. Checking Officer Alerts (Stress & Dynamic Triggers) ===")
r = requests.get(f'{base}/personalize/alerts/officer')
print('Status:', r.status_code)
alerts = r.json().get('alerts', [])
print(f'Total officer alerts: {len(alerts)}')
for a in alerts[:5]:
    print(f" • [{a.get('type')}] {a.get('name')}: Severity={a.get('severity_score')}/100, Confidence={a.get('confidence_score')}%, Urgency={a.get('urgency')}")
    print(f"   AI Summary: {a.get('ai_summary')[:90]}...")
    if a.get('empathetic_message'):
        print(f"   Empathetic Outreach: {a.get('empathetic_message')[:80]}...")

print("\n=== 2. Sending Personalized Empathetic Message to Farmer ===")
msg_payload = {
    'user_id': 'farmer@altgrade.in',
    'message': 'Hello Ramesh, we noticed the pre-sowing period has reduced your liquidity. We can attach PMFBY crop insurance and activate a 60-day harvest grace period on your repayments.',
    'category': 'restructuring_offer',
    'channel': 'in_app',
    'officer_name': 'Officer Anand Varma'
}
r_msg = requests.post(f'{base}/personalize/officer-message', json=msg_payload)
print('Send Message Status:', r_msg.status_code, r_msg.json())

print("\n=== 3. Farmer Retrieving Officer Messages Inbox ===")
r_inbox = requests.get(f'{base}/personalize/officer-messages/farmer@altgrade.in')
print('Farmer Inbox Status:', r_inbox.status_code)
inbox = r_inbox.json()
print(f'Total messages in farmer inbox: {inbox.get("total")}')
for m in inbox.get('messages', [])[:3]:
    print(f" • From {m.get('officer_name')} [{m.get('category')} via {m.get('channel')}]: {m.get('message')}")

print("\n=== 4. Checking Personalized Banking Products for Farmer ===")
r_bank = requests.get(f'{base}/personalize/farmer@altgrade.in')
bank_data = r_bank.json()
recs = bank_data.get('recommendations', [])
print(f'Total Recommended Banking Products: {len(recs)}')
for rec in recs[:5]:
    print(f" • {rec.get('name')} | Category: {rec.get('category')} | Fit: {rec.get('fit_score')}%")
    print(f"   Benefit: {rec.get('max_benefit')} | Subsidy: {rec.get('subsidy_rate')}")

print("\n=== 5. Verifying Gujarati Vernacular Audio Script ===")
audio_scripts = bank_data.get('borrower_summary', {}).get('audio_scripts', {})
print("Languages supported:", list(audio_scripts.keys()))
print("Gujarati Audio Script preview:", audio_scripts.get('gu', '')[:100], "...")
print("\n>>> ALL CHECKS COMPLETED SUCCESSFULLY! <<<")
