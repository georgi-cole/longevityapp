# Smart Longevity Intake

A professional static web application for a longevity clinic intake workflow.
Collects structured client information before the first consultation, dynamically
opens relevant follow-up modules, calculates internal risk/domain signals,
and generates a clinician-facing summary with recommended diagnostic packages.

> **⚠️ Prototype - Not a medical device.**  
> This app does not diagnose, prescribe, or tell patients they have a disease.
> It collects information, identifies signals, and prepares a clinician review summary.  
> **Do not use with real patient data in the public prototype.**

---

## File structure

```
longevityapp/
├── index.html        - App shell, three-view layout (intake / completion / clinician)
├── styles.css        - Premium medical visual design
├── app.js            - All application logic (state, rendering, scoring, summary)
├── questionBank.js   - Source of truth: questions, modules, packages, scoring rules
└── README.md         - This file
```

### How the files relate

| File | Role |
|---|---|
| `questionBank.js` | Defines every question, module, package, scoring rule, and trigger rule. Edit this file to change the clinical content. |
| `app.js` | Reads `questionBank` and drives the adaptive flow. Handles state, rendering, scoring, trigger engine, navigation, and clinician summary generation. |
| `index.html` | HTML skeleton with three `<section>` views and `<script>` tags to load the two JS files. |
| `styles.css` | All styles - white background, teal/blue/green palette, rounded cards, shadows. |

---

## How to run locally

No build step required. Open `index.html` directly in any modern browser:

```bash
# macOS / Linux
open index.html

# Windows
start index.html

# Or use a simple local server (avoids any CORS issues with file:// URLs)
npx serve .
# then visit http://localhost:3000
```

---

## How to deploy to GitHub Pages

1. Push all four files to the root of a GitHub repository (or a `docs/` folder).
2. In the repository **Settings → Pages**, set the source branch to `main` (or the relevant branch) and the folder to `/ (root)` (or `/docs`).
3. GitHub Pages will serve `index.html` automatically.
4. The app is fully static - no server, no API keys, no database required.

---

## How to edit the question bank

All clinical/medical content lives in **`questionBank.js`**. The file exports a single
object `questionBank` with three top-level keys:

### `questionBank.modules`

Defines each module's display label and sort order.

```js
metabolic: { label: 'Метаболитно здраве', order: 2 },
```

To add a module: add a key here, then add questions with `module: 'your_module_id'`,
and add trigger rules that reference it.

### `questionBank.packages`

Defines diagnostic package IDs, display labels, and descriptions.

```js
metabolic_standard: {
  label: 'Метаболитен стандартен пакет',
  description: 'Глюкоза, HbA1c, инсулин, HOMA-IR ...',
},
```

### `questionBank.triggerRules`

Global rules that open a module when a specific answer is given anywhere.

```js
{
  id: 'tr_meta_diabetes',
  sourceQuestion: 'q_conditions',
  condition: { type: 'includes_any', values: ['prediabetes', 'diabetes'] },
  triggerModules: ['metabolic'],
  reason: 'Диабет / предиабет',
},
```

### `questionBank.questions`

Array of question objects. Each question may have:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `module` | string | Module this question belongs to |
| `type` | string | Question type (see below) |
| `label` | string | Short label (used in clinician summary) |
| `text` | string | Full question text shown to patient |
| `helpText` | string | Optional help text below the question |
| `required` | boolean | Validation: must answer before advancing |
| `options` | array | For choice questions - `{ value, label, exclusive? }` |
| `fields` | array | For `lab_values` / `repeatable_group` |
| `unit` | string | Unit suffix for numeric inputs |
| `validation` | object | `{ min, max, message }` or `{ minAge, maxAge }` |
| `showIf` | object | Only show if `{ question: id, value: '...' \| [...] }` |
| `followUps` | array | Insert questions after this one based on answer |
| `scoring` | array | Array of scoring rules (see below) |

### Supported question types

| Type | Description |
|---|---|
| `info` | Informational screen, no input |
| `single_choice` | Radio buttons |
| `multi_choice` | Checkboxes with exclusive-option support |
| `yes_no` | Two-button Да/Не |
| `yes_no_unknown` | Three-button Да/Не/Не знам |
| `numeric` | Number input with unit and range validation |
| `scale` | 0-10 scale |
| `date` | Date picker with age validation |
| `lab_values` | Grid of optional lab fields |
| `repeatable_group` | Add/remove entries (medications, family history, etc.) |
| `file_upload` | File name capture only - no server upload |

### Scoring rule structure

```js
{
  condition: { type: 'includes', value: 'high_blood_pressure' },
  domain: 'cardiometabolic_risk',  // domain to add points to
  points: 2,                        // 1-4 (capped at 4 per domain)
  tags: ['hypertension'],           // internal tags
  packages: ['cardiometabolic_standard'], // suggest these packages
  triggerModules: ['cardiometabolic'],    // open these modules
  safetyNote: 'Safety note text',   // shown in clinician Safety Notes
  redFlag: true,                    // marks profile as physician_first_required
  reason: 'Human-readable reason',  // shown in clinician summary
}
```

### Condition types

| Type | Example |
|---|---|
| `equals` | `{ type: 'equals', value: 'current' }` |
| `in` | `{ type: 'in', values: ['no', 'unknown'] }` |
| `includes` | `{ type: 'includes', value: 'high_blood_pressure' }` |
| `includes_any` | `{ type: 'includes_any', values: ['a', 'b'] }` |
| `gte` / `lte` | `{ type: 'gte', value: 7 }` |
| `between` | `{ type: 'between', min: 4, max: 5 }` |
| `age_gte` | `{ type: 'age_gte', value: 50 }` |
| `bmi_gte` | `{ type: 'bmi_gte', value: 30 }` |
| `waist_elevated_male/female` | No extra fields - uses sex from `q_sex` |
| `all_empty` | True if all lab fields are empty |
| `has_entries` | True if repeatable_group has ≥ 1 entry |
| `entries_gte` | `{ type: 'entries_gte', count: 2 }` |
| `count_gte` | `{ type: 'count_gte', tracked: [...], count: 2 }` |

---

## Domain score levels

| Score | Level | Meaning |
|---|---|---|
| 0 | none | No significant signal |
| 1 | low | Weak signal or interest |
| 2 | moderate | Standard package suitable |
| 3 | priority | Extended assessment recommended |
| 4 | clinician_first | Clinician review required before program |

---

## Data privacy

- All answers are stored **only in JavaScript memory** during the browser session.
- **Questionnaire answers** are not transmitted to any server; all answers stay in JavaScript memory only.
- Third-party resources (e.g., Google Fonts) are loaded from external servers; no questionnaire data is included in those requests.
- No cookies or localStorage are used by default.
- When the tab is closed, all data is lost.
- The JSON export button allows saving a local file for prototype/testing purposes only.

---

## Disclaimer

This application is a **prototype** intended for demonstration and design validation.
It is **not a certified medical device**, does not provide medical diagnoses or
treatment recommendations, and must not be used with real patient health data
in its current public form.
