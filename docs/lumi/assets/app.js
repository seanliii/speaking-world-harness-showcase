
const STORAGE_KEY = "lumi-public-play-v1";
const LEGACY_KEY = "lumi-public-legacy-v1";
const levels = [
  {name:"水果", questions:[
    {word:"apple", chinese:"苹果", answer:"🍎", choices:["🍎","🍌","🍇"], say:"apple"},
    {word:"banana", chinese:"香蕉", answer:"🍌", choices:["🍓","🍌","🍉"], say:"banana"},
    {word:"grapes", chinese:"葡萄", answer:"🍇", choices:["🍊","🍐","🍇"], say:"grapes"}
  ]},
  {name:"动物", questions:[
    {word:"cat", chinese:"小猫", answer:"🐱", choices:["🐱","🐶","🐰"], say:"cat"},
    {word:"dog", chinese:"小狗", answer:"🐶", choices:["🐻","🐶","🦊"], say:"dog"},
    {word:"rabbit", chinese:"兔子", answer:"🐰", choices:["🐰","🐼","🐸"], say:"rabbit"}
  ]},
  {name:"颜色", questions:[
    {word:"red", chinese:"红色", answer:"🔴", choices:["🔴","🔵","🟡"], say:"red"},
    {word:"blue", chinese:"蓝色", answer:"🔵", choices:["🟢","🔵","🟣"], say:"blue"},
    {word:"yellow", chinese:"黄色", answer:"🟡", choices:["🟡","🟠","🟤"], say:"yellow"}
  ]}
];
const DEFAULT_STATE = Object.freeze({progress:[], practiced:0, invited:0, skipped:0, last:null});
let storageAvailable = true;
const state = load();
let view = "start";
let levelIndex = 0;
let questionIndex = 0;
let selected = null;
let phase = "question";

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return normalizeState(saved);
  } catch (error) {}
  return {...DEFAULT_STATE, progress:[]};
}
function normalizeState(saved) {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {...DEFAULT_STATE, progress:[]};
  const progress = Array.isArray(saved.progress) ? saved.progress.slice(0, levels.length).map(value => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? Math.min(parsed, levels[0].questions.length) : 0;
  }) : [];
  while (progress.length < levels.length) progress.push(0);
  const counter = value => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  };
  return {
    progress,
    practiced: counter(saved.practiced),
    invited: counter(saved.invited),
    skipped: counter(saved.skipped),
    last: typeof saved.last === "string" ? saved.last.slice(0, 40) : null
  };
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageAvailable = true; }
  catch (error) { storageAvailable = false; }
}
function legacyExists() {
  try { return Boolean(localStorage.getItem(LEGACY_KEY)); } catch (error) { return false; }
}
function currentLevel() { return levels[levelIndex]; }
function currentQuestion() { return currentLevel().questions[questionIndex]; }
function levelDone(level) { return (state.progress[level] || 0) >= levels[level].questions.length; }
function allDone() { return levels.every((_, index) => levelDone(index)); }
function start() {
  if (allDone()) { view = "done"; render(); return; }
  view = "game";
  levelIndex = levels.findIndex((_, index) => !levelDone(index));
  if (levelIndex < 0) levelIndex = 0;
  questionIndex = state.progress[levelIndex] || 0;
  phase = "question";
  render();
}
function choose(choice) {
  if (phase !== "question") return;
  selected = choice;
  if (choice === currentQuestion().answer) {
    state.progress[levelIndex] = Math.max(state.progress[levelIndex] || 0, questionIndex + 1);
    state.practiced += 1;
    state.last = currentQuestion().word;
    save();
    phase = "invite";
    render();
  }
  render();
}
function continueAfterInvite(spoke) {
  if (phase !== "invite") return;
  if (spoke) state.invited += 1; else state.skipped += 1;
  save();
  selected = null;
  if (questionIndex + 1 < currentLevel().questions.length) {
    questionIndex += 1;
    phase = "question";
  } else if (levelIndex + 1 < levels.length) {
    levelIndex += 1;
    questionIndex = state.progress[levelIndex] || 0;
    phase = "question";
  } else {
    view = "done";
  }
  render();
}
function render() {
  const app = document.getElementById("app");
  if (view === "start") app.innerHTML = renderStart();
  else if (view === "game") app.innerHTML = renderGame();
  else app.innerHTML = renderDone();
  bind();
}
function renderStart() {
  return `
    <section class="hero">
      <div>
        <h1>Lumi Play</h1>
        <p>看图片，选答案，点亮你的英语小地图。</p>
        <div class="badge">🔇 无声版 · 一句话启动军团 Harness 制作</div>
      </div>
      <img src="./assets/owl-teacher.png" alt="Lumi 老师">
    </section>
    <section class="card">
      <div class="section-title"><h2>怎么玩</h2><span class="muted">🤫 无需开口</span></div>
      <p>1. 👀 看中文和图片。<br>2. 👆 点正确的图片。<br>3. 🤫 想说就说，不想说就点跳过。</p>
      <div class="actions"><button class="primary" data-action="start">开始玩</button></div>
      ${legacyExists() ? `<div class="note">已检测到旧版学习记录，本页面不会覆盖它。</div>` : ``}
    </section>
    <details class="card"><summary><h2>家长看板</h2></summary>${renderStatsInner()}</details>
  `;
}
function renderGame() {
  const question = currentQuestion();
  const total = currentLevel().questions.length;
  const progress = Math.round(((state.progress[levelIndex] || 0) / total) * 100);
  return `
    <section class="card">
      <div class="section-title"><h2>${currentLevel().name}</h2><span class="muted">${questionIndex + 1}/${total}</span></div>
      <div class="actions"><button class="secondary small" data-action="home">回首页</button></div>
      <div class="progress"><span style="width:${progress}%"></span></div>
      <h3>${question.chinese}</h3>
      <p><b>${question.word}</b></p>
      <div class="grid">
        ${question.choices.map(choice => `<button class="option ${selected === choice ? (choice === question.answer ? "correct" : "wrong") : ""}" data-choice="${choice}"><span>${choice}</span><b>${choice === question.answer ? question.word : ""}</b></button>`).join("")}
      </div>
      ${phase === "invite" ? `
        <div class="result">答对了！想跟 Lumi 说 <b>${question.say}</b> 吗？</div>
        <div class="actions">
          <button class="secondary" data-action="home">回首页</button>
          <button class="primary" data-invite="yes">我说了</button>
          <button class="skip" data-invite="no">跳过</button>
        </div>
      ` : ``}
    </section>
  `;
}
function renderDone() {
  return `
    <section class="card">
      <h2>你把三个小关卡都点亮了！</h2>
      <p>太棒了！这些都是「练过」，再玩会更熟。「练过」表示点对了，不等于独立掌握；愿意说的记录也只是孩子自报，不能当掌握证据。</p>
      <div class="actions">
        <button class="secondary" data-action="home">回首页</button>
        <button class="primary" data-action="restart">再玩一次</button>
      </div>
    </section>
    <details class="card"><summary><h2>家长看板</h2></summary>${renderStatsInner()}</details>
  `;
}
function renderStatsInner() {
  return `
      <div class="stats">
        <div class="stat"><b>${state.practiced}</b><span>练过</span></div>
        <div class="stat"><b>${state.invited}</b><span>愿意说</span></div>
        <div class="stat"><b>${state.skipped}</b><span>跳过</span></div>
      </div>
      <div class="note">本页只记录操作，不记录语音、不开口也不阻塞。这里的「练过」不能判定独立掌握${storageAvailable ? "" : "；当前存储不可用，本次进度不会保存"}。</div>
  `;
}
function bind() {
  document.querySelector("[data-action=start]")?.addEventListener("click", start);
  document.querySelectorAll("[data-action=home]").forEach(button => button.addEventListener("click", () => {
    view = "start";
    render();
  }));
  document.querySelector("[data-action=restart]")?.addEventListener("click", () => {
    state.progress = [];
    state.practiced = 0; state.invited = 0; state.skipped = 0;
    save(); view = "game"; levelIndex = 0; questionIndex = 0; phase = "question"; render();
  });
  document.querySelectorAll("[data-choice]").forEach(button => button.addEventListener("click", () => choose(button.dataset.choice)));
  document.querySelectorAll("[data-invite]").forEach(button => button.addEventListener("click", () => continueAfterInvite(button.dataset.invite === "yes")));
}
render();
