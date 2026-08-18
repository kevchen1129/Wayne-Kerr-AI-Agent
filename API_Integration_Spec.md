# WK AI Agent Integration Spec

Last updated: August 6, 2026

## Purpose

This document describes how an external Wayne Kerr data logging application should hand off measurement data to WK AI Agent.

Goal:
- A user clicks `Analyze with WK AI` inside the Wayne Kerr data logging software.
- The software uploads the current measurement artifacts to WK AI Agent.
- WK AI Agent opens in the browser with the measurement context already loaded.
- The user can immediately ask follow-up questions without manually re-uploading files.

---

## Integration Summary

The external application should do the following:

1. Export the current sweep chart as a `PNG` file.
2. Export the current measured numeric data as a `CSV` file.
3. Send both files to WK AI Agent using `multipart/form-data`.
4. Read the returned `sessionId` / `openUrl`.
5. Open the browser to WK AI Agent using that session URL.

The external application should **not** call xAI directly.
The external application should only call the WK AI Agent backend.

---

## API Endpoint

### Production

```text
POST https://<your-domain>/api/import-measurement
```

### Local development

```text
POST http://localhost:3000/api/import-measurement
```

---

## Request Format

### Content-Type

```text
multipart/form-data
```

### Form Fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `mode` | text | Yes | Analysis mode. For sweep/equivalent-circuit use `interpret_graph`. |
| `sourceApp` | text | No | Name of the source application, e.g. `WK Data Logger`. |
| `question` | text | No | Default prompt/question to preload into the AI context. |
| `files` | file[] | Yes | One or more uploaded files. Recommended: one PNG + one CSV. |

### Recommended Values

- `mode=interpret_graph`
- `sourceApp=WK Data Logger`
- `question=請分析這個掃頻圖的等效電路與工作頻率`

---

## Supported File Types

### Recommended for v1

- `PNG` for sweep chart image
- `CSV` for measurement data

### Also accepted

- `JPG` / `JPEG`
- `WEBP`
- `TXT`
- `TSV`
- `XLSX` / `XLS`

### Important note

For the current MVP, **CSV is strongly recommended**.
`XLSX/XLS` can be uploaded, but structured parsing support is not yet the preferred path.
If precise numeric interpretation is required, export CSV.

---

## CSV Format Specification

### Encoding

- `UTF-8`

### Delimiter

- comma `,`

### First row

- must be a header row

### Recommended v1 schema

```csv
frequency_hz,Ls_nH,Rs_mOhm
100000,993.81,21.233
200000,992.40,30.115
500000,988.40,107.78
1000000,978.40,357.78
```

### Required column names for best compatibility

- `frequency_hz`
- `Ls_nH`
- `Rs_mOhm`

### Optional future columns

- `Q`
- `phase_deg`
- `bias_current_mA`
- `bias_voltage_V`
- `impedance_ohm`

### Notes

- Keep units explicit in the header name.
- Do not rename columns arbitrarily.
- Avoid merged cells, formulas, or presentation-only formatting.
- The cleaner the CSV, the better the AI analysis quality.

---

## Image Format Specification

### File type

- `PNG` preferred

### Content recommendations

The sweep chart image should preserve:
- axis labels
- units
- marker values
- sweep range
- measured traces
- measurement conditions if visible

### Best practice

Whenever possible, provide both:
- `PNG` for visual pattern interpretation
- `CSV` for exact numeric interpretation

---

## Example Request

### cURL example

```bash
curl -X POST https://<your-domain>/api/import-measurement \
  -F "mode=interpret_graph" \
  -F "sourceApp=WK Data Logger" \
  -F "question=請分析這個掃頻圖的等效電路與工作頻率" \
  -F "files=@sweep.png" \
  -F "files=@sweep.csv"
```

---

## Response Format

### Example response

```json
{
  "sessionId": "6bfcd193-83f1-452a-b84c-e9861b97176f",
  "openUrl": "/?importSession=6bfcd193-83f1-452a-b84c-e9861b97176f",
  "session": {
    "id": "6bfcd193-83f1-452a-b84c-e9861b97176f",
    "mode": "interpret_graph",
    "sourceApp": "WK Desktop",
    "question": "請分析這個掃頻圖的等效電路與工作頻率"
  }
}
```

### Response fields

| Field | Type | Description |
|---|---|---|
| `sessionId` | string | Unique identifier for the imported measurement session |
| `openUrl` | string | Relative URL that opens WK AI Agent with the imported session |
| `session` | object | Server-side normalized metadata for the imported session |

---

## Client Action After Upload

After receiving the response, the external application should open the browser to:

```text
https://<your-domain>/?importSession=<sessionId>
```

or equivalently:

```text
https://<your-domain><openUrl>
```

This loads WK AI Agent with the imported measurement session already attached.

---

## Expected User Experience

After handoff:

1. WK AI Agent opens automatically in the browser.
2. The imported image and data context are already loaded.
3. The user does not need to upload files manually.
4. The user can immediately ask questions such as:
   - What is the most likely equivalent circuit?
   - What working frequency range is recommended?
   - Is skin effect already dominant?
   - What further measurements should be taken?

---

## Recommended Software Flow

Inside the Wayne Kerr data logging software, implement the following flow:

1. User clicks `Analyze with WK AI`
2. Export current chart to `PNG`
3. Export current numeric data to `CSV`
4. Call `POST /api/import-measurement`
5. Parse the JSON response
6. Open browser to returned session URL

Pseudo-flow:

```text
[Measure] -> [User clicks Analyze with WK AI]
          -> [Export PNG + CSV]
          -> [POST to /api/import-measurement]
          -> [Receive sessionId/openUrl]
          -> [Open WK AI Agent in browser]
```

---

## Security Notes

- Do **not** embed xAI API keys in the external desktop/client software.
- Do **not** call xAI directly from the external application.
- The external application should only call WK AI Agent backend endpoints.
- AI model invocation and credentials must remain server-side.

---

## Current MVP Limitations

- CSV parsing is the preferred numeric import path.
- XLSX/XLS upload is accepted, but CSV remains the recommended export format.
- Session storage is currently intended for handoff/testing workflow and should be reviewed for long-term persistence requirements.
- If very large files are uploaded, upstream size limits may need to be enforced.

---

## Recommended First-Version Scope

For the first engineering handoff, implement only this:

- 1 PNG file
- 1 CSV file
- 1 API call to `/api/import-measurement`
- Open browser using returned `sessionId`

This is enough to validate the end-to-end WK software -> WK AI Agent workflow.

---

## Short Handoff Summary for Engineer

Implement an `Analyze with WK AI` action in the Wayne Kerr data logging software.

When triggered:
- export the current sweep chart as `PNG`
- export the current numeric data as `CSV`
- send both files via `multipart/form-data` to `/api/import-measurement`
- read the returned `sessionId` or `openUrl`
- open WK AI Agent in the browser using that session URL

Recommended request fields:
- `mode=interpret_graph`
- `sourceApp=WK Data Logger`
- `question=請分析這個掃頻圖的等效電路與工作頻率`

Recommended files:
- `sweep.png`
- `sweep.csv`

