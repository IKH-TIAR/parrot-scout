import json

# Load existing workflow
with open(r'AI Voice Agency - Working.json', 'r') as f:
    wf = json.load(f)

wf['name'] = 'AI Voice Agency - With Config'

# ── NEW NODE: Read Config (Google Sheets) ──
read_config_node = {
    "parameters": {
        "documentId": {
            "__rl": True,
            "value": "PASTE_YOUR_CONFIG_SHEET_URL_HERE",
            "mode": "url"
        },
        "sheetName": {
            "__rl": True,
            "value": "gid=0",
            "mode": "list",
            "cachedResultName": "Config"
        },
        "options": {}
    },
    "id": "a1b2c3d4-1111-2222-3333-444455556666",
    "name": "Read Config",
    "type": "n8n-nodes-base.googleSheets",
    "typeVersion": 4.7,
    "position": [-696, -48],
    "credentials": {
        "googleSheetsOAuth2Api": {
            "id": "jIjKJwUKv54jP30y",
            "name": "Google Sheets OAuth2 API"
        }
    }
}

# ── NEW NODE: Read Config SMS (for missed call path) ──
read_config_sms_node = {
    "parameters": {
        "documentId": {
            "__rl": True,
            "value": "PASTE_YOUR_CONFIG_SHEET_URL_HERE",
            "mode": "url"
        },
        "sheetName": {
            "__rl": True,
            "value": "gid=0",
            "mode": "list",
            "cachedResultName": "Config"
        },
        "options": {}
    },
    "id": "a1b2c3d4-5555-6666-7777-888899990000",
    "name": "Read Config SMS",
    "type": "n8n-nodes-base.googleSheets",
    "typeVersion": 4.7,
    "position": [-672, 320],
    "credentials": {
        "googleSheetsOAuth2Api": {
            "id": "jIjKJwUKv54jP30y",
            "name": "Google Sheets OAuth2 API"
        }
    }
}

# Add new nodes
wf['nodes'].append(read_config_node)
wf['nodes'].append(read_config_sms_node)

# ── MODIFY: OpenAI Voice Receptionist - use config for system prompt and fix input reference ──
for node in wf['nodes']:
    if node['name'] == 'OpenAI Voice Receptionist':
        node['parameters']['messages']['messageValues'][0]['message'] = (
            "={{ $('Read Config').item.json['ai_system_prompt'] }}"
        )
        node['parameters']['text'] = (
            "=Turn {{ ($('Twilio Voice Webhook').item.json.query || {}).turn || '1' }}. "
            "Caller says: {{ $('Twilio Voice Webhook').item.json.body.SpeechResult || '(new call)' }}"
        )


# ── MODIFY: Return TwiML XML - use config for voice, timeouts, max_turns ──
# Also fixes call-dropping: timeout 5→8, speechTimeout auto→3
for node in wf['nodes']:
    if node['name'] == 'Return TwiML XML':
        node['parameters']['responseBody'] = (
            '=<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Response>\n'
            "    <Say voice=\"{{ $('Read Config').item.json['greeting_voice'] || 'Polly.Joanna' }}\" language=\"en-US\">{{ $json.text }}</Say>\n"
            "    {{ ($json.text || '').toLowerCase().includes('stay safe') || Number(($('Twilio Voice Webhook').item.json.query || {}).turn || 1) >= Number($('Read Config').item.json['max_turns'] || 5) + 1 ? '<Hangup/>' : '<Gather input=\"speech\" method=\"POST\" language=\"en-US\" action=\"https://parrotscoutai.app.n8n.cloud/webhook/twilio-voice?turn=' + (Number(($('Twilio Voice Webhook').item.json.query || {}).turn || 1) + 1) + '\" timeout=\"' + ($('Read Config').item.json['gather_timeout'] || '8') + '\" speechTimeout=\"' + ($('Read Config').item.json['speech_timeout'] || '3') + '\" speechModel=\"phone_call\" enhanced=\"true\"></Gather>' }}\n"
            '</Response>'
        )

# ── MODIFY: Is Lead Captured? - use config max_turns ──
for node in wf['nodes']:
    if node['name'] == 'Is Lead Captured?':
        for cond in node['parameters']['conditions']['conditions']:
            if cond.get('id') == 'd2e3f4a5-b6c7-8901-def0-234567890bcd':
                cond['rightValue'] = "={{ Number($('Read Config').item.json['max_turns'] || 5) }}"

# ── MODIFY: Send Missed Call SMS - use config for SMS message ──
for node in wf['nodes']:
    if node['name'] == 'Send Missed Call SMS':
        node['parameters']['message'] = "={{ $('Read Config SMS').item.json['missed_call_sms'] || 'Sorry we missed your call! We will get back to you shortly. Reply to this message or call us back anytime.' }}"

# ── UPDATE CONNECTIONS ──
conns = wf['connections']

# Voice path: Webhook → Read Config → OpenAI (was: Webhook → OpenAI)
conns['Twilio Voice Webhook'] = {
    "main": [[{"node": "Read Config", "type": "main", "index": 0}]]
}
conns['Read Config'] = {
    "main": [[{"node": "OpenAI Voice Receptionist", "type": "main", "index": 0}]]
}

# Missed call path: Call Status → Read Config SMS → Is Missed Call? (was: Call Status → Is Missed Call?)
conns['Call Status Webhook'] = {
    "main": [[{"node": "Read Config SMS", "type": "main", "index": 0}]]
}
conns['Read Config SMS'] = {
    "main": [[{"node": "Is Missed Call?", "type": "main", "index": 0}]]
}

# Write output
with open(r'AI Voice Agency - With Config.json', 'w') as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)

print("DONE - Workflow written to: AI Voice Agency - With Config.json")
print("\nChanges made:")
print("  1. Added 'Read Config' node (Google Sheets) on voice call path")
print("  2. Added 'Read Config SMS' node (Google Sheets) on missed call path")
print("  3. OpenAI system prompt now reads from config sheet")
print("  4. TwiML voice, timeout, speechTimeout now read from config sheet")
print("  5. Is Lead Captured max_turns now reads from config sheet")
print("  6. Missed Call SMS message now reads from config sheet")
print("  7. Default timeout changed 5→8, speechTimeout auto→3 (call drop fix)")
print("\n⚠️  BEFORE IMPORTING: Replace 'PASTE_YOUR_CONFIG_SHEET_URL_HERE' with your actual config sheet URL")
