import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

TWILIO_LINE = '+15077650557'
INPUT_FILE = 'AI Voice Agency - With Config (4).json'

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:

    # ── FIX 1: Return TwiML XML ──
    # ROOT CAUSE: <\/Gather> is invalid XML → Twilio ignores Gather entirely
    # → AI says first line and hangs up. Fix: replace with </Gather>
    if node['name'] == 'Return TwiML XML':
        body = node['parameters']['responseBody']
        # Fix the broken closing tag
        body = body.replace('<\\/Gather>', '</Gather>')
        # Fix max_turns default 4→5
        body = body.replace(
            "['max_turns'] || 4) + 1",
            "['max_turns'] || 5) + 1"
        )
        node['parameters']['responseBody'] = body

        # Verify
        if '</Gather>' in body and '<\\/Gather>' not in body:
            print('VERIFIED: Return TwiML XML - </Gather> correct, max_turns=5')
        else:
            print('WARNING: Gather tag check failed. Manual inspection needed.')
            print('  Has </Gather>:', '</Gather>' in body)
            print('  Has <\\/Gather>:', '<\\/Gather>' in body)

    # ── FIX 2: OpenAI Voice Receptionist ──
    # Use real newlines (not \\n literals) so GPT reads history correctly
    if node['name'] == 'OpenAI Voice Receptionist':
        ts_ref = "($('Twilio Voice Webhook').item.json.query || {}).ts"
        speech_ref = "$('Twilio Voice Webhook').item.json.body.SpeechResult"
        turn_ref = "($('Twilio Voice Webhook').item.json.query || {}).turn"
        node['parameters']['text'] = (
            f"=Turn {{{{ {turn_ref} || '1' }}}}."
            f"{{{{ {ts_ref} "
            f"? '\n\nConversation history:\n' + {ts_ref} "
            f": '' }}}}"
            f"\n\nCurrent caller says: {{{{ {speech_ref} || '(new call)' }}}}"
        )
        print('Fixed: OpenAI Voice Receptionist - real newlines in prompt')

    # ── FIX 3: Is Lead Captured? max_turns 4→5 ──
    if node['name'] == 'Is Lead Captured?':
        for cond in node['parameters']['conditions']['conditions']:
            rv = cond.get('rightValue', '')
            if rv == 4 or rv == '4':
                cond['rightValue'] = 5
                print('Fixed: Is Lead Captured? max_turns numeric 4->5')
            elif isinstance(rv, str) and '|| 4)' in rv:
                cond['rightValue'] = rv.replace('|| 4)', '|| 5)')
                print('Fixed: Is Lead Captured? max_turns expression 4->5')

    # ── FIX 4: Extract Lead Details ──
    # Search full transcript (ts) not just last SpeechResult
    if node['name'] == 'Extract Lead Details':
        ts_ref = "($('Twilio Voice Webhook').item.json.query || {}).ts"
        speech_ref = "$('Twilio Voice Webhook').item.json.body.SpeechResult"
        from_ref = "$('Twilio Voice Webhook').item.json.body.From"
        to_ref = "$('Twilio Voice Webhook').item.json.body.To"
        caller_id = f"{from_ref} === '{TWILIO_LINE}' ? {to_ref} : {from_ref}"

        node['parameters']['text'] = "\n".join([
            "=Extract caller contact details from the full conversation transcript.",
            "Return ONLY a raw JSON object (no markdown, no backticks) with keys: name, address, phone.",
            'If a field is not found, use "not provided".',
            "",
            f"Full conversation transcript:",
            f"{{{{ {ts_ref} || {speech_ref} || '(no transcript)' }}}}",
            "",
            f"Last caller utterance: {{{{ {speech_ref} || '(silent)' }}}}",
            "",
            f"Twilio system number (NEVER use as callback): {TWILIO_LINE}",
            f"Actual caller phone: {{{{ {caller_id} }}}}",
        ])

        node['parameters']['messages']['messageValues'][0]['message'] = "\n".join([
            "Return ONLY raw JSON with keys: name, address, phone.",
            f"NEVER use {TWILIO_LINE} as phone - that is the business Twilio line.",
            "If caller said 'this number', 'my number', or 'same number', use Twilio Caller ID.",
            "If phone is absent, use Twilio Caller ID as fallback.",
            "Return ONLY the JSON object. No markdown, no backticks.",
            "",
            "Full transcript:",
            f"{{{{ {ts_ref} || {speech_ref} }}}}",
            f"Twilio Caller ID: {{{{ {caller_id} }}}}",
        ])
        print('Fixed: Extract Lead Details - full transcript + correct caller ID')

    # ── FIX 5: Email Lead Details ──
    if node['name'] == 'Email Lead Details':
        from_ref = "$('Twilio Voice Webhook').item.json.body.From"
        to_ref = "$('Twilio Voice Webhook').item.json.body.To"
        ts_ref = "($('Twilio Voice Webhook').item.json.query || {}).ts"
        caller_id = f"{from_ref} === '{TWILIO_LINE}' ? {to_ref} : {from_ref}"
        extract_ref = "$json.text.replace(/```json|```/g, '').trim()"
        extract_detail = lambda field: (
            f"{{{{ (() => {{ try {{ return JSON.parse({extract_ref}).{field} "
            f"|| 'not provided'; }} catch(e) {{ return 'not provided'; }} }})() }}}}"
        )
        callback = (
            f"{{{{ (() => {{ "
            f"try {{ const p = JSON.parse({extract_ref}).phone; "
            f"return (p && p !== 'not provided' && p !== '{TWILIO_LINE}') ? p : ({caller_id}); }} "
            f"catch(e) {{ return ({caller_id}); }} "
            f"}})() }}}}"
        )
        node['parameters']['message'] = (
            "=<h2>New Demo Call Lead</h2>"
            "<table style=\"border-collapse:collapse;font-family:sans-serif\">"
            f"<tr><td style=\"padding:8px;font-weight:bold\">Caller Phone</td>"
            f"<td style=\"padding:8px\">{{{{ {caller_id} }}}}</td></tr>"
            f"<tr><td style=\"padding:8px;font-weight:bold\">Name</td>"
            f"<td style=\"padding:8px\">{extract_detail('name')}</td></tr>"
            f"<tr><td style=\"padding:8px;font-weight:bold\">Address</td>"
            f"<td style=\"padding:8px\">{extract_detail('address')}</td></tr>"
            f"<tr><td style=\"padding:8px;font-weight:bold\">Callback Number</td>"
            f"<td style=\"padding:8px\">{callback}</td></tr>"
            f"<tr><td style=\"padding:8px;font-weight:bold\">Full Transcript</td>"
            f"<td style=\"padding:8px;color:#555;font-size:12px\">{{{{ {ts_ref} || '(no transcript)' }}}}</td></tr>"
            "</table>"
            "<p style=\"color:#999;font-size:12px\">{{ $now.toLocaleString() }}</p>"
        )
        print('Fixed: Email Lead Details - correct callback + full transcript')

    # ── FIX 6: SMS Lead to Admin ──
    if node['name'] == 'SMS Lead to Admin':
        from_ref = "$('Twilio Voice Webhook').item.json.body.From"
        to_ref = "$('Twilio Voice Webhook').item.json.body.To"
        caller_id = f"{from_ref} === '{TWILIO_LINE}' ? {to_ref} : {from_ref}"
        extract_ref = "$('Extract Lead Details').item.json.text.replace(/```json|```/g, '').trim()"
        extract_detail = lambda field: (
            f"{{{{ (() => {{ try {{ return JSON.parse({extract_ref}).{field} "
            f"|| 'not provided'; }} catch(e) {{ return 'not provided'; }} }})() }}}}"
        )
        callback = (
            f"{{{{ (() => {{ "
            f"try {{ const p = JSON.parse({extract_ref}).phone; "
            f"return (p && p !== 'not provided' && p !== '{TWILIO_LINE}') ? p : ({caller_id}); }} "
            f"catch(e) {{ return ({caller_id}); }} "
            f"}})() }}}}"
        )
        node['parameters']['message'] = (
            f"=New ParrotScout Lead!\n"
            f"Phone: {{{{ {caller_id} }}}}\n"
            f"Name: {extract_detail('name')}\n"
            f"Address: {extract_detail('address')}\n"
            f"Callback: {callback}"
        )
        print('Fixed: SMS Lead to Admin - correct callback number')

with open(INPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)

print(f'\nDONE - "{INPUT_FILE}" saved with all fixes applied.')
print('Re-import this file into n8n to fix the hang-up issue.')
