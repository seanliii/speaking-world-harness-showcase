export const STORY = Object.freeze({
  title: 'Sound Seed Island',
  premise: 'The island lost its friendly sounds. Your voice can grow seeds, wake music, light caves, and build a stage.',
  acts: [
    Object.freeze({
      id: 'act1',
      name: 'Wake the Harbor Seed',
      characterId: 'pip',
      characterName: 'Pip',
      scene: 'assets/scenes/harbor-scene.svg',
      need: 'The Sound Seed is asleep. The little bridge cannot grow.',
      voiceNeed: 'Pip needs a friendly hello. Say: Hello! I can help you.',
      modelPhrase: 'Hello! I can help you.',
      successVideo: 'assets/video/harbor-seed-bloom.mp4',
      successCaption: 'Your voice wakes the seed. A green bridge grows!',
      unlock: 'Market Path',
      speechWindowMs: 8000
    }),
    Object.freeze({
      id: 'act2',
      name: "Mango's Snack Request",
      characterId: 'mango',
      characterName: 'Mango',
      scene: 'assets/scenes/market-scene.svg',
      need: 'Mango needs one snack to power the sleeping market band.',
      voiceNeed: 'Choose a snack, then ask for it. Say: I want the red apple, please.',
      options: Object.freeze([
        Object.freeze({ id: 'red_apple', label: 'red apple', phrase: 'I want the red apple, please.', className: 'apple' }),
        Object.freeze({ id: 'yellow_banana', label: 'yellow banana', phrase: 'I want the yellow banana, please.', className: 'banana' }),
        Object.freeze({ id: 'blue_berry', label: 'blue berry', phrase: 'I want the blue berry, please.', className: 'berry' })
      ]),
      successVideo: 'assets/video/market-band-wakes.mp4',
      successCaption: 'The snack lands in the basket. Market lights and drums wake up!',
      unlock: 'Drum Key',
      extensionPrompt: 'Why did you choose that snack?',
      extensionModel: 'I chose it because it is sweet.',
      speechWindowMs: 10000
    }),
    Object.freeze({
      id: 'act3',
      name: "Blue's Firefly Description",
      characterId: 'blue',
      characterName: 'Blue',
      scene: 'assets/scenes/cave-scene.svg',
      need: 'Blue cannot find the lost firefly without color and size words.',
      voiceNeed: 'Choose a firefly and describe it. Say: I see a small blue firefly.',
      options: Object.freeze([
        Object.freeze({ id: 'small_blue', label: 'small blue firefly', phrase: 'I see a small blue firefly.', className: 'firefly-blue' }),
        Object.freeze({ id: 'big_yellow', label: 'big yellow firefly', phrase: 'I see a big yellow firefly.', className: 'firefly-yellow' }),
        Object.freeze({ id: 'small_pink', label: 'small pink firefly', phrase: 'I see a small pink firefly.', className: 'firefly-pink' })
      ]),
      successVideo: 'assets/video/firefly-lantern.mp4',
      successCaption: 'The firefly joins the lantern and lights the cave path.',
      unlock: 'Lantern Charm',
      speechWindowMs: 10000
    }),
    Object.freeze({
      id: 'act4',
      name: "Bramble's Bridge Sequence",
      characterId: 'bramble',
      characterName: 'Bramble',
      scene: 'assets/scenes/bridge-scene.svg',
      need: 'Storm stones must be put back in order before the bridge is safe.',
      voiceNeed: 'Put the stones in order, then explain it. Say: First, I put the red stone. Then, I put the blue stone. Now, the bridge is strong.',
      stones: Object.freeze([
        Object.freeze({ id: 'red', label: 'red stone', className: 'stone-red' }),
        Object.freeze({ id: 'blue', label: 'blue stone', className: 'stone-blue' }),
        Object.freeze({ id: 'yellow', label: 'yellow stone', className: 'stone-yellow' })
      ]),
      successVideo: 'assets/video/bridge-flowers-lock.mp4',
      successCaption: 'Flowers lock the stones. The bridge becomes strong enough to cross.',
      unlock: 'Stage Bridge',
      extensionPrompt: 'What happens next on the strong bridge?',
      extensionModel: 'Next, we can walk across to the sound show.',
      speechWindowMs: 12000
    }),
    Object.freeze({
      id: 'act5',
      name: "Melody's Sound Show",
      characterId: 'melody',
      characterName: 'Melody',
      scene: 'assets/scenes/sound-show-scene.svg',
      need: 'Melody needs a brand-new Sound Show before the ferry can leave.',
      voiceNeed: 'Build your show, then tell it. Say two, three, or four sentences.',
      showChoices: Object.freeze([
        Object.freeze({
          key: 'backdrop',
          prompt: 'Choose a place',
          options: Object.freeze([
            Object.freeze({ id: 'star_sky', label: 'star sky', icon: '✦' }),
            Object.freeze({ id: 'rainbow_bay', label: 'rainbow bay', icon: '◠' }),
            Object.freeze({ id: 'flower_hill', label: 'flower hill', icon: '❀' })
          ])
        }),
        Object.freeze({
          key: 'prop',
          prompt: 'Choose a sound prop',
          options: Object.freeze([
            Object.freeze({ id: 'drum', label: 'big drum', icon: '咚' }),
            Object.freeze({ id: 'lantern', label: 'glow lantern', icon: '☀' }),
            Object.freeze({ id: 'shell', label: 'song shell', icon: 'ᨏ' })
          ])
        }),
        Object.freeze({
          key: 'partner',
          prompt: 'Choose a friend',
          options: Object.freeze([
            Object.freeze({ id: 'pip', label: 'Pip', icon: 'fox' }),
            Object.freeze({ id: 'mango', label: 'Mango', icon: 'bird' }),
            Object.freeze({ id: 'melody', label: 'Melody', icon: 'whale' })
          ])
        })
      ]),
      sentenceStarters: Object.freeze(['My show is about...', 'First, ...', 'Then, ...', 'My friend...', 'The end!']),
      successVideo: 'assets/video/sound-show-celebration.mp4',
      successCaption: 'The stage lights dance. You are a Sound Friend!',
      unlock: 'Sound Friend Badge',
      speechWindowMs: 20000
    })
  ]
});

export const ACT_IDS = Object.freeze(STORY.acts.map((act) => act.id));

export function getAct(actId) {
  return STORY.acts.find((act) => act.id === actId) || null;
}

export function nextActId(actId) {
  const index = ACT_IDS.indexOf(actId);
  return index >= 0 && index < ACT_IDS.length - 1 ? ACT_IDS[index + 1] : null;
}

export function modelPhraseFor(act, choices = {}) {
  if (act.id === 'act2' || act.id === 'act3') {
    return choices.option ? choices.option.phrase : act.options[0].phrase;
  }
  if (act.id === 'act4') {
    const stones = choices.stones && choices.stones.length ? choices.stones : ['red', 'blue', 'yellow'];
    const first = stones[0];
    const then = stones[1] || stones[0];
    return `First, I put the ${first} stone. Then, I put the ${then} stone. Now, the bridge is strong.`;
  }
  if (act.id === 'act5') {
    const place = choices.show?.backdrop?.label || 'star sky';
    const prop = choices.show?.prop?.label || 'big drum';
    const partner = choices.show?.partner?.label || 'Pip';
    return `My show is about ${place}. First, I play the ${prop}. Then, my friend ${partner} sings. The end!`;
  }
  return act.modelPhrase;
}
