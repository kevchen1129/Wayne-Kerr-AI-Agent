# WK AI Agent CSV Format Spec

Last updated: August 6, 2026

## Purpose

This document defines the recommended CSV schema for Wayne Kerr measurement data exported from the data logging software and handed off to WK AI Agent.

The main goal is to keep the CSV simple, machine-readable, and stable so the AI backend can interpret numeric trends accurately.

---

## Recommended Export Format

- File type: `.csv`
- Encoding: `UTF-8`
- Delimiter: comma `,`
- First row: required header row
- Decimal separator: `.`
- One measurement point per row

---

## Minimum Recommended Schema (v1)

```csv
frequency_hz,Ls_nH,Rs_mOhm
100000,993.81,21.233
200000,992.40,30.115
500000,988.40,107.78
1000000,978.40,357.78
```

### Required columns for first version

| Column | Type | Meaning |
|---|---|---|
| `frequency_hz` | number | Sweep frequency in Hz |
| `Ls_nH` | number | Series inductance in nH |
| `Rs_mOhm` | number | Series resistance in milliohms |

---

## Column Naming Rules

Please keep the column names stable and explicit.

Recommended style:
- lowercase
- underscore-separated
- unit included in the header name when applicable

Examples:
- `frequency_hz`
- `Ls_nH`
- `Rs_mOhm`
- `phase_deg`
- `Q`
- `bias_current_mA`

Avoid:
- spaces in headers
- localized column names for v1
- ambiguous names such as `freq`, `L`, or `R` without units

---

## Optional Extended Schema

If more numeric detail is available, the following columns may also be included:

| Column | Type | Meaning |
|---|---|---|
| `Q` | number | Quality factor |
| `phase_deg` | number | Phase angle in degrees |
| `impedance_ohm` | number | Impedance magnitude in ohms |
| `bias_current_mA` | number | DC bias current in mA |
| `bias_voltage_V` | number | Bias voltage in volts |
| `temperature_C` | number | Measurement temperature in Celsius |

Example:

```csv
frequency_hz,Ls_nH,Rs_mOhm,Q,phase_deg
100000,993.81,21.233,29.4,87.2
200000,992.40,30.115,20.7,86.5
500000,988.40,107.78,7.6,81.9
1000000,978.40,357.78,2.7,73.1
```

---

## Data Quality Rules

### Required

- Numeric cells should contain raw numeric values only
- No merged cells
- No formulas
- No comments inside the table body
- No decorative header rows above the actual header
- No unit rows separated from the header row

### Recommended

- Sort by frequency ascending
- Keep one sweep per file for v1
- Export only one consistent measurement mode per file

---

## Units

For the first version, units should be encoded directly in the column names.

Examples:
- `frequency_hz`
- `Ls_nH`
- `Rs_mOhm`

This avoids ambiguity and makes parsing simpler.

---

## One Sweep Per File (Recommended)

For the first implementation, each CSV should represent only one sweep dataset.

Recommended:
- one frequency sweep
- one measurement mode
- one DUT
- one test condition set

Avoid putting multiple unrelated sweeps into the same file unless a multi-dataset schema is explicitly added later.

---

## Example Good File

```csv
frequency_hz,Ls_nH,Rs_mOhm
100000,993.81,21.233
200000,992.40,30.115
300000,991.10,48.702
400000,989.80,72.410
500000,988.40,107.78
700000,984.60,180.42
1000000,978.40,357.78
```

---

## Example Bad File

```csv
Wayne Kerr Sweep Export
Unit: nH / mOhm
Freq,L,R
100k,993.81,21.233
200k,992.40,30.115
```

Why this is bad:
- extra title row
- extra unit row
- ambiguous headers
- frequency values are not raw numeric Hz

---

## Recommended Export Behavior in Logging Software

When the user selects `Analyze with WK AI`, the software should:

1. Export the currently displayed sweep data into a fresh CSV file
2. Use the standard v1 schema
3. Save the file to a temporary location
4. Upload that CSV together with the sweep image

---

## Versioning Recommendation

If the format may evolve later, add a sidecar metadata concept in the software layer, not inside the CSV body.

For v1, keep the CSV plain and minimal.

---

## Engineer Summary

For first implementation, export CSV exactly like this:

```csv
frequency_hz,Ls_nH,Rs_mOhm
100000,993.81,21.233
200000,992.40,30.115
500000,988.40,107.78
1000000,978.40,357.78
```

This is the preferred format for WK AI Agent numeric interpretation.
