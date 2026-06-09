import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

TWILIO_LINE = '+15077650557'
INPUT_FILE = 'AI Voice Agency - With Config (4).json'

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    wf = json.load(f)

# ─────────────────────────────────────────────────────────────────────────────
# COMMON EXPRESSIONS (reused across nodes)
# ─────────────────────────────────────────────────────────────────────────────
ts_ref     = "($('Twilio Voice Webhook').item.json.query || {}).ts"
turn_ref   = "($('Twilio Voice Webhook').item.json.query || {}).turn"
speech_ref = "$('Twilio Voice Webhook').item.json.body.SpeechResult"
from_ref   = "$('Twilio Voice Webhook').item.json.body.From"
to_ref     = "$('Twilio Voice Webhook').item.json.body.To"
caller_id  = f"{from_ref} === '{TWILIO_LINE}' ? {to_ref} : {from_ref}"

# THE FULL TRANSCRIPT: ts (past turns) + current SpeechResult (this turn)
# This ensures we never miss data from the final turn.
full_ts = (
    f"{{{{ {ts_ref} ? {ts_ref} + ' | T' + ({turn_ref} || '1') + ': ' + ({speech_ref} || '') "
    f": 'T1: ' + ({speech_ref} || '') }}}}"
)

for node in wf['nodes']:

    # ── 1: OpenAI Voice Receptionist ──────────────────────────────────────────
    # FIX: maxTokens 80→150 (enough to read back all 3 details)
    # FIX: text prompt — no actual newlines inside {{ }} blocks (was causing "Invalid syntax")
    if node['name'] == 'OpenAI Model':
        node['parameters']['options']['maxTokens'] = 150
        print('Fixed: OpenAI Model - maxTokens 80 -> 150')

    if node['name'] == 'OpenAI Voice Receptionist':
        # \\n inside {{ }} = valid JS escape for newline
        # \n  outside {{ }} = actual newline in the template (fine)
        node['parameters']['text'] = (
            f"=Turn {{{{ {turn_ref} || '1' }}}}."
            f"{{{{ {ts_ref} ? '\\n\\nConversation history:\\n' + {ts_ref} : '' }}}}"
            f"\n\nCurrent caller says: {{{{ {speech_ref} || '(new call - no speech yet)' }}}}"
        )
        print('Fixed: OpenAI Voice Receptionist - text prompt (valid syntax, real newlines outside expressions only)')

    # ── 2: Return TwiML XML ───────────────────────────────────────────────────
    # FIX: Change trigger phrase to "booking confirmed" (more specific)
    # The old "stay safe" check remains but we look for "booking confirmed. stay safe"
    # Actually keep "stay safe" as trigger since that's what the prompt uses
    # Just ensure max_turns default is 6 (more turns for confirmation flow)
    if node['name'] == 'Return TwiML XML':
        body = node['parameters']['responseBody']
        # Fix max_turns default: 4→6 (need extra turns for confirmation)
        body = body.replace("['max_turns'] || 5) + 1", "['max_turns'] || 6) + 1")
        body = body.replace("['max_turns'] || 4) + 1", "['max_turns'] || 6) + 1")
        node['parameters']['responseBody'] = body
        print('Fixed: Return TwiML XML - max_turns default -> 6 (allows confirmation turn)')

    # ── 3: Is Lead Captured? ──────────────────────────────────────────────────
    # Check for "booking confirmed" (more specific than just "stay safe")
    # Keep "stay safe" as fallback check, but also check "booking confirmed"
    if node['name'] == 'Is Lead Captured?':
        conditions = node['parameters']['conditions']['conditions']
        # Update max_turns condition
        for cond in conditions:
            rv = cond.get('rightValue', '')
            if rv in (4, 5) or (isinstance(rv, str) and ('|| 4)' in rv or '|| 5)' in rv)):
                cond['rightValue'] = "={{ Number($('Read Config').item.json['max_turns'] || 6) }}"
                print('Fixed: Is Lead Captured? - max_turns -> 6')
        # Update the "stay safe" text check to also catch "booking confirmed"
        for cond in conditions:
            if cond.get('rightValue') == 'stay safe':
                cond['rightValue'] = 'stay safe'  # Keep this as is
                print('OK: Is Lead Captured? - "stay safe" trigger retained')
        print('Fixed: Is Lead Captured? - updated')

    # ── 4: Extract Lead Details ───────────────────────────────────────────────
    # ROOT FIX: was using `ts || SpeechResult` which ignores SpeechResult if ts exists
    # NOW: uses ts (past turns) + SpeechResult (current turn) COMBINED
    # This ensures we NEVER miss data from any turn including the final one
    if node['name'] == 'Extract Lead Details':
        extract_txt = "$json.text.replace(/```json|```/g, '').trim()"

        node['parameters']['text'] = (
            "=Extract caller contact details from the FULL conversation transcript below.\n"
            "Return ONLY a raw JSON object (no markdown, no backticks, no explanation) with exactly these keys: name, address, phone.\n"
            "Search EVERY line carefully. If a field is not found anywhere, use \"not provided\".\n\n"
            "FULL TRANSCRIPT (all turns combined):\n"
            # THE FIX: ts (past turns) + this turn's SpeechResult combined
            f"{{{{ {ts_ref} ? {ts_ref} + ' | T' + ({turn_ref} || '1') + ': ' + ({speech_ref} || '') "
            f": 'T1: ' + ({speech_ref} || '') }}}}\n\n"
            f"Twilio system number — NEVER use as callback: {TWILIO_LINE}\n"
            f"Actual caller number from Twilio: {{{{ {caller_id} }}}}"
        )

        node['parameters']['messages']['messageValues'][0]['message'] = (
            "You extract contact details from a voice call transcript. "
            "Return ONLY a raw JSON object with keys: name, address, phone. No markdown, no backticks.\n\n"
            "Rules:\n"
            f"- NEVER use {TWILIO_LINE} as the phone — that is the business Twilio line.\n"
            "- If the caller said 'this number', 'my number', 'same number', or 'call me back on this', use the Twilio Caller ID.\n"
            "- If the caller stated a phone number verbally, use that number.\n"
            "- If phone is not found in the transcript at all, use the Twilio Caller ID as fallback.\n"
            "- Search the ENTIRE transcript for name and address — they may appear in any turn.\n"
            "- If name or address truly cannot be found, use \"not provided\".\n\n"
            f"Full transcript:\n{{{{ {ts_ref} ? {ts_ref} + ' | T' + ({turn_ref} || '1') + ': ' + ({speech_ref} || '') : {speech_ref} }}}}\n"
            f"Twilio Caller ID: {{{{ {caller_id} }}}}"
        )
        print('Fixed: Extract Lead Details - now uses ts + current SpeechResult combined (no data missed)')

    # ── 5: Email Lead Details ─────────────────────────────────────────────────
    if node['name'] == 'Email Lead Details':
        txt = "$json.text.replace(/```json|```/g, '').trim()"
        get = lambda f: f"{{{{ (() => {{ try {{ return JSON.parse({txt}).{f} || 'not provided'; }} catch(e) {{ return 'not provided'; }} }})() }}}}"
        cb  = (f"{{{{ (() => {{ try {{ const p = JSON.parse({txt}).phone; "
               f"return (p && p !== 'not provided' && p !== '{TWILIO_LINE}') ? p : ({caller_id}); }} "
               f"catch(e) {{ return ({caller_id}); }} }})() }}}}")

        node['parameters']['message'] = (
            "=<h2>New Demo Call Lead</h2>"
            "<table style=\"border-collapse:collapse;font-family:sans-serif\">"
            f"<tr><td style=\"padding:8px;font-weight:bold\">Caller Phone</td><td style=\"padding:8px\">{{{{ {caller_id} }}}}</td></tr>"
            f"<tr><td style=\"padding:8px;font-weight:bold\">Name</td><td style=\"padding:8px\">{get('name')}</td></tr>"
            f"<tr><td style=\"padding:8px;font-weight:bold\">Address</td><td style=\"padding:8px\">{get('address')}</td></tr>"
            f"<tr><td style=\"padding:8px;font-weight:bold\">Callback Number</td><td style=\"padding:8px\">{cb}</td></tr>"
            f"<tr><td style=\"padding:8px;font-weight:bold\">Full Transcript</td>"
            f"<td style=\"padding:8px;color:#555;font-size:12px\">"
            f"{{{{ {ts_ref} ? {ts_ref} + ' | T' + ({turn_ref} || '1') + ': ' + ({speech_ref} || '') : {speech_ref} }}}}"
            f"</td></tr>"
            "</table>"
            "<p style=\"color:#999;font-size:12px\">{{ $now.toLocaleString() }}</p>"
        )
        print('Fixed: Email Lead Details - correct callback + full transcript in email')

    # ── 6: SMS Lead to Admin ──────────────────────────────────────────────────
    if node['name'] == 'SMS Lead to Admin':
        txt = "$('Extract Lead Details').item.json.text.replace(/```json|```/g, '').trim()"
        get = lambda f: f"{{{{ (() => {{ try {{ return JSON.parse({txt}).{f} || 'not provided'; }} catch(e) {{ return 'not provided'; }} }})() }}}}"
        cb  = (f"{{{{ (() => {{ try {{ const p = JSON.parse({txt}).phone; "
               f"return (p && p !== 'not provided' && p !== '{TWILIO_LINE}') ? p : ({caller_id}); }} "
               f"catch(e) {{ return ({caller_id}); }} }})() }}}}")

        node['parameters']['message'] = (
            f"=New ParrotScout Lead!\n"
            f"Phone: {{{{ {caller_id} }}}}\n"
            f"Name: {get('name')}\n"
            f"Address: {get('address')}\n"
            f"Callback: {cb}"
        )
        print('Fixed: SMS Lead to Admin - correct callback number')

# ─────────────────────────────────────────────────────────────────────────────
# VERIFY: No actual newlines inside {{ }} blocks in OpenAI node
# ─────────────────────────────────────────────────────────────────────────────
for node in wf['nodes']:
    if node['name'] == 'OpenAI Voice Receptionist':
        text = node['parameters']['text']
        inside = False
        bad = False
        i = 0
        while i < len(text) - 1:
            if text[i:i+2] == '{{': inside = True; i += 2; continue
            if text[i:i+2] == '}}': inside = False; i += 2; continue
            if inside and text[i] == '\n': bad = True; break
            i += 1
        print(f"VERIFY OpenAI text prompt: {'FAIL - newline inside expression!' if bad else 'PASS - no newlines inside expressions'}")

with open(INPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)

print(f'\nDONE - "{INPUT_FILE}" saved with all fixes.')
print('\nAlso update your Google Sheet ai_system_prompt — see the new prompt below.\n')
print('=' * 60)
print('NEW SYSTEM PROMPT FOR GOOGLE SHEET:')
print('=' * 60)
PROMPT = """You are ParrotScout, a friendly AI voice receptionist for HVAC and plumbing businesses.
Speak in 1-2 short, natural sentences. Sound human, not robotic.

FLOW (follow strictly, be flexible):

Turn 1: Greet warmly. Ask if they need HVAC or plumbing help.

Turn 2: Acknowledge the issue briefly. Ask if it is urgent or can wait.

Turn 3: Ask for their name, service address, and best callback number all in one natural sentence.

Turn 4: Read back ALL three details clearly. Ask: "Does that sound right?"
  - If any detail is missing, ask for only that one missing piece.

Turn 5+:
  - If the caller CONFIRMS (yes, correct, that's right, sounds good, etc.):
    Say EXACTLY: "Booking confirmed. Stay safe!"
  - If the caller wants to CORRECT something: Accept it, read back the corrected info, ask to confirm again.
  - If you are on Turn 7 or later: Wrap up with whatever info you have. Say "Booking confirmed. Stay safe!"

STRICT RULES:
- NEVER say "Stay safe!" before the caller has confirmed their details.
- Your final message MUST end with the exact phrase: Stay safe!
- Keep every response to 1-2 sentences maximum.
- Never repeat a question the caller already answered.
- Allow corrections at any time — just accept and move on."""
print(PROMPT)
