# WK AI Agent Engineer Handoff Checklist

Last updated: August 6, 2026

## Goal

Implement a handoff flow from Wayne Kerr data logging software to WK AI Agent so that the user can click one button and open WK AI Agent with the current measurement context already loaded.

---

## Deliverable Summary

The logging software should support an action such as:

```text
Analyze with WK AI
```

When triggered, the software should:
- export the current sweep chart as `PNG`
- export the current measurement data as `CSV`
- upload both to WK AI Agent backend
- receive a `sessionId` / `openUrl`
- open WK AI Agent in the browser using that session URL

---

## Required Reading

Before implementation, read:

- `API_Integration_Spec.md`
- `CSV_Format_Spec.md`

---

## Backend Endpoint To Call

```text
POST /api/import-measurement
```

Environment examples:

- local: `http://localhost:3000/api/import-measurement`
- production: `https://<your-domain>/api/import-measurement`

---

## Required Request Fields

Send request as `multipart/form-data`.

Required form fields:
- `mode=interpret_graph`
- `files=@sweep.png`
- `files=@sweep.csv`

Recommended additional fields:
- `sourceApp=WK Data Logger`
- `question=請分析這個掃頻圖的等效電路與工作頻率`

---

## Required File Outputs

### 1. Sweep image

- format: `PNG`
- include visible axes and measurement traces

### 2. Numeric data

- format: `CSV`
- use standard column names

Minimum recommended schema:

```csv
frequency_hz,Ls_nH,Rs_mOhm
100000,993.81,21.233
200000,992.40,30.115
500000,988.40,107.78
1000000,978.40,357.78
```

---

## Expected Response

The response JSON contains:

- `sessionId`
- `openUrl`

Example:

```json
{
  "sessionId": "6bfcd193-83f1-452a-b84c-e9861b97176f",
  "openUrl": "/?importSession=6bfcd193-83f1-452a-b84c-e9861b97176f"
}
```

---

## Required Client Action After Upload

Open the browser to:

```text
https://<your-domain>/?importSession=<sessionId>
```

or:

```text
https://<your-domain><openUrl>
```

---

## Implementation Checklist

### Export layer

- [ ] Add UI trigger: `Analyze with WK AI`
- [ ] Export current chart to PNG
- [ ] Export current numeric sweep data to CSV
- [ ] Ensure CSV header format is correct

### Upload layer

- [ ] Build multipart/form-data request
- [ ] Attach PNG file
- [ ] Attach CSV file
- [ ] Include `mode=interpret_graph`
- [ ] Include `sourceApp`
- [ ] Include default `question`
- [ ] POST to `/api/import-measurement`

### Response handling

- [ ] Parse JSON response
- [ ] Read `sessionId` or `openUrl`
- [ ] Handle upload failure gracefully
- [ ] Handle missing/invalid response gracefully

### Browser handoff

- [ ] Open WK AI Agent in default browser
- [ ] Use returned session URL
- [ ] Confirm imported context loads correctly

### QA checklist

- [ ] PNG uploads successfully
- [ ] CSV uploads successfully
- [ ] Session opens in browser
- [ ] WK AI Agent shows imported chart context
- [ ] User can ask follow-up questions immediately

---

## Error Handling Recommendations

If upload fails:
- show a user-facing message such as `Failed to send data to WK AI Agent.`
- keep local files available for retry

If browser open fails:
- show the generated session URL so user can copy it manually

If CSV export fails:
- do not fall back silently
- warn that AI precision may be reduced if only image is uploaded

---

## Security Checklist

- [ ] Do not embed xAI API keys in client software
- [ ] Do not call xAI directly from the logging software
- [ ] Only call WK AI Agent backend
- [ ] Keep model credentials server-side

---

## MVP Scope Recommendation

For first release, only support:
- one sweep image
- one CSV file
- one API call
- one browser launch

Do not add extra workflow complexity until this flow is stable.

---

## Short Summary For Engineer

Implement a single-click handoff from the Wayne Kerr logging software to WK AI Agent:

1. Export current sweep chart as PNG
2. Export current measurement data as CSV
3. Upload both via `multipart/form-data` to `/api/import-measurement`
4. Read returned `sessionId` / `openUrl`
5. Open WK AI Agent in browser with imported session
