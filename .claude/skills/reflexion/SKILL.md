---
name: reflexion
description: "Cross-session error learning protocol. Manages docs/memory/solutions-learned.jsonl — the append-only log of error patterns and resolutions. Referenced by skills for error pattern lookup and systemic issue detection."
---

# Reflexion — Cross-Session Error Learning Protocol

## Purpose

This skill defines the protocol for reading, writing, and querying the cross-session error log (`docs/memory/solutions-learned.jsonl`). Skills consult this when they need to learn from past failures, append new resolutions, or detect systemic patterns.

---

## JSONL Schema

Each line in `docs/memory/solutions-learned.jsonl` is a JSON object with these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | string (ISO 8601) | Yes | When the error was resolved |
| `error` | string | Yes | Description of the error encountered |
| `solution` | string | Yes | How the error was resolved |
| `context` | string | Yes | What was being done when the error occurred |
| `skillName` | string | Yes | Which skill encountered the error (e.g., `dev`, `seo-skill`, `build-site`) |
| `severity` | string | Yes | One of: `low`, `medium`, `high`, `critical` |
| `tags` | string[] | Yes | Searchable tags (e.g., `["build-error", "css", "html-validation"]`) |
| `rootCause` | string | Yes | Root cause category (e.g., `malformed-html`, `missing-file`, `build-failure`, `seo-regression`) |

### Example Entry

```json
{"timestamp":"2026-03-30T10:00:00Z","error":"build.js failed: missing closing tag in header.html","solution":"Added missing </nav> closing tag in components/header.html","context":"Running build after editing header component","skillName":"dev","severity":"medium","tags":["build-error","html","component"],"rootCause":"malformed-html"}
```

---

## Query Patterns

### At Session Start

```
Read docs/memory/solutions-learned.jsonl (if it exists).
Note recurring patterns before proceeding.
```

### Before Starting a Task

```
Filter solutions-learned.jsonl for entries where:
  - skillName matches the current skill, OR
  - tags overlap with the task context
If matches found, note the pattern to avoid repeating the error.
```

### On Error Resolution (append)

```
After resolving any error, append a new JSONL line with ALL mandatory fields.
Do not omit fields — partial entries degrade future pattern matching.
```

---

## Pattern Aggregation

When reading the log, check for systemic issues:

1. **3+ entries with the same `rootCause`**: Surface as a systemic issue.
2. **3+ entries with the same `skillName`**: That skill area may need attention.
3. **Entries with `severity: "critical"` or `severity: "high"`**: Always surface these.

---

## Data

- File: `docs/memory/solutions-learned.jsonl`
- Format: JSONL (one JSON object per line, newline-delimited)
- Access: Append-only writes, full-scan reads with field-based filtering
