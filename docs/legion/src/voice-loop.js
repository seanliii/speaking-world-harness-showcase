export const VOICE_RESPONSE_STATES = Object.freeze({
  SEMANTIC_SUCCESS: 'semantic_success',
  PARTIAL_SUCCESS: 'partial_success',
  UNDERSTOOD_REFUSAL: 'understood_refusal',
  UNDERSTOOD_ALTERNATIVE: 'understood_alternative',
  SEQUENCE_MISMATCH: 'sequence_mismatch',
  CLARIFICATION_NEEDED: 'clarification_needed',
  EXTENSION_IDEA: 'extension_idea',
  HEARD_NO_MATCH: 'heard_no_match',
  NO_SPEECH: 'no_speech',
  UNSUPPORTED_OR_DENIED: 'unsupported_or_denied',
  LISTEN_AND_CHOOSE: 'listen_and_choose'
});

const ACT_CHARACTERS = Object.freeze({
  act1: 'Pip',
  act2: 'Mango',
  act3: 'Blue',
  act4: 'Bramble',
  act5: 'Melody'
});

const ACT_MODEL_PHRASES = Object.freeze({
  act1: 'Hello! I can help you.',
  act2: 'I want the red apple, please.',
  act3: 'I see a small blue firefly.',
  act4: 'First, I put the red stone. Then, I put the blue stone. Now, the bridge is strong.',
  act5: 'My show is about sounds. First, I play the drum. Then, my friend sings. The end!'
});

const FILLER_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'um', 'uh', 'er', 'ah', 'oh', 'yeah', 'yes', 'no', 'okay', 'ok', 'like',
  'i', 'we', 'you', 'it', 'is', 'are', 'was', 'be', 'been', 'my', 'your', 'to', 'for', 'with'
]);

const SYNONYMS = Object.freeze({
  hi: 'hello',
  hey: 'hello',
  need: 'want',
  look: 'see',
  bug: 'firefly',
  light: 'firefly',
  fruit: 'snack'
});

const OPTION_CATALOGS = Object.freeze({
  act2: Object.freeze(['red_apple', 'yellow_banana', 'blue_berry']),
  act3: Object.freeze(['small_blue', 'big_yellow', 'small_pink'])
});

const NEGATION_WORDS = new Set(['no', 'not', 'dont', 'never', 'cannot', 'cant', 'stop', 'refuse']);
const STONE_WORDS = new Set(['red', 'blue', 'yellow']);

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function normalizeTranscript(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => SYNONYMS[word] || word)
    .filter(Boolean)
    .join(' ');
}

function words(value) {
  return normalizeTranscript(value).split(/\s+/).filter(Boolean);
}

function hasWord(value, target) {
  return words(value).includes(target);
}

function hasAnyWord(value, targets) {
  const set = new Set(words(value));
  return targets.some((target) => set.has(target));
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function selectedTokens(selectedOption) {
  if (Array.isArray(selectedOption)) {
    return selectedOption.flatMap((value) => String(value).split(/[_\s-]+/)).filter(Boolean);
  }
  return String(selectedOption || '').split(/[_\s-]+/).filter(Boolean);
}

function meaningfulWords(value) {
  return words(value).filter((word) => !FILLER_WORDS.has(word) && word.length > 1);
}

function wordsWithPositions(value) {
  const list = words(value);
  return list.map((word, index) => ({ word, index }));
}

function rawClauses(value) {
  return String(value || '')
    .split(/[.!?;,]+|\s+but\s+/i)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

function rawSentences(value) {
  return String(value || '')
    .split(/[.!?;]+|\s+but\s+/i)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function clauses(value) {
  return rawClauses(value)
    .map((clause) => normalizeTranscript(clause))
    .filter(Boolean);
}

function isNegatedClause(clause) {
  const normalized = normalizeTranscript(clause);
  return /\b(no|not|dont|never|cannot|cant|refuse|stop)\b/.test(normalized) &&
    !/\b(cannot wait|cant wait)\b/.test(normalized);
}

function isNegatedPhrase(value, targetWords, lookBack = 5) {
  const tokens = wordsWithPositions(value);
  const targets = new Set(selectedTokens(targetWords));
  return tokens.some(({ word, index }) => {
    if (!targets.has(word)) return false;
    return tokens
      .slice(Math.max(0, index - lookBack), index)
      .some(({ word: previous }) => NEGATION_WORDS.has(previous));
  });
}

function optionLabel(optionId) {
  return String(optionId || '').replace(/_/g, ' ');
}

function mentionedOptions(value, catalog, actId) {
  return catalog
    .map((optionId) => {
      const tokens = actId === 'act3' ? [optionId.split('_').pop()] : selectedTokens(optionId);
      const mentioned = tokens.every((token) => hasWord(value, token));
      const insteadOf = new RegExp(`\\binstead of\\b.*?\\b${tokens.join('\\s+.*?\\b')}\\b`).test(normalizeTranscript(value));
      return mentioned ? { optionId, negated: isNegatedPhrase(value, tokens) || insteadOf } : null;
    })
    .filter(Boolean);
}

function optionMentionsByClause(value, catalog, actId) {
  return rawClauses(value).flatMap((rawClause) => mentionedOptions(rawClause, catalog, actId).map((mention) => ({
    ...mention,
    clause: normalizeTranscript(rawClause),
    negated: isNegatedClause(rawClause) || mention.negated
  })));
}

function positiveOption(mentions) {
  const positive = uniqueValues(mentions.filter((mention) => !mention.negated).map((mention) => mention.optionId));
  return positive.length === 1 ? positive[0] : null;
}

function hasMultiplePositiveOptions(mentions) {
  return uniqueValues(mentions.filter((mention) => !mention.negated).map((mention) => mention.optionId)).length > 1;
}

function chosenOption(mentions) {
  const positive = mentions.filter((mention) => !mention.negated);
  return positive.length === 1 ? positive[0].optionId : null;
}

function spokenStoneSequence(value) {
  const sequence = [];
  clauses(value).forEach((clause) => {
    const tokens = words(clause);
    tokens.forEach((token, index) => {
      if (!STONE_WORDS.has(token) || sequence.includes(token)) return;
      const previous = tokens.slice(Math.max(0, index - 4), index);
      if (previous.some((word) => NEGATION_WORDS.has(word))) return;
      sequence.push(token);
    });
  });
  return sequence;
}

function isRefusal(value) {
  return /\b(no|not|dont|do not|never|cannot|cant|refuse|stop|later)\b/.test(value) &&
    /\b(help|want|tell|story|show|play|sing|put)\b/.test(value);
}

function isQuotedSpeech(rawClause) {
  return /\b(says|said|tells|told|asks|asked|shouts|whispers)\b/i.test(String(rawClause || ''));
}

function isSelfRefusal(value) {
  return rawSentences(value).some((rawSentence) => {
    const clause = normalizeTranscript(rawSentence);
    if (isQuotedSpeech(rawSentence)) return false;
    if (/\b(cannot wait|cant wait)\b/.test(clause)) return false;
    const selfSubject = /\b(i|we)\b/.test(clause);
    const negated = isNegatedClause(clause);
    const declinesCurrentActivity = /\b(help|hand|tell|show|story|play|sing|stop|put|bridge)\b/.test(clause);
    const inabilityNow = /\b(cannot|cant|can not|not)\b/.test(clause) && /\b(right now|now|today|later)\b/.test(clause);
    return selfSubject && negated && (declinesCurrentActivity || inabilityNow);
  });
}

function contextualExtension(actId, selectedOption, recognizedKeys) {
  if (actId === 'act1') return 'Pip says, “Hello! You can help me wake the seed.” The vine hears your voice and grows.';
  if (actId === 'act2') {
    const snack = String(selectedOption || 'red_apple').replace(/_/g, ' ');
    return `Mango says, “I hear that you want the ${snack}.” It lands in the basket and the market drums wake.`;
  }
  if (actId === 'act3') {
    const firefly = String(selectedOption || 'blue_firefly').replace(/_/g, ' ');
    return `Blue says, “I see the ${firefly}, too.” It joins the lantern and the cave path brightens.`;
  }
  if (actId === 'act4') {
    const stones = selectedTokens(selectedOption).join(' and ');
    return `Bramble says, “First ${stones}, then the flowers lock.” Now the bridge is strong.`;
  }
  const ideaWords = recognizedKeys.slice(0, 3).join(', ');
  return ideaWords ? `Melody says, “Your show has ${ideaWords}.” The stage lights dance to your story.` : 'Melody says, “What a sound show!” The stage lights dance to your story.';
}

function mismatchDetail(actId, expected, understood) {
  if (actId === 'act4') {
    return `Bramble heard ${understood.join(', then ')}. The flowers stay loose because the plan was ${expected.join(', then ')}. Say the order again.`;
  }
  if (actId === 'act5') {
    return 'Melody hears that you do not want a show right now. The stage waits kindly.';
  }
  return 'Your friend hears that you do not want to do this right now. The island waits kindly.';
}

function retryFocusFor(actId, recognizedKeys, selectedOption) {
  if (actId === 'act1') return recognizedKeys.includes('hello') ? 'help' : 'hello';
  if (actId === 'act2') return recognizedKeys.includes('want') ? selectedTokens(selectedOption).pop() : 'want';
  if (actId === 'act3') {
    if (!recognizedKeys.includes('see')) return 'see';
    if (!recognizedKeys.includes(selectedTokens(selectedOption)[0])) return selectedTokens(selectedOption)[0];
    return 'firefly';
  }
  if (actId === 'act4') return recognizedKeys.includes('first') ? 'then' : 'first';
  return 'another show word';
}

export function classifyTranscript(actId, transcript, selectedOption = null, alternatives = []) {
  const normalized = normalizeTranscript(transcript);
  const normalizedAlternatives = uniqueValues(alternatives.map(normalizeTranscript))
    .filter((alternative) => alternative && alternative !== normalized);
  const primary = interpretUtterance(actId, transcript, selectedOption);
  const recognized = [];
  let understoodOption = null;
  let understoodSequence = null;
  let expectedSequence = null;
  let refusal = false;
  let alternative = false;
  let clarificationNeeded = false;
  let matched = false;
  let partiallyMatched = false;

  if (actId === 'act1') {
    recognized.push(...primary.recognizedKeys);
    refusal = primary.refusal;
    alternative = primary.alternative;
    matched = primary.matched;
    partiallyMatched = primary.partiallyMatched;
  } else if (actId === 'act2') {
    recognized.push(...primary.recognizedKeys);
    understoodOption = primary.understoodOption;
    refusal = primary.refusal;
    clarificationNeeded = primary.clarificationNeeded;
    matched = primary.matched;
    partiallyMatched = primary.partiallyMatched;
  } else if (actId === 'act3') {
    recognized.push(...primary.recognizedKeys);
    understoodOption = primary.understoodOption;
    refusal = primary.refusal;
    clarificationNeeded = primary.clarificationNeeded;
    matched = primary.matched;
    partiallyMatched = primary.partiallyMatched;
  } else if (actId === 'act4') {
    recognized.push(...primary.recognizedKeys);
    understoodSequence = primary.understoodSequence;
    expectedSequence = primary.expectedSequence;
    refusal = primary.refusal;
    matched = primary.matched;
    partiallyMatched = primary.partiallyMatched;
  } else if (actId === 'act5') {
    recognized.push(...primary.recognizedKeys);
    refusal = primary.refusal;
    alternative = primary.alternative;
    matched = primary.matched;
    partiallyMatched = primary.partiallyMatched;
  } else {
    return {
      state: VOICE_RESPONSE_STATES.HEARD_NO_MATCH,
      transcript,
      normalizedTranscript: normalized,
      recognizedKeys: [],
      selectedOption,
      meaningfulWordCount: meaningfulWords(normalized).length
    };
  }

  let state = matched
    ? VOICE_RESPONSE_STATES.SEMANTIC_SUCCESS
    : partiallyMatched
      ? VOICE_RESPONSE_STATES.PARTIAL_SUCCESS
      : normalized
        ? VOICE_RESPONSE_STATES.HEARD_NO_MATCH
        : VOICE_RESPONSE_STATES.NO_SPEECH;

  if (!matched && refusal && normalized) state = VOICE_RESPONSE_STATES.UNDERSTOOD_REFUSAL;
  if (alternative && normalized) state = VOICE_RESPONSE_STATES.UNDERSTOOD_ALTERNATIVE;
  if (clarificationNeeded && normalized) state = VOICE_RESPONSE_STATES.CLARIFICATION_NEEDED;
  if (actId === 'act4' && understoodSequence && expectedSequence &&
      understoodSequence.join('|') !== expectedSequence.slice(0, understoodSequence.length).join('|')) {
    state = VOICE_RESPONSE_STATES.SEQUENCE_MISMATCH;
  }

  if (normalizedAlternatives.length) {
    const alternativeResults = normalizedAlternatives.map((alternative) => interpretUtterance(actId, alternative, selectedOption));
    const substantive = (result) => [
      result.matched,
      result.understoodOption,
      result.understoodSequence?.join('|'),
      result.refusal,
      result.clarificationNeeded
    ].join('|');
    const conflicting = alternativeResults.some((result) => substantive(result) !== substantive(primary));
    if (conflicting) state = VOICE_RESPONSE_STATES.CLARIFICATION_NEEDED;
  }

  return {
    state,
    transcript,
    normalizedTranscript: normalized,
    recognizedKeys: uniqueValues(recognized),
    selectedOption,
    understoodOption,
    understoodSequence,
    expectedSequence,
    intent: state === VOICE_RESPONSE_STATES.CLARIFICATION_NEEDED
      ? 'clarify'
      : refusal
        ? 'decline'
        : matched
          ? 'cooperate'
          : 'unclear',
    meaningfulWordCount: meaningfulWords(normalized).length
  };
}

function interpretUtterance(actId, transcript, selectedOption) {
  const normalized = normalizeTranscript(transcript);
  const clauseList = clauses(transcript);
  const result = {
    state: VOICE_RESPONSE_STATES.HEARD_NO_MATCH,
    recognizedKeys: uniqueValues(meaningfulWords(normalized).slice(0, 10)),
    understoodOption: null,
    understoodSequence: null,
    expectedSequence: null,
    refusal: false,
    alternative: false,
    clarificationNeeded: false,
    matched: false,
    partiallyMatched: false
  };

  if (actId === 'act1') {
    const greeting = hasWord(normalized, 'hello');
    const cooperative = /\b(help|hand|work together|with you|wake the seed|let us|lets)\b/.test(normalized);
    const firstPersonRefusal = isSelfRefusal(transcript);
    if (greeting) result.recognizedKeys.unshift('hello');
    result.refusal = firstPersonRefusal;
    result.matched = cooperative && !firstPersonRefusal;
    result.partiallyMatched = !firstPersonRefusal && (greeting || cooperative);
    return result;
  }

  if (actId === 'act2' || actId === 'act3') {
    const catalog = OPTION_CATALOGS[actId];
    const mentions = optionMentionsByClause(transcript, catalog, actId);
    result.understoodOption = positiveOption(mentions);
    result.clarificationNeeded = hasMultiplePositiveOptions(mentions) ||
      (!result.understoodOption && mentions.some((mention) => mention.negated));
    const request = actId === 'act2'
      ? /\b(want|need|give|please|take|have|could|would|may|can)\b/.test(normalized)
      : /\b(see|point|find|there)\b/.test(normalized);
    const objectWord = actId === 'act3' && /\b(firefly|bug|light)\b/.test(normalized);
    if (result.understoodOption) result.recognizedKeys.push(...selectedTokens(result.understoodOption));
    result.matched = Boolean(result.understoodOption) && request && (actId !== 'act3' || objectWord);
    result.partiallyMatched = !result.refusal && !result.clarificationNeeded && (request || mentions.length > 0 || objectWord);
    return result;
  }

  if (actId === 'act4') {
    const markerCount = ['first', 'then', 'next', 'now'].filter((marker) => hasWord(normalized, marker)).length;
    const sequence = spokenStoneSequence(transcript);
    result.expectedSequence = Array.isArray(selectedOption) ? [...selectedOption] : null;
    result.understoodSequence = sequence;
    result.recognizedKeys.push(...sequence, ...['first', 'then', 'next', 'now', 'bridge', 'stone'].filter((word) => hasWord(normalized, word)));
    result.refusal = isSelfRefusal(transcript) && sequence.length < 2;
    const orderMatches = Boolean(result.expectedSequence && sequence.length >= 2 &&
      result.expectedSequence.slice(0, sequence.length).join('|') === sequence.join('|'));
    result.matched = sequence.length >= 2 && markerCount > 0 && orderMatches;
    result.partiallyMatched = !result.refusal && sequence.length < 2 && (markerCount > 0 || sequence.length === 1);
    return result;
  }

  if (actId === 'act5') {
    const meaningful = meaningfulWords(normalized);
    const narrative = /\b(show|story|first|then|friend|bear|rabbit|dance|drum|sing)\b/.test(normalized);
    const firstPersonRefusal = isSelfRefusal(transcript);
    const wantsAlternativeRole = /\b(audience|listen|hear|watch)\b/.test(normalized) &&
      /\b(i|we|my|our)\b/.test(normalized) &&
      !firstPersonRefusal;
    result.refusal = firstPersonRefusal;
    result.alternative = wantsAlternativeRole;
    result.matched = meaningful.length >= 2 && !firstPersonRefusal && !wantsAlternativeRole && (narrative || meaningful.length >= 3);
    result.partiallyMatched = !firstPersonRefusal && meaningful.length === 1;
    return result;
  }

  return result;
}

export function classifyExtensionTranscript(actId, transcript) {
  const normalized = normalizeTranscript(transcript);
  const recognizedKeys = uniqueValues(meaningfulWords(normalized).slice(0, 10));
  if (!normalized) {
    return {
      state: VOICE_RESPONSE_STATES.NO_SPEECH,
      transcript,
      normalizedTranscript: normalized,
      recognizedKeys: [],
      intent: 'silent',
      meaningfulWordCount: 0
    };
  }

  if (isSelfRefusal(transcript)) {
    return {
      state: VOICE_RESPONSE_STATES.UNDERSTOOD_REFUSAL,
      transcript,
      normalizedTranscript: normalized,
      recognizedKeys,
      intent: 'decline',
      meaningfulWordCount: recognizedKeys.length
    };
  }

  const reasoningCue = /\b(because|so|then|next|first|want|like|love|need|help|make|play|dance|sing|walk|cross)\b/.test(normalized);
  const enoughIdea = recognizedKeys.length >= 2 && (reasoningCue || recognizedKeys.length >= 4);
  return {
    state: enoughIdea
      ? VOICE_RESPONSE_STATES.EXTENSION_IDEA
      : VOICE_RESPONSE_STATES.PARTIAL_SUCCESS,
    transcript,
    normalizedTranscript: normalized,
    recognizedKeys,
    intent: enoughIdea ? 'explain' : 'unclear',
    meaningfulWordCount: recognizedKeys.length
  };
}

export function buildExtensionFeedback(actId, result) {
  const character = ACT_CHARACTERS[actId] || 'Friend';
  const act = getExtensionAct(actId);
  const ideaWords = result.recognizedKeys
    .filter((word) => !['because', 'so', 'then', 'next', 'first', 'want', 'need'].includes(word))
    .slice(0, 4);
  const idea = ideaWords.join(', ');

  if (result.state === VOICE_RESPONSE_STATES.EXTENSION_IDEA) {
    const semanticDetail = extensionSemanticDetail(normalizeTranscript(result.transcript || ''));
    return {
      character,
      headline: `${character} understands your idea!`,
      detail: semanticDetail || (idea
        ? `${character} says, “I hear your idea: ${idea}.” Let’s try it in the story.`
        : `${character} says, “I hear your idea.” Let’s try it in the story.`),
      worldChange: 'extension-response',
      tone: 'reasoning-response'
    };
  }
  if (result.state === VOICE_RESPONSE_STATES.UNDERSTOOD_REFUSAL) {
    return {
      character,
      headline: `${character} hears your “no.”`,
      detail: 'You can try this thinking question later. The story will wait for you.',
      worldChange: 'respected-pause',
      tone: 'respected-refusal'
    };
  }
  if (result.state === VOICE_RESPONSE_STATES.NO_SPEECH) {
    return {
      character,
      headline: `${character} waits for your idea.`,
      detail: 'You can say one more sentence, or continue the adventure.',
      modelPhrase: act?.extensionModel || 'I chose it because...',
      worldChange: 'none',
      tone: 'gentle-retry'
    };
  }
  return {
    character,
    headline: `${character} heard your voice.`,
    detail: 'Say a little more about why or what happens next.',
    modelPhrase: act?.extensionModel || 'I chose it because...',
    worldChange: 'small-spark',
    retryFocus: 'one more idea',
    tone: 'gentle-retry'
  };
}

function extensionSemanticDetail(normalized) {
  if (/\bshare\b/.test(normalized) && /\bforgot\b/.test(normalized)) {
    return 'You want to share your snack because a friend forgot hers. That is a kind plan.';
  }
  if (/\bshare\b/.test(normalized)) {
    return 'You want to share with your friend. Sharing can make the game more fun.';
  }
  if (/\bnot like\b/.test(normalized) || /\bdoesnt like\b/.test(normalized)) {
    return 'You are making a backup plan. We can ask the friend what she likes, then choose something she enjoys.';
  }
  if (/\bbecause\b/.test(normalized) && /\b(sweet|crunchy|juicy|yummy|good)\b/.test(normalized)) {
    const tasteWords = ['sweet', 'crunchy', 'juicy', 'yummy', 'good'].filter((word) => new RegExp(`\\b${word}\\b`).test(normalized));
    return `You chose it because it is ${tasteWords.join(' and ')}. That is a clear reason.`;
  }
  if (/\b(next|then)\b/.test(normalized) && /\b(walk|cross|bridge|go)\b/.test(normalized)) {
    return 'You are planning what happens next. We can walk across the bridge together.';
  }
  return null;
}

function getExtensionAct(actId) {
  if (actId === 'act2') {
    return { extensionModel: 'I chose it because it is sweet.' };
  }
  if (actId === 'act4') {
    return { extensionModel: 'Next, we can walk across to the sound show.' };
  }
  return null;
}

export function buildChildFeedback(actId, state, recognizedKeys = [], options = {}) {
  const character = ACT_CHARACTERS[actId] || 'Friend';
  const modelPhrase = ACT_MODEL_PHRASES[actId] || 'Say your idea.';
  const heardWords = recognizedKeys.filter((key) => !['want', 'see', 'bridge'].includes(key)).slice(0, 2);
  const heardLabel = heardWords.length ? ` I heard ${heardWords.join(' and ')}!` : '';
  const selectedOption = options.selectedOption || null;
  const retryFocus = retryFocusFor(actId, recognizedKeys, selectedOption);

  if (state === VOICE_RESPONSE_STATES.SEMANTIC_SUCCESS) {
    return {
      character,
      headline: `${character} hears you!`,
      detail: contextualExtension(actId, selectedOption, recognizedKeys),
      modelPhrase,
      worldChange: 'full-consequence',
      retryFocus: null,
      tone: 'celebrate-and-extend'
    };
  }
  if (state === VOICE_RESPONSE_STATES.PARTIAL_SUCCESS) {
    return {
      character,
      headline: `${character} heard your voice!${heardLabel}`,
      detail: 'Say it one more time, a little slower.',
      modelPhrase,
      worldChange: 'small-spark',
      retryFocus,
      tone: 'gentle-retry'
    };
  }
  if (state === VOICE_RESPONSE_STATES.UNDERSTOOD_REFUSAL) {
    return {
      character,
      headline: `${character} hears your “no.”`,
      detail: mismatchDetail(actId, [], []),
      modelPhrase,
      worldChange: 'respected-pause',
      retryFocus: null,
      tone: 'respected-refusal'
    };
  }
  if (state === VOICE_RESPONSE_STATES.UNDERSTOOD_ALTERNATIVE) {
    return {
      character,
      headline: `${character} hears a different plan!`,
      detail: 'You want a different role right now. Your friend can change the plan without changing the world by mistake.',
      modelPhrase,
      worldChange: 'alternative-response',
      retryFocus: null,
      tone: 'respected-alternative'
    };
  }
  if (state === VOICE_RESPONSE_STATES.SEQUENCE_MISMATCH) {
    return {
      character,
      headline: `${character} heard a different order.`,
      detail: mismatchDetail(actId, options.expectedSequence || [], options.understoodSequence || []),
      modelPhrase,
      worldChange: 'no-consequence-yet',
      retryFocus: 'order',
      tone: 'kind-mismatch'
    };
  }
  if (state === VOICE_RESPONSE_STATES.CLARIFICATION_NEEDED) {
    return {
      character,
      headline: `${character} heard two ideas.`,
      detail: 'I do not want to guess. Say the one you really want, then I will change the world.',
      modelPhrase,
      worldChange: 'none',
      retryFocus: 'one choice',
      tone: 'honest-clarify'
    };
  }
  if (state === VOICE_RESPONSE_STATES.HEARD_NO_MATCH) {
    return {
      character,
      headline: `${character} heard a voice!`,
      detail: 'The words are still sleepy. Say them together.',
      modelPhrase,
      worldChange: 'wiggle',
      retryFocus,
      tone: 'playful-retry'
    };
  }
  if (state === VOICE_RESPONSE_STATES.NO_SPEECH) {
    return {
      character,
      headline: `${character} waits for your voice.`,
      detail: 'Listen first. Then hold the mushroom and speak.',
      modelPhrase,
      worldChange: 'none',
      retryFocus,
      tone: 'whispered-model'
    };
  }
  if (state === VOICE_RESPONSE_STATES.LISTEN_AND_CHOOSE) {
    return {
      character,
      headline: `${character} plays with your choice.`,
      detail: 'Speech listening is not being used, so this is honestly a Look-and-Choose turn.',
      modelPhrase,
      worldChange: 'choice-consequence',
      retryFocus: null,
      tone: 'honest-fallback'
    };
  }
  return {
    character,
    headline: 'Speech listening is not available.',
    detail: 'You can still play with Look-and-Choose. No recording is needed.',
    modelPhrase,
    worldChange: 'fallback',
    retryFocus: null,
    tone: 'honest-fallback'
  };
}

export function createListenAndChooseResult(actId, selectedOption) {
  const classifier = classifyTranscript(actId, ACT_MODEL_PHRASES[actId], selectedOption);
  return {
    state: VOICE_RESPONSE_STATES.LISTEN_AND_CHOOSE,
    mode: 'listen_and_choose',
    transcript: '',
    normalizedTranscript: '',
    recognizedKeys: ['look_and_choose'],
    selectedOption,
    feedback: buildChildFeedback(actId, VOICE_RESPONSE_STATES.LISTEN_AND_CHOOSE),
    recognitionProvider: 'none',
    recordingAvailable: false,
    fallbackUsed: true,
    microphoneUsed: false,
    meaningfulWordCount: classifier.meaningfulWordCount
  };
}

export class VoiceLoop {
  #activeRecognition;
  #activeStream;
  #activeRecorder;
  #audioContext;
  #meterFrame;
  #stopTimer;
  #maxAudioLevel;
  #stopRequested;

  constructor({ language = 'en-US', onAudioLevel, onStateChange, onTranscript } = {}) {
    this.language = language;
    this.onAudioLevel = onAudioLevel || null;
    this.onStateChange = onStateChange || null;
    this.onTranscript = onTranscript || null;
    this.microphonePermission = 'unknown';
    this.lastRecordingUrl = null;
    this.active = false;
    this.recognitionProvider = 'browser-speech-api';
    this.#activeRecognition = null;
    this.#activeStream = null;
    this.#activeRecorder = null;
    this.#audioContext = null;
    this.#meterFrame = null;
    this.#stopTimer = null;
    this.#maxAudioLevel = 0;
    this.#stopRequested = false;
  }

  get recognitionSupported() {
    return Boolean(getSpeechRecognitionConstructor());
  }

  get microphoneSupported() {
    return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  get capabilitySummary() {
    return {
      speechRecognitionSupported: this.recognitionSupported,
      microphoneSupported: this.microphoneSupported,
      microphonePermission: this.microphonePermission,
      recognitionProvider: this.recognitionSupported ? 'browser-built-in SpeechRecognition' : 'none',
      recognitionBoundary: 'The browser controls the SpeechRecognition backend; it may use an OS or online service. This app does not promise local-only transcription.',
      recordingBoundary: 'MediaRecorder audio stays in browser memory for this session only and is never persisted or uploaded by this app.',
      fallback: 'Look-and-Choose remains available and is labeled as a non-speech fallback.',
      lastRecordingInMemory: Boolean(this.lastRecordingUrl)
    };
  }

  async requestMicrophonePermission() {
    if (!this.microphoneSupported) {
      this.microphonePermission = 'unsupported';
      return this.microphonePermission;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      this.microphonePermission = 'granted';
    } catch (error) {
      this.microphonePermission = error && error.name === 'NotFoundError' ? 'unavailable' : 'denied';
    }
    return this.microphonePermission;
  }

  async startListening({ actId, selectedOption = null, speechWindowMs = 8000, keepRecording = null } = {}) {
    if (this.active) throw new Error('A voice turn is already active.');
    if (!actId) throw new Error('actId is required.');
    if (!this.recognitionSupported || !this.microphoneSupported) {
      return this.#unsupportedResult(actId, selectedOption, this.recognitionSupported ? 'microphone-unavailable' : 'speech-recognition-unavailable');
    }

    this.#stopRequested = false;
    this.#maxAudioLevel = 0;
    this.active = true;
    this.#emitState('requesting-audio');

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      this.microphonePermission = 'granted';
    } catch (error) {
      this.microphonePermission = error && error.name === 'NotFoundError' ? 'unavailable' : 'denied';
      return this.#unsupportedResult(actId, selectedOption, `microphone-${this.microphonePermission}`);
    }
    this.#activeStream = stream;
    const recognitionPromise = this.#startRecognition()
      .catch((error) => ({ transcript: '', alternatives: [], confidence: null, error: error && error.name ? error.name : 'start-failed' }))
      .then((outcome) => {
        this.stopListening();
        return outcome;
      });
    const recordingPromise = this.#startRecording(stream);
    this.#startAudioMeter(stream);

    const shouldKeepRecording = keepRecording === null ? actId === 'act5' : keepRecording;
    this.#stopTimer = window.setTimeout(() => this.stopListening(), speechWindowMs);

    const [recognitionOutcome, recordingOutcome] = await Promise.all([
      recognitionPromise,
      recordingPromise
    ]);

    if (this.#activeStream) {
      this.#activeStream.getTracks().forEach((track) => track.stop());
      this.#activeStream = null;
    }
    await this.#stopAudioMeter();
    this.active = false;
    this.#emitState('complete');

    if (shouldKeepRecording && recordingOutcome.url) {
      this.releaseSessionRecording();
      this.lastRecordingUrl = recordingOutcome.url;
    }

    const classifier = this.#classifyRecognitionOutcome(actId, recognitionOutcome, selectedOption);
    return {
      ...classifier,
      mode: 'speech',
      selectedOption,
      feedback: buildChildFeedback(actId, classifier.state, classifier.recognizedKeys, {
        selectedOption: classifier.understoodOption || selectedOption,
        expectedSequence: classifier.expectedSequence,
        understoodSequence: classifier.understoodSequence
      }),
      recognitionProvider: this.recognitionProvider,
      recognitionError: recognitionOutcome.error || null,
      recordingAvailable: Boolean(recordingOutcome.url),
      audioUrl: shouldKeepRecording ? recordingOutcome.url : null,
      keepRecording: shouldKeepRecording,
      microphoneUsed: true,
      microphonePermission: this.microphonePermission,
      maxAudioLevel: this.#maxAudioLevel,
      durationMs: recordingOutcome.durationMs || recognitionOutcome.durationMs || 0
    };
  }

  stopListening() {
    if (!this.active || this.#stopRequested) return;
    this.#stopRequested = true;
    this.#emitState('stopping');
    window.clearTimeout(this.#stopTimer);
    this.#stopTimer = null;
    if (this.#activeRecognition) {
      try {
        this.#activeRecognition.stop();
      } catch (error) {}
    }
    if (this.#activeRecorder && this.#activeRecorder.state !== 'inactive') {
      try {
        this.#activeRecorder.stop();
      } catch (error) {}
    }
  }

  releaseSessionRecording() {
    if (this.lastRecordingUrl) {
      URL.revokeObjectURL(this.lastRecordingUrl);
      this.lastRecordingUrl = null;
    }
  }

  #emitState(state) {
    if (this.onStateChange) this.onStateChange({ state, active: this.active });
  }

  #unsupportedResult(actId, selectedOption, reason) {
    this.active = false;
    const state = VOICE_RESPONSE_STATES.UNSUPPORTED_OR_DENIED;
    return {
      state,
      mode: 'speech_unavailable',
      transcript: '',
      normalizedTranscript: '',
      recognizedKeys: [],
      selectedOption,
      fallbackReason: reason,
      feedback: buildChildFeedback(actId, state),
      recognitionProvider: 'none',
      recordingAvailable: false,
      microphoneUsed: false,
      microphonePermission: this.microphonePermission,
      fallbackUsed: true,
      durationMs: 0
    };
  }

  #startRecognition() {
    const RecognitionConstructor = getSpeechRecognitionConstructor();
    const recognition = new RecognitionConstructor();
    const startedAt = performance.now();
    let finalTranscript = '';
    let interimTranscript = '';
    let confidence = null;
    let alternatives = [];
    let error = null;
    let settled = false;

    recognition.lang = this.language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    const promise = new Promise((resolve) => {
      const settle = () => {
        if (settled) return;
        settled = true;
        resolve({
          transcript: finalTranscript || interimTranscript,
          alternatives,
          confidence,
          error,
          durationMs: performance.now() - startedAt
        });
      };

      recognition.onresult = (event) => {
        let currentInterim = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const firstAlternative = result[0] || {};
          if (result.isFinal) {
            finalTranscript += ` ${firstAlternative.transcript || ''}`;
            confidence = firstAlternative.confidence ?? confidence;
            for (let alternativeIndex = 0; alternativeIndex < result.length; alternativeIndex += 1) {
              alternatives.push(result[alternativeIndex].transcript || '');
            }
          } else {
            currentInterim += ` ${firstAlternative.transcript || ''}`;
          }
        }
        interimTranscript = currentInterim || interimTranscript;
        const liveTranscript = `${finalTranscript} ${interimTranscript}`.trim();
        this.#emitTranscript(liveTranscript, false);
      };

      recognition.onerror = (event) => {
        error = event.error;
        this.#emitState(`recognition-error-${event.error}`);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
          settle();
        }
      };

      recognition.onend = () => {
        settle();
      };
    });

    this.#activeRecognition = recognition;
    recognition.start();
    return promise;
  }

  #startRecording(stream) {
    return new Promise((resolve) => {
      if (typeof MediaRecorder === 'undefined') {
        resolve({ url: null, durationMs: 0, reason: 'media-recorder-unavailable' });
        return;
      }
      const mimeType = ['audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
      const chunks = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const startedAt = performance.now();
      let resolved = false;

      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => finish({ url: null, durationMs: performance.now() - startedAt, reason: 'recorder-error' });
      recorder.onstop = () => {
        if (!chunks.length) {
          finish({ url: null, durationMs: performance.now() - startedAt, reason: 'no-audio-data' });
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        finish({ url: URL.createObjectURL(blob), durationMs: performance.now() - startedAt });
      };

      this.#activeRecorder = recorder;
      recorder.start(250);
    });
  }

  #startAudioMeter(stream) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor || !this.onAudioLevel) return;
    this.#audioContext = new AudioContextConstructor();
    const source = this.#audioContext.createMediaStreamSource(stream);
    const analyser = this.#audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const update = () => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (const sample of data) {
        const centered = sample - 128;
        sumSquares += centered * centered;
      }
      const level = Math.min(1, Math.sqrt(sumSquares / data.length) / 48);
      this.#maxAudioLevel = Math.max(this.#maxAudioLevel, level);
      this.onAudioLevel(level);
      this.#meterFrame = requestAnimationFrame(update);
    };
    update();
  }

  async #stopAudioMeter() {
    if (this.#meterFrame) {
      cancelAnimationFrame(this.#meterFrame);
      this.#meterFrame = null;
    }
    if (this.#audioContext) {
      await this.#audioContext.close().catch(() => {});
      this.#audioContext = null;
    }
  }

  #emitTranscript(transcript, isFinal) {
    if (this.onTranscript) this.onTranscript({ transcript, isFinal });
  }

  #classifyRecognitionOutcome(actId, outcome, selectedOption) {
    if (outcome.transcript) {
      const classifier = classifyTranscript(actId, outcome.transcript, selectedOption, outcome.alternatives);
      return { ...classifier, confidence: outcome.confidence };
    }

    if (outcome.error === 'not-allowed' || outcome.error === 'service-not-allowed' || outcome.error === 'audio-capture' || outcome.error === 'network') {
      return {
        state: VOICE_RESPONSE_STATES.UNSUPPORTED_OR_DENIED,
        transcript: '',
        normalizedTranscript: '',
        recognizedKeys: [],
        selectedOption,
        meaningfulWordCount: 0
      };
    }

    if (this.#maxAudioLevel > 0.035) {
      return {
        state: VOICE_RESPONSE_STATES.HEARD_NO_MATCH,
        transcript: '',
        normalizedTranscript: '',
        recognizedKeys: [],
        selectedOption,
        meaningfulWordCount: 0
      };
    }

    return {
      state: VOICE_RESPONSE_STATES.NO_SPEECH,
      transcript: '',
      normalizedTranscript: '',
      recognizedKeys: [],
      selectedOption,
      meaningfulWordCount: 0
    };
  }
}
