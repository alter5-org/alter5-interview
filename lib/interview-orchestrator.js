// Deterministic control flow for the conversational text interview.
//
// Pure functions only — no DB, no network, no Claude call — so this module
// is unit-testable exactly like lib/interview-scoring.js. The one Claude
// call per candidate turn (classify the answer / write a follow-up) and the
// one-time adaptive-question pick both live in api/interview-chat/respond.js,
// which calls into this module for every deterministic decision around them.
//
// State shape (persisted verbatim in interviews.orchestrator_state, spec
// §22, re-read/re-written on every /respond call — no in-memory session):
//   {
//     elapsedSeconds,
//     anchorsCompleted: [anchorId],
//     anchorsRemaining: [anchorId],
//     adaptiveQuestionsUsed, maxAdaptiveQuestions,           // 0/1 in V1
//     currentQuestionId, currentQuestionKind,                // 'anchor'|'adaptive'
//     followupsUsedCurrentQuestion, maxFollowupsCurrentQuestion, // 0/1 by default
//     questionsAsked: [{ id, kind }],
//     candidateClarificationsUsed,
//     phase,               // see PHASES below
//     adaptiveSelectedId,  // set once the adaptive pick has been made
//   }

// Time gates, spec §14/§23 (seconds).
const GATE_STOP_OPTIONAL_DEEPDIVES = 9 * 60;  // stop optional deep-dives if anchors remain
const GATE_NO_NEW_OPTIONAL = 12 * 60;         // don't start the adaptive question if not begun
const GATE_MISSING_ANCHOR_ONLY = 13 * 60;     // only complete a missing anchor, or close
const GATE_NO_NEW_QUESTION = 14 * 60;         // never ask a new substantive question after this
const HARD_MAX_SECONDS = 15 * 60;             // session closes, preserving all completed answers

const PHASES = {
  NOT_STARTED: 'not_started',
  ANCHOR: 'anchor',
  FOLLOWUP: 'followup',
  ADAPTIVE_PENDING_PICK: 'adaptive_pending_pick', // caller must pick one via Claude, then call recordAdaptiveSelected
  ADAPTIVE: 'adaptive',
  ADAPTIVE_FOLLOWUP: 'adaptive_followup',
  CLOSING: 'closing',
  DONE: 'done',
};

function initState(anchorIds) {
  if (!Array.isArray(anchorIds) || anchorIds.length !== 4) {
    throw new Error('initState requires exactly 4 anchor ids');
  }
  return {
    elapsedSeconds: 0,
    anchorsCompleted: [],
    anchorsRemaining: [...anchorIds],
    adaptiveQuestionsUsed: 0,
    maxAdaptiveQuestions: 1,
    currentQuestionId: null,
    currentQuestionKind: null,
    currentQuestionText: null,
    currentQuestionDomain: null,
    currentQuestionDifficulty: null,
    followupsUsedCurrentQuestion: 0,
    maxFollowupsCurrentQuestion: 1,
    questionsAsked: [],
    candidateClarificationsUsed: 0,
    phase: PHASES.NOT_STARTED,
    adaptiveSelectedId: null,
  };
}

function isHardTimeUp(state) {
  return state.elapsedSeconds >= HARD_MAX_SECONDS;
}

// Whether one more follow-up on the CURRENT question is allowed right now.
// Deep-dives (of which a follow-up is one form) stop once anchors remain and
// we're past minute 9; no new optional exchange starts past minute 12; hard
// stop on any new question past minute 14.
function canAskFollowup(state) {
  if (state.followupsUsedCurrentQuestion >= state.maxFollowupsCurrentQuestion) return false;
  if (state.elapsedSeconds >= GATE_NO_NEW_QUESTION) return false;
  if (state.elapsedSeconds >= GATE_NO_NEW_OPTIONAL) return false;
  if (state.elapsedSeconds >= GATE_STOP_OPTIONAL_DEEPDIVES && state.anchorsRemaining.length > 0) {
    return false;
  }
  return true;
}

// Direct port of spec §23's pseudocode. Called once the caller has already
// decided (via canAskFollowup + the classify-answer Claude call) that no
// follow-up is warranted for the answer just received — this function only
// picks WHAT COMES NEXT among anchor / adaptive / closing.
function chooseNextQuestion(state) {
  if (state.elapsedSeconds >= GATE_NO_NEW_QUESTION) {
    return { action: 'closing' };
  }
  if (state.elapsedSeconds >= GATE_NO_NEW_OPTIONAL && state.anchorsRemaining.length === 0) {
    return { action: 'closing' };
  }
  if (state.anchorsRemaining.length > 0) {
    // Fixed bank order for a deterministic, auditable MVP — every candidate
    // sees the 4 anchors in the same order, satisfying "equivalent
    // comparability" (spec §29) without a priority-scoring model.
    return { action: 'ask_anchor', anchorId: state.anchorsRemaining[0] };
  }
  if (state.elapsedSeconds >= GATE_MISSING_ANCHOR_ONLY) {
    // Past minute 13 with no anchors left and no room for the adaptive
    // question per the gate above — close.
    return { action: 'closing' };
  }
  if (state.adaptiveQuestionsUsed < state.maxAdaptiveQuestions
      && state.elapsedSeconds < GATE_NO_NEW_OPTIONAL) {
    return { action: 'ask_adaptive_pending_pick' };
  }
  return { action: 'closing' };
}

// `text`/`domain` are stored on the state itself (not just the id) so the
// exact wording the candidate is currently facing survives a reload without
// a round-trip back to the static bank — needed for follow-ups, whose text
// is chosen/generated at runtime and has no bank entry of its own.
function recordQuestionAsked(state, { id, kind, text = null, domain = null, difficulty = null }) {
  return {
    ...state,
    currentQuestionId: id,
    currentQuestionKind: kind,
    currentQuestionText: text,
    currentQuestionDomain: domain,
    currentQuestionDifficulty: difficulty,
    followupsUsedCurrentQuestion: 0,
    questionsAsked: [...state.questionsAsked, { id, kind, text, domain, difficulty }],
    phase: kind === 'anchor' ? PHASES.ANCHOR : PHASES.ADAPTIVE,
  };
}

function recordFollowupAsked(state, text = null) {
  return {
    ...state,
    currentQuestionText: text ?? state.currentQuestionText,
    followupsUsedCurrentQuestion: state.followupsUsedCurrentQuestion + 1,
    questionsAsked: [...state.questionsAsked, {
      id: state.currentQuestionId, kind: 'followup', text: text ?? state.currentQuestionText,
      domain: state.currentQuestionDomain, difficulty: state.currentQuestionDifficulty,
    }],
    phase: state.currentQuestionKind === 'anchor' ? PHASES.FOLLOWUP : PHASES.ADAPTIVE_FOLLOWUP,
  };
}

// Mark the current anchor complete (its follow-up budget is spent or wasn't
// needed) and move it from remaining to completed.
function completeCurrentAnchor(state) {
  if (state.currentQuestionKind !== 'anchor' || !state.currentQuestionId) return state;
  return {
    ...state,
    anchorsRemaining: state.anchorsRemaining.filter(id => id !== state.currentQuestionId),
    anchorsCompleted: [...state.anchorsCompleted, state.currentQuestionId],
  };
}

function markAdaptivePendingPick(state) {
  return { ...state, phase: PHASES.ADAPTIVE_PENDING_PICK };
}

// Caller picked an adaptive question (via the one-time Claude call, or a
// deterministic fallback if that call fails — see respond.js). Records the
// pick and asks it as the current question.
function recordAdaptiveSelected(state, { id, text = null, domain = null }) {
  return recordQuestionAsked(
    { ...state, adaptiveQuestionsUsed: state.adaptiveQuestionsUsed + 1, adaptiveSelectedId: id },
    { id, kind: 'adaptive', text, domain },
  );
}

function markClosing(state) {
  return { ...state, phase: PHASES.CLOSING };
}

function markDone(state) {
  return { ...state, phase: PHASES.DONE };
}

function recordClarificationUsed(state) {
  return { ...state, candidateClarificationsUsed: state.candidateClarificationsUsed + 1 };
}

// Code-level prompt-injection pre-check (spec §28, TC6). Runs BEFORE any
// Claude call on the candidate's raw turn text — a match short-circuits
// straight to the canned refusal line (see orchestrator-prompt.md) without
// ever sending the text to the model for that turn, then the deterministic
// planner resumes with the next scheduled question. This is a defense in
// depth alongside the prompt-level instruction, not a replacement for it: a
// phrasing this list misses still hits the "ignore role change" instruction
// in the interviewer prompt.
const INJECTION_PATTERNS = [
  /ignor[ae]\s+(tus|las)\s+instruccion/i,
  /ignore\s+(your|previous|all)\s+instructions?/i,
  /(dame|dime|show me|give me|tell me)\b.{0,25}\b(la )?(r[uú]brica|respuesta ideal|ideal answer|expected answer|scoring (criteria|rubric)|expected response)/i,
  /(muestra|mu[eé]strame|revela|reveal)\b.{0,25}\b(criterios internos|system prompt|tus instrucciones|your instructions|scoring rubric|r[uú]brica)/i,
  /act[uú]a\s+como|you are now|pretend you are|olvida (que eres|tu rol)/i,
  /dame\s+(un\s+)?10\b.{0,15}(sin|independientemente)/i,
];

function detectInjectionAttempt(text) {
  const t = String(text || '');
  return INJECTION_PATTERNS.some(re => re.test(t));
}

module.exports = {
  PHASES,
  GATE_STOP_OPTIONAL_DEEPDIVES,
  GATE_NO_NEW_OPTIONAL,
  GATE_MISSING_ANCHOR_ONLY,
  GATE_NO_NEW_QUESTION,
  HARD_MAX_SECONDS,
  initState,
  isHardTimeUp,
  canAskFollowup,
  chooseNextQuestion,
  recordQuestionAsked,
  recordFollowupAsked,
  completeCurrentAnchor,
  markAdaptivePendingPick,
  recordAdaptiveSelected,
  markClosing,
  markDone,
  recordClarificationUsed,
  detectInjectionAttempt,
};
