# Adam Esposito — Technician Prep Automation (MVP)
## Foolproof Build Plan for Claude + n8n MCP

---

## 1. Full Requirements Analysis

### What the client wants (Phase 1 only):
- Every evening, the system fetches **tomorrow's scheduled jobs** from Housecall Pro
- For each job, it sends a **structured SMS** to the assigned technician containing:
  - Customer name
  - Job address
  - Scheduled start time
  - Scope of work / job description
  - Customer notes
  - **AI-generated tool & material recommendations** based on the job description
- Technicians receive nothing else — no app, no login, just a text

### What is explicitly NOT in Phase 1 (ignore for now):
- Morning before-photo prompt
- Evening after-photo prompt
- Photo storage / customer record linking
- Social media post generation
- Content auto-publishing
- Material cost vs. billing comparison

### Key design constraint:
> The client said: *"The preferred user experience is text-message based... adoption needs to be simple."*
> The workflow must require **zero technician input or setup**. It is purely outbound.

---

## 2. API & Technical Research

### Housecall Pro API
- **Base URL:** `https://api.housecallpro.com`
- **Auth header:** `Authorization: Token YOUR_API_KEY` ← Note: `Token`, NOT `Bearer`
- **Key endpoint:** `GET /jobs`
- **Date filter params:**
  - `scheduled_start_min` → ISO-8601 datetime string (start of tomorrow)
  - `scheduled_start_max` → ISO-8601 datetime string (end of tomorrow)
- **Pagination:** response wraps results in a `jobs` array. Use `page_size=100` to safely capture a full day of jobs without pagination logic in MVP.
- **Technician phone field:** `assigned_employees[0].mobile_number`

### Exact response fields needed per job:
| Field | JSON Path |
|---|---|
| Customer first name | `customer.first_name` |
| Customer last name | `customer.last_name` |
| Job address | `address.street`, `address.city`, `address.zip` |
| Scheduled time | `schedule.scheduled_start` |
| Scope/description | `description` |
| Customer notes | `notes[0].content` (array, take first note) |
| Technician phone | `assigned_employees[0].mobile_number` |

> [!WARNING]
> **Critical edge case:** Some jobs may have no assigned employee, no notes, or no description. The workflow must handle these gracefully. The `IF` node must filter out jobs where `assigned_employees` is empty before the SMS step.

---

## 3. Minimal Workflow — 6 Nodes, No Complexity

### Node 1: Schedule Trigger
- **Type:** Schedule Trigger
- **Config:** Run every day at **6:00 PM** (adjust timezone to Central Time for TruBlue of Western DuPage, Illinois)

### Node 2: HTTP Request — Fetch Tomorrow's Jobs
- **Type:** HTTP Request
- **Method:** GET
- **URL:** `https://api.housecallpro.com/jobs`
- **Auth header:** `Authorization: Token ADAM_API_KEY`
- **Query params:**
  - `scheduled_start_min` = `{{ $now.setZone('America/Chicago').plus({days:1}).startOf('day').toISO() }}`
  - `scheduled_start_max` = `{{ $now.setZone('America/Chicago').plus({days:1}).endOf('day').toISO() }}`
  - `page_size` = `100`

### Node 3: Split in Batches (Loop per Job)
- **Type:** Split In Batches
- **Input field:** `jobs` array from the HTTP response

### Node 4: IF — Filter Out Unassigned Jobs
- **Type:** IF
- **Condition:** `{{ $json.assigned_employees.length > 0 }}` is `true`
- **True branch:** continues to OpenAI
- **False branch:** does nothing (no error, just drops the item)

### Node 5: OpenAI — Generate Tool Recommendations
- **Type:** OpenAI (Chat Message)
- **Model:** `gpt-4o-mini` (cheapest, fast enough)
- **System prompt:**
  ```
  You are an expert home services field operations manager. Your job is to
  read a job description and recommend a short, practical bullet list of
  tools, consumables, and materials the technician should bring. Be concise.
  Maximum 6 bullet points. No intro text.
  ```
- **User message:**
  ```
  Job description: {{ $json.description }}
  Customer notes: {{ $json.notes.length > 0 ? $json.notes[0].content : 'None' }}
  ```

### Node 6: Twilio — Send SMS to Technician
- **Type:** Twilio (Send SMS)
- **From:** Adam's Twilio number
- **To:** `{{ $json.assigned_employees[0].mobile_number }}`
- **Message body:**
  ```
  [TruBlue - Tomorrow's Job]

  Customer: {{ $json.customer.first_name }} {{ $json.customer.last_name }}
  Address: {{ $json.address.street }}, {{ $json.address.city }}
  Time: {{ $json.schedule.scheduled_start }}

  Scope: {{ $json.description }}
  Notes: {{ $json.notes.length > 0 ? $json.notes[0].content : 'None' }}

  Recommended Prep:
  {{ $('OpenAI').item.json.message.content }}
  ```

---

## 4. Connection Map
```
Schedule Trigger
  └─> Fetch Tomorrow's Jobs (HTTP Request)
        └─> Split In Batches (Loop per job)
              └─> IF: Has assigned technician?
                    └─> [TRUE] OpenAI: Generate Recommendations
                          └─> Twilio: Send SMS
                    └─> [FALSE] (end — do nothing)
```

---

## 5. Credentials Needed from Adam
Before Claude builds this in n8n, Adam must provide:

| Credential | Where to find it |
|---|---|
| Housecall Pro API Key | HCP Dashboard → App Store → API Key Management |
| Twilio Account SID | Twilio Console → Account Info |
| Twilio Auth Token | Twilio Console → Account Info |
| Twilio "From" Number | His Twilio phone number |
| OpenAI API Key | platform.openai.com → API keys |

---

## 6. What to Tell Claude (Exact Prompt)

> Build an n8n workflow called **"TruBlue Technician Prep - MVP"** with the following 6 nodes in order:
>
> 1. **Schedule Trigger** — fires daily at 6 PM Central Time (America/Chicago)
> 2. **HTTP Request** — GET `https://api.housecallpro.com/jobs` with header `Authorization: Token [HCP_API_KEY]` and query params: `scheduled_start_min = tomorrow start ISO`, `scheduled_start_max = tomorrow end ISO`, `page_size = 100`
> 3. **Split In Batches** — split the `jobs` array so each job runs individually
> 4. **IF node** — condition: `assigned_employees` array length is greater than 0. True branch continues, False branch ends silently.
> 5. **OpenAI node (gpt-4o-mini)** — system prompt tells it to act as a field ops manager and produce a 6-bullet tool checklist. User message passes `description` and first `notes` content.
> 6. **Twilio SMS node** — sends to `assigned_employees[0].mobile_number` a structured message with customer name, address, scheduled time, description, notes, and the OpenAI bullet list.
>
> Use placeholder text like `YOUR_HCP_API_KEY` wherever credentials go.
