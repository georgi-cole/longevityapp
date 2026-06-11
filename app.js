// app.js — Smart Longevity Intake
// All application logic lives here. Edit questionBank.js to change medical content.

'use strict';

// ── Module-order preference for dynamic queue ────────────────────────────────
const MODULE_ORDER = [
  'core',
  'cardiometabolic',
  'metabolic',
  'sleep',
  'gut',
  'hormone',
  'immune',
  'cancer_family',
  'mitochondrial',
  'renal',
];

// ── Central state ────────────────────────────────────────────────────────────
const state = {
  currentQuestionIndex: 0,
  activeQuestionQueue: [],   // ordered list of question IDs to show
  answers: {},               // { questionId: value }
  tags: new Set(),
  domainScores: {},          // { domain: number }
  domainReasons: {},         // { domain: string[] }
  recommendedPackages: {},   // { packageId: { level: 'suggested'|'priority', reasons: [] } }
  openedModules: new Set(),
  completedModules: new Set(),
  redFlags: [],              // string[]
  safetyNotes: [],           // string[]
  history: [],               // stack of question indices for Back navigation
  physicianFirstRequired: false,
  uploadedFiles: [],
  currentView: 'intake',     // 'intake' | 'patient_complete' | 'clinician'
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getQuestionById(id) {
  return questionBank.questions.find(q => q.id === id) || null;
}

function getModuleQuestions(module) {
  return questionBank.questions.filter(q => q.module === module);
}

function calculateAge(dobValue) {
  if (!dobValue) return null;
  const dob = new Date(dobValue);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function calculateBMI() {
  const h = parseFloat(state.answers['q_height']);
  const w = parseFloat(state.answers['q_weight']);
  if (!h || !w || h <= 0) return null;
  return w / ((h / 100) ** 2);
}

function getSex() {
  return state.answers['q_sex'] || null;
}

// ── Condition evaluator ──────────────────────────────────────────────────────

function evaluateCondition(condition, questionId, answer) {
  if (!condition) return false;
  const { type } = condition;

  switch (type) {
    case 'equals':
      return answer === condition.value;

    case 'in':
      return Array.isArray(condition.values) && condition.values.includes(answer);

    case 'includes':
      return Array.isArray(answer) && answer.includes(condition.value);

    case 'includes_any':
      return Array.isArray(answer) && condition.values.some(v => answer.includes(v));

    case 'gte':
      return parseFloat(answer) >= condition.value;

    case 'lte':
      return parseFloat(answer) <= condition.value;

    case 'between':
      return parseFloat(answer) >= condition.min && parseFloat(answer) <= condition.max;

    case 'age_gte': {
      const age = calculateAge(state.answers['q_dob']);
      return age !== null && age >= condition.value;
    }

    case 'bmi_gte': {
      const bmi = calculateBMI();
      return bmi !== null && bmi >= condition.value;
    }

    case 'waist_elevated_male': {
      const waist = parseFloat(answer);
      const sex = getSex();
      return sex === 'male' && !isNaN(waist) && waist > 102;
    }

    case 'waist_elevated_female': {
      const waist = parseFloat(answer);
      const sex = getSex();
      return sex === 'female' && !isNaN(waist) && waist > 88;
    }

    case 'all_empty':
      // For lab_values: true if no field has a non-empty value
      if (answer && typeof answer === 'object') {
        return Object.values(answer).every(v => !v || String(v).trim() === '');
      }
      return true;

    case 'has_entries':
      return Array.isArray(answer) && answer.length > 0;

    case 'entries_gte':
      return Array.isArray(answer) && answer.length >= condition.count;

    case 'count_gte': {
      // Count how many of the tracked values appear in a multi_choice answer
      if (!Array.isArray(answer)) return false;
      const matched = condition.tracked.filter(v => answer.includes(v)).length;
      return matched >= condition.count;
    }

    case 'multiple_same_type': {
      // Check if repeatable_group has >= 2 entries with same cancer_type
      if (!Array.isArray(answer) || answer.length < 2) return false;
      const types = answer.map(e => (e.cancer_type || '').trim().toLowerCase()).filter(Boolean);
      const seen = new Set();
      for (const t of types) {
        if (seen.has(t)) return true;
        seen.add(t);
      }
      return false;
    }

    default:
      console.warn(`[Scoring] Unknown condition type: "${type}"`);
      return false;
  }
}

// ── Scoring engine ───────────────────────────────────────────────────────────

const DOMAIN_MAX = 4;

function evaluateScoring(questionId, answer) {
  const question = getQuestionById(questionId);
  if (!question || !question.scoring) return;

  for (const rule of question.scoring) {
    if (!evaluateCondition(rule.condition, questionId, answer)) continue;

    // Domain score
    if (rule.domain && rule.points) {
      const current = state.domainScores[rule.domain] || 0;
      state.domainScores[rule.domain] = Math.min(DOMAIN_MAX, current + rule.points);
      if (!state.domainReasons[rule.domain]) state.domainReasons[rule.domain] = [];
      if (rule.reason && !state.domainReasons[rule.domain].includes(rule.reason)) {
        state.domainReasons[rule.domain].push(rule.reason);
      }
    }

    // Tags
    if (rule.tags) {
      rule.tags.forEach(t => state.tags.add(t));
    }

    // Packages
    if (rule.packages) {
      const level = (rule.domain && (state.domainScores[rule.domain] || 0) >= 3)
        ? 'priority' : 'suggested';
      rule.packages.forEach(pkg => addPackage(pkg, level, rule.reason));
    }

    // Trigger modules
    if (rule.triggerModules) {
      rule.triggerModules.forEach(m => openModule(m));
    }

    // Red flag
    if (rule.redFlag) {
      state.physicianFirstRequired = true;
      if (rule.reason && !state.redFlags.includes(rule.reason)) {
        state.redFlags.push(rule.reason);
      }
    }

    // Safety notes
    if (rule.safetyNote && !state.safetyNotes.includes(rule.safetyNote)) {
      state.safetyNotes.push(rule.safetyNote);
    }
  }

  // Re-evaluate priority after scoring
  Object.keys(state.recommendedPackages).forEach(pkg => {
    const rec = state.recommendedPackages[pkg];
    const domain = domainForPackage(pkg);
    if (domain && (state.domainScores[domain] || 0) >= 3) {
      rec.level = 'priority';
    }
  });
}

function domainForPackage(pkg) {
  const map = {
    cardiometabolic_standard: 'cardiometabolic_risk',
    cardiometabolic_extended: 'cardiometabolic_risk',
    metabolic_standard:       'metabolic_risk',
    metabolic_extended:       'metabolic_risk',
    sleep_assessment:         'sleep_risk',
    gut_microbiome:           'gut_risk',
    hormone_standard:         'hormone_risk',
    cancer_prevention:        'cancer_risk',
    mitochondrial_assessment: 'mitochondrial_risk',
    renal_assessment:         'renal_risk',
    immune_assessment:        'immune_risk',
  };
  return map[pkg] || null;
}

function addPackage(pkg, level, reason) {
  if (!state.recommendedPackages[pkg]) {
    state.recommendedPackages[pkg] = { level, reasons: [] };
  }
  if (level === 'priority') state.recommendedPackages[pkg].level = 'priority';
  if (reason && !state.recommendedPackages[pkg].reasons.includes(reason)) {
    state.recommendedPackages[pkg].reasons.push(reason);
  }
}

// ── Trigger rules engine ─────────────────────────────────────────────────────

function evaluateTriggerRules(changedQuestionId) {
  for (const rule of questionBank.triggerRules) {
    if (rule.sourceQuestion !== changedQuestionId) continue;
    const answer = state.answers[changedQuestionId];
    if (evaluateCondition(rule.condition, changedQuestionId, answer)) {
      if (rule.triggerModules) rule.triggerModules.forEach(m => openModule(m));
    }
  }
}

// ── Module management ────────────────────────────────────────────────────────

function openModule(moduleId) {
  if (!questionBank.modules[moduleId]) {
    console.warn(`[openModule] Unknown module: "${moduleId}"`);
    return;
  }
  if (state.openedModules.has(moduleId) || state.completedModules.has(moduleId)) return;
  if (moduleId === 'core') return; // core always active

  state.openedModules.add(moduleId);

  // Determine insertion point: after all currently queued questions of the preceding module
  const moduleQuestionIds = getModuleQuestions(moduleId).map(q => q.id);

  // Find insertion index (just before the "end" or after last question of current module)
  // We insert in MODULE_ORDER order relative to other dynamic modules
  const currentModuleIdx = MODULE_ORDER.indexOf(moduleId);
  let insertAt = state.activeQuestionQueue.length;

  for (let i = state.activeQuestionQueue.length - 1; i >= state.currentQuestionIndex + 1; i--) {
    const qId = state.activeQuestionQueue[i];
    const q = getQuestionById(qId);
    if (!q) continue;
    const qModuleIdx = MODULE_ORDER.indexOf(q.module);
    if (qModuleIdx <= currentModuleIdx) {
      insertAt = i + 1;
      break;
    }
  }

  // Filter out questions already in queue
  const toAdd = moduleQuestionIds.filter(id => !state.activeQuestionQueue.includes(id));
  if (toAdd.length === 0) return;

  state.activeQuestionQueue.splice(insertAt, 0, ...toAdd);
}

// ── showIf evaluation ────────────────────────────────────────────────────────

function shouldShowQuestion(question) {
  if (!question.showIf) return true;
  const { question: sourceId, value } = question.showIf;
  const answer = state.answers[sourceId];
  if (Array.isArray(value)) {
    return value.includes(answer);
  }
  return answer === value;
}

// ── Queue management ─────────────────────────────────────────────────────────

function insertFollowUps(question, answer) {
  if (!question.followUps) return;
  for (const fu of question.followUps) {
    if (fu.ifValue !== answer) continue;
    const insertIdx = state.currentQuestionIndex + 1;
    fu.questions.forEach((qId, i) => {
      if (!state.activeQuestionQueue.includes(qId)) {
        state.activeQuestionQueue.splice(insertIdx + i, 0, qId);
      }
    });
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

function validateAnswer(question, answer) {
  const errors = [];
  if (question.required) {
    if (answer === null || answer === undefined || answer === '') {
      errors.push('Моля, отговорете на въпроса преди да продължите.');
    } else if (Array.isArray(answer) && answer.length === 0) {
      errors.push('Моля, изберете поне един вариант.');
    }
  }

  if (question.type === 'numeric' && answer !== '' && answer !== null && answer !== undefined) {
    const num = parseFloat(answer);
    if (isNaN(num)) {
      errors.push('Моля, въведете валидна числова стойност.');
    } else if (question.validation) {
      if (question.validation.min !== undefined && num < question.validation.min) {
        errors.push(question.validation.message || 'Моля, проверете стойността. Изглежда необичайна.');
      }
      if (question.validation.max !== undefined && num > question.validation.max) {
        errors.push(question.validation.message || 'Моля, проверете стойността. Изглежда необичайна.');
      }
    }
  }

  if (question.type === 'scale' && answer !== '' && answer !== null && answer !== undefined) {
    const num = parseFloat(answer);
    if (isNaN(num) || num < 0 || num > 10) {
      errors.push('Моля, въведете стойност между 0 и 10.');
    }
  }

  if (question.type === 'date' && answer) {
    const age = calculateAge(answer);
    if (age === null || isNaN(age)) {
      errors.push('Моля, въведете валидна дата.');
    } else if (question.validation) {
      if (question.validation.minAge && age < question.validation.minAge) {
        errors.push(`Минималната възраст е ${question.validation.minAge} години.`);
      }
      if (question.validation.maxAge && age > question.validation.maxAge) {
        errors.push(question.validation.message || 'Моля, проверете стойността. Изглежда необичайна.');
      }
    }
  }

  return errors;
}

// ── Answer handler ───────────────────────────────────────────────────────────

function handleAnswer(questionId, answer) {
  state.answers[questionId] = answer;
  evaluateScoring(questionId, answer);
  evaluateTriggerRules(questionId);
}

// ── Navigation ───────────────────────────────────────────────────────────────

function goNext() {
  const currentId = state.activeQuestionQueue[state.currentQuestionIndex];
  const question = getQuestionById(currentId);
  if (!question) return;

  const answer = state.answers[currentId];

  // Validate
  const errors = validateAnswer(question, answer);
  if (errors.length > 0) {
    showValidationErrors(errors);
    return;
  }
  clearValidationErrors();

  // Process follow-ups for single_choice and yes_no
  if (['yes_no', 'single_choice'].includes(question.type) && answer) {
    insertFollowUps(question, answer);
  }

  // Push history
  state.history.push(state.currentQuestionIndex);

  // Advance, skipping showIf-hidden questions
  let nextIdx = state.currentQuestionIndex + 1;
  while (nextIdx < state.activeQuestionQueue.length) {
    const nextId = state.activeQuestionQueue[nextIdx];
    const nextQ = getQuestionById(nextId);
    if (nextQ && shouldShowQuestion(nextQ)) break;
    nextIdx++;
  }

  if (nextIdx >= state.activeQuestionQueue.length) {
    // End of questionnaire
    finishQuestionnaire();
    return;
  }

  state.currentQuestionIndex = nextIdx;
  renderCurrentQuestion();
}

function goBack() {
  if (state.history.length === 0) return;
  clearValidationErrors();
  state.currentQuestionIndex = state.history.pop();
  renderCurrentQuestion();
}

// ── Domain level mapping ─────────────────────────────────────────────────────

function getDomainLevel(score) {
  if (score >= 4) return { level: 'clinician_first', label: 'Лекарски преглед', color: '#dc2626' };
  if (score >= 3) return { level: 'priority',        label: 'Приоритет',       color: '#ea580c' };
  if (score >= 2) return { level: 'moderate',        label: 'Умерен сигнал',   color: '#d97706' };
  if (score >= 1) return { level: 'low',             label: 'Слаб сигнал',     color: '#65a30d' };
  return              { level: 'none',           label: 'Без сигнал',      color: '#6b7280' };
}

const DOMAIN_LABELS = {
  cardiometabolic_risk: 'Сърдечно-съдово здраве',
  metabolic_risk:       'Метаболитно здраве',
  sleep_risk:           'Сън и възстановяване',
  gut_risk:             'Микробиом и храносмилане',
  hormone_risk:         'Хормонален баланс',
  immune_risk:          'Имунна система',
  cancer_risk:          'Семейна профилактика',
  mitochondrial_risk:   'Енергия и митохондрии',
  renal_risk:           'Бъбречно здраве',
};

// ── Patient-facing category labels ───────────────────────────────────────────
function buildPatientFacingCategories() {
  const catMap = {
    cardiometabolic_risk: 'сърдечно-съдова профилактика',
    metabolic_risk:       'метаболитно здраве',
    sleep_risk:           'сън и възстановяване',
    gut_risk:             'микробиом',
    hormone_risk:         'хормонален баланс',
    immune_risk:          'имунна система',
    cancer_risk:          'семейна превенция',
    mitochondrial_risk:   'енергия и митохондрии',
    renal_risk:           'бъбречно здраве',
  };
  return Object.entries(state.domainScores)
    .filter(([, score]) => score >= 1)
    .sort(([, a], [, b]) => b - a)
    .map(([domain]) => catMap[domain] || domain);
}

// ── Missing data ─────────────────────────────────────────────────────────────
function buildMissingData() {
  const missingLabels = {
    missing_ApoB:                    'ApoB изследване',
    missing_LpA:                     'Lp(a) изследване',
    missing_lipid_panel:             'Пълна липидна панел',
    missing_glucose_insulin_markers: 'Глюкоза/инсулин на гладно, HOMA-IR',
    missing_recent_labs:             'Скорошни лабораторни резултати',
    missing_kidney_markers:          'Бъбречна функция (eGFR, UACR)',
    HRV_missing:                     'HRV данни',
    VO2_missing:                     'VO2 max измерване',
    genetic_testing_not_done:        'Генетично тестване за онкологичен риск',
  };
  return Array.from(state.tags)
    .filter(t => missingLabels[t])
    .map(t => ({ tag: t, label: missingLabels[t] }));
}

// ── Clinician summary builder ────────────────────────────────────────────────

function buildClinicianSummary() {
  const age = calculateAge(state.answers['q_dob']);
  const bmi = calculateBMI();
  const sex = state.answers['q_sex'];
  const sexLabel = { male: 'Мъж', female: 'Жена', prefer_not_to_say: 'Не уточнено' }[sex] || '—';

  const domainLevels = {};
  Object.entries(state.domainScores).forEach(([d, score]) => {
    domainLevels[d] = getDomainLevel(score);
  });

  const priorityPackages = Object.entries(state.recommendedPackages)
    .filter(([, v]) => v.level === 'priority')
    .map(([k]) => k);

  const suggestedPackages = Object.entries(state.recommendedPackages)
    .filter(([, v]) => v.level === 'suggested')
    .map(([k]) => k);

  // Baseline longevity for almost everyone
  if (!state.physicianFirstRequired && !state.recommendedPackages['baseline_longevity']) {
    addPackage('baseline_longevity', 'suggested', 'Базова оценка за всички клиенти');
  }

  const consultationQuestions = buildConsultationQuestions();
  const missingData = buildMissingData();

  return {
    timestamp: new Date().toISOString(),
    clientSnapshot: {
      age: age !== null ? age : '—',
      sex: sexLabel,
      height: state.answers['q_height'] ? `${state.answers['q_height']} cm` : '—',
      weight: state.answers['q_weight'] ? `${state.answers['q_weight']} kg` : '—',
      bmi: bmi ? bmi.toFixed(1) : '—',
      waist: state.answers['q_waist'] ? `${state.answers['q_waist']} cm` : '—',
    },
    primaryGoals: state.answers['q_goals'] || [],
    redFlags: state.redFlags,
    safetyNotes: state.safetyNotes,
    domainScores: { ...state.domainScores },
    domainLevels,
    domainReasons: { ...state.domainReasons },
    tags: Array.from(state.tags),
    triggeredModules: Array.from(state.openedModules),
    completedModules: Array.from(state.completedModules),
    recommendedPackages: { ...state.recommendedPackages },
    priorityPackages,
    suggestedPackages,
    missingData,
    physicianFirstRequired: state.physicianFirstRequired,
    patientFacingCategories: buildPatientFacingCategories(),
    consultationQuestions,
    answers: { ...state.answers },
    uploadedFiles: [...state.uploadedFiles],
  };
}

function buildConsultationQuestions() {
  const questions = [];
  if (state.tags.has('missing_ApoB') || state.tags.has('missing_LpA')) {
    questions.push('Изследвани ли са ApoB и Lp(a)? Семейна история на сърдечно-съдови заболявания?');
  }
  if (state.tags.has('hypertension') || state.tags.has('hypertension_reported')) {
    questions.push('Какъв е текущият режим за кръвно налягане? Мониторинг у дома?');
  }
  if (state.tags.has('diabetes_t2') || state.tags.has('prediabetes')) {
    questions.push('Какъв е текущият метаболитен контрол? HbA1c тенденция?');
  }
  if (state.tags.has('thyroid_disease') || state.tags.has('thyroid_symptoms')) {
    questions.push('Текущо лечение на щитовидната жлеза? Последен TSH?');
  }
  if (state.tags.has('sleep_apnea') || state.tags.has('snoring_apnea_possible')) {
    questions.push('Правена ли е полисомнография? CPAP употреба?');
  }
  if (state.tags.has('hormone_therapy_interest')) {
    questions.push('Обсъдени ли са индикациите и рисковете на хормонална терапия?');
  }
  if (state.tags.has('kidney_disease') || state.tags.has('kidney_review_required')) {
    questions.push('Последно eGFR и UACR? Нефролог консултация?');
  }
  if (state.tags.has('cancer_history')) {
    questions.push('Текущо онкологично проследяване? Препоръчано от специалист?');
  }
  if (state.redFlags.length > 0) {
    questions.push('Уточнете всички маркирани сигнали преди стандартна longevity програма.');
  }
  return questions;
}

// ── Finish questionnaire ─────────────────────────────────────────────────────

function finishQuestionnaire() {
  // Mark all opened modules as completed
  state.openedModules.forEach(m => state.completedModules.add(m));
  state.completedModules.add('core');
  state.currentView = 'patient_complete';
  renderPatientCompletionScreen();
}

// ── JSON export ───────────────────────────────────────────────────────────────

function exportJSON() {
  const summary = buildClinicianSummary();
  const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `longevity_intake_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════════════════════════
// RENDERING
// ════════════════════════════════════════════════════════════════════════════

function el(selector) {
  return document.querySelector(selector);
}

function clearValidationErrors() {
  const err = el('#validation-errors');
  if (err) { err.innerHTML = ''; err.hidden = true; }
}

function showValidationErrors(errors) {
  const err = el('#validation-errors');
  if (!err) return;
  err.innerHTML = errors.map(e => `<p>${e}</p>`).join('');
  err.hidden = false;
  err.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateProgress() {
  const total = state.activeQuestionQueue.length;
  const current = state.currentQuestionIndex + 1;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  const bar = el('#progress-bar-fill');
  const label = el('#progress-label');
  if (bar) bar.style.width = `${pct}%`;
  if (label) label.textContent = `${current} / ${total}`;
}

function updateModuleLabel(question) {
  const mod = questionBank.modules[question.module];
  const lbl = el('#module-label');
  if (lbl) lbl.textContent = mod ? mod.label : '';
}

// ── Render dispatcher ────────────────────────────────────────────────────────

function renderCurrentQuestion() {
  const qId = state.activeQuestionQueue[state.currentQuestionIndex];
  if (!qId) { finishQuestionnaire(); return; }

  const question = getQuestionById(qId);
  if (!question) {
    console.error(`[render] Question not found: ${qId}`);
    renderFallback(qId);
    return;
  }

  clearValidationErrors();
  updateProgress();
  updateModuleLabel(question);

  const container = el('#question-container');
  if (!container) return;

  let html = '';
  switch (question.type) {
    case 'info':             html = renderInfo(question); break;
    case 'single_choice':   html = renderSingleChoice(question); break;
    case 'multi_choice':    html = renderMultiChoice(question); break;
    case 'yes_no':          html = renderYesNo(question); break;
    case 'yes_no_unknown':  html = renderYesNoUnknown(question); break;
    case 'numeric':         html = renderNumeric(question); break;
    case 'scale':           html = renderScale(question); break;
    case 'date':            html = renderDate(question); break;
    case 'lab_values':      html = renderLabValues(question); break;
    case 'repeatable_group':html = renderRepeatableGroup(question); break;
    case 'file_upload':     html = renderFileUpload(question); break;
    default:
      console.warn(`[render] Unknown question type: "${question.type}"`);
      html = renderFallbackHtml(question);
  }

  container.innerHTML = html;
  attachQuestionListeners(question);
  restoreAnswer(question);

  // Show/hide Back button
  const backBtn = el('#btn-back');
  if (backBtn) backBtn.style.display = state.history.length > 0 ? '' : 'none';
}

// ── Render: info ──────────────────────────────────────────────────────────────
function renderInfo(q) {
  return `
    <div class="question-card">
      <h2 class="question-title">${esc(q.text)}</h2>
      ${q.helpText ? `<p class="question-help">${esc(q.helpText)}</p>` : ''}
    </div>`;
}

// ── Render: single_choice ────────────────────────────────────────────────────
function renderSingleChoice(q) {
  const opts = (q.options || []).map(opt => `
    <label class="option-card" data-value="${esc(opt.value)}">
      <input type="radio" name="${esc(q.id)}" value="${esc(opt.value)}" />
      <span class="option-text">${esc(opt.label)}</span>
    </label>`).join('');

  return `
    <div class="question-card">
      <p class="question-module-hint">${moduleHint(q)}</p>
      <h2 class="question-title">${esc(q.text)}</h2>
      ${q.helpText ? `<p class="question-help">${esc(q.helpText)}</p>` : ''}
      <div class="options-list" role="radiogroup" aria-label="${esc(q.label)}">${opts}</div>
    </div>`;
}

// ── Render: multi_choice ─────────────────────────────────────────────────────
function renderMultiChoice(q) {
  const opts = (q.options || []).map(opt => `
    <label class="option-card" data-value="${esc(opt.value)}" data-exclusive="${opt.exclusive ? 'true' : 'false'}">
      <input type="checkbox" name="${esc(q.id)}" value="${esc(opt.value)}" ${opt.exclusive ? 'data-exclusive="true"' : ''} />
      <span class="option-text">${esc(opt.label)}</span>
    </label>`).join('');

  return `
    <div class="question-card">
      <p class="question-module-hint">${moduleHint(q)}</p>
      <h2 class="question-title">${esc(q.text)}</h2>
      ${q.helpText ? `<p class="question-help">${esc(q.helpText)}</p>` : ''}
      <p class="multi-hint">Изберете всички приложими.</p>
      <div class="options-list" role="group" aria-label="${esc(q.label)}">${opts}</div>
    </div>`;
}

// ── Render: yes_no ───────────────────────────────────────────────────────────
function renderYesNo(q) {
  return `
    <div class="question-card">
      <p class="question-module-hint">${moduleHint(q)}</p>
      <h2 class="question-title">${esc(q.text)}</h2>
      ${q.helpText ? `<p class="question-help">${esc(q.helpText)}</p>` : ''}
      <div class="options-list yn-row" role="radiogroup">
        <label class="option-card" data-value="yes">
          <input type="radio" name="${esc(q.id)}" value="yes" /><span class="option-text">Да</span>
        </label>
        <label class="option-card" data-value="no">
          <input type="radio" name="${esc(q.id)}" value="no" /><span class="option-text">Не</span>
        </label>
      </div>
    </div>`;
}

// ── Render: yes_no_unknown ───────────────────────────────────────────────────
function renderYesNoUnknown(q) {
  return `
    <div class="question-card">
      <p class="question-module-hint">${moduleHint(q)}</p>
      <h2 class="question-title">${esc(q.text)}</h2>
      ${q.helpText ? `<p class="question-help">${esc(q.helpText)}</p>` : ''}
      <div class="options-list yn-row" role="radiogroup">
        <label class="option-card" data-value="yes">
          <input type="radio" name="${esc(q.id)}" value="yes" /><span class="option-text">Да</span>
        </label>
        <label class="option-card" data-value="no">
          <input type="radio" name="${esc(q.id)}" value="no" /><span class="option-text">Не</span>
        </label>
        <label class="option-card" data-value="unknown">
          <input type="radio" name="${esc(q.id)}" value="unknown" /><span class="option-text">Не знам</span>
        </label>
      </div>
    </div>`;
}

// ── Render: numeric ──────────────────────────────────────────────────────────
function renderNumeric(q) {
  const unit = q.unit ? `<span class="input-unit">${esc(q.unit)}</span>` : '';
  return `
    <div class="question-card">
      <p class="question-module-hint">${moduleHint(q)}</p>
      <h2 class="question-title">${esc(q.text)}</h2>
      ${q.helpText ? `<p class="question-help">${esc(q.helpText)}</p>` : ''}
      <div class="input-with-unit">
        <input id="input-${esc(q.id)}" type="number" class="text-input"
          inputmode="decimal" autocomplete="off"
          aria-label="${esc(q.label)}"
          ${q.validation?.min !== undefined ? `min="${q.validation.min}"` : ''}
          ${q.validation?.max !== undefined ? `max="${q.validation.max}"` : ''}
        />${unit}
      </div>
    </div>`;
}

// ── Render: scale ────────────────────────────────────────────────────────────
function renderScale(q) {
  const ticks = Array.from({ length: 11 }, (_, i) => `
    <label class="scale-tick">
      <input type="radio" name="${esc(q.id)}" value="${i}" />
      <span>${i}</span>
    </label>`).join('');

  return `
    <div class="question-card">
      <p class="question-module-hint">${moduleHint(q)}</p>
      <h2 class="question-title">${esc(q.text)}</h2>
      ${q.helpText ? `<p class="question-help">${esc(q.helpText)}</p>` : ''}
      <div class="scale-container" role="radiogroup" aria-label="${esc(q.label)}">${ticks}</div>
      <div class="scale-selected-display" id="scale-display-${esc(q.id)}"></div>
    </div>`;
}

// ── Render: date ─────────────────────────────────────────────────────────────
function renderDate(q) {
  return `
    <div class="question-card">
      <p class="question-module-hint">${moduleHint(q)}</p>
      <h2 class="question-title">${esc(q.text)}</h2>
      ${q.helpText ? `<p class="question-help">${esc(q.helpText)}</p>` : ''}
      <input id="input-${esc(q.id)}" type="date" class="text-input date-input"
        aria-label="${esc(q.label)}"
        max="${new Date().toISOString().split('T')[0]}"
      />
    </div>`;
}

// ── Render: lab_values ───────────────────────────────────────────────────────
function renderLabValues(q) {
  const fields = (q.fields || []).map(f => {
    const validation = f.validation
      ? `min="${f.validation.min}" max="${f.validation.max}"`
      : '';
    const inputType = f.type === 'numeric' ? 'number' : 'text';
    return `
      <div class="lab-field">
        <label class="lab-label" for="lab-${esc(q.id)}-${esc(f.id)}">
          ${esc(f.label)}
          ${f.unit ? `<span class="lab-unit">${esc(f.unit)}</span>` : ''}
        </label>
        <input id="lab-${esc(q.id)}-${esc(f.id)}"
          type="${inputType}" class="text-input lab-input"
          data-field-id="${esc(f.id)}"
          autocomplete="off"
          ${validation}
        />
      </div>`;
  }).join('');

  return `
    <div class="question-card">
      <p class="question-module-hint">${moduleHint(q)}</p>
      <h2 class="question-title">${esc(q.text)}</h2>
      ${q.helpText ? `<p class="question-help">${esc(q.helpText)}</p>` : ''}
      <div class="lab-values-grid">${fields}</div>
    </div>`;
}

// ── Render: repeatable_group ─────────────────────────────────────────────────
function renderRepeatableGroup(q) {
  const existing = Array.isArray(state.answers[q.id]) ? state.answers[q.id] : [];
  const entriesHtml = existing.map((entry, idx) => renderRepeatableEntry(q, entry, idx)).join('');

  return `
    <div class="question-card">
      <p class="question-module-hint">${moduleHint(q)}</p>
      <h2 class="question-title">${esc(q.text)}</h2>
      ${q.helpText ? `<p class="question-help">${esc(q.helpText)}</p>` : ''}
      <div class="repeatable-entries" id="entries-${esc(q.id)}">${entriesHtml}</div>
      <button type="button" class="btn-add-entry" data-qid="${esc(q.id)}">
        + Добавете запис
      </button>
    </div>`;
}

function renderRepeatableEntry(q, entry, idx) {
  const fields = (q.fields || []).map(f => `
    <div class="rep-field">
      <label class="rep-label" for="rep-${esc(q.id)}-${idx}-${esc(f.id)}">${esc(f.label)}</label>
      <input id="rep-${esc(q.id)}-${idx}-${esc(f.id)}"
        type="text" class="text-input rep-input"
        data-qid="${esc(q.id)}" data-idx="${idx}" data-field="${esc(f.id)}"
        value="${esc(String(entry[f.id] || ''))}"
        ${f.required ? 'required' : ''}
      />
    </div>`).join('');

  return `
    <div class="rep-entry" data-idx="${idx}">
      <div class="rep-fields">${fields}</div>
      <button type="button" class="btn-remove-entry" data-qid="${esc(q.id)}" data-idx="${idx}" aria-label="Изтрийте запис">✕</button>
    </div>`;
}

// ── Render: file_upload ──────────────────────────────────────────────────────
function renderFileUpload(q) {
  const files = state.uploadedFiles.map((f, i) => `
    <div class="file-item">
      <span>📄 ${esc(f)}</span>
      <button type="button" class="btn-remove-file" data-idx="${i}" aria-label="Премахнете файла">✕</button>
    </div>`).join('');

  return `
    <div class="question-card">
      <p class="question-module-hint">${moduleHint(q)}</p>
      <h2 class="question-title">${esc(q.text)}</h2>
      <div class="privacy-warning">
        ⚠️ За MVP прототипа не качвайте реални лични данни.
      </div>
      ${q.helpText ? `<p class="question-help">${esc(q.helpText)}</p>` : ''}
      <input type="file" id="file-input-${esc(q.id)}" multiple class="file-input-hidden" aria-label="Изберете файлове" />
      <label for="file-input-${esc(q.id)}" class="btn-file-choose">Изберете файлове</label>
      <div class="file-list">${files}</div>
    </div>`;
}

function renderFallbackHtml(q) {
  return `
    <div class="question-card question-fallback">
      <p class="question-module-hint">${moduleHint(q)}</p>
      <h2 class="question-title">${esc(q.text)}</h2>
      <p class="question-help">Типът на въпроса „${esc(q.type)}" не е разпознат. Моля, продължете.</p>
    </div>`;
}

function renderFallback(qId) {
  const container = el('#question-container');
  if (container) {
    container.innerHTML = `
      <div class="question-card question-fallback">
        <p>Въпросът „${esc(qId)}" не беше намерен. Моля, свържете се с администратор.</p>
      </div>`;
  }
}

function moduleHint(q) {
  const mod = questionBank.modules[q.module];
  return mod ? `<span class="module-chip">${esc(mod.label)}</span>` : '';
}

// ── Attach listeners ─────────────────────────────────────────────────────────

function attachQuestionListeners(question) {
  const container = el('#question-container');
  if (!container) return;

  // Radio (single_choice, yes_no, yes_no_unknown, scale)
  container.querySelectorAll(`input[type="radio"][name="${question.id}"]`).forEach(input => {
    input.addEventListener('change', () => {
      const val = question.type === 'scale' ? parseInt(input.value, 10) : input.value;
      handleAnswer(question.id, val);
      // Update option card active state
      container.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
      input.closest('.option-card')?.classList.add('selected');
      // Scale display
      const disp = el(`#scale-display-${question.id}`);
      if (disp) disp.textContent = `Избрана стойност: ${val}`;
      // Scale tick active
      container.querySelectorAll('.scale-tick').forEach(t => t.classList.remove('active'));
      input.closest('.scale-tick')?.classList.add('active');
    });
  });

  // Checkbox (multi_choice)
  container.querySelectorAll(`input[type="checkbox"][name="${question.id}"]`).forEach(input => {
    input.addEventListener('change', () => {
      const isExclusive = input.dataset.exclusive === 'true';
      const allCheckboxes = container.querySelectorAll(`input[type="checkbox"][name="${question.id}"]`);

      if (isExclusive && input.checked) {
        // Clear all others
        allCheckboxes.forEach(cb => { if (cb !== input) { cb.checked = false; } });
      } else if (!isExclusive && input.checked) {
        // Clear exclusive
        allCheckboxes.forEach(cb => { if (cb.dataset.exclusive === 'true') { cb.checked = false; } });
      }

      const selected = Array.from(allCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
      handleAnswer(question.id, selected);

      // Update card active states
      container.querySelectorAll('.option-card').forEach(card => {
        const cb = card.querySelector('input[type="checkbox"]');
        card.classList.toggle('selected', cb && cb.checked);
      });
    });
  });

  // Numeric input
  const numInput = container.querySelector(`#input-${question.id}`);
  if (numInput && question.type === 'numeric') {
    numInput.addEventListener('input', () => handleAnswer(question.id, numInput.value));
  }

  // Date input
  if (question.type === 'date' && numInput) {
    numInput.addEventListener('change', () => handleAnswer(question.id, numInput.value));
  }

  // Lab values
  if (question.type === 'lab_values') {
    container.querySelectorAll('.lab-input').forEach(inp => {
      inp.addEventListener('input', () => {
        const current = state.answers[question.id] || {};
        current[inp.dataset.fieldId] = inp.value;
        handleAnswer(question.id, { ...current });
      });
    });
    // Validate numeric lab fields inline
    container.querySelectorAll('.lab-input[min]').forEach(inp => {
      inp.addEventListener('blur', () => {
        const val = parseFloat(inp.value);
        const min = parseFloat(inp.min);
        const max = parseFloat(inp.max);
        if (inp.value && !isNaN(val) && (!isNaN(min) && val < min || !isNaN(max) && val > max)) {
          inp.classList.add('input-error');
          showValidationErrors(['Моля, проверете стойността. Изглежда необичайна.']);
        } else {
          inp.classList.remove('input-error');
        }
      });
    });
  }

  // Repeatable group: add entry
  container.querySelectorAll('.btn-add-entry').forEach(btn => {
    btn.addEventListener('click', () => {
      const qid = btn.dataset.qid;
      const q = getQuestionById(qid);
      if (!q) return;
      const entries = Array.isArray(state.answers[qid]) ? [...state.answers[qid]] : [];
      const newEntry = {};
      (q.fields || []).forEach(f => { newEntry[f.id] = ''; });
      entries.push(newEntry);
      state.answers[qid] = entries;
      // Re-render just the repeatable group
      const entriesContainer = el(`#entries-${qid}`);
      if (entriesContainer) {
        entriesContainer.innerHTML = entries.map((e, i) => renderRepeatableEntry(q, e, i)).join('');
        attachRepeatableListeners(q);
      }
    });
  });
  attachRepeatableListeners(question);

  // File upload
  if (question.type === 'file_upload') {
    const fileInput = container.querySelector(`#file-input-${question.id}`);
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        Array.from(fileInput.files).forEach(f => {
          if (!state.uploadedFiles.includes(f.name)) state.uploadedFiles.push(f.name);
        });
        fileInput.value = '';
        // Re-render file list
        const fileList = container.querySelector('.file-list');
        if (fileList) {
          fileList.innerHTML = state.uploadedFiles.map((f, i) => `
            <div class="file-item">
              <span>📄 ${esc(f)}</span>
              <button type="button" class="btn-remove-file" data-idx="${i}" aria-label="Премахнете файла">✕</button>
            </div>`).join('');
          attachFileRemoveListeners();
        }
      });
    }
    attachFileRemoveListeners();
  }
}

function attachRepeatableListeners(question) {
  const container = el('#question-container');
  if (!container) return;

  // Field input
  container.querySelectorAll(`.rep-input[data-qid="${question.id}"]`).forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.idx, 10);
      const field = inp.dataset.field;
      const entries = Array.isArray(state.answers[question.id]) ? [...state.answers[question.id]] : [];
      if (!entries[idx]) entries[idx] = {};
      entries[idx][field] = inp.value;
      state.answers[question.id] = entries;
    });
  });

  // Remove entry
  container.querySelectorAll(`.btn-remove-entry[data-qid="${question.id}"]`).forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const entries = Array.isArray(state.answers[question.id]) ? [...state.answers[question.id]] : [];
      entries.splice(idx, 1);
      state.answers[question.id] = entries;
      const entriesContainer = el(`#entries-${question.id}`);
      if (entriesContainer) {
        entriesContainer.innerHTML = entries.map((e, i) => renderRepeatableEntry(question, e, i)).join('');
        attachRepeatableListeners(question);
      }
    });
  });
}

function attachFileRemoveListeners() {
  const container = el('#question-container');
  if (!container) return;
  container.querySelectorAll('.btn-remove-file').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      state.uploadedFiles.splice(idx, 1);
      const fileList = container.querySelector('.file-list');
      if (fileList) {
        fileList.innerHTML = state.uploadedFiles.map((f, i) => `
          <div class="file-item">
            <span>📄 ${esc(f)}</span>
            <button type="button" class="btn-remove-file" data-idx="${i}" aria-label="Премахнете файла">✕</button>
          </div>`).join('');
        attachFileRemoveListeners();
      }
    });
  });
}

// ── Restore saved answer ─────────────────────────────────────────────────────

function restoreAnswer(question) {
  const answer = state.answers[question.id];
  if (answer === undefined || answer === null) return;
  const container = el('#question-container');
  if (!container) return;

  if (['single_choice', 'yes_no', 'yes_no_unknown', 'scale'].includes(question.type)) {
    const radios = container.querySelectorAll(`input[type="radio"][name="${question.id}"]`);
    radios.forEach(r => {
      const match = question.type === 'scale'
        ? parseInt(r.value, 10) === answer
        : r.value === answer;
      if (match) {
        r.checked = true;
        r.closest('.option-card')?.classList.add('selected');
        r.closest('.scale-tick')?.classList.add('active');
        const disp = el(`#scale-display-${question.id}`);
        if (disp) disp.textContent = `Избрана стойност: ${answer}`;
      }
    });
  }

  if (question.type === 'multi_choice' && Array.isArray(answer)) {
    container.querySelectorAll(`input[type="checkbox"][name="${question.id}"]`).forEach(cb => {
      cb.checked = answer.includes(cb.value);
      cb.closest('.option-card')?.classList.toggle('selected', cb.checked);
    });
  }

  if (question.type === 'numeric' || question.type === 'date') {
    const inp = container.querySelector(`#input-${question.id}`);
    if (inp) inp.value = answer;
  }

  if (question.type === 'lab_values' && typeof answer === 'object') {
    container.querySelectorAll('.lab-input').forEach(inp => {
      const val = answer[inp.dataset.fieldId];
      if (val !== undefined) inp.value = val;
    });
  }
}

// ── Patient completion screen ────────────────────────────────────────────────

function renderPatientCompletionScreen() {
  const view = el('#view-intake');
  const completionView = el('#view-patient-complete');
  if (view) view.hidden = true;
  if (completionView) completionView.hidden = false;

  const categories = buildPatientFacingCategories();
  const catHtml = categories.length > 0
    ? categories.map(c => `<li class="category-item">${esc(c)}</li>`).join('')
    : '<li class="category-item">обща превенция и дълголетие</li>';

  const msgHtml = state.physicianFirstRequired
    ? `<div class="physician-note">
        <p>Някои от посочените отговори изискват лекарска оценка преди стандартна longevity програма. Това е предпазна мярка, за да започнем по най-безопасния начин.</p>
       </div>`
    : '';

  if (completionView) {
    completionView.innerHTML = `
      <div class="completion-card">
        <div class="completion-icon">✓</div>
        <h1 class="completion-title">Благодарим Ви!</h1>
        <p class="completion-subtitle">Вашият предварителен профил е създаден успешно.</p>
        <p class="completion-body">
          На база отговорите Ви екипът ще прегледа основните направления и ще предложи
          най-подходящия диагностичен път по време на консултацията.
        </p>
        ${msgHtml}
        ${categories.length > 0 ? `
          <div class="completion-categories">
            <h3>Области за обсъждане:</h3>
            <ul>${catHtml}</ul>
          </div>` : ''}
        <p class="completion-next">
          <strong>Следваща стъпка:</strong> Нашият екип ще се свърже с Вас, за да потвърди часа на консултацията и да отговори на допълнителни въпроси.
        </p>
        <p class="disclaimer">
          ⚠️ Това не е медицинска диагноза. Събраната информация е предназначена единствено за подготовка на клиничния екип.
        </p>
        <button class="btn-primary" id="btn-view-clinician">Виж обобщение за клинициста</button>
      </div>`;
    el('#btn-view-clinician')?.addEventListener('click', () => {
      state.currentView = 'clinician';
      renderClinicianSummary();
    });
  }
}

// ── Clinician summary renderer ───────────────────────────────────────────────

function renderClinicianSummary() {
  const completionView = el('#view-patient-complete');
  const clinicianView = el('#view-clinician');
  if (completionView) completionView.hidden = true;
  if (clinicianView) clinicianView.hidden = false;

  const summary = buildClinicianSummary();
  const container = el('#clinician-content');
  if (!container) return;

  container.innerHTML = `
    ${renderClientSnapshot(summary)}
    ${summary.physicianFirstRequired ? renderRedFlagBanner() : ''}
    ${renderDomainSection(summary)}
    ${renderRedFlagSection(summary)}
    ${renderSafetyNotesSection(summary)}
    ${renderPackagesSection(summary)}
    ${renderMissingDataSection(summary)}
    ${renderConsultationQuestionsSection(summary)}
    ${renderRawAnswersSection(summary)}
  `;

  el('#btn-export-json')?.addEventListener('click', exportJSON);
  el('#btn-back-to-patient')?.addEventListener('click', () => {
    clinicianView.hidden = true;
    el('#view-patient-complete').hidden = false;
  });
}

function renderClientSnapshot(s) {
  const snap = s.clientSnapshot;
  const goalsLabels = (s.primaryGoals || []).map(g => {
    const q = getQuestionById('q_goals');
    const opt = q?.options?.find(o => o.value === g);
    return opt ? opt.label : g;
  });
  return `
    <section class="summary-section">
      <h2 class="summary-section-title">👤 Профил на клиента</h2>
      <div class="snapshot-grid">
        <div class="snap-item"><span class="snap-label">Възраст</span><span class="snap-val">${snap.age} г.</span></div>
        <div class="snap-item"><span class="snap-label">Пол</span><span class="snap-val">${snap.sex}</span></div>
        <div class="snap-item"><span class="snap-label">Ръст</span><span class="snap-val">${snap.height}</span></div>
        <div class="snap-item"><span class="snap-label">Тегло</span><span class="snap-val">${snap.weight}</span></div>
        <div class="snap-item"><span class="snap-label">ИТМ</span><span class="snap-val">${snap.bmi}</span></div>
        <div class="snap-item"><span class="snap-label">Талия</span><span class="snap-val">${snap.waist}</span></div>
      </div>
      ${goalsLabels.length ? `
        <div class="goals-list">
          <strong>Основни цели:</strong>
          <ul>${goalsLabels.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
        </div>` : ''}
    </section>`;
}

function renderRedFlagBanner() {
  return `
    <div class="red-flag-banner">
      ⚠️ КЛИНИЦИСТ — НЕОБХОДИМ ПРЕГЛЕД ПРЕДИ СТАНДАРТНА ПРОГРАМА
    </div>`;
}

function renderDomainSection(s) {
  const domains = Object.entries(s.domainScores).sort(([, a], [, b]) => b - a);
  if (domains.length === 0) return '';
  const rows = domains.map(([domain, score]) => {
    const lvl = getDomainLevel(score);
    const label = DOMAIN_LABELS[domain] || domain;
    const reasons = (s.domainReasons[domain] || []).map(r => `<li>${esc(r)}</li>`).join('');
    return `
      <div class="domain-row">
        <div class="domain-header">
          <span class="domain-label">${esc(label)}</span>
          <span class="domain-badge" style="background:${lvl.color}">${score}/4 — ${esc(lvl.label)}</span>
        </div>
        ${reasons ? `<ul class="domain-reasons">${reasons}</ul>` : ''}
      </div>`;
  }).join('');

  return `
    <section class="summary-section">
      <h2 class="summary-section-title">📊 Домейнови сигнали</h2>
      <div class="domain-list">${rows}</div>
    </section>`;
}

function renderRedFlagSection(s) {
  if (!s.redFlags || s.redFlags.length === 0) return '';
  const items = s.redFlags.map(r => `<li class="red-flag-item">🚩 ${esc(r)}</li>`).join('');
  return `
    <section class="summary-section">
      <h2 class="summary-section-title">🚩 Червени флагове</h2>
      <ul class="red-flag-list">${items}</ul>
    </section>`;
}

function renderSafetyNotesSection(s) {
  if (!s.safetyNotes || s.safetyNotes.length === 0) return '';
  const items = s.safetyNotes.map(n => `<li class="safety-note-item">⚡ ${esc(n)}</li>`).join('');
  return `
    <section class="summary-section">
      <h2 class="summary-section-title">⚡ Бележки за безопасност</h2>
      <ul class="safety-note-list">${items}</ul>
    </section>`;
}

function renderPackagesSection(s) {
  const all = Object.entries(s.recommendedPackages);
  if (all.length === 0) return '';

  const priority = all.filter(([, v]) => v.level === 'priority');
  const suggested = all.filter(([, v]) => v.level === 'suggested');

  function pkgRow([id, rec]) {
    const pkg = questionBank.packages[id];
    const name = pkg ? pkg.label : id;
    const desc = pkg ? pkg.description : '';
    const reasons = (rec.reasons || []).join('; ');
    return `
      <div class="package-row ${rec.level}">
        <div class="package-name">${esc(name)}</div>
        ${desc ? `<div class="package-desc">${esc(desc)}</div>` : ''}
        ${reasons ? `<div class="package-reasons">Причина: ${esc(reasons)}</div>` : ''}
      </div>`;
  }

  return `
    <section class="summary-section">
      <h2 class="summary-section-title">🧪 Препоръчани диагностични пакети</h2>
      ${priority.length ? `<h3 class="pkg-sublabel priority-label">Приоритет (score ≥ 3)</h3><div class="package-list">${priority.map(pkgRow).join('')}</div>` : ''}
      ${suggested.length ? `<h3 class="pkg-sublabel suggested-label">Предложени</h3><div class="package-list">${suggested.map(pkgRow).join('')}</div>` : ''}
    </section>`;
}

function renderMissingDataSection(s) {
  if (!s.missingData || s.missingData.length === 0) return '';
  const items = s.missingData.map(m => `<li class="missing-item">📋 ${esc(m.label)}</li>`).join('');
  return `
    <section class="summary-section">
      <h2 class="summary-section-title">📋 Липсващи данни</h2>
      <ul class="missing-list">${items}</ul>
    </section>`;
}

function renderConsultationQuestionsSection(s) {
  if (!s.consultationQuestions || s.consultationQuestions.length === 0) return '';
  const items = s.consultationQuestions.map(q => `<li class="consult-q">❓ ${esc(q)}</li>`).join('');
  return `
    <section class="summary-section">
      <h2 class="summary-section-title">❓ Въпроси за консултацията</h2>
      <ul class="consult-list">${items}</ul>
    </section>`;
}

function renderRawAnswersSection(s) {
  const entries = Object.entries(s.answers).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return '';

  const rows = entries.map(([qId, val]) => {
    const q = getQuestionById(qId);
    const label = q ? q.label : qId;
    let displayVal = '';

    if (Array.isArray(val)) {
      if (val.length > 0 && typeof val[0] === 'object') {
        // repeatable_group
        displayVal = val.map((entry, i) => {
          const parts = Object.entries(entry)
            .filter(([, v]) => v)
            .map(([k, v]) => {
              const field = q?.fields?.find(f => f.id === k);
              return `${field ? field.label : k}: ${esc(String(v))}`;
            }).join(', ');
          return `<div class="raw-entry">${i + 1}. ${parts}</div>`;
        }).join('');
      } else {
        // multi_choice: resolve labels
        displayVal = val.map(v => {
          const opt = q?.options?.find(o => o.value === v);
          return esc(opt ? opt.label : v);
        }).join(', ');
      }
    } else if (typeof val === 'object') {
      // lab_values
      displayVal = Object.entries(val)
        .filter(([, v]) => v)
        .map(([k, v]) => {
          const field = q?.fields?.find(f => f.id === k);
          return `${field ? field.label : k}: ${esc(String(v))}`;
        }).join(' | ');
    } else {
      // Resolve label for single_choice
      const opt = q?.options?.find(o => o.value === String(val));
      displayVal = esc(opt ? opt.label : String(val));
    }

    return `<tr><td class="raw-q">${esc(label)}</td><td class="raw-a">${displayVal}</td></tr>`;
  }).join('');

  return `
    <section class="summary-section">
      <h2 class="summary-section-title">📝 Всички отговори</h2>
      <div class="raw-table-wrap">
        <table class="raw-table"><tbody>${rows}</tbody></table>
      </div>
    </section>`;
}

// ── HTML escape ──────────────────────────────────────────────────────────────
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ════════════════════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════════════════════

function initApp() {
  // Build initial queue from core module only
  state.openedModules.add('core');
  state.activeQuestionQueue = getModuleQuestions('core').map(q => q.id);
  state.currentQuestionIndex = 0;

  // Baseline longevity package suggested for everyone unless physician_first_required
  addPackage('baseline_longevity', 'suggested', 'Базова оценка за всички клиенти');

  // Wire up Next / Back buttons
  el('#btn-next')?.addEventListener('click', goNext);
  el('#btn-back')?.addEventListener('click', goBack);

  // Hide clinician view initially
  const clinicianView = el('#view-clinician');
  if (clinicianView) clinicianView.hidden = true;
  const completionView = el('#view-patient-complete');
  if (completionView) completionView.hidden = true;

  renderCurrentQuestion();
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
