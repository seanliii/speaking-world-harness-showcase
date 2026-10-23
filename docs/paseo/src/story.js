export const story = [
  {
    id: 'farm',
    title: 'Farm Gate',
    objective: 'Ask Pig to open the gate.',
    missionText: 'Pip needs to enter the farm. Say hello and ask Pig for help.',
    model: 'Hello, Pig! Please open the gate.',
    hints: ['Hello, Pig!', 'Please open the gate.', 'Can you help me?'],
    badge: { id: 'courage', label: 'Courage' },
    match: {
      required: [['hello', 'hi'], ['open', 'gate', 'help']],
      optional: ['please']
    },
    success: "Yes! The gate is open. Cub's footprints go to the pond.",
    tryAgain: 'I hear you! Say: Please open the gate.',
    animation: 'gate-open',
    hotspots: [
      { id: 'cat', say: 'The cat is sleepy.', label: 'cat' },
      { id: 'hen', say: 'The hen says cluck!', label: 'hen' },
      { id: 'apple', say: 'I like red apples.', label: 'apple' }
    ]
  },
  {
    id: 'pond',
    title: 'Sunny Pond',
    objective: 'Ask Duck where Cub went.',
    missionText: 'Duck knows the way. Ask a question, then say thank you.',
    model: 'Where is Cub, Duck? Thank you!',
    hints: ['Where is Cub?', 'What do you see?', 'Thank you, Duck.'],
    badge: { id: 'listening', label: 'Listening' },
    match: {
      required: [['where', 'what'], ['cub', 'duck', 'see', 'thank']],
      optional: ['thank']
    },
    success: 'You are welcome! Cub went to the birthday den.',
    tryAgain: 'Quack! Ask: Where is Cub?',
    animation: 'duck-answer',
    hotspots: [
      { id: 'fish', say: 'The fish is swimming.', label: 'fish' },
      { id: 'lily', say: 'The lily pad is green.', label: 'lily pad' },
      { id: 'reeds', say: 'The reeds are tall.', label: 'reeds' }
    ]
  },
  {
    id: 'den',
    title: 'Birthday Den',
    objective: 'Comfort Cub and describe a gift.',
    missionText: 'Cub is shy. Say something kind and tell him about your gift.',
    model: 'Happy birthday, Cub! I have a blue balloon for you.',
    hints: ['Happy birthday!', 'I have a balloon.', 'You are my friend.'],
    badge: { id: 'kindness', label: 'Kindness' },
    match: {
      required: [['happy', 'birthday'], ['balloon', 'gift', 'present', 'friend', 'like', 'you']],
      optional: ['blue', 'red', 'cake', 'friend', 'kind']
    },
    success: 'Thank you! Now my birthday feels happy.',
    tryAgain: 'I feel shy. Say: Happy birthday, Cub!',
    animation: 'cub-happy',
    hotspots: [
      { id: 'balloon', say: 'The balloon is floating.', label: 'balloon' },
      { id: 'cake', say: 'The cake is sweet.', label: 'cake' },
      { id: 'lantern', say: 'The lantern is bright.', label: 'lantern' }
    ]
  }
];
