import { ACT_IDS, getAct, nextActId } from './story.js';

const STORAGE_KEY = 'sound-seed-island-progress-v1';

export function createProgress() {
  return {
    currentActId: 'act1',
    completedActs: [],
    unlocks: [],
    preferences: {},
    actEvents: [],
    capabilities: {
      speechRecognitionSupported: null,
      microphonePermission: 'unknown'
    },
    freePlayUnlocked: false
  };
}

export function loadProgress() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createProgress();
    const saved = JSON.parse(raw);
    return validateProgress(saved) ? saved : createProgress();
  } catch {
    return createProgress();
  }
}

export function saveProgress(progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    return;
  }
}

export function clearProgress() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function validateProgress(value) {
  return Boolean(
    value &&
    ACT_IDS.includes(value.currentActId) &&
    Array.isArray(value.completedActs) &&
    value.completedActs.every((id) => ACT_IDS.includes(id)) &&
    Array.isArray(value.unlocks) &&
    Array.isArray(value.actEvents)
  );
}

export function recordAttempt(progress, actId, result, selectedOption = null) {
  progress.actEvents.push({
    act_id: actId,
    attempt: progress.actEvents.filter((event) => event.act_id === actId).length + 1,
    response_state: result.state,
    recognized_keys: [...(result.recognizedKeys || [])],
    selected_option: Array.isArray(selectedOption) ? [...selectedOption] : selectedOption,
    mode: result.mode || 'speech',
    speech_observed: Boolean(result.transcript && result.transcript.trim()),
    microphone_used: Boolean(result.microphoneUsed),
    recognition_provider: result.recognitionProvider || 'unknown',
    model_provider: result.modelProvider || null,
    model_enhanced: Boolean(result.modelEnhanced),
    understood_option: result.understoodOption || null,
    understood_sequence: result.understoodSequence || null,
    timestamp_ms: Date.now()
  });
  progress.capabilities.speechRecognitionSupported = result.recognitionProvider !== 'none';
  progress.capabilities.microphonePermission = result.microphonePermission || progress.capabilities.microphonePermission;
  return progress;
}

export function completeAct(progress, actId, selectedOption = null) {
  const act = getAct(actId);
  if (!act) return progress;
  if (!progress.completedActs.includes(actId)) progress.completedActs.push(actId);
  if (!progress.unlocks.includes(act.unlock)) progress.unlocks.push(act.unlock);
  if (Array.isArray(selectedOption)) {
    progress.preferences[`${actId}_stones`] = [...selectedOption];
  } else if (selectedOption && typeof selectedOption === 'object') {
    progress.preferences[`${actId}_choice`] = selectedOption.id;
    if (selectedOption.choices) progress.preferences.show = selectedOption.choices;
  }
  const following = nextActId(actId);
  progress.currentActId = following || actId;
  progress.freePlayUnlocked = actId === 'act5';
  return progress;
}

export function progressPercent(progress) {
  return Math.round((progress.completedActs.length / ACT_IDS.length) * 100);
}

export function participationSummary(progress) {
  const speechEvents = progress.actEvents.filter((event) => event.mode === 'speech' || event.mode === 'extension');
  const extensionEvents = progress.actEvents.filter((event) => event.mode === 'extension');
  return {
    actsCompleted: progress.completedActs.length,
    speakingTurns: speechEvents.filter((event) => event.speech_observed).length,
    understoodSpeechTurns: speechEvents.filter((event) => event.response_state === 'semantic_success').length,
    understoodExtensionTurns: extensionEvents.filter((event) => event.response_state === 'extension_idea').length,
    lookAndChooseTurns: progress.actEvents.filter((event) => event.mode === 'listen_and_choose').length,
    note: 'This is participation evidence, not a pronunciation or mastery score. Speaking means words were heard; understood means the app matched the meaning.'
  };
}
