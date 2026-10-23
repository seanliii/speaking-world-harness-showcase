const escapeHTML = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const speakText = (text) => {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.pitch = 1.15;
  window.speechSynthesis.speak(utterance);
};

const foxSVG = (className = '') => `
  <g class="fox-body ${className}">
    <g class="fox-breath">
      <path class="fox-tail" d="M47 91c38-18 56 4 59 22 3 20-17 32-38 27-15-4-24-13-29-24z" />
      <ellipse class="fox-shadow" cx="34" cy="116" rx="42" ry="9" />
      <path class="fox-ear fox-ear-left" d="M16 17 9 43l24-13z" />
      <path class="fox-ear fox-ear-right" d="M56 16l9 28-25-13z" />
      <path class="fox-head" d="M13 20c8-8 39-8 48 0 8 8 8 35 0 44-9 10-39 10-48 0-8-9-8-36 0-44z" />
      <path class="fox-face" d="M18 43c5 10 13 16 19 16s14-6 19-16c-6-5-13-7-19-7s-13 2-19 7z" />
      <ellipse class="fox-eye" cx="24" cy="37" rx="3.4" ry="4.4" />
      <ellipse class="fox-eye" cx="54" cy="37" rx="3.4" ry="4.4" />
      <ellipse class="fox-nose" cx="39" cy="51" rx="4.5" ry="3.5" />
      <path class="fox-body-main" d="M14 63c7 5 16 8 25 8s18-3 25-8c8 9 12 22 12 33 0 15-16 22-37 22s-37-7-37-22c0-11 4-24 12-33z" />
      <path class="fox-chest" d="M27 69c4 5 8 7 12 7s8-2 12-7c5 8 8 18 8 26 0 11-9 17-20 17s-20-6-20-17c0-8 3-18 8-26z" />
      <path class="fox-leg fox-leg-left" d="M24 112c-2 6-2 10 0 12 3 2 7 0 7-4z" />
      <path class="fox-leg fox-leg-right" d="M54 112c2 6 2 10 0 12-3 2-7 0-7-4z" />
    </g>
  </g>
`;

const hotspotArt = {
  cat: `
    <g class="cat">
      <ellipse class="cat-body" cx="0" cy="8" rx="29" ry="17" />
      <circle class="cat-head" cx="-25" cy="-4" r="15" />
      <path class="cat-ear" d="M-37-14l-4-11 11 5z" />
      <path class="cat-ear" d="M-15-14l5-11 5 10z" />
      <circle class="cat-eye" cx="-30" cy="-5" r="2" />
      <circle class="cat-eye" cx="-20" cy="-5" r="2" />
      <path class="cat-tail" d="M27 6c14 2 18-11 10-18" />
    </g>`,
  hen: `
    <g class="hen">
      <ellipse class="hen-body" cx="0" cy="5" rx="23" ry="18" />
      <circle class="hen-head" cx="-20" cy="-14" r="12" />
      <path class="hen-beak" d="M-32-14l-10 4 10 5z" />
      <path class="hen-comb" d="M-27-27c2-7 9-7 10-1z" />
      <circle class="hen-eye" cx="-24" cy="-15" r="2" />
      <path class="hen-wing" d="M-7 2c12-5 21 0 23 7-8 7-19 6-23-7z" />
      <path class="hen-leg" d="M-7 22v8M7 22v8" />
    </g>`,
  apple: `
    <g class="apple">
      <path class="apple-stem" d="M0-19c1-7 7-10 12-10" />
      <path class="apple-leaf" d="M3-26c10-4 17 1 17 8-9 3-16-1-17-8z" />
      <circle class="apple-fruit" cx="0" cy="0" r="19" />
      <path class="apple-shine" d="M-8-8c-3 3-3 8-1 11" />
    </g>`,
  fish: `
    <g class="fish">
      <ellipse class="fish-body" cx="0" cy="0" rx="27" ry="15" />
      <path class="fish-tail" d="M24 0l18-12v24z" />
      <circle class="fish-eye" cx="-14" cy="-3" r="2.5" />
      <path class="fish-fin" d="M-5-13c7-6 14-4 17 1" />
    </g>`,
  lily: `
    <g class="lily">
      <ellipse class="lily-pad" cx="0" cy="0" rx="31" ry="18" />
      <path class="lily-flower" d="M-3-22c5-9 14-9 16 0-5 8-13 8-16 0z" />
    </g>`,
  reeds: `
    <g class="reeds">
      <path class="reed" d="M-18 31C-20 5-18-17-12-32" />
      <path class="reed" d="M0 31C1 6-1-14-4-28" />
      <path class="reed" d="M18 31C21 7 19-11 12-24" />
      <ellipse class="reed-head" cx="-12" cy="-34" rx="5" ry="10" />
      <ellipse class="reed-head" cx="-4" cy="-30" rx="5" ry="10" />
      <ellipse class="reed-head" cx="12" cy="-26" rx="5" ry="10" />
    </g>`,
  balloon: `
    <g class="balloon">
      <path class="balloon-string" d="M0 25c8 12-8 20 2 34" />
      <ellipse class="balloon-body" cx="0" cy="0" rx="24" ry="29" />
      <path class="balloon-knot" d="M-5 27l5 7 5-7z" />
      <path class="balloon-shine" d="M-10-12c-4 5-4 12-2 16" />
    </g>`,
  cake: `
    <g class="cake">
      <rect class="cake-plate" x="-27" y="23" width="54" height="6" rx="3" />
      <rect class="cake-base" x="-22" y="-1" width="44" height="24" rx="6" />
      <rect class="cake-top" x="-26" y="-11" width="52" height="13" rx="6" />
      <path class="cake-candle" d="M-4-23h8v13h-8z" />
      <ellipse class="cake-flame" cx="0" cy="-28" rx="4" ry="6" />
    </g>`,
  lantern: `
    <g class="lantern">
      <path class="lantern-top" d="M-12-28h24l-4 8h-16z" />
      <rect class="lantern-glass" x="-16" y="-20" width="32" height="42" rx="10" />
      <path class="lantern-flame" d="M0 8c8-8 5-18-1-24-6 6-7 17 1 24z" />
      <path class="lantern-base" d="M-13 22h26l-3 8h-20z" />
    </g>`
};

const hotspotPositions = {
  cat: [626, 259],
  hen: [719, 394],
  apple: [674, 139],
  fish: [289, 430],
  lily: [526, 437],
  reeds: [687, 358],
  balloon: [654, 146],
  cake: [289, 443],
  lantern: [421, 128]
};

const renderHotspot = ({ id, label, say }) => {
  const [x, y] = hotspotPositions[id] ?? [400, 260];
  const art = hotspotArt[id] ?? '';
  return `
    <g class="hotspot" data-hotspot-id="${escapeHTML(id)}" data-say="${escapeHTML(say)}" tabindex="0" role="button" aria-label="${escapeHTML(label)}" transform="translate(${x}, ${y})">
      <circle class="hotspot-ring" cx="0" cy="0" r="50" />
      ${art}
      <text class="hotspot-label" x="0" y="63" text-anchor="middle">${escapeHTML(label)}</text>
    </g>
  `;
};

const farmScene = (stage) => `
  <svg class="scene-svg scene-farm" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="scene-title scene-description">
    <title id="scene-title">Farm Gate</title>
    <desc id="scene-description">Pip asks Pig to open the gate to the sunny farm.</desc>
    <defs>
      <linearGradient id="farm-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a7e0ff" />
        <stop offset="1" stop-color="#dff5ff" />
      </linearGradient>
    </defs>
    <rect class="scene-sky" fill="url(#farm-sky)" width="800" height="520" />
    <circle class="sun" cx="92" cy="72" r="42" />
    <g class="sun-rays" transform="translate(92,72)">
      <path d="M0-56v-14M40-40l10-10M56 0h14M40 40l10 10M0 56v14M-40 40l-10 10M-56 0h-14M-40-40l-10-10" />
    </g>
    <g class="cloud cloud-a"><ellipse cx="0" cy="0" rx="43" ry="18" /><ellipse cx="30" cy="6" rx="30" ry="14" /></g>
    <g class="cloud cloud-b"><ellipse cx="0" cy="0" rx="34" ry="14" /><ellipse cx="24" cy="5" rx="24" ry="11" /></g>
    <path class="hill hill-back" d="M-20 286c100-88 227-88 320-14 83-65 219-68 301 4z" />
    <path class="hill hill-front" d="M-20 317c127-70 256-60 356 4 100-67 253-63 344 6z" />
    <rect class="ground" x="-20" y="314" width="840" height="230" />
    <g class="tree" transform="translate(120,206)">
      <path class="tree-trunk" d="M-8 120c1-48 2-82 4-100h8c2 18 3 52 4 100z" />
      <circle class="tree-leaf" cx="0" cy="-16" r="52" />
      <circle class="tree-leaf-light" cx="24" cy="5" r="29" />
    </g>
    <g class="barn" transform="translate(577,205)">
      <path class="barn-roof" d="M-77 37L0-24l77 61z" />
      <rect class="barn-wall" x="-65" y="35" width="130" height="95" rx="8" />
      <rect class="barn-door" x="-25" y="61" width="50" height="69" rx="7" />
      <path class="barn-x" d="M-25 61l50 69M25 61l-50 69" />
      <circle class="barn-window" cx="45" cy="51" r="12" />
    </g>
    <g class="hay" transform="translate(626,321)">
      <rect class="hay-bale" x="-33" y="-19" width="66" height="38" rx="13" />
      <path class="hay-line" d="M-23 0h46" />
    </g>
    <g class="fence">
      <rect x="288" y="287" width="12" height="80" rx="5" />
      <rect x="496" y="287" width="12" height="80" rx="5" />
      <rect x="260" y="308" width="80" height="11" rx="5" />
      <rect x="456" y="308" width="80" height="11" rx="5" />
      <rect x="260" y="338" width="80" height="11" rx="5" />
      <rect x="456" y="338" width="80" height="11" rx="5" />
    </g>
    <g class="gate">
      <g class="gate-panel gate-left">
        <rect x="342" y="282" width="46" height="86" rx="8" />
        <path d="M342 299h46M342 352h46" />
      </g>
      <g class="gate-panel gate-right">
        <rect x="410" y="282" width="46" height="86" rx="8" />
        <path d="M410 299h46M410 352h46" />
      </g>
      <circle class="gate-hinge" cx="400" cy="325" r="8" />
    </g>
    <g transform="translate(116,265)"><g class="pip">${foxSVG()}</g></g>
    <g class="pig" transform="translate(576,265)">
      <g class="pig-body">
        <ellipse class="pig-tail" cx="54" cy="66" rx="11" ry="7" />
        <ellipse class="pig-main" cx="18" cy="63" rx="52" ry="33" />
        <circle class="pig-head" cx="-38" cy="47" r="28" />
        <path class="pig-ear" d="M-55 25l-13-12 25-3z" />
        <ellipse class="pig-snout" cx="-58" cy="52" rx="13" ry="10" />
        <circle class="pig-nostril" cx="-62" cy="50" r="2" />
        <circle class="pig-nostril" cx="-54" cy="50" r="2" />
        <circle class="pig-eye" cx="-40" cy="41" r="3" />
        <path class="pig-leg" d="M-11 91v16M17 91v16M41 91v16" />
      </g>
    </g>
    <g class="footprints">
      <path d="M416 413c5-8 12-8 16 0 3 7-3 12-8 12s-11-5-8-12z" />
      <path d="M477 440c5-8 12-8 16 0 3 7-3 12-8 12s-11-5-8-12z" />
      <path d="M556 465c5-8 12-8 16 0 3 7-3 12-8 12s-11-5-8-12z" />
    </g>
    ${stage.hotspots.map(renderHotspot).join('')}
  </svg>
`;

const pondScene = (stage) => `
  <svg class="scene-svg scene-pond" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="scene-title scene-description">
    <title id="scene-title">Sunny Pond</title>
    <desc id="scene-description">Pip asks Duck where Cub went.</desc>
    <defs>
      <linearGradient id="pond-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#97dcff" />
        <stop offset="1" stop-color="#e4f8ff" />
      </linearGradient>
    </defs>
    <rect class="scene-sky" fill="url(#pond-sky)" width="800" height="520" />
    <circle class="sun" cx="693" cy="68" r="40" />
    <g class="sun-rays" transform="translate(693,68)">
      <path d="M0-54v-13M38-38l10-10M54 0h13M38 38l10 10M0 54v13M-38 38l-10 10M-54 0h-13M-38-38l-10-10" />
    </g>
    <g class="cloud cloud-a"><ellipse cx="0" cy="0" rx="40" ry="16" /><ellipse cx="28" cy="5" rx="27" ry="12" /></g>
    <g class="cloud cloud-b"><ellipse cx="0" cy="0" rx="31" ry="13" /><ellipse cx="22" cy="4" rx="22" ry="10" /></g>
    <path class="hill hill-back" d="M-20 258c112-86 232-79 318-12 87-62 214-66 302 5z" />
    <rect class="ground" x="-20" y="272" width="840" height="270" />
    <ellipse class="pond-water" cx="404" cy="395" rx="282" ry="108" />
    <ellipse class="pond-edge" cx="404" cy="395" rx="282" ry="108" />
    <g class="water-wave water-wave-a"><path d="M160 371c32-13 66-13 99 0s68 13 100 0" /></g>
    <g class="water-wave water-wave-b"><path d="M200 424c32-13 66-13 99 0s68 13 100 0" /></g>
    <g class="ripples">
      <circle class="ripple" cx="404" cy="397" r="42" />
      <circle class="ripple" cx="404" cy="397" r="72" />
      <circle class="ripple" cx="404" cy="397" r="102" />
    </g>
    <g class="duck-clue">
      <path class="clue-arrow" d="M492 318l70-51-5 27 32-7-65 57-1-29z" />
      <rect class="clue-sign" x="560" y="167" width="152" height="71" rx="17" />
      <text class="clue-text" x="636" y="195" text-anchor="middle">Cub is at</text>
      <text class="clue-text" x="636" y="220" text-anchor="middle">the den!</text>
    </g>
    <g transform="translate(99,274)"><g class="pip">${foxSVG()}</g></g>
    <g transform="translate(414,337)">
      <g class="duck">
        <g class="duck-body">
          <ellipse class="duck-main" cx="0" cy="26" rx="54" ry="28" />
          <path class="duck-tail" d="M47 13c22-6 35 4 39 17-18 8-34 3-39-17z" />
          <circle class="duck-head" cx="-20" cy="-14" r="27" />
          <path class="duck-bill" d="M-47-14l-26 8 26 11z" />
          <circle class="duck-eye" cx="-28" cy="-19" r="3.5" />
          <path class="duck-wing" d="M-9 18c20-11 42-5 49 7-15 13-40 10-49-7z" />
        </g>
      </g>
    </g>
    ${stage.hotspots.map(renderHotspot).join('')}
  </svg>
`;

const denScene = (stage) => `
  <svg class="scene-svg scene-den" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="scene-title scene-description">
    <title id="scene-title">Birthday Den</title>
    <desc id="scene-description">Pip gives shy Cub a birthday balloon and kind words.</desc>
    <defs>
      <linearGradient id="den-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a7e6ff" />
        <stop offset="1" stop-color="#fff2d8" />
      </linearGradient>
    </defs>
    <rect class="scene-sky" fill="url(#den-sky)" width="800" height="520" />
    <circle class="sun" cx="91" cy="68" r="38" />
    <g class="sun-rays" transform="translate(91,68)">
      <path d="M0-52v-12M37-37l9-9M52 0h12M37 37l9 9M0 52v12M-37 37l-9 9M-52 0h-12M-37-37l-9-9" />
    </g>
    <g class="cloud cloud-a"><ellipse cx="0" cy="0" rx="36" ry="15" /><ellipse cx="25" cy="5" rx="24" ry="11" /></g>
    <g class="cloud cloud-b"><ellipse cx="0" cy="0" rx="28" ry="12" /><ellipse cx="20" cy="4" rx="20" ry="9" /></g>
    <path class="hill hill-back" d="M-20 246c102-83 220-79 303-13 86-63 211-68 297 5z" />
    <rect class="ground" x="-20" y="262" width="840" height="280" />
    <g class="bush bush-a"><circle cx="120" cy="310" r="31" /><circle cx="157" cy="319" r="25" /></g>
    <g class="bush bush-b"><circle cx="678" cy="312" r="35" /><circle cx="716" cy="321" r="27" /></g>
    <g class="bunting" transform="translate(400,91)">
      <path class="bunting-line" d="M-235 13C-150-24 149-24 235 13" />
      <path class="bunting-flag" d="M-190-6l25 6-22 15z" />
      <path class="bunting-flag" d="M-94-17l25 4-21 16z" />
      <path class="bunting-flag" d="M0-21l25 1-20 16z" />
      <path class="bunting-flag" d="M94-17l25-4-4 21z" />
      <path class="bunting-flag" d="M190-6l25-6-3 22z" />
    </g>
    <g class="den-cave" transform="translate(555,278)">
      <path class="cave-back" d="M-103 158c-9-77 33-133 103-133s112 56 103 133z" />
      <path class="cave-mouth" d="M-63 158c-6-52 21-89 63-89s69 37 63 89z" />
    </g>
    <g transform="translate(129,274)"><g class="pip">${foxSVG()}</g></g>
    <g transform="translate(525,289)">
      <g class="cub">
        <g class="cub-body">
          <ellipse class="cub-main" cx="0" cy="44" rx="53" ry="36" />
          <path class="cub-arm cub-arm-left" d="M-42 25c-17 4-24 18-19 31 14 4 25-6 28-19z" />
          <path class="cub-arm cub-arm-right" d="M42 25c17 4 24 18 19 31-14 4-25-6-28-19z" />
          <circle class="cub-head" cx="0" cy="-1" r="38" />
          <circle class="cub-ear" cx="-27" cy="-27" r="12" />
          <circle class="cub-ear" cx="27" cy="-27" r="12" />
          <ellipse class="cub-muzzle" cx="0" cy="12" rx="20" ry="14" />
          <ellipse class="cub-nose" cx="0" cy="6" rx="7" ry="5" />
          <circle class="cub-eye" cx="-14" cy="-8" r="3.5" />
          <circle class="cub-eye" cx="14" cy="-8" r="3.5" />
          <path class="cub-mouth" d="M-8 18c5 6 11 6 16 0" />
          <path class="cub-leg" d="M-27 77v15M27 77v15" />
        </g>
      </g>
    </g>
    <g class="confetti">
      <path class="confetti-piece" d="M171 103l10 21-20-2z" />
      <path class="confetti-piece" d="M311 75l12 19-23 2z" />
      <path class="confetti-piece" d="M487 65l10 21-20-2z" />
      <path class="confetti-piece" d="M642 91l12 19-23 2z" />
    </g>
    ${stage.hotspots.map(renderHotspot).join('')}
  </svg>
`;

const sceneRenderers = {
  farm: farmScene,
  pond: pondScene,
  den: denScene
};

function attachHotspots(container) {
  const caption = container.querySelector('.scene-caption');
  const hotspots = [...container.querySelectorAll('.hotspot')];
  hotspots.forEach((hotspot) => {
    const activate = () => {
      hotspots.forEach((item) => item.classList.remove('is-active'));
      hotspot.classList.add('is-active');
      caption.textContent = hotspot.dataset.say || '';
      speakText(hotspot.dataset.say);
    };
    hotspot.addEventListener('click', (event) => {
      event.preventDefault();
      activate();
    });
    hotspot.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      activate();
    });
  });
}

export function renderScene(container, stage) {
  if (!container || !stage) return;
  const render = sceneRenderers[stage.id];
  if (!render) return;
  container.dataset.stageId = stage.id;
  container.dataset.animation = '';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', stage.title);
  container.className = 'scene';
  container.innerHTML = `
    <div class="scene-caption" role="status" aria-live="polite">Tap a picture to hear its words.</div>
    <div class="scene-frame">${render(stage)}</div>
  `;
  attachHotspots(container);
}

export function createFoxPreview(container) {
  if (!container) return;
  container.className = 'fox-preview';
  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', 'Pip the friendly fox waves hello.');
  container.innerHTML = `
    <svg class="preview-svg" viewBox="0 0 150 150" role="presentation">
      <circle class="preview-glow" cx="75" cy="75" r="68" />
      <g transform="translate(36,24)"><g class="preview-pip">${foxSVG()}</g></g>
    </svg>
  `;
}
