// questionBank.js — Smart Longevity Intake
// Source of truth for all questions, modules, packages, scoring rules and trigger rules.
// Edit this file to add/modify/remove questions, modules or packages.

const questionBank = {

  // ── Module definitions ───────────────────────────────────────────────────
  modules: {
    core:            { label: 'Основна информация',           order: 0 },
    cardiometabolic: { label: 'Сърдечно-съдово здраве',       order: 1 },
    metabolic:       { label: 'Метаболитно здраве',           order: 2 },
    sleep:           { label: 'Сън и възстановяване',         order: 3 },
    gut:             { label: 'Храносмилане и микробиом',     order: 4 },
    hormone:         { label: 'Хормонален баланс',            order: 5 },
    immune:          { label: 'Имунна система',               order: 6 },
    cancer_family:   { label: 'Семейна профилактика',         order: 7 },
    mitochondrial:   { label: 'Енергия и митохондрии',        order: 8 },
    renal:           { label: 'Бъбречно здраве',              order: 9 },
  },

  // ── Diagnostic package definitions ───────────────────────────────────────
  packages: {
    baseline_longevity: {
      label: 'Базова Longevity Оценка',
      description: 'Пълен базов анализ, препоръчан за всички клиенти: CBC, метаболитен панел, хормони, витамин D, hsCRP, ферогрупа.',
    },
    cardiometabolic_standard: {
      label: 'Кардиометаболитен стандартен пакет',
      description: 'ЕКГ в покой, пълна липидна панел, ApoB, Lp(a), hsCRP, фибриноген.',
    },
    cardiometabolic_extended: {
      label: 'Кардиометаболитен разширен пакет',
      description: 'Включва коронарен калциев скор (CT), холтер ЕКГ, стрес тест с ЕКГ, ехокардиография.',
    },
    metabolic_standard: {
      label: 'Метаболитен стандартен пакет',
      description: 'Глюкоза на гладно, HbA1c, инсулин, HOMA-IR, чернодробни ензими (ALT, AST, GGT), пикочна киселина.',
    },
    metabolic_extended: {
      label: 'Метаболитен разширен пакет',
      description: 'Непрекъснато мониториране на глюкозата (CGM 14 дни), DEXA (телесен състав), чернодробна ехография.',
    },
    sleep_assessment: {
      label: 'Оценка на съня',
      description: 'Домашен сомно-скрининг или полисомнография, HRV анализ (7 дни), актиграфия.',
    },
    gut_microbiome: {
      label: 'Микробиом и стомашно-чревно здраве',
      description: 'Анализ на чревна микробиота (16S или метагеномен), хранителна непоносимост (IgG панел), калпротектин.',
    },
    hormone_standard: {
      label: 'Хормонален стандартен пакет',
      description: 'Пълен хормонален профил: TSH, fT3, fT4, тестостерон/естрадиол, DHEA-S, кортизол (сутрешен), LH, FSH.',
    },
    cancer_prevention: {
      label: 'Семейна онкологична профилактика',
      description: 'Генетично консултиране, PSA (мъже), СА-125 (жени), CEA, AFP; планиран скрининг по пол и възраст.',
    },
    mitochondrial_assessment: {
      label: 'Оценка на митохондриалната функция',
      description: 'VO2 max тест (кардиопулмонален), лактатен праг, органска киселинна панел (урина), CoQ10.',
    },
    renal_assessment: {
      label: 'Бъбречна оценка',
      description: 'eGFR (CKD-EPI), серумен креатинин, UACR (урина), електролити, пикочна киселина, бъбречна ехография.',
    },
    immune_assessment: {
      label: 'Имунна оценка',
      description: 'Имунен фенотип (лимфоцитни субпопулации), антиядрени антитела (ANA), hsCRP, IL-6.',
    },
  },

  // ── Global trigger rules (checked after every answer) ────────────────────
  // These supplement per-question scoring.triggerModules.
  triggerRules: [
    {
      id: 'tr_cardio_hbp',
      sourceQuestion: 'q_conditions',
      condition: { type: 'includes', value: 'high_blood_pressure' },
      triggerModules: ['cardiometabolic', 'renal', 'sleep'],
      reason: 'Диагностицирана хипертония',
    },
    {
      id: 'tr_cardio_cholesterol',
      sourceQuestion: 'q_conditions',
      condition: { type: 'includes', value: 'high_cholesterol' },
      triggerModules: ['cardiometabolic'],
      reason: 'Диагностициран висок холестерол',
    },
    {
      id: 'tr_cardio_heart_disease',
      sourceQuestion: 'q_conditions',
      condition: { type: 'includes', value: 'heart_disease' },
      triggerModules: ['cardiometabolic'],
      reason: 'Известно сърдечно заболяване',
    },
    {
      id: 'tr_cardio_goal',
      sourceQuestion: 'q_goals',
      condition: { type: 'includes', value: 'cardiovascular_prevention' },
      triggerModules: ['cardiometabolic'],
      reason: 'Цел: сърдечно-съдова профилактика',
    },
    {
      id: 'tr_cardio_smoking',
      sourceQuestion: 'q_smoking',
      condition: { type: 'equals', value: 'current' },
      triggerModules: ['cardiometabolic'],
      reason: 'Активен пушач',
    },
    {
      id: 'tr_cardio_family_cv',
      sourceQuestion: 'q_family_history',
      condition: { type: 'includes', value: 'premature_heart_disease' },
      triggerModules: ['cardiometabolic'],
      reason: 'Фамилна преждевременна сърдечно-съдова болест',
    },
    {
      id: 'tr_meta_diabetes',
      sourceQuestion: 'q_conditions',
      condition: { type: 'includes_any', values: ['prediabetes', 'diabetes'] },
      triggerModules: ['metabolic'],
      reason: 'Диабет / предиабет',
    },
    {
      id: 'tr_meta_goal',
      sourceQuestion: 'q_goals',
      condition: { type: 'includes', value: 'body_composition' },
      triggerModules: ['metabolic'],
      reason: 'Цел: телесен състав',
    },
    {
      id: 'tr_meta_liver',
      sourceQuestion: 'q_conditions',
      condition: { type: 'includes', value: 'liver_disease' },
      triggerModules: ['metabolic'],
      reason: 'Чернодробна болест',
    },
    {
      id: 'tr_sleep_goal',
      sourceQuestion: 'q_goals',
      condition: { type: 'includes_any', values: ['sleep_recovery', 'stress_management'] },
      triggerModules: ['sleep'],
      reason: 'Цел: сън / стрес',
    },
    {
      id: 'tr_sleep_stress_scale',
      sourceQuestion: 'q_stress',
      condition: { type: 'gte', value: 7 },
      triggerModules: ['sleep'],
      reason: 'Висок стрес (≥ 7/10)',
    },
    {
      id: 'tr_sleep_quality_scale',
      sourceQuestion: 'q_sleep_quality',
      condition: { type: 'lte', value: 4 },
      triggerModules: ['sleep'],
      reason: 'Лошо качество на съня (≤ 4/10)',
    },
    {
      id: 'tr_sleep_apnea',
      sourceQuestion: 'q_conditions',
      condition: { type: 'includes', value: 'sleep_apnea' },
      triggerModules: ['sleep', 'cardiometabolic'],
      reason: 'Диагностицирана сънна апнея',
    },
    {
      id: 'tr_gut_goal',
      sourceQuestion: 'q_goals',
      condition: { type: 'includes', value: 'gut_microbiome' },
      triggerModules: ['gut'],
      reason: 'Цел: микробиом',
    },
    {
      id: 'tr_gut_autoimmune',
      sourceQuestion: 'q_conditions',
      condition: { type: 'includes', value: 'autoimmune' },
      triggerModules: ['gut', 'immune'],
      reason: 'Автоимунно заболяване',
    },
    {
      id: 'tr_gut_gi_symptoms',
      sourceQuestion: 'q_gi_symptoms',
      condition: { type: 'equals', value: 'yes' },
      triggerModules: ['gut'],
      reason: 'Редовни GI симптоми',
    },
    {
      id: 'tr_hormone_goal',
      sourceQuestion: 'q_goals',
      condition: { type: 'includes_any', values: ['hormone_balance', 'sexual_health'] },
      triggerModules: ['hormone'],
      reason: 'Цел: хормонален баланс / сексуално здраве',
    },
    {
      id: 'tr_hormone_thyroid',
      sourceQuestion: 'q_conditions',
      condition: { type: 'includes', value: 'thyroid_disease' },
      triggerModules: ['hormone'],
      reason: 'Болест на щитовидната жлеза',
    },
    {
      id: 'tr_cancer_goal',
      sourceQuestion: 'q_goals',
      condition: { type: 'includes', value: 'cancer_prevention' },
      triggerModules: ['cancer_family'],
      reason: 'Цел: онкологична профилактика',
    },
    {
      id: 'tr_cancer_history',
      sourceQuestion: 'q_conditions',
      condition: { type: 'includes', value: 'cancer_history' },
      triggerModules: ['cancer_family'],
      reason: 'Лична онкологична история',
    },
    {
      id: 'tr_cancer_family_history',
      sourceQuestion: 'q_family_history',
      condition: { type: 'includes', value: 'cancer_family' },
      triggerModules: ['cancer_family'],
      reason: 'Фамилна онкологична история',
    },
    {
      id: 'tr_mito_energy',
      sourceQuestion: 'q_energy',
      condition: { type: 'lte', value: 4 },
      triggerModules: ['mitochondrial'],
      reason: 'Ниска енергия (≤ 4/10)',
    },
    {
      id: 'tr_mito_goal',
      sourceQuestion: 'q_goals',
      condition: { type: 'includes_any', values: ['vo2_fitness', 'muscle_performance'] },
      triggerModules: ['mitochondrial'],
      reason: 'Цел: фитнес / мускули',
    },
    {
      id: 'tr_renal_condition',
      sourceQuestion: 'q_conditions',
      condition: { type: 'includes', value: 'kidney_disease' },
      triggerModules: ['renal'],
      reason: 'Бъбречна болест',
    },
    {
      id: 'tr_renal_family',
      sourceQuestion: 'q_family_history',
      condition: { type: 'includes', value: 'kidney_disease_family' },
      triggerModules: ['renal'],
      reason: 'Фамилна бъбречна болест',
    },
    {
      id: 'tr_renal_diabetes',
      sourceQuestion: 'q_conditions',
      condition: { type: 'includes', value: 'diabetes' },
      triggerModules: ['renal'],
      reason: 'Диабет (бъбречен риск)',
    },
  ],

  // ── Questions ─────────────────────────────────────────────────────────────
  // Each question must have: id, module, type, label, text.
  // Optional: helpText, required, options, validation, followUps, showIf,
  //           scoring, tags, packages, triggerModules, fields, sourceQuestionId, unit.
  questions: [

    // ════════════════════════════════════════════════════════════════════════
    // CORE MODULE
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'q_welcome',
      module: 'core',
      type: 'info',
      label: 'Добре дошли',
      text: 'Добре дошли в Smart Longevity Intake',
      helpText: 'Тази анкета ни помага да подготвим персонализирана оценка за Вашето здраве преди първата консултация. Отговорите Ви се запазват само в браузъра по време на тази сесия — никакви данни не се изпращат или съхраняват. Ще отнеме около 10–15 минути.',
      required: false,
    },

    {
      id: 'q_dob',
      module: 'core',
      type: 'date',
      label: 'Дата на раждане',
      text: 'Каква е Вашата дата на раждане?',
      helpText: 'Използваме тази информация за оценка на възрастово-специфични сигнали.',
      required: true,
      validation: { minAge: 18, maxAge: 100 },
      scoring: [
        {
          condition: { type: 'age_gte', value: 50 },
          domain: 'cardiometabolic_risk',
          points: 1,
          tags: ['age_50_plus'],
          reason: 'Възраст ≥ 50 години',
        },
        {
          condition: { type: 'age_gte', value: 60 },
          domain: 'cancer_risk',
          points: 1,
          tags: ['age_60_plus'],
          reason: 'Възраст ≥ 60 години',
        },
      ],
    },

    {
      id: 'q_sex',
      module: 'core',
      type: 'single_choice',
      label: 'Биологичен пол',
      text: 'Какъв е Вашият биологичен пол?',
      helpText: 'Тази информация се използва за пол-специфични референтни диапазони.',
      required: true,
      options: [
        { value: 'male',              label: 'Мъж' },
        { value: 'female',            label: 'Жена' },
        { value: 'prefer_not_to_say', label: 'Предпочитам да не уточнявам' },
      ],
    },

    {
      id: 'q_height',
      module: 'core',
      type: 'numeric',
      label: 'Ръст',
      text: 'Какъв е Вашият ръст?',
      helpText: 'Въведете в сантиметри.',
      required: true,
      unit: 'cm',
      validation: { min: 120, max: 230, message: 'Моля, проверете стойността. Изглежда необичайна.' },
    },

    {
      id: 'q_weight',
      module: 'core',
      type: 'numeric',
      label: 'Тегло',
      text: 'Какво е Вашето текущо тегло?',
      helpText: 'Въведете в килограми.',
      required: true,
      unit: 'kg',
      validation: { min: 35, max: 250, message: 'Моля, проверете стойността. Изглежда необичайна.' },
      scoring: [
        {
          condition: { type: 'bmi_gte', value: 30 },
          domain: 'metabolic_risk',
          points: 2,
          tags: ['obesity'],
          packages: ['metabolic_standard'],
          triggerModules: ['metabolic'],
          reason: 'ИТМ ≥ 30 (затлъстяване)',
        },
        {
          condition: { type: 'bmi_gte', value: 25 },
          domain: 'metabolic_risk',
          points: 1,
          tags: ['overweight'],
          triggerModules: ['metabolic'],
          reason: 'ИТМ ≥ 25 (наднормено тегло)',
        },
      ],
    },

    {
      id: 'q_waist',
      module: 'core',
      type: 'numeric',
      label: 'Обиколка на талия',
      text: 'Каква е обиколката на Вашата талия?',
      helpText: 'Измерете на нивото на пъпа, въведете в сантиметри. Можете да пропуснете, ако не знаете.',
      required: false,
      unit: 'cm',
      validation: { min: 45, max: 180, message: 'Моля, проверете стойността. Изглежда необичайна.' },
      scoring: [
        {
          condition: { type: 'waist_elevated_male' },
          domain: 'metabolic_risk',
          points: 2,
          tags: ['central_obesity'],
          packages: ['metabolic_standard'],
          triggerModules: ['metabolic'],
          reason: 'Централно затлъстяване (мъже > 102 cm)',
        },
        {
          condition: { type: 'waist_elevated_female' },
          domain: 'metabolic_risk',
          points: 2,
          tags: ['central_obesity'],
          packages: ['metabolic_standard'],
          triggerModules: ['metabolic'],
          reason: 'Централно затлъстяване (жени > 88 cm)',
        },
      ],
    },

    {
      id: 'q_goals',
      module: 'core',
      type: 'multi_choice',
      label: 'Основни цели',
      text: 'Кои са Вашите основни цели при записването?',
      helpText: 'Изберете всички, които се отнасят за Вас. Нашият екип ще фокусира оценката именно върху тях.',
      required: true,
      options: [
        { value: 'general_longevity',        label: 'Обща превенция и дълголетие' },
        { value: 'cardiovascular_prevention', label: 'Сърдечно-съдова профилактика' },
        { value: 'body_composition',          label: 'Телесен състав и метаболизъм' },
        { value: 'sleep_recovery',            label: 'Сън и възстановяване' },
        { value: 'stress_management',         label: 'Управление на стреса' },
        { value: 'gut_microbiome',            label: 'Микробиом и храносмилане' },
        { value: 'hormone_balance',           label: 'Хормонален баланс' },
        { value: 'sexual_health',             label: 'Сексуално здраве' },
        { value: 'vo2_fitness',               label: 'Фитнес и VO2 max' },
        { value: 'muscle_performance',        label: 'Мускулна маса и сила' },
        { value: 'cancer_prevention',         label: 'Онкологична профилактика' },
        { value: 'brain_cognitive',           label: 'Мозъчна функция и когниция' },
        { value: 'other',                     label: 'Друго' },
      ],
      scoring: [
        {
          condition: { type: 'includes', value: 'cardiovascular_prevention' },
          domain: 'cardiometabolic_risk',
          points: 1,
          packages: ['cardiometabolic_standard'],
          triggerModules: ['cardiometabolic'],
          reason: 'Цел: сърдечно-съдова профилактика',
        },
        {
          condition: { type: 'includes', value: 'body_composition' },
          domain: 'metabolic_risk',
          points: 1,
          packages: ['metabolic_standard'],
          triggerModules: ['metabolic'],
          reason: 'Цел: телесен състав',
        },
        {
          condition: { type: 'includes_any', values: ['sleep_recovery', 'stress_management'] },
          domain: 'sleep_risk',
          points: 1,
          packages: ['sleep_assessment'],
          triggerModules: ['sleep'],
          reason: 'Цел: сън / стрес',
        },
        {
          condition: { type: 'includes', value: 'gut_microbiome' },
          domain: 'gut_risk',
          points: 1,
          packages: ['gut_microbiome'],
          triggerModules: ['gut'],
          reason: 'Цел: микробиом',
        },
        {
          condition: { type: 'includes_any', values: ['hormone_balance', 'sexual_health'] },
          domain: 'hormone_risk',
          points: 1,
          packages: ['hormone_standard'],
          triggerModules: ['hormone'],
          reason: 'Цел: хормони / сексуално здраве',
        },
        {
          condition: { type: 'includes', value: 'cancer_prevention' },
          domain: 'cancer_risk',
          points: 1,
          packages: ['cancer_prevention'],
          triggerModules: ['cancer_family'],
          reason: 'Цел: онкологична профилактика',
        },
        {
          condition: { type: 'includes_any', values: ['vo2_fitness', 'muscle_performance'] },
          domain: 'mitochondrial_risk',
          points: 1,
          packages: ['mitochondrial_assessment'],
          triggerModules: ['mitochondrial'],
          reason: 'Цел: фитнес / мускулна маса',
        },
      ],
    },

    {
      id: 'q_conditions',
      module: 'core',
      type: 'multi_choice',
      label: 'Медицински диагнози',
      text: 'Кои от следните заболявания или диагнози имате?',
      helpText: 'Изберете всички приложими. Ако нямате нито едно, изберете „Нямам нито едно".',
      required: true,
      options: [
        { value: 'high_blood_pressure', label: 'Високо кръвно налягане' },
        { value: 'high_cholesterol',    label: 'Висок холестерол' },
        { value: 'prediabetes',         label: 'Предиабет' },
        { value: 'diabetes',            label: 'Захарен диабет тип 2' },
        { value: 'thyroid_disease',     label: 'Болест на щитовидната жлеза' },
        { value: 'autoimmune',          label: 'Автоимунно заболяване' },
        { value: 'kidney_disease',      label: 'Хронична бъбречна болест' },
        { value: 'liver_disease',       label: 'Чернодробна болест / мастен черен дроб' },
        { value: 'heart_disease',       label: 'Сърдечно заболяване (исхемична болест, аритмия и др.)' },
        { value: 'cancer_history',      label: 'Онкологично заболяване (в миналото или настоящо)' },
        { value: 'mental_health',       label: 'Диагностицирано психично-здравно заболяване' },
        { value: 'sleep_apnea',         label: 'Сънна апнея (диагностицирана)' },
        { value: 'none', label: 'Нямам нито едно от изброените', exclusive: true },
      ],
      scoring: [
        {
          condition: { type: 'includes', value: 'high_blood_pressure' },
          domain: 'cardiometabolic_risk',
          points: 2,
          tags: ['hypertension'],
          packages: ['cardiometabolic_standard'],
          reason: 'Диагностицирана хипертония',
        },
        {
          condition: { type: 'includes', value: 'high_cholesterol' },
          domain: 'cardiometabolic_risk',
          points: 2,
          tags: ['dyslipidemia'],
          packages: ['cardiometabolic_standard'],
          reason: 'Диагностицирана дислипидемия',
        },
        {
          condition: { type: 'includes', value: 'prediabetes' },
          domain: 'metabolic_risk',
          points: 2,
          tags: ['prediabetes'],
          packages: ['metabolic_standard'],
          reason: 'Диагностициран предиабет',
        },
        {
          condition: { type: 'includes', value: 'diabetes' },
          domain: 'metabolic_risk',
          points: 3,
          tags: ['diabetes_t2'],
          packages: ['metabolic_extended'],
          reason: 'Диабет тип 2',
        },
        {
          condition: { type: 'includes', value: 'thyroid_disease' },
          domain: 'hormone_risk',
          points: 2,
          tags: ['thyroid_disease'],
          packages: ['hormone_standard'],
          reason: 'Болест на щитовидната жлеза',
        },
        {
          condition: { type: 'includes', value: 'autoimmune' },
          domain: 'immune_risk',
          points: 2,
          tags: ['autoimmune'],
          packages: ['immune_assessment'],
          reason: 'Автоимунно заболяване',
        },
        {
          condition: { type: 'includes', value: 'kidney_disease' },
          domain: 'renal_risk',
          points: 3,
          tags: ['kidney_disease', 'kidney_review_required'],
          packages: ['renal_assessment'],
          safetyNote: 'Хронична бъбречна болест — прегледайте дозировки и контраиндикации.',
          reason: 'Хронична бъбречна болест',
        },
        {
          condition: { type: 'includes', value: 'liver_disease' },
          domain: 'metabolic_risk',
          points: 2,
          tags: ['liver_disease'],
          safetyNote: 'Чернодробна болест — чернодробен метаболизъм и лекарствени взаимодействия.',
          reason: 'Чернодробна болест',
        },
        {
          condition: { type: 'includes', value: 'heart_disease' },
          domain: 'cardiometabolic_risk',
          points: 4,
          tags: ['heart_disease', 'red_flag'],
          packages: ['cardiometabolic_extended'],
          safetyNote: 'Установено сърдечно заболяване — необходима кардиологична оценка преди програма.',
          redFlag: true,
          reason: 'Известно сърдечно заболяване',
        },
        {
          condition: { type: 'includes', value: 'cancer_history' },
          domain: 'cancer_risk',
          points: 4,
          tags: ['cancer_history', 'red_flag'],
          packages: ['cancer_prevention'],
          safetyNote: 'Лична онкологична история — необходима специализирана консултация.',
          redFlag: true,
          reason: 'Лична онкологична история',
        },
        {
          condition: { type: 'includes', value: 'sleep_apnea' },
          domain: 'sleep_risk',
          points: 3,
          tags: ['sleep_apnea'],
          packages: ['sleep_assessment'],
          reason: 'Диагностицирана сънна апнея',
        },
      ],
    },

    {
      id: 'q_medications',
      module: 'core',
      type: 'repeatable_group',
      label: 'Редовни медикаменти',
      text: 'Приемате ли редовно медикаменти с рецепта или без?',
      helpText: 'Включете всички редовни лекарства. Добавете толкова записи, колкото са нужни.',
      required: false,
      fields: [
        { id: 'med_name',      label: 'Наименование на медикамента', type: 'text', required: true },
        { id: 'med_dose',      label: 'Доза (напр. 10 mg)',          type: 'text', required: false },
        { id: 'med_frequency', label: 'Честота (напр. веднъж/ден)',  type: 'text', required: false },
        { id: 'med_reason',    label: 'Причина за приема (по желание)', type: 'text', required: false },
      ],
      scoring: [
        {
          condition: { type: 'has_entries' },
          tags: ['medication_review_required'],
          safetyNote: 'Активна медикация — преглед на взаимодействия и съвместимост.',
          reason: 'Активна употреба на медикаменти',
        },
      ],
    },

    {
      id: 'q_supplements',
      module: 'core',
      type: 'repeatable_group',
      label: 'Хранителни добавки',
      text: 'Приемате ли хранителни добавки или билкови препарати?',
      helpText: 'Включете витамини, минерали, растителни екстракти и всякакви добавки.',
      required: false,
      fields: [
        { id: 'supp_name',      label: 'Наименование',             type: 'text', required: true },
        { id: 'supp_dose',      label: 'Доза',                    type: 'text', required: false },
        { id: 'supp_frequency', label: 'Честота на приема',       type: 'text', required: false },
      ],
      scoring: [
        {
          condition: { type: 'has_entries' },
          tags: ['supplement_review_required'],
          safetyNote: 'Активна употреба на добавки — преглед на взаимодействия.',
          reason: 'Активна употреба на добавки',
        },
      ],
    },

    {
      id: 'q_smoking',
      module: 'core',
      type: 'single_choice',
      label: 'Тютюнопушене',
      text: 'Пушите ли или сте пушили?',
      helpText: 'Тютюнопушенето е важен фактор за множество здравни сигнали.',
      required: true,
      options: [
        { value: 'never',      label: 'Никога не съм пушил/а' },
        { value: 'former',     label: 'Бивш/а пушач — спрял/а' },
        { value: 'current',    label: 'Настоящ/а пушач' },
        { value: 'occasional', label: 'Случайно (социален пушач)' },
      ],
      scoring: [
        {
          condition: { type: 'equals', value: 'current' },
          domain: 'cardiometabolic_risk',
          points: 2,
          tags: ['current_smoker'],
          packages: ['cardiometabolic_standard'],
          reason: 'Активен пушач',
        },
        {
          condition: { type: 'equals', value: 'former' },
          domain: 'cardiometabolic_risk',
          points: 1,
          tags: ['former_smoker'],
          reason: 'Бивш пушач',
        },
      ],
    },

    {
      id: 'q_alcohol',
      module: 'core',
      type: 'single_choice',
      label: 'Алкохол',
      text: 'Как бихте описали употребата на алкохол?',
      required: true,
      options: [
        { value: 'none',       label: 'Не употребявам алкохол' },
        { value: 'occasional', label: 'Рядко (1–2 пъти/месец)' },
        { value: 'moderate',   label: 'Умерено (1–3 пъти/седмица)' },
        { value: 'frequent',   label: 'Редовно (повечето дни)' },
      ],
      scoring: [
        {
          condition: { type: 'equals', value: 'frequent' },
          domain: 'metabolic_risk',
          points: 2,
          tags: ['heavy_alcohol'],
          safetyNote: 'Честа алкохолна употреба — чернодробна и метаболитна оценка.',
          triggerModules: ['metabolic'],
          reason: 'Честа алкохолна употреба',
        },
      ],
    },

    {
      id: 'q_activity',
      module: 'core',
      type: 'single_choice',
      label: 'Физическа активност',
      text: 'Как бихте описали нивото на Вашата физическа активност?',
      helpText: 'Средно за последния месец.',
      required: true,
      options: [
        { value: 'sedentary', label: 'Заседнал начин на живот (почти без упражнения)' },
        { value: 'light',     label: 'Лека активност (1–2 пъти/седмица)' },
        { value: 'moderate',  label: 'Умерена активност (3–4 пъти/седмица)' },
        { value: 'active',    label: 'Активен/а (5+ пъти/седмица)' },
        { value: 'athlete',   label: 'Спортист — тренирам интензивно' },
      ],
      scoring: [
        {
          condition: { type: 'equals', value: 'sedentary' },
          domain: 'cardiometabolic_risk',
          points: 2,
          tags: ['sedentary_lifestyle'],
          triggerModules: ['cardiometabolic', 'metabolic'],
          reason: 'Заседнал начин на живот',
        },
        {
          condition: { type: 'equals', value: 'athlete' },
          domain: 'mitochondrial_risk',
          points: 1,
          tags: ['athlete'],
          triggerModules: ['mitochondrial'],
          reason: 'Интензивна спортна активност',
        },
      ],
    },

    {
      id: 'q_energy',
      module: 'core',
      type: 'scale',
      label: 'Ниво на енергия',
      text: 'Как бихте оценили общото си ниво на енергия?',
      helpText: '0 = изключително ниска енергия, 10 = оптимална енергия',
      required: true,
      validation: { min: 0, max: 10 },
      scoring: [
        {
          condition: { type: 'lte', value: 3 },
          domain: 'mitochondrial_risk',
          points: 3,
          tags: ['low_energy_severe'],
          packages: ['mitochondrial_assessment'],
          triggerModules: ['mitochondrial', 'hormone'],
          reason: 'Тежка умора (≤ 3/10)',
        },
        {
          condition: { type: 'between', min: 4, max: 5 },
          domain: 'mitochondrial_risk',
          points: 1,
          tags: ['low_energy'],
          triggerModules: ['mitochondrial'],
          reason: 'Умерена умора (4–5/10)',
        },
      ],
    },

    {
      id: 'q_sleep_quality',
      module: 'core',
      type: 'scale',
      label: 'Качество на съня',
      text: 'Как бихте оценили качеството на съня си?',
      helpText: '0 = много лош сън, 10 = отличен сън',
      required: true,
      validation: { min: 0, max: 10 },
      scoring: [
        {
          condition: { type: 'lte', value: 4 },
          domain: 'sleep_risk',
          points: 2,
          tags: ['poor_sleep'],
          packages: ['sleep_assessment'],
          triggerModules: ['sleep'],
          reason: 'Лошо качество на съня (≤ 4/10)',
        },
      ],
    },

    {
      id: 'q_stress',
      module: 'core',
      type: 'scale',
      label: 'Ниво на стрес',
      text: 'Как бихте оценили средното ниво на стрес в живота си?',
      helpText: '0 = без стрес, 10 = изключително висок стрес',
      required: true,
      validation: { min: 0, max: 10 },
      scoring: [
        {
          condition: { type: 'gte', value: 7 },
          domain: 'sleep_risk',
          points: 2,
          tags: ['high_stress'],
          packages: ['sleep_assessment'],
          triggerModules: ['sleep'],
          reason: 'Висок стрес (≥ 7/10)',
        },
      ],
    },

    {
      id: 'q_family_history',
      module: 'core',
      type: 'multi_choice',
      label: 'Семейна история',
      text: 'Имате ли близки роднини (родители, братя, сестри) с някое от следните?',
      helpText: 'Семейната история е важен показател за наследствен риск.',
      required: true,
      options: [
        { value: 'premature_heart_disease',    label: 'Инфаркт или инсулт преди 55 г. (мъже) / 65 г. (жени)' },
        { value: 'high_cholesterol_family',    label: 'Фамилна хиперхолестеролемия' },
        { value: 'diabetes_family',            label: 'Захарен диабет тип 2' },
        { value: 'cancer_family',              label: 'Онкологично заболяване (особено преди 50 г.)' },
        { value: 'kidney_disease_family',      label: 'Хронична бъбречна болест' },
        { value: 'alzheimer_family',           label: 'Болест на Алцхаймер или деменция' },
        { value: 'none', label: 'Не знам / Нямам такива случаи', exclusive: true },
      ],
      scoring: [
        {
          condition: { type: 'includes', value: 'premature_heart_disease' },
          domain: 'cardiometabolic_risk',
          points: 2,
          tags: ['family_premature_cvd', 'missing_ApoB', 'missing_LpA'],
          packages: ['cardiometabolic_standard'],
          reason: 'Фамилна преждевременна сърдечно-съдова болест',
        },
        {
          condition: { type: 'includes', value: 'high_cholesterol_family' },
          domain: 'cardiometabolic_risk',
          points: 2,
          tags: ['family_hypercholesterolemia', 'missing_ApoB', 'missing_LpA'],
          packages: ['cardiometabolic_standard'],
          reason: 'Фамилна хиперхолестеролемия',
        },
        {
          condition: { type: 'includes', value: 'cancer_family' },
          domain: 'cancer_risk',
          points: 2,
          tags: ['family_cancer'],
          packages: ['cancer_prevention'],
          reason: 'Фамилна онкологична история',
        },
        {
          condition: { type: 'includes', value: 'kidney_disease_family' },
          domain: 'renal_risk',
          points: 1,
          tags: ['family_kidney_disease'],
          reason: 'Фамилна бъбречна болест',
        },
      ],
    },

    {
      id: 'q_recent_labs',
      module: 'core',
      type: 'yes_no',
      label: 'Скорошни лаборатории',
      text: 'Имате ли лабораторни резултати от последните 12 месеца?',
      helpText: 'Ако да, ще можете да въведете ключови стойности за по-точна оценка.',
      required: false,
      followUps: [
        { ifValue: 'yes', questions: ['q_lab_values'] },
      ],
    },

    {
      id: 'q_lab_values',
      module: 'core',
      type: 'lab_values',
      label: 'Лабораторни стойности',
      text: 'Въведете известните Ви стойности (всички са незадължителни):',
      helpText: 'Въведете само стойностите, за които разполагате с резултати. Единиците са посочени до всяко поле.',
      required: false,
      showIf: { question: 'q_recent_labs', value: 'yes' },
      fields: [
        { id: 'glucose',           label: 'Кръвна глюкоза (на гладно)', unit: 'mmol/L', type: 'text' },
        { id: 'hba1c',             label: 'HbA1c',                      unit: '%',      type: 'text' },
        { id: 'total_cholesterol', label: 'Общ холестерол',             unit: 'mmol/L', type: 'text' },
        { id: 'ldl',               label: 'LDL холестерол',             unit: 'mmol/L', type: 'text' },
        { id: 'hdl',               label: 'HDL холестерол',             unit: 'mmol/L', type: 'text' },
        { id: 'triglycerides',     label: 'Триглицериди',               unit: 'mmol/L', type: 'text' },
        { id: 'creatinine',        label: 'Серумен креатинин',          unit: 'μmol/L', type: 'text' },
        { id: 'tsh',               label: 'TSH (щитовидна)',            unit: 'mIU/L',  type: 'text' },
        { id: 'vitamin_d',         label: 'Витамин D (25-OH)',          unit: 'nmol/L', type: 'text' },
        { id: 'ferritin',          label: 'Феритин',                    unit: 'μg/L',   type: 'text' },
      ],
      scoring: [
        {
          condition: { type: 'all_empty' },
          tags: ['missing_recent_labs', 'missing_lipid_panel', 'missing_glucose_insulin_markers'],
          reason: 'Без скорошни лабораторни данни',
        },
      ],
    },

    {
      id: 'q_gi_symptoms',
      module: 'core',
      type: 'yes_no',
      label: 'Стомашно-чревни оплаквания',
      text: 'Имате ли редовни стомашно-чревни оплаквания?',
      helpText: 'Например: болки в корема, подуване, диария, запек — повечето от дните в седмицата.',
      required: false,
      scoring: [
        {
          condition: { type: 'equals', value: 'yes' },
          domain: 'gut_risk',
          points: 2,
          tags: ['gi_symptoms'],
          packages: ['gut_microbiome'],
          triggerModules: ['gut'],
          reason: 'Редовни стомашно-чревни симптоми',
        },
      ],
    },

    {
      id: 'q_file_upload',
      module: 'core',
      type: 'file_upload',
      label: 'Прикачване на документи',
      text: 'Желаете ли да прикачите лабораторни резултати или медицински документи?',
      helpText: 'За MVP прототипа не качвайте реални лични данни. Само имената на файловете ще бъдат запазени в паметта на браузъра.',
      required: false,
    },

    // ════════════════════════════════════════════════════════════════════════
    // CARDIOMETABOLIC MODULE
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'q_bp_status',
      module: 'cardiometabolic',
      type: 'single_choice',
      label: 'Кръвно налягане',
      text: 'Знаете ли приблизителните стойности на кръвното Ви налягане?',
      helpText: 'Ако не знаете точните стойности, изберете „Не знам".',
      required: false,
      options: [
        { value: 'normal',   label: 'Нормално (< 130/80)' },
        { value: 'elevated', label: 'Леко повишено (130–139 / 80–89)' },
        { value: 'high',     label: 'Повишено (≥ 140/90)' },
        { value: 'unknown',  label: 'Не знам' },
      ],
      scoring: [
        {
          condition: { type: 'equals', value: 'high' },
          domain: 'cardiometabolic_risk',
          points: 2,
          tags: ['hypertension_reported'],
          packages: ['cardiometabolic_standard'],
          reason: 'Съобщено повишено кръвно налягане (≥ 140/90)',
        },
        {
          condition: { type: 'equals', value: 'elevated' },
          domain: 'cardiometabolic_risk',
          points: 1,
          tags: ['prehypertension'],
          reason: 'Леко повишено кръвно налягане',
        },
      ],
      followUps: [
        { ifValue: 'elevated', questions: ['q_bp_values'] },
        { ifValue: 'high',     questions: ['q_bp_values'] },
      ],
    },

    {
      id: 'q_bp_values',
      module: 'cardiometabolic',
      type: 'lab_values',
      label: 'Стойности на кръвното налягане',
      text: 'Въведете типичните стойности на кръвното Ви налягане (ако знаете):',
      required: false,
      showIf: { question: 'q_bp_status', value: ['elevated', 'high'] },
      fields: [
        { id: 'bp_systolic',  label: 'Систолно налягане (горна цифра)', unit: 'mmHg', type: 'numeric', validation: { min: 80, max: 240 } },
        { id: 'bp_diastolic', label: 'Диастолно налягане (долна цифра)', unit: 'mmHg', type: 'numeric', validation: { min: 40, max: 140 } },
      ],
    },

    {
      id: 'q_chest_symptoms',
      module: 'cardiometabolic',
      type: 'yes_no',
      label: 'Гръдни симптоми',
      text: 'Имате ли болка, натиск или задух при физическо натоварване?',
      helpText: 'Дори лек дискомфорт в гърдите при ходене или изкачване е важен сигнал.',
      required: false,
      scoring: [
        {
          condition: { type: 'equals', value: 'yes' },
          domain: 'cardiometabolic_risk',
          points: 3,
          tags: ['angina_symptoms', 'red_flag'],
          safetyNote: 'Съобщени гръдни симптоми при натоварване — необходима кардиологична оценка преди програма.',
          redFlag: true,
          reason: 'Гръдни симптоми при натоварване',
        },
      ],
    },

    {
      id: 'q_family_cv_details',
      module: 'cardiometabolic',
      type: 'repeatable_group',
      label: 'Детайли: фамилна сърдечно-съдова история',
      text: 'Въведете детайли за фамилни сърдечно-съдови инциденти (незадължително):',
      helpText: 'Инфаркт, инсулт, внезапна сърдечна смърт. Включете само биологични роднини.',
      required: false,
      fields: [
        { id: 'cv_relation', label: 'Роднина',                              type: 'text', required: true },
        { id: 'cv_event',    label: 'Събитие (инфаркт / инсулт / друго)',   type: 'text', required: true },
        { id: 'cv_age',      label: 'Приблизителна възраст при събитието',  type: 'text', required: false },
      ],
    },

    {
      id: 'q_cardio_labs',
      module: 'cardiometabolic',
      type: 'yes_no_unknown',
      label: 'ApoB и Lp(a)',
      text: 'Имате ли правени изследвания за ApoB или Lp(a)?',
      helpText: 'Тези маркери дават по-пълна картина на сърдечно-съдовия риск — особено при фамилна история.',
      required: false,
      scoring: [
        {
          condition: { type: 'in', values: ['no', 'unknown'] },
          tags: ['missing_ApoB', 'missing_LpA'],
          reason: 'ApoB и Lp(a) не са изследвани или статусът е неизвестен',
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // METABOLIC MODULE
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'q_glucose_symptoms',
      module: 'metabolic',
      type: 'multi_choice',
      label: 'Метаболитни симптоми',
      text: 'Кои от следните симптоми изпитвате редовно?',
      helpText: 'Изберете всички, които се отнасят за Вас.',
      required: false,
      options: [
        { value: 'post_meal_crash',    label: 'Умора и сънливост след хранене' },
        { value: 'sugar_cravings',     label: 'Силна нужда от сладко между храненията' },
        { value: 'frequent_urination', label: 'Честа нужда от уриниране' },
        { value: 'excessive_thirst',   label: 'Прекомерна жажда' },
        { value: 'brain_fog',          label: 'Мозъчна мъгла, трудна концентрация' },
        { value: 'none', label: 'Нито едно', exclusive: true },
      ],
      scoring: [
        {
          condition: { type: 'includes', value: 'post_meal_crash' },
          domain: 'metabolic_risk',
          points: 1,
          tags: ['insulin_resistance_possible'],
          reason: 'Умора след хранене (сигнал за инсулинова резистентност)',
        },
        {
          condition: { type: 'includes_any', values: ['frequent_urination', 'excessive_thirst'] },
          domain: 'metabolic_risk',
          points: 2,
          tags: ['diabetes_symptoms_possible', 'missing_glucose_insulin_markers'],
          packages: ['metabolic_standard'],
          reason: 'Симптоми, свързани с глюкозния метаболизъм',
        },
      ],
    },

    {
      id: 'q_fatty_liver',
      module: 'metabolic',
      type: 'yes_no_unknown',
      label: 'Мастен черен дроб',
      text: 'Имате ли история на мастен черен дроб (стеатоза)?',
      required: false,
      scoring: [
        {
          condition: { type: 'equals', value: 'yes' },
          domain: 'metabolic_risk',
          points: 2,
          tags: ['fatty_liver'],
          packages: ['metabolic_extended'],
          safetyNote: 'Мастен черен дроб — чернодробни ензими и ехографска оценка.',
          reason: 'Мастен черен дроб (стеатоза)',
        },
      ],
    },

    {
      id: 'q_metabolic_labs',
      module: 'metabolic',
      type: 'yes_no',
      label: 'Изследвания за инсулинова резистентност',
      text: 'Имате ли правени изследвания за инсулин на гладно или HOMA-IR?',
      required: false,
      scoring: [
        {
          condition: { type: 'equals', value: 'no' },
          tags: ['missing_glucose_insulin_markers'],
          reason: 'Липсват изследвания за инсулинова резистентност',
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // SLEEP MODULE
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'q_sleep_hours',
      module: 'sleep',
      type: 'numeric',
      label: 'Часове сън',
      text: 'Колко часа сън средно получавате на нощ?',
      helpText: 'Имайте предвид средното за последните 4 седмици.',
      required: false,
      unit: 'часа',
      validation: { min: 1, max: 14, message: 'Моля, проверете стойността. Изглежда необичайна.' },
      scoring: [
        {
          condition: { type: 'lte', value: 5 },
          domain: 'sleep_risk',
          points: 3,
          tags: ['severe_sleep_deprivation'],
          packages: ['sleep_assessment'],
          reason: 'Тежко лишаване от сън (≤ 5 часа)',
        },
        {
          condition: { type: 'between', min: 5.1, max: 6 },
          domain: 'sleep_risk',
          points: 2,
          tags: ['sleep_deprivation'],
          reason: 'Недостатъчен сън (5–6 часа)',
        },
      ],
    },

    {
      id: 'q_snoring',
      module: 'sleep',
      type: 'yes_no',
      label: 'Хъркане',
      text: 'Хъркате ли или сте уведомявани за паузи в дишането по време на сън?',
      helpText: 'Тази информация насочва към оценка за сънна апнея.',
      required: false,
      scoring: [
        {
          condition: { type: 'equals', value: 'yes' },
          domain: 'sleep_risk',
          points: 2,
          tags: ['snoring_apnea_possible'],
          packages: ['sleep_assessment'],
          triggerModules: ['cardiometabolic'],
          reason: 'Хъркане / потенциална сънна апнея',
        },
      ],
    },

    {
      id: 'q_sleep_refreshed',
      module: 'sleep',
      type: 'yes_no',
      label: 'Отпочинало събуждане',
      text: 'Събуждате ли се обикновено отпочинал/а и заредена/и?',
      required: false,
      scoring: [
        {
          condition: { type: 'equals', value: 'no' },
          domain: 'sleep_risk',
          points: 2,
          tags: ['non_restorative_sleep'],
          packages: ['sleep_assessment'],
          reason: 'Невъзстановителен сън',
        },
      ],
    },

    {
      id: 'q_hrv',
      module: 'sleep',
      type: 'yes_no',
      label: 'HRV мониторинг',
      text: 'Измервате ли вариабилността на сърдечния ритъм (HRV) редовно?',
      helpText: 'С устройство като Oura, WHOOP, Apple Watch и др.',
      required: false,
      scoring: [
        {
          condition: { type: 'equals', value: 'no' },
          tags: ['HRV_missing'],
          reason: 'HRV данни не са налични',
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // GUT MODULE
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'q_bowel_habits',
      module: 'gut',
      type: 'single_choice',
      label: 'Чревни навици',
      text: 'Как бихте описали редовността на чревната си функция?',
      required: false,
      options: [
        { value: 'regular',      label: 'Редовно (1–2 пъти/ден)' },
        { value: 'irregular',    label: 'Нерегулярно' },
        { value: 'constipation', label: 'Преобладаващо запек' },
        { value: 'diarrhea',     label: 'Преобладаваща диария' },
        { value: 'mixed',        label: 'Редуващи се диария и запек' },
      ],
      scoring: [
        {
          condition: { type: 'in', values: ['constipation', 'diarrhea', 'mixed', 'irregular'] },
          domain: 'gut_risk',
          points: 1,
          tags: ['bowel_irregularity'],
          packages: ['gut_microbiome'],
          reason: 'Нарушена чревна регулярност',
        },
      ],
    },

    {
      id: 'q_food_intolerances',
      module: 'gut',
      type: 'yes_no',
      label: 'Хранителна непоносимост',
      text: 'Забелязвате ли симптоми (подуване, дискомфорт, умора) след определени храни?',
      required: false,
      scoring: [
        {
          condition: { type: 'equals', value: 'yes' },
          domain: 'gut_risk',
          points: 1,
          tags: ['food_intolerance_possible'],
          packages: ['gut_microbiome'],
          reason: 'Възможна хранителна непоносимост',
        },
      ],
    },

    {
      id: 'q_antibiotic_history',
      module: 'gut',
      type: 'yes_no',
      label: 'Антибиотична употреба',
      text: 'Приемали ли сте антибиотици в последните 12 месеца?',
      required: false,
      scoring: [
        {
          condition: { type: 'equals', value: 'yes' },
          domain: 'gut_risk',
          points: 1,
          tags: ['recent_antibiotics'],
          reason: 'Скорошна антибиотична употреба',
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // HORMONE MODULE
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'q_thyroid_symptoms',
      module: 'hormone',
      type: 'multi_choice',
      label: 'Симптоми, свързани с щитовидната жлеза',
      text: 'Кои от следните изпитвате?',
      required: false,
      options: [
        { value: 'fatigue_thyroid',  label: 'Умора и отпадналост без видима причина' },
        { value: 'weight_changes',   label: 'Необяснима промяна в теглото' },
        { value: 'hair_loss',        label: 'Косопад' },
        { value: 'cold_intolerance', label: 'Непоносимост към студ или горещина' },
        { value: 'none', label: 'Нито едно', exclusive: true },
      ],
      scoring: [
        {
          condition: { type: 'count_gte', tracked: ['fatigue_thyroid', 'weight_changes', 'hair_loss', 'cold_intolerance'], count: 2 },
          domain: 'hormone_risk',
          points: 2,
          tags: ['thyroid_symptoms'],
          packages: ['hormone_standard'],
          reason: 'Множество симптоми, свързани с щитовидната жлеза',
        },
      ],
    },

    {
      id: 'q_male_hormones',
      module: 'hormone',
      type: 'multi_choice',
      label: 'Мъжки хормонален профил',
      text: 'Кои от следните симптоми изпитвате?',
      helpText: 'Тези симптоми могат да са свързани с нива на тестостерон и мъжки хормони.',
      required: false,
      showIf: { question: 'q_sex', value: 'male' },
      options: [
        { value: 'low_libido',           label: 'Намалено либидо' },
        { value: 'erectile_dysfunction',  label: 'Еректилна дисфункция' },
        { value: 'fatigue_male',          label: 'Умора и намалена мотивация' },
        { value: 'muscle_loss',           label: 'Намаляване на мускулната маса' },
        { value: 'mood_changes_male',     label: 'Промени в настроението' },
        { value: 'none', label: 'Нито едно', exclusive: true },
      ],
      scoring: [
        {
          condition: { type: 'includes_any', values: ['low_libido', 'erectile_dysfunction'] },
          domain: 'hormone_risk',
          points: 2,
          tags: ['low_testosterone_possible'],
          packages: ['hormone_standard'],
          reason: 'Симптоми на нисък тестостерон',
        },
      ],
    },

    {
      id: 'q_female_hormones',
      module: 'hormone',
      type: 'multi_choice',
      label: 'Женски хормонален профил',
      text: 'Кои от следните изпитвате?',
      helpText: 'Тези симптоми могат да са свързани с женски хормони.',
      required: false,
      showIf: { question: 'q_sex', value: 'female' },
      options: [
        { value: 'menstrual_irregularity', label: 'Нередовен менструален цикъл' },
        { value: 'hot_flashes',            label: 'Горещи вълни или нощно изпотяване' },
        { value: 'low_libido_f',           label: 'Намалено либидо' },
        { value: 'mood_changes_f',         label: 'Промени в настроението / раздразнителност' },
        { value: 'none', label: 'Нито едно', exclusive: true },
      ],
      scoring: [
        {
          condition: { type: 'includes_any', values: ['hot_flashes', 'menstrual_irregularity'] },
          domain: 'hormone_risk',
          points: 2,
          tags: ['female_hormone_symptoms'],
          packages: ['hormone_standard'],
          reason: 'Симптоми на хормонален дисбаланс',
        },
      ],
    },

    {
      id: 'q_hormone_therapy',
      module: 'hormone',
      type: 'yes_no_unknown',
      label: 'Хормонална терапия',
      text: 'Ползвате ли или обмисляте хормонална заместителна терапия (HRT)?',
      required: false,
      scoring: [
        {
          condition: { type: 'in', values: ['yes', 'unknown'] },
          tags: ['hormone_therapy_interest'],
          safetyNote: 'Интерес към хормонална терапия — преглед на индикации, рискове и базова хормонална панел.',
          reason: 'Текуща или планирана хормонална терапия',
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // IMMUNE MODULE
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'q_immune_symptoms',
      module: 'immune',
      type: 'multi_choice',
      label: 'Имунни сигнали',
      text: 'Кои от следните изпитвате редовно?',
      required: false,
      options: [
        { value: 'frequent_infections',    label: 'Чести инфекции (повече от 4 пъти годишно)' },
        { value: 'chronic_inflammation',   label: 'Хронично ставно болки или кожни обриви' },
        { value: 'allergies',              label: 'Значими алергии (хранителни или вдишване)' },
        { value: 'slow_wound_healing',     label: 'Бавно заздравяване на рани' },
        { value: 'none', label: 'Нито едно', exclusive: true },
      ],
      scoring: [
        {
          condition: { type: 'includes_any', values: ['frequent_infections', 'chronic_inflammation'] },
          domain: 'immune_risk',
          points: 2,
          tags: ['immune_dysfunction_possible'],
          packages: ['immune_assessment'],
          reason: 'Потенциална имунна дисфункция',
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // CANCER FAMILY MODULE
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'q_cancer_details',
      module: 'cancer_family',
      type: 'repeatable_group',
      label: 'Фамилна онкологична история',
      text: 'Въведете детайли за онкологични заболявания в семейството (незадължително):',
      helpText: 'Включете само биологични роднини. Повторете за всеки засегнат.',
      required: false,
      fields: [
        { id: 'cancer_relation', label: 'Роднина',                  type: 'text', required: true },
        { id: 'cancer_type',     label: 'Вид рак',                   type: 'text', required: true },
        { id: 'cancer_age',      label: 'Възраст при диагнозата',    type: 'text', required: false },
      ],
      scoring: [
        {
          condition: { type: 'entries_gte', count: 2 },
          domain: 'cancer_risk',
          points: 2,
          tags: ['multiple_family_cancer'],
          packages: ['cancer_prevention'],
          reason: 'Множество роднини с онкологично заболяване',
        },
      ],
    },

    {
      id: 'q_genetic_testing',
      module: 'cancer_family',
      type: 'yes_no_unknown',
      label: 'Генетично тестване',
      text: 'Имате ли правено генетично тестване за онкологичен риск (BRCA, Lynch и др.)?',
      required: false,
      scoring: [
        {
          condition: { type: 'equals', value: 'no' },
          tags: ['genetic_testing_not_done'],
          reason: 'Генетично тестване не е правено',
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // MITOCHONDRIAL MODULE
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'q_recovery',
      module: 'mitochondrial',
      type: 'scale',
      label: 'Физическо възстановяване',
      text: 'Как оценявате способността си да се възстановявате след физическо натоварване?',
      helpText: '0 = много бавно / изтощен след дни, 10 = бързо и пълно',
      required: false,
      validation: { min: 0, max: 10 },
      scoring: [
        {
          condition: { type: 'lte', value: 4 },
          domain: 'mitochondrial_risk',
          points: 2,
          tags: ['poor_recovery'],
          packages: ['mitochondrial_assessment'],
          reason: 'Лошо физическо възстановяване (≤ 4/10)',
        },
      ],
    },

    {
      id: 'q_vo2',
      module: 'mitochondrial',
      type: 'yes_no',
      label: 'VO2 Max',
      text: 'Имате ли измерен VO2 max (кардиопулмонален тест или фитнес апарат)?',
      required: false,
      scoring: [
        {
          condition: { type: 'equals', value: 'no' },
          tags: ['VO2_missing'],
          reason: 'VO2 max не е измерен',
        },
      ],
    },

    {
      id: 'q_muscle_performance',
      module: 'mitochondrial',
      type: 'scale',
      label: 'Мускулна сила и издръжливост',
      text: 'Как бихте оценили мускулната си сила и издръжливост спрямо целите си?',
      helpText: '0 = много слаба, 10 = отлична',
      required: false,
      validation: { min: 0, max: 10 },
    },

    // ════════════════════════════════════════════════════════════════════════
    // RENAL MODULE
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'q_nsaid_use',
      module: 'renal',
      type: 'single_choice',
      label: 'Употреба на болкоуспокояващи (НСПВС)',
      text: 'Колко често приемате ибупрофен, диклофенак или подобни болкоуспокояващи?',
      required: false,
      options: [
        { value: 'never',   label: 'Никога или рядко (< 1 път/месец)' },
        { value: 'monthly', label: 'Няколко пъти/месец' },
        { value: 'weekly',  label: 'Седмично или по-често' },
      ],
      scoring: [
        {
          condition: { type: 'equals', value: 'weekly' },
          domain: 'renal_risk',
          points: 2,
          tags: ['frequent_NSAID_use', 'kidney_review_required'],
          packages: ['renal_assessment'],
          safetyNote: 'Честа употреба на НСПВС — бъбречен мониторинг е препоръчан.',
          reason: 'Честа употреба на НСПВС',
        },
      ],
    },

    {
      id: 'q_kidney_symptoms',
      module: 'renal',
      type: 'multi_choice',
      label: 'Симптоми, свързани с бъбречната функция',
      text: 'Имате ли някой от следните симптоми?',
      required: false,
      options: [
        { value: 'foamy_urine',  label: 'Пенеста урина' },
        { value: 'blood_urine',  label: 'Розово оцветена или кървава урина' },
        { value: 'flank_pain',   label: 'Болка в лумбалната (поясна) област' },
        { value: 'swelling',     label: 'Отоци в краката или около очите' },
        { value: 'none', label: 'Нито едно', exclusive: true },
      ],
      scoring: [
        {
          condition: { type: 'includes_any', values: ['foamy_urine', 'blood_urine'] },
          domain: 'renal_risk',
          points: 3,
          tags: ['kidney_symptoms', 'red_flag', 'kidney_review_required'],
          packages: ['renal_assessment'],
          safetyNote: 'Симптоми, насочващи към бъбречна патология — необходима лекарска оценка преди програма.',
          redFlag: true,
          reason: 'Симптоми, насочващи към бъбречна патология',
        },
      ],
    },

    {
      id: 'q_renal_labs',
      module: 'renal',
      type: 'yes_no',
      label: 'Бъбречни изследвания',
      text: 'Имате ли правени изследвания на бъбречната функция (eGFR, серумен креатинин) в последните 2 години?',
      required: false,
      scoring: [
        {
          condition: { type: 'equals', value: 'no' },
          tags: ['missing_kidney_markers'],
          reason: 'Липсват бъбречни изследвания',
        },
      ],
    },

  ], // end questions
}; // end questionBank
