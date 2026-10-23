import { story } from './story.js';
import { createSpeechEngine } from './speech.js';
import { renderScene, createFoxPreview } from './scene-animation.js';

const screens = {
  home: document.querySelector('#home'),
  intro: document.querySelector('#intro'),
  game: document.querySelector('#game'),
  celebrate: document.querySelector('#celebrate')
};
const elements = {
  introVideo: document.querySelector('#intro-video'),
  mission: document.querySelector('#mission'),
  character: document.querySelector('#character'),
  scene: document.querySelector('#scene'),
  speechState: document.querySelector('#speech-state'),
  micButton: document.querySelector('#mic-button'),
  phraseHints: document.querySelector('#phrase-hints'),
  listenModel: document.querySelector('#listen-model'),
  response: document.querySelector('#response'),
  progress: document.querySelector('#progress'),
  badges: document.querySelector('#badges'),
  review: document.querySelector('#review')
};

let stageIndex = 0;
let attempts = 0;
let typedFallbackUsed = false;
let recordings = [];
let answers = [];
const speech = createSpeechEngine();
const badges = new Set();

function show(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo(0, 0);
  if (name === 'game') renderStage();
}

function speak(text, { rate = 0.85 } = {}) {
  return speech.speak(text, rate);
}

function renderStage() {
  const stage = story[stageIndex];
  attempts = 0;
  typedFallbackUsed = false;
  elements.mission.innerHTML = `
    <p class="eyebrow">${stage.title}</p>
    <h2>${stage.objective}</h2>
    <p>${stage.missionText}</p>
  `;
  elements.character.innerHTML = `
    <div class="character-card">
      <div class="speech-bubble">Hi! Can you help Pip?</div>
      <div class="character-name">${stage.title}</div>
    </div>
  `;
  elements.phraseHints.innerHTML = stage.hints.map((hint) => `<button class="hint">${hint}</button>`).join('');
  elements.phraseHints.querySelectorAll('.hint').forEach((button) => {
    button.addEventListener('click', () => speak(button.textContent));
  });
  elements.response.textContent = '';
  elements.speechState.textContent = 'Press the microphone and speak.';
  renderScene(elements.scene, stage);
  updateProgress();
  speak(stage.missionText);
}

function updateProgress() {
  elements.progress.innerHTML = story.map((stage, index) => `
    <span class="step ${index < stageIndex ? 'done' : ''} ${index === stageIndex ? 'current' : ''}"></span>
  `).join('');
  elements.badges.innerHTML = [...badges].map((id) => {
    const badge = story.find((stage) => stage.badge.id === id).badge;
    return `<span class="badge" title="${badge.label}">⭐ ${badge.label}</span>`;
  }).join('');
}

function matchSpeech(text, match) {
  const normalized = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
  return match.required.every((group) => group.some((word) => normalized.includes(word)));
}

async function handleRecording() {
  const stage = story[stageIndex];
  if (!speech.recognitionSupported) {
    elements.speechState.textContent = 'This browser cannot recognize words. You can still record your voice.';
  } else {
    elements.speechState.textContent = 'Listening... speak now!';
  }
  elements.micButton.classList.add('listening');
  const result = await speech.capture(stage.id);
  elements.micButton.classList.remove('listening');
  recordings.push(result);

  if (result.error) {
    attempts += 1;
    elements.speechState.textContent = `Microphone issue: ${result.error} Ask a grown-up to allow the microphone, then try again.`;
    if (!typedFallbackUsed && attempts >= 2) {
      typedFallbackUsed = true;
      renderTypedFallback(stage);
    }
    return;
  }
  if (result.audioUrl) {
    elements.speechState.innerHTML = `Recognized: <strong>${result.transcript || 'not available in this browser'}</strong>`;
  }
  if (!result.transcript) {
    attempts += 1;
    if (!typedFallbackUsed && attempts >= 2) {
      typedFallbackUsed = true;
      renderTypedFallback(stage);
    }
    return;
  }
  evaluate(result.transcript, result.audioUrl);
}

function renderTypedFallback(stage) {
  const form = document.createElement('form');
  form.className = 'typed-fallback';
  form.innerHTML = `
    <label for="typed-speech">Typed fallback (not speech recognition)</label>
    <input id="typed-speech" autocomplete="off" placeholder="${stage.model}" />
    <button class="primary" type="submit">Send</button>
  `;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = event.currentTarget.querySelector('input').value.trim();
    if (text) evaluate(text, recordings.at(-1)?.audioUrl, 'Typed fallback');
  });
  elements.response.replaceChildren(form);
  form.querySelector('input').focus();
}

function evaluate(text, audioUrl, source = 'Speech recognition') {
  const stage = story[stageIndex];
  if (matchSpeech(text, stage.match)) {
    badges.add(stage.badge.id);
    answers.push({
      stageId: stage.id,
      title: stage.title,
      text,
      audioUrl,
      source
    });
    elements.response.innerHTML = `
      <div class="success">
        <strong>${stage.success}</strong>
        ${audioUrl ? `<button class="ghost play-recording" data-url="${audioUrl}">▶ My voice</button>` : ''}
        <button class="primary next-stage">Keep going</button>
      </div>
    `;
    elements.scene.dataset.animation = stage.animation;
    speak(stage.success, { rate: 0.9 });
    updateProgress();
  } else {
    attempts += 1;
    elements.response.innerHTML = `
      <div class="retry">
        <strong>${stage.tryAgain}</strong>
        ${audioUrl ? `<button class="ghost play-recording" data-url="${audioUrl}">▶ My voice</button>` : ''}
      </div>
    `;
    speak(stage.tryAgain, { rate: 0.8 });
    if (!typedFallbackUsed && attempts >= 2) {
      typedFallbackUsed = true;
      renderTypedFallback(stage);
    }
  }
}

function advance() {
  if (stageIndex < story.length - 1) {
    stageIndex += 1;
    renderStage();
  } else {
    renderReview();
    show('celebrate');
    speak('You found Cub! Happy birthday, Cub!');
  }
}

function renderReview() {
  elements.review.innerHTML = `
    <h2>My speaking journey</h2>
    <div class="recordings">
  ${answers.map((answer) => `
        <article class="recording">
          <h3>${answer.title}</h3>
          <p><strong>${answer.source}:</strong> ${answer.text}</p>
          ${answer.audioUrl ? `<audio controls src="${answer.audioUrl}"></audio>` : ''}
        </article>
      `).join('')}
    </div>
  `;
}

document.querySelector('#play-intro').addEventListener('click', async () => {
  elements.introVideo.src = './assets/pip-story.mp4';
  show('intro');
  await elements.introVideo.play();
});
document.querySelector('#skip-intro').addEventListener('click', () => show('game'));
document.querySelector('#start-game').addEventListener('click', () => {
  elements.introVideo.pause();
  show('game');
});
document.querySelector('#home-button').addEventListener('click', () => show('home'));
elements.micButton.addEventListener('click', handleRecording);
elements.listenModel.addEventListener('click', () => speak(story[stageIndex].model, { rate: 0.75 }));
elements.response.addEventListener('click', (event) => {
  if (event.target.classList.contains('next-stage')) advance();
  if (event.target.classList.contains('play-recording')) {
    new Audio(event.target.dataset.url).play();
  }
});
document.querySelector('#play-again').addEventListener('click', () => {
  recordings = [];
  answers = [];
  badges.clear();
  stageIndex = 0;
  show('game');
});

createFoxPreview(document.querySelector('#fox-preview'));
