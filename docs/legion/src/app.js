import { STORY, ACT_IDS, getAct, modelPhraseFor, nextActId } from './story.js';
import {
  clearProgress,
  completeAct,
  createProgress,
  loadProgress,
  participationSummary,
  progressPercent,
  recordAttempt,
  saveProgress
} from './app-state.js';
import {
  buildExtensionFeedback,
  classifyExtensionTranscript,
  createListenAndChooseResult,
  VoiceLoop,
  VOICE_RESPONSE_STATES
} from './voice-loop.js';
import { interpretWithModel } from './dialog-client.js';

const app = document.getElementById('app');

let progress = loadProgress();
let phase = 'title';
let currentActId = progress.currentActId || 'act1';
let selectedChoice = null;
let stoneOrder = [];
let showChoices = {};
let currentResult = null;
let feedback = null;
let isListening = false;
let liveTranscript = '';
let audioLevel = 0;
let mediaReturnPhase = 'title';
let microphoneRequested = false;
let dialogHistory = [];

const voiceLoop = new VoiceLoop({
  language: 'en-US',
  onAudioLevel(level) {
    audioLevel = level;
    const meter = document.querySelector('.listen-meter span');
    if (meter) meter.style.width = `${Math.min(100, Math.round(level * 160))}%`;
  },
  onStateChange(state) {
    const button = document.querySelector('.listen-button');
    if (button && state === 'requesting-audio') button.classList.add('listening');
  },
  onTranscript(transcript) {
    liveTranscript = transcript;
    const transcriptElement = document.querySelector('.live-transcript');
    if (transcriptElement) transcriptElement.textContent = transcript ? `I hear: ${transcript}` : '';
  }
});

const storyMoments = [
  { label: 'Arrival: the quiet island', video: 'assets/video/arrival-quiet-island.mp4', caption: 'The ferry reaches a very quiet island.' },
  { label: 'Act 1: the seed wakes', video: 'assets/video/harbor-seed-bloom.mp4', caption: 'A friendly voice makes the seed grow a bridge.' },
  { label: 'Act 2: the market band', video: 'assets/video/market-band-wakes.mp4', caption: 'A polite snack request wakes the market.' },
  { label: 'Act 3: the firefly lantern', video: 'assets/video/firefly-lantern.mp4', caption: 'Describing words bring light to the cave.' },
  { label: 'Act 4: the strong bridge', video: 'assets/video/bridge-flowers-lock.mp4', caption: 'Sequence words help repair the bridge.' },
  { label: 'Act 5: the Sound Show', video: 'assets/video/sound-show-celebration.mp4', caption: 'A brand-new show earns the Sound Friend badge.' }
];

function on(selector, eventName, handler) {
  const element = document.querySelector(selector);
  if (element) element.addEventListener(eventName, handler);
}

function speak(text, { queue = false, rate = 0.86, pitch = 1.12 } = {}) {
  if (!('speechSynthesis' in window)) return;
  if (!queue) window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.pitch = pitch;
  const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.lang && candidate.lang.startsWith('en'));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function resetTurnState() {
  isListening = false;
  liveTranscript = '';
  audioLevel = 0;
  currentResult = null;
  feedback = null;
}

function restoreActChoices(act) {
  if (act.options) {
    const savedChoice = progress.preferences[`${act.id}_choice`];
    selectedChoice = act.options.find((option) => option.id === savedChoice) || act.options[0];
  }
  if (act.id === 'act4') {
    const savedStones = progress.preferences.act4_stones;
    stoneOrder = Array.isArray(savedStones) ? [...savedStones] : [];
  }
  if (act.showChoices) {
    const savedShow = progress.preferences.show || {};
    showChoices = Object.fromEntries(act.showChoices.map((choiceSet) => {
      const saved = savedShow[choiceSet.key];
      return [choiceSet.key, choiceSet.options.find((option) => option === saved || option.id === saved?.id || option.id === saved) || choiceSet.options[0]];
    }));
  }
}

function enterAct(actId) {
  const act = getAct(actId);
  if (!act) return;
  currentActId = actId;
  resetTurnState();
  stoneOrder = [];
  selectedChoice = null;
  showChoices = {};
  restoreActChoices(act);
  phase = 'act';
  render();
  stopSpeaking();
  speak(act.voiceNeed, { rate: 0.82 });
}

function startFreshJourney() {
  voiceLoop.releaseSessionRecording();
  progress = createProgress();
  clearProgress();
  currentActId = 'act1';
  selectedChoice = null;
  stoneOrder = [];
  showChoices = {};
  resetTurnState();
  phase = 'intro';
  render();
  playRenderedVideo();
}

function continueJourney() {
  if (progress.freePlayUnlocked || progress.completedActs.length === ACT_IDS.length) {
    phase = 'freeplay';
    render();
    speak('Welcome back to your Sound Show stage!');
    return;
  }
  enterAct(progress.currentActId);
}

function progressHtml() {
  return `<div class="progress-track" aria-label="Journey progress">${STORY.acts.map((act) => {
    const done = progress.completedActs.includes(act.id);
    const current = act.id === currentActId && phase === 'act';
    return `<div class="progress-step ${done ? 'done' : ''} ${current ? 'current' : ''}"><i></i><span>${act.name}</span></div>`;
  }).join('')}</div>`;
}

function frameHtml(innerStage, sidePanel, extraClass = '') {
  return `<div class="app-shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span>Sound Seed Island</div>
      <div class="privacy-chip">The microphone is requested only after you tap Talk. Show audio stays in this tab and is not uploaded.</div>
    </header>
    ${progress.completedActs.length ? progressHtml() : ''}
    <main class="main-frame ${extraClass}">
      <section class="stage" aria-label="Story stage">${innerStage}</section>
      <section class="side-panel" aria-label="Speaking activities">${sidePanel}</section>
    </main>
  </div>`;
}

function titleHtml() {
  const hasProgress = progress.completedActs.length > 0;
  const stage = `<img class="stage-art" src="assets/scenes/harbor-scene.svg" alt="A quiet island harbor with a sleeping sound seed" />
    <div class="title-screen">
      <div class="title-copy">
        <div class="eyebrow">English Speaking Play</div>
        <h1>Sound Seed Island</h1>
        <p>${STORY.premise}</p>
        <div class="title-actions">
          <button id="start-play" class="primary-button">▶ Play</button>
          ${hasProgress ? '<button id="continue-play" class="secondary-button">Continue</button><button id="reset-play" class="ghost-button">Start over</button>' : ''}
        </div>
        <div class="title-cast" aria-hidden="true">
          ${['pip', 'mango', 'blue', 'bramble', 'melody'].map((id) => `<img src="assets/characters/${id}.svg" alt="" />`).join('')}
        </div>
      </div>
    </div>`;
  return frameHtml(stage, `<div class="instruction"><strong>Grown-up note:</strong> one tap starts play. There is no form before the fun. Speech recognition is handled by the browser; Look-and-Choose is always available and clearly labeled.</div>`, 'complete-grid');
}

function introHtml() {
  const stage = `<div class="video-frame"><video id="intro-video" src="assets/video/arrival-quiet-island.mp4" playsinline></video>
    <button class="skip-button" id="skip-intro">Skip</button></div>`;
  const panel = `<h2 class="act-heading">Welcome to Sound Seed Island</h2>
    <div class="instruction">Watch what happened. When the island went quiet, the Sound Seed fell asleep.</div>
    <div class="phrase-card"><div class="phrase-label">Next</div><p class="phrase">You will help Pip wake the seed with your voice.</p></div>
    <div class="controls"><button class="secondary-button" id="replay-intro">Replay arrival</button></div>`;
  return frameHtml(stage, panel);
}

function choicesHtml(act) {
  if (!act.options) return '';
  return `<div class="choices" role="group" aria-label="Choose your words">${act.options.map((option) => `
    <button class="choice-button ${selectedChoice?.id === option.id ? 'selected' : ''}" data-choice-id="${option.id}" aria-pressed="${selectedChoice?.id === option.id}">
      <span class="choice-icon ${option.className}" aria-hidden="true"></span>
      <span>${option.label}</span>
    </button>`).join('')}</div>`;
}

function stonesHtml(act) {
  return `<div class="stone-row" aria-label="Storm stones">${act.stones.map((stone) => `
      <button class="stone-button" data-stone-id="${stone.id}" ${stoneOrder.includes(stone.id) ? 'disabled' : ''}>
        <span class="choice-icon ${stone.className}" aria-hidden="true"></span>
        <span>${stone.label}</span>
      </button>`).join('')}</div>
    <div class="stone-order" id="stone-order" aria-label="Your stone order">${stoneOrder.length ? stoneOrder.map((stone) => `<span class="starter">${stone}</span>`).join('') : 'Tap or drag stones into order'}</div>`;
}

function showBuilderHtml(act) {
  return `<div class="show-builder">${act.showChoices.map((choiceSet) => `
    <div class="show-choice-set">
      <div class="show-choice-label">${choiceSet.prompt}</div>
      <div class="show-options">${choiceSet.options.map((option) => `
        <button class="show-option ${showChoices[choiceSet.key]?.id === option.id ? 'selected' : ''}" data-show-key="${choiceSet.key}" data-show-id="${option.id}" aria-pressed="${showChoices[choiceSet.key]?.id === option.id}">
          <span aria-hidden="true">${option.icon}</span><br>${showChoices[choiceSet.key]?.id === option.id ? '<span class="selected-mark">✓</span> ' : ''}${option.label}
        </button>`).join('')}</div>
    </div>`).join('')}
    <div class="show-choice-label">Sentence starters</div>
    <div class="starter-list">${act.sentenceStarters.map((starter) => `<span class="starter">${starter}</span>`).join('')}</div>
  </div>`;
}

function feedbackHtml() {
  if (!feedback) return '';
  const tone = feedback.tone || '';
  const className = feedback.worldChange === 'full-consequence' || tone === 'celebrate-and-extend'
    ? 'celebrate'
    : feedback.worldChange === 'small-spark' || tone === 'try-again'
      ? 'partial'
      : feedback.fallbackUsed || tone === 'honest-fallback' ? 'fallback' : 'retry';
  return `<div class="feedback ${className}" role="status">
    <h3>${escapeHtml(feedback.headline)}</h3>
    <p>${escapeHtml(feedback.detail)}</p>
    ${feedback.modelPhrase ? `<p class="model-again">Try: ${escapeHtml(feedback.modelPhrase)}</p>` : ''}
    ${feedback.nextPrompt ? `<p class="model-again next-prompt">Next: ${escapeHtml(feedback.nextPrompt)}</p>` : ''}
  </div>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function actHtml() {
  const act = getAct(currentActId);
  const modelPhrase = modelPhraseFor(act, { option: selectedChoice, stones: stoneOrder, show: showChoices });
  const stage = `<img class="stage-art" src="${act.scene}" alt="${act.name} scene" />
    <img class="stage-char" src="assets/characters/${act.characterId}.svg" alt="${act.characterName}" />
    <div class="stage-caption"><h2>${act.name}</h2><p>${act.need}</p></div>`;
  const interaction = act.options ? choicesHtml(act) : act.id === 'act4' ? stonesHtml(act) : act.id === 'act5' ? showBuilderHtml(act) : '';
  const canListen = act.id !== 'act4' || stoneOrder.length >= 2;
  const canFallback = canListen;
  const side = `<h2 class="act-heading">${act.characterName} needs your voice</h2>
    <div class="instruction">${act.voiceNeed}</div>
    ${interaction}
    <div class="phrase-card"><div class="phrase-label">Say this</div><p class="phrase">${modelPhrase}</p></div>
    ${feedbackHtml()}
    ${isListening ? `<div class="listen-meter" aria-hidden="true"><span style="width:${Math.min(100, Math.round(audioLevel * 160))}%"></span><p class="live-transcript">${liveTranscript ? `I hear: ${liveTranscript}` : ''}</p></div>` : ''}
    <div class="controls">
      <button id="hear-model" class="secondary-button">🔊 Hear it</button>
      <button id="listen-button" class="primary-button listen-button" ${!canListen || isListening ? '' : ''} ${canListen ? '' : 'disabled'}>${isListening ? '⏹ Stop and check' : '🎤 Tap to talk'}</button>
      <button id="look-and-choose" class="ghost-button" ${canFallback ? '' : 'disabled'}>Look and choose (not speaking)</button>
    </div>`;
  return frameHtml(stage, side);
}

function consequenceHtml() {
  const act = getAct(currentActId);
  const modeLabel = currentResult?.mode === 'listen_and_choose'
    ? 'Look-and-Choose: no voice used.'
    : 'The app understood your spoken meaning, so the world changes.';
  const caption = consequenceCaption(act, currentResult);
  return `<div class="app-shell">
    <header class="topbar"><div class="brand"><span class="brand-mark"></span>Sound Seed Island</div><div class="privacy-chip">${modeLabel}</div></header>
    <main class="main-frame video-stage-frame"><section class="stage"><div class="video-frame">
      <video id="consequence-video" src="${act.successVideo}" playsinline></video>
      <div class="video-caption">${caption}</div>
      <button class="skip-button" id="skip-consequence">Continue</button>
    </div></section></main>
  </div>`;
}

function consequenceCaption(act, result) {
  if (result?.mode === 'listen_and_choose') {
    if (act.id === 'act2' || act.id === 'act3') return `You chose the ${selectedChoice.label}. The scene changes, and this was clearly a non-speaking turn.`;
    if (act.id === 'act4') return `You chose ${stoneOrder.join(', then ')}. The scene changes, and this was clearly a non-speaking turn.`;
    return 'You built the show by choosing. No speaking was used.';
  }
  if (act.id === 'act1') return 'Your friendly spoken hello and offer to help wake the seed. A green bridge grows!';
  if (act.id === 'act2') return `Mango understands that you asked for the ${selectedChoice.label}. It lands in the basket and the market band wakes.`;
  if (act.id === 'act3') return `Blue understands the ${selectedChoice.label} you described. It joins the lantern and lights the cave.`;
  if (act.id === 'act4') return `Bramble understands first ${stoneOrder[0]}, then ${stoneOrder[1] || stoneOrder[0]}. Flowers lock the stones in that order.`;
  const ideaWords = result?.recognizedKeys?.slice(0, 3).join(', ');
  return ideaWords ? `Melody hears your show about ${ideaWords}. The stage lights dance to your story.` : act.successCaption;
}

function mediaHtml(moment) {
  return `<div class="app-shell">
    <header class="topbar"><div class="brand"><span class="brand-mark"></span>Sound Seed Island</div><div class="privacy-chip">Story moment replay</div></header>
    <main class="main-frame video-stage-frame"><section class="stage"><div class="video-frame">
      <video id="moment-video" src="${moment.video}" playsinline controls></video>
      <div class="video-caption">${moment.caption}</div>
      <button class="skip-button" id="close-moment">Close</button>
    </div></section></main>
  </div>`;
}

function extensionHtml() {
  const act = getAct(currentActId);
  const model = act.extensionModel;
  const stage = `<img class="stage-art" src="${act.scene}" alt="${act.name} after your help" />
    <img class="stage-char" src="assets/characters/${act.characterId}.svg" alt="${act.characterName}" />
    <div class="stage-caption"><h2>One more idea</h2><p>${act.characterName} wants to hear your thinking.</p></div>`;
  const side = `<div class="extension-card">
      <h3>${act.extensionPrompt}</h3>
      <p class="model-again">You can say: ${model}</p>
      ${feedbackHtml()}
      <div class="extension-actions">
        <button id="extension-talk" class="primary-button">${isListening ? '⏹ Stop' : '🎤 Tell your idea'}</button>
        <button id="extension-continue" class="secondary-button">Continue</button>
      </div>
    </div>
    <div class="instruction">This bonus turn celebrates reasoning and expression. It does not block the next adventure.</div>`;
  return frameHtml(stage, side);
}

function freePlayHtml() {
  const summary = participationSummary(progress);
  const stage = `<img class="stage-art" src="assets/scenes/sound-show-scene.svg" alt="A bright sound show stage" />
    <div class="stage-caption"><h2>Your Sound Show Stage</h2><p>Replay your show, visit story moments, and make the friends talk.</p></div>
    <img class="stage-char" src="assets/characters/melody.svg" alt="Melody the ferry whale" />`;
  const side = `<h2 class="act-heading">You are a Sound Friend!</h2>
    <div class="badge-wall">${progress.unlocks.map((unlock) => `<span class="badge">${unlock}</span>`).join('')}</div>
    <div class="summary">
      <dl>
        <dt>Acts completed</dt><dd>${summary.actsCompleted}/5</dd>
        <dt>Speaking turns with words heard</dt><dd>${summary.speakingTurns}</dd>
        <dt>Understood speaking turns</dt><dd>${summary.understoodSpeechTurns}</dd>
        <dt>Extension ideas understood</dt><dd>${summary.understoodExtensionTurns}</dd>
        <dt>Look-and-choose turns</dt><dd>${summary.lookAndChooseTurns}</dd>
      </dl>
      <p>${summary.note}</p>
    </div>
    ${voiceLoop.lastRecordingUrl ? '<audio id="show-recording" controls src="' + voiceLoop.lastRecordingUrl + '"></audio>' : '<div class="instruction">No show recording is stored in this browser session.</div>'}
    <div class="controls">
      <button id="make-another-show" class="primary-button">🎤 Make another show</button>
      <button id="start-over" class="ghost-button">Start the whole journey again</button>
    </div>
    <div class="story-moments">${storyMoments.map((moment, index) => `<button class="story-moment" data-moment-index="${index}">▶ ${moment.label}</button>`).join('')}</div>
    <div class="show-choice-label">Tap a friend</div>
    <div class="play-character">${['pip', 'mango', 'blue', 'bramble', 'melody'].map((id) => `<img data-character-id="${id}" src="assets/characters/${id}.svg" alt="Play with ${id}" />`).join('')}</div>`;
  return frameHtml(stage, side, 'complete-grid');
}

function render() {
  if (phase === 'title') app.innerHTML = titleHtml();
  else if (phase === 'intro') app.innerHTML = introHtml();
  else if (phase === 'act') app.innerHTML = actHtml();
  else if (phase === 'consequence') app.innerHTML = consequenceHtml();
  else if (phase === 'extension') app.innerHTML = extensionHtml();
  else if (phase === 'freeplay') app.innerHTML = freePlayHtml();
  else if (phase === 'media') app.innerHTML = mediaHtml(currentResult);
  bindCurrentView();
}

function bindCurrentView() {
  if (phase === 'title') {
    on('#start-play', 'click', startFreshJourney);
    on('#continue-play', 'click', continueJourney);
    on('#reset-play', 'click', startFreshJourney);
  } else if (phase === 'intro') {
    on('#skip-intro', 'click', () => enterAct('act1'));
    on('#replay-intro', 'click', playRenderedVideo);
    const video = document.querySelector('#intro-video');
    if (video) {
      video.addEventListener('ended', () => enterAct('act1'));
      video.addEventListener('error', () => enterAct('act1'));
    }
  } else if (phase === 'act') {
    bindActView();
  } else if (phase === 'consequence') {
    on('#skip-consequence', 'click', finishConsequence);
    const video = document.querySelector('#consequence-video');
    if (video) {
      video.addEventListener('ended', finishConsequence);
      video.addEventListener('error', finishConsequence);
    }
    playRenderedVideo();
  } else if (phase === 'extension') {
    on('#extension-talk', 'click', handleExtensionTalk);
    on('#extension-continue', 'click', () => enterAct(nextActId(currentActId)));
  } else if (phase === 'freeplay') {
    on('#make-another-show', 'click', () => enterAct('act5'));
    on('#start-over', 'click', startFreshJourney);
    document.querySelectorAll('[data-moment-index]').forEach((button) => {
      button.addEventListener('click', () => {
        currentResult = storyMoments[Number(button.dataset.momentIndex)];
        mediaReturnPhase = 'freeplay';
        phase = 'media';
        render();
      });
    });
    document.querySelectorAll('[data-character-id]').forEach((image) => {
      image.addEventListener('click', () => {
        const id = image.dataset.characterId;
        const lines = {
          pip: 'Hello, Sound Friend! Your voice made the seed grow.',
          mango: 'The market drums love your polite request.',
          blue: 'Your color words found the firefly.',
          bramble: 'First, then, now! The bridge is strong.',
          melody: 'Your show can be long, short, silly, or new. Try again!'
        };
        speak(lines[id], { rate: 0.88 });
      });
    });
  } else if (phase === 'media') {
    on('#close-moment', 'click', () => {
      phase = mediaReturnPhase;
      render();
    });
    playRenderedVideo();
  }
}

function bindActView() {
  const act = getAct(currentActId);
  on('#hear-model', 'click', () => {
    const phrase = modelPhraseFor(act, { option: selectedChoice, stones: stoneOrder, show: showChoices });
    speak(`Listen slowly. ${phrase}`, { rate: 0.7 });
    speak(`Now naturally. ${phrase}`, { queue: true, rate: 0.95 });
  });
  on('#listen-button', 'click', handleListen);
  on('#look-and-choose', 'click', handleLookAndChoose);

  document.querySelectorAll('[data-choice-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedChoice = act.options.find((option) => option.id === button.dataset.choiceId);
      progress.preferences[`${act.id}_choice`] = selectedChoice.id;
      saveProgress(progress);
      render();
      speak(`You chose the ${selectedChoice.label}.`, { rate: .88 });
    });
  });

  document.querySelectorAll('[data-stone-id]').forEach((button) => {
    button.addEventListener('click', () => addStone(button.dataset.stoneId));
    button.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', button.dataset.stoneId);
    });
  });
  const stoneOrderElement = document.querySelector('#stone-order');
  if (stoneOrderElement) {
    stoneOrderElement.addEventListener('dragover', (event) => event.preventDefault());
    stoneOrderElement.addEventListener('drop', (event) => {
      event.preventDefault();
      addStone(event.dataTransfer.getData('text/plain'));
    });
  }

  document.querySelectorAll('[data-show-key]').forEach((button) => {
    button.addEventListener('click', () => {
      const choiceSet = act.showChoices.find((candidate) => candidate.key === button.dataset.showKey);
      showChoices[choiceSet.key] = choiceSet.options.find((option) => option.id === button.dataset.showId);
      progress.preferences.show = showChoices;
      saveProgress(progress);
      render();
      speak(`You chose the ${showChoices[choiceSet.key].label}.`, { rate: .9 });
    });
  });
}

function addStone(stoneId) {
  if (!stoneId || stoneOrder.includes(stoneId) || stoneOrder.length >= 3) return;
  stoneOrder.push(stoneId);
  render();
  speak(`${stoneId} stone. ${stoneOrder.length === 3 ? 'Now explain your order.' : 'Choose the next stone.'}`, { rate: .84 });
}

function selectedVoiceOption() {
  const act = getAct(currentActId);
  if (act.id === 'act2' || act.id === 'act3') return selectedChoice?.id || act.options[0].id;
  if (act.id === 'act4') return stoneOrder;
  return null;
}

function selectedProgressOption() {
  const act = getAct(currentActId);
  if (act.id === 'act2' || act.id === 'act3') return selectedChoice || act.options[0];
  if (act.id === 'act4') return stoneOrder;
  if (act.id === 'act5') return { id: 'custom_show', choices: showChoices };
  return { id: 'hello_help' };
}

function modelDialogPayload(act, result, turnType) {
  return {
    turnType,
    act: {
      id: act.id,
      name: act.name,
      need: act.need,
      voiceNeed: act.voiceNeed
    },
    transcript: result.transcript || '',
    localInterpretation: {
      state: result.state,
      intent: result.intent,
      understoodOption: result.understoodOption,
      understoodSequence: result.understoodSequence
    },
    localFeedback: result.feedback,
    selectedOption: selectedVoiceOption(),
    showChoices: act.id === 'act5'
      ? Object.fromEntries(Object.entries(showChoices).map(([key, option]) => [key, option?.id]))
      : null,
    history: dialogHistory.slice(-8)
  };
}

async function enhanceWithModel(act, result, turnType) {
  if (!result.transcript || !result.transcript.trim()) return result;
  const modelResult = await interpretWithModel(modelDialogPayload(act, result, turnType));
  if (!modelResult) {
    return {
      ...result,
      modelProvider: 'local-domain-rules',
      feedback: {
        ...result.feedback,
        detail: `${result.feedback.detail} (Local understanding is active.)`
      }
    };
  }
  const genericResponse = /say that again|your friend is listening/i.test(
    `${modelResult.response.headline} ${modelResult.response.detail}`
  );
  if (modelResult.state !== 'heard_no_match' && !genericResponse) {
    dialogHistory.push(
      { role: 'child', text: result.transcript },
      { role: 'character', state: modelResult.state, detail: modelResult.response.detail }
    );
    dialogHistory = dialogHistory.slice(-4);
  }
  return {
    ...result,
    state: modelResult.state,
    intent: modelResult.intent,
    understoodOption: modelResult.understoodOption,
    understoodSequence: modelResult.understoodSequence,
    feedback: modelResult.response,
    modelProvider: modelResult.source === 'local-fallback' ? 'hybrid-local-fallback' : modelResult.modelProvider,
    modelId: modelResult.source === 'local-fallback' ? null : modelResult.modelId,
    modelEnhanced: modelResult.source !== 'local-fallback'
  };
}

function applyUnderstanding(result, act) {
  if ((act.id === 'act2' || act.id === 'act3') && result.understoodOption) {
    selectedChoice = act.options.find((option) => option.id === result.understoodOption) || selectedChoice;
  }
  if (act.id === 'act4' && result.understoodSequence) {
    stoneOrder = [...result.understoodSequence];
  }
}

async function handleListen() {
  if (isListening) {
    voiceLoop.stopListening();
    return;
  }
  const act = getAct(currentActId);
  isListening = true;
  liveTranscript = '';
  audioLevel = 0;
  feedback = null;
  render();
  speak(`${act.characterName} is listening.`, { rate: .95 });
  try {
    if (!microphoneRequested) {
      await voiceLoop.requestMicrophonePermission();
      microphoneRequested = true;
    }
    const result = await voiceLoop.startListening({
      actId: act.id,
      selectedOption: selectedVoiceOption(),
      speechWindowMs: act.speechWindowMs,
      keepRecording: act.id === 'act5'
    });
    await handleVoiceResult(result, act);
  } catch (error) {
    feedback = {
      headline: 'The microphone stopped',
      detail: 'You can try again or use Look-and-Choose.',
      modelPhrase: modelPhraseFor(act, { option: selectedChoice, stones: stoneOrder, show: showChoices })
    };
  } finally {
    isListening = false;
    render();
  }
}

async function handleVoiceResult(result, act) {
  result = await enhanceWithModel(act, result, 'main');
  currentResult = result;
  applyUnderstanding(result, act);
  recordAttempt(progress, act.id, result, selectedProgressOption());
  feedback = result.feedback;
  saveProgress(progress);

  if (result.state === VOICE_RESPONSE_STATES.SEMANTIC_SUCCESS) {
    finishAct(act, result);
  } else if (result.state === VOICE_RESPONSE_STATES.PARTIAL_SUCCESS) {
    feedback = { ...feedback, detail: `${feedback.detail} I heard ${result.recognizedKeys.join(' and ') || 'your voice'}!` };
  } else if (result.state === VOICE_RESPONSE_STATES.UNSUPPORTED_OR_DENIED) {
    feedback = { ...feedback, detail: `${feedback.detail} Look-and-Choose is ready and will be labeled as a non-speaking turn.` };
  } else if (result.state === VOICE_RESPONSE_STATES.UNDERSTOOD_REFUSAL || result.state === VOICE_RESPONSE_STATES.SEQUENCE_MISMATCH) {
    feedback = result.feedback;
  } else if (result.state === VOICE_RESPONSE_STATES.UNDERSTOOD_ALTERNATIVE || result.state === VOICE_RESPONSE_STATES.CLARIFICATION_NEEDED) {
    feedback = result.feedback;
  }
}

function handleLookAndChoose() {
  const act = getAct(currentActId);
  const selectedOption = selectedVoiceOption();
  const result = createListenAndChooseResult(act.id, selectedOption);
  recordAttempt(progress, act.id, result, selectedProgressOption());
  feedback = {
    ...result.feedback,
    detail: `${result.feedback.detail} This turn used Look-and-Choose, so it is not counted as speech recognition.`
  };
  finishAct(act, result);
}

function finishAct(act, result) {
  if (act.id === 'act5') progress.preferences.show = showChoices;
  completeAct(progress, act.id, selectedProgressOption());
  progress.capabilities.speechRecognitionSupported = voiceLoop.recognitionSupported;
  progress.capabilities.microphonePermission = voiceLoop.microphonePermission;
  saveProgress(progress);
  currentResult = result;
  feedback = result.feedback;
  phase = 'consequence';
  render();
}

function playRenderedVideo() {
  const video = document.querySelector('video');
  if (!video) return;
  video.play().catch(() => {
    video.controls = true;
  });
}

function finishConsequence() {
  stopSpeaking();
  const act = getAct(currentActId);
  if (act && (act.id === 'act2' || act.id === 'act4')) {
    feedback = null;
    isListening = false;
    phase = 'extension';
    render();
    speak(act.extensionPrompt, { rate: .85 });
    return;
  }
  if (act && act.id === 'act5') {
    phase = 'freeplay';
    render();
    speak('Your Sound Show is ready! You are a Sound Friend.');
    return;
  }
  const next = nextActId(currentActId);
  if (next) enterAct(next);
  else {
    phase = 'freeplay';
    render();
  }
}

async function handleExtensionTalk() {
  const act = getAct(currentActId);
  if (isListening) {
    voiceLoop.stopListening();
    return;
  }
  isListening = true;
  feedback = null;
  render();
  try {
    const result = await voiceLoop.startListening({
      actId: act.id,
      selectedOption: selectedVoiceOption(),
      speechWindowMs: 8000
    });
    const extension = classifyExtensionTranscript(act.id, result.transcript || '');
    let extensionResult = {
      ...result,
      ...extension,
      mode: 'extension',
      feedback: buildExtensionFeedback(act.id, extension)
    };
    extensionResult = await enhanceWithModel(act, extensionResult, 'extension');
    extensionResult.mode = 'extension';
    extensionResult.recognitionProvider = result.recognitionProvider;
    extensionResult.microphoneUsed = result.microphoneUsed;
    recordAttempt(progress, act.id, extensionResult, selectedProgressOption());
    feedback = extensionResult.feedback;
  } catch {
    feedback = {
      headline: 'The bonus turn stopped',
      detail: 'You can continue the story now.',
      modelPhrase: act.extensionModel
    };
  } finally {
    isListening = false;
    saveProgress(progress);
    render();
  }
}

window.addEventListener('beforeunload', () => {
  voiceLoop.releaseSessionRecording();
});

if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

render();
