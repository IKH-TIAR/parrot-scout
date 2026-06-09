import json

TWILIO_LINE = '+15077650557'

with open('AI Voice Agency - With Config.json', 'r', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:

    # ── FIX 1: OpenAI Voice Receptionist ──
    # Fix the \\n issue: the current text has literal \\n sequences.
    # Use actual newline characters so GPT sees real line breaks.
    if node['name'] == 'OpenAI Voice Receptionist':
        node['parameters']['text'] = (
            "=Turn {{ ($('Twilio Voice Webhook').item.json.query || {}).turn || '1' }}."
            "{{ ($('Twilio Voice Webhook').item.json.query || {}).ts "
            "? '\n\nConversation history:\n' + ($('Twilio Voice Webhook').item.json.query || {}).ts "
            ": '' }}"
            "\n\nCurrent caller says: {{ $('Twilio Voice Webhook').item.json.body.SpeechResult || '(new call)' }}"
        )
        print("Fixed: OpenAI Voice Receptionist text prompt")

    # ── FIX 2: Return TwiML XML ──
    # Fix max_turns default to 5 (was 4).
    # The <\/Gather> and &amp; are actually correct in TwiML XML - leave as is.
    # Just fix the max_turns default.
    if node['name'] == 'Return TwiML XML':
        body = node['parameters']['responseBody']
        # Fix max_turns default from 4 to 5
        body = body.replace("$('Read Config').item.json['max_turns'] || 4", "$('Read Config').item.json['max_turns'] || 5")
        node['parameters']['responseBody'] = body
        print("Fixed: Return TwiML XML max_turns default 4->5")

    # ── FIX 3: Is Lead Captured? ──
    # Fix max_turns default from 4 to 5
    if node['name'] == 'Is Lead Captured?':
        for cond in node['parameters']['conditions']['conditions']:
            if 'max_turns' in str(cond.get('rightValue', '')):
                cond['rightValue'] = "={{ Number($('Read Config').item.json['max_turns'] || 5) }}"
                print("Fixed: Is Lead Captured? max_turns default 4->5")

    # ── FIX 4: Extract Lead Details ──
    # Improve the prompt to: use FULL transcript (ts param), use correct caller ID,
    # and explicitly never use the Twilio line number.
    if node['name'] == 'Extract Lead Details':
        node['parameters']['text'] = (
            "=Extract caller contact details from the full conversation transcript below.\n"
            "Return ONLY a raw JSON object (no markdown, no backticks, no explanation) with exactly these keys: name, address, phone.\n"
            "If a field is not found, use \"not provided\".\n\n"
            "Full conversation transcript:\n"
            "{{ ($('Twilio Voice Webhook').item.json.query || {}).ts || $('Twilio Voice Webhook').item.json.body.SpeechResult || '(no transcript)' }}\n\n"
            "Last caller utterance: {{ $('Twilio Voice Webhook').item.json.body.SpeechResult || '(silent)' }}\n\n"
            f"Twilio system number (NEVER use this as callback): {TWILIO_LINE}\n"
            f"Actual caller phone from Twilio: {{{{ $('Twilio Voice Webhook').item.json.body.From === '{TWILIO_LINE}' ? $('Twilio Voice Webhook').item.json.body.To : $('Twilio Voice Webhook').item.json.body.From }}}}"
        )
        node['parameters']['messages']['messageValues'][0]['message'] = (
            "You extract contact details from a voice call transcript and return ONLY raw JSON with keys: name, address, phone.\n\n"
            "Rules:\n"
            "- Search the ENTIRE transcript for the caller's name, address, and phone number.\n"
            f"- NEVER use {TWILIO_LINE} as the phone value — that is the business's Twilio line.\n"
            "- If the caller said 'this number', 'my number', 'same number', or 'call me back on this', use the Twilio Caller ID provided.\n"
            "- If the caller verbally stated a phone number, use that number.\n"
            "- If phone is completely absent from both transcript and verbal statement, use the Twilio Caller ID.\n"
            "- If name or address are not found anywhere in the transcript, use \"not provided\".\n"
            "- Return ONLY the raw JSON object. No markdown, no backticks, no extra text.\n\n"
            "Full transcript:\n"
            "{{ ($('Twilio Voice Webhook').item.json.query || {}).ts || $('Twilio Voice Webhook').item.json.body.SpeechResult }}\n"
            f"Twilio Caller ID: {{{{ $('Twilio Voice Webhook').item.json.body.From === '{TWILIO_LINE}' ? $('Twilio Voice Webhook').item.json.body.To : $('Twilio Voice Webhook').item.json.body.From }}}}"
        )
        print("Fixed: Extract Lead Details - improved prompt, correct caller ID, full transcript")

    # ── FIX 5: Email Lead Details ──
    # Ensure callback number logic: prefer caller-stated phone, but never use the Twilio line,
    # fallback to the actual caller ID (From/To swap).
    if node['name'] == 'Email Lead Details':
        caller_id = f"$('Twilio Voice Webhook').item.json.body.From === '{TWILIO_LINE}' ? $('Twilio Voice Webhook').item.json.body.To : $('Twilio Voice Webhook').item.json.body.From"
        callback_expr = (
            f"{{{{ (() => {{ try {{ const p = JSON.parse($json.text.replace(/```json|```/g, '').trim()).phone; "
            f"return (p && p !== 'not provided' && p !== '{TWILIO_LINE}') ? p : ({caller_id}); "
            f"}} catch(e) {{ return ({caller_id}); }} }})() }}}}"
        )
        node['parameters']['message'] = (
            "=<h2>New Demo Call Lead</h2>"
            "<table style=\"border-collapse:collapse;font-family:sans-serif\">"
            f"<tr><td style=\"padding:8px;font-weight:bold\">Caller Phone</td><td style=\"padding:8px\">{{{{ {caller_id} }}}}</td></tr>"
            "<tr><td style=\"padding:8px;font-weight:bold\">Name</td><td style=\"padding:8px\">{{ (() => { try { return JSON.parse($json.text.replace(/```json|```/g, '').trim()).name || 'not provided'; } catch(e) { return 'not provided'; } })() }}</td></tr>"
            "<tr><td style=\"padding:8px;font-weight:bold\">Address</td><td style=\"padding:8px\">{{ (() => { try { return JSON.parse($json.text.replace(/```json|```/g, '').trim()).address || 'not provided'; } catch(e) { return 'not provided'; } })() }}</td></tr>"
            f"<tr><td style=\"padding:8px;font-weight:bold\">Callback Number</td><td style=\"padding:8px\">{callback_expr}</td></tr>"
            "<tr><td style=\"padding:8px;font-weight:bold\">Full Transcript</td><td style=\"padding:8px;color:#555;font-size:12px\">{{ ($('Twilio Voice Webhook').item.json.query || {}).ts || '(no transcript available)' }}</td></tr>"
            "</table>"
            "<p style=\"color:#999;font-size:12px\">{{ $now.toLocaleString() }}</p>"
        )
        print("Fixed: Email Lead Details - callback number + full transcript displayed")

    # ── FIX 6: SMS Lead to Admin ──
    if node['name'] == 'SMS Lead to Admin':
        caller_id = f"$('Twilio Voice Webhook').item.json.body.From === '{TWILIO_LINE}' ? $('Twilio Voice Webhook').item.json.body.To : $('Twilio Voice Webhook').item.json.body.From"
        node['parameters']['message'] = (
            f"=New ParrotScout Lead!\n"
            f"Phone (Twilio): {{{{ {caller_id} }}}}\n"
            f"Name: {{{{ (() => {{ try {{ return JSON.parse($('Extract Lead Details').item.json.text.replace(/```json|```/g, '').trim()).name || 'not provided'; }} catch(e) {{ return 'not provided'; }} }})() }}}}\n"
            f"Address: {{{{ (() => {{ try {{ return JSON.parse($('Extract Lead Details').item.json.text.replace(/```json|```/g, '').trim()).address || 'not provided'; }} catch(e) {{ return 'not provided'; }} }})() }}}}\n"
            f"Callback: {{{{ (() => {{ try {{ const p = JSON.parse($('Extract Lead Details').item.json.text.replace(/```json|```/g, '').trim()).phone; return (p && p !== 'not provided' && p !== '{TWILIO_LINE}') ? p : ({caller_id}); }} catch(e) {{ return ({caller_id}); }} }})() }}}}"
        )
        print("Fixed: SMS Lead to Admin - correct callback number")

with open('AI Voice Agency - With Config.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)

print("\nDONE - AI Voice Agency - With Config.json updated successfully!")
print("\nSummary of all fixes:")
print("  1. OpenAI Voice Receptionist: Fixed \\\\n -> real newlines in transcript prompt")
print("  2. Return TwiML XML: Fixed max_turns default 4->5")
print("  3. Is Lead Captured?: Fixed max_turns default 4->5")
print("  4. Extract Lead Details: Improved prompt, full transcript, correct caller ID")
print("  5. Email Lead Details: Correct callback (never Twilio line, use caller ID as fallback)")
print("  6. SMS Lead to Admin: Correct callback number")
