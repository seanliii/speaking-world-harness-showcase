const SpeakingWorldRules = (function () {
  const missions = [
    {
      id: "package",
      title: "The Right Package",
      speakerName: "Zibo",
      speakerAvatar: "👽",
      scene: "assets/scene-1.mp4",
      line: "Welcome to the Space Post Office! Moon Grandma needs her birthday package. Which one should we take?",
      goal: "Ask for the red package, and be polite.",
      model: "Can I have the red package, please?",
      cues: [
        { emoji: "🔴", label: "red" },
        { emoji: "📦", label: "package" },
        { emoji: "🙏", label: "please" }
      ],
      requirements: [
        { key: "color", pattern: /\b(red|warm red|bright red)\b/i, tip: "Say the color: red." },
        { key: "object", pattern: /\b(package|parcel|present|gift)\b/i, tip: "Say what you need: package, present, parcel, or gift." },
        { key: "polite", pattern: /\b(please|thank you|may i|could i|can i|would you|could you|can you|kindly)\b/i, tip: "Ask kindly, for example: Could you, would you, can I, or please." }
      ],
      success: "Yes! The red package is warm and glowing. I will put it in the rocket for Moon Grandma.",
      successEmoji: "📦",
      successClass: "package",
      refusalResponse: "That is okay. I understand you do not want it now. Moon Grandma’s gift is the red package. You can say, ‘I would like the red package, please,’ or tell me why you would like a different one.",
      successWhy: "You told Zibo the color, the object, and you were polite."
    },
    {
      id: "shopping",
      title: "Star Market Snack",
      speakerName: "Bolt",
      speakerAvatar: "🤖",
      scene: "assets/scene-2.mp4",
      line: "Hello space friend! Moon Grandma is hungry. What should we buy for her snack?",
      goal: "Ask for two star apples, please.",
      model: "Can we have two star apples, please?",
      cues: [
        { emoji: "2️⃣", label: "two" },
        { emoji: "🍎", label: "star apples" },
        { emoji: "🙏", label: "please" }
      ],
      requirements: [
        { key: "number", pattern: /\b(two|2|a pair of)\b/i, tip: "Say how many: two." },
        { key: "item", pattern: /\b(star apples?|apples?)\b/i, tip: "Say the snack: star apples or apples." },
        { key: "polite", pattern: /\b(please|thank you|may we|could we|can we|would you|could you|can you|kindly)\b/i, tip: "Ask kindly, for example: Could we, would you, can we, or please." }
      ],
      success: "Two star apples coming up! They sparkle when Moon Grandma smiles. I will put them beside her gift.",
      successEmoji: "🍎",
      successClass: "apples",
      refusalResponse: "I hear you. We do not have to buy it right now. Moon Grandma is hungry and asked for two star apples. You can try again or tell me another snack you think she might like.",
      successWhy: "You named the number, the snack, and asked kindly."
    },
    {
      id: "navigation",
      title: "Through the Star Fog",
      speakerName: "Professor Hoot",
      speakerAvatar: "🦉",
      scene: "assets/scene-3.mp4",
      line: "The space fog is thick. I see a blue star on the right and a red star on the left. Which way should we fly?",
      goal: "Tell the pilot: turn right at the blue star, please.",
      model: "Please turn right at the blue star.",
      cues: [
        { emoji: "➡️", label: "turn right" },
        { emoji: "⭐", label: "blue star" },
        { emoji: "🙏", label: "please" }
      ],
      requirements: [
        { key: "direction", pattern: /\bright\b/i, tip: "Choose the direction: right." },
        { key: "place", pattern: /\b(blue star|blue light|blue one)\b/i, tip: "Name the place: blue star." },
        { key: "action", pattern: /\b(turn|go|fly|please)\b/i, tip: "Say what to do: turn, go, or fly." }
      ],
      success: "Right at the blue star! The fog is clearing, and I can see Moon Grandma's garden.",
      successEmoji: "🚀",
      successClass: "rocket",
      refusalResponse: "Understood. I will not turn yet. The blue star is on our right. You can say, ‘Please turn right at the blue star,’ or tell me why you want to stop.",
      successWhy: "You gave a clear direction and helped the crew make a safe choice."
    }
  ];

  function normalize(text) {
    return String(text || "").replace(/[’‘]/g, "'").toLowerCase();
  }

  function clauses(said) {
    return said.split(/[.;!?]+|\bbut\b|\bso that\b/).map((part) => part.trim()).filter(Boolean);
  }

  function isMotivationalNegation(clause) {
    return /\b(?:can'?t|cannot|could not|couldn'?t)\s+wait\b/.test(clause);
  }

  function clauseRefusesAction(clause) {
    if (isMotivationalNegation(clause)) return false;
    const directNegation = /\b(?:do not|don'?t|does not|doesn'?t|did not|didn'?t|will not|won'?t|should not|shouldn'?t|must not|mustn'?t|never|refuse|avoid)\b/;
    const notAction = /\bnot\s+(?:take|buy|turn|go|fly|want|need|have|give|get|keep|leave)\b/;
    const keepOrLeaveHere = /\b(?:keep|leave|put|stay)\b.{0,35}\bhere\b/;
    const ratherNot = /\bwould rather not\b/;
    const politeNo = /\bno,?\s+(?:thank you|thanks)\b/;
    return directNegation.test(clause) || notAction.test(clause) || keepOrLeaveHere.test(clause) || ratherNot.test(clause) || politeNo.test(clause);
  }

  function detectsRefusal(said) {
    return clauses(said).some((clause) => clauseRefusesAction(clause));
  }

  function directObjectColor(clause) {
    const beforeReference = clause.split(/\b(?:beside|next to|near|behind|in front of|across from)\b/)[0];
    const match = beforeReference.match(/\b(bright red|warm red|red|blue|green|yellow|purple|orange|pink)\s+(?:package|parcel|present|gift)\b/);
    return match ? match[1] : null;
  }

  function directObjectMentioned(clause) {
    return /\b(?:package|parcel|present|gift)\b/.test(clause.split(/\b(?:beside|next to|near|behind|in front of|across from)\b/)[0]);
  }

  function hasRequestAction(clause) {
    return /\b(?:have|give|pass|hand|take|get|like|want|need|may i|can i|could i|would you|could you|can you)\b/.test(clause);
  }

  function hasPoliteness(clause) {
    return /\b(?:please|thank you|thanks|may i|can i|could i|would you|could you|can you|kindly)\b/.test(clause);
  }

  function isExplanation(said) {
    return /\b(?:because|since|as she|as he|reminds?|loves?|likes?|prefers?|feels?|miss(es)?|home|ocean)\b/.test(said);
  }

  function navigationDirection(said) {
    const imperative = clauses(said).find((clause) => /\b(?:turn|go|fly|head|steer)\b/.test(clause) && /\bleft\b|\bright\b/.test(clause));
    if (!imperative) return null;
    if (/\bleft\b/.test(imperative)) return "left";
    if (/\bright\b/.test(imperative)) return "right";
    return null;
  }

  function describesBlueStarOnRight(said) {
    return /\bblue star\b.{0,25}\bright\b|\bright\b.{0,25}\bblue star\b/.test(said);
  }

  function describesBlueStarOnLeft(said) {
    return /\bblue star\b.{0,25}\bleft\b|\bleft\b.{0,25}\bblue star\b/.test(said);
  }

  function interpret(mission, transcript, conversation) {
    const state = {
      awaitingReason: (conversation && conversation.awaitingReason) || null,
      alternative: null
    };
    const said = normalize(transcript);
    const parts = clauses(said);
    const matched = [];
    const missing = [];

    if (!said) {
      return { complete: false, refusal: false, alternative: null, response: null, successResponse: null, conversation: state, matched, missing, said, heardWords: 0 };
    }

    mission.requirements.forEach((requirement) => {
      if (requirement.pattern.test(said)) matched.push(requirement);
      else missing.push(requirement);
    });

    const refusing = parts.some((clause) => clauseRefusesAction(clause));
    if (refusing) {
      state.awaitingReason = null;
      return {
        complete: false,
        refusal: true,
        alternative: null,
        response: mission.refusalResponse,
        successResponse: null,
        conversation: state,
        matched,
        missing,
        said,
        heardWords: said.split(/\s+/).filter(Boolean).length
      };
    }

    if (mission.id === "package") {
      const requestClause = parts.find((part) => directObjectMentioned(part) && (hasRequestAction(part) || hasPoliteness(part)));
      const requestedColor = requestClause ? directObjectColor(requestClause) : null;
      const color = /^(?:warm red|bright red)$/.test(requestedColor || "") ? "red" : requestedColor;

      if (state.awaitingReason === "blue package" && isExplanation(said)) {
        return {
          complete: true,
          refusal: false,
          alternative: null,
          response: null,
          successResponse: "That is a thoughtful reason. I will take the blue package instead, because it reminds Moon Grandma of her ocean home.",
          successWhy: "You explained why your idea fits Moon Grandma, and Zibo accepted your choice.",
          conversation: { awaitingReason: null, alternative: null },
          matched,
          missing,
          said,
          heardWords: said.split(/\s+/).filter(Boolean).length
        };
      }

      if (requestClause && color === "red" && hasPoliteness(requestClause)) {
        return {
          complete: true,
          refusal: false,
          alternative: null,
          response: null,
          successResponse: mission.success,
          successWhy: mission.successWhy,
          conversation: { awaitingReason: null, alternative: null },
          matched,
          missing,
          said,
          heardWords: said.split(/\s+/).filter(Boolean).length
        };
      }

      if (requestClause && color && color !== "red" && hasPoliteness(requestClause)) {
        state.awaitingReason = `${color} package`;
        return {
          complete: false,
          refusal: false,
          alternative: `I heard you ask for the ${color} package. Moon Grandma’s birthday gift is the red one. Tell me why you think the ${color} package is better for her.`,
          response: null,
          successResponse: null,
          conversation: state,
          matched,
          missing,
          said,
          heardWords: said.split(/\s+/).filter(Boolean).length
        };
      }

      if (requestClause && !color) {
        return {
          complete: false,
          refusal: false,
          alternative: "I heard you ask for a package, but I am not sure which one is yours. Which color package do you mean?",
          response: null,
          successResponse: null,
          conversation: { awaitingReason: null, alternative: null },
          matched,
          missing,
          said,
          heardWords: said.split(/\s+/).filter(Boolean).length
        };
      }
    }

    if (mission.id === "shopping") {
      const requestClause = parts.find((part) => /\b(?:apples?|bananas?|cookies?|cakes?|sandwich(?:es)?|juice)\b/.test(part));
      const item = requestClause ? requestClause.match(/\b(star apples?|apples?|bananas?|cookies?|cakes?|sandwich(?:es)?|juice)\b/) : null;
      const number = requestClause ? requestClause.match(/\b(one|two|three|four|five|1|2|3|4|5|a pair of)\b/) : null;

      if (requestClause && item && number && /(?:two|2|a pair of)/.test(number[1]) && /(?:star apples?|apples?)/.test(item[1]) && hasPoliteness(requestClause)) {
        return {
          complete: true,
          refusal: false,
          alternative: null,
          response: null,
          successResponse: mission.success,
          successWhy: mission.successWhy,
          conversation: { awaitingReason: null, alternative: null },
          matched,
          missing,
          said,
          heardWords: said.split(/\s+/).filter(Boolean).length
        };
      }

      if (requestClause && item) {
        const reasonInvited = state.awaitingReason === "different snack";
        state.awaitingReason = "different snack";
        return {
          complete: false,
          refusal: false,
          alternative: reasonInvited
            ? "I remember your snack idea. Tell me why Grandma might like it, and then say, “Yes, let us get it.”"
            : `I heard ${number ? `${number[1]} ` : ""}${item[1]}. Moon Grandma asked for two star apples. Tell me why your snack might make her happy.`,
          response: null,
          successResponse: null,
          conversation: state,
          matched,
          missing,
          said,
          heardWords: said.split(/\s+/).filter(Boolean).length
        };
      }
    }

    if (mission.id === "navigation") {
      const direction = navigationDirection(said);
      const mentionsBlueStar = /\b(?:blue star|blue light|blue one)\b/.test(said);

      if (direction === "right" && mentionsBlueStar && hasPoliteness(said) && !describesBlueStarOnLeft(said)) {
        return {
          complete: true,
          refusal: false,
          alternative: null,
          response: null,
          successResponse: mission.success,
          successWhy: mission.successWhy,
          conversation: { awaitingReason: null, alternative: null },
          matched,
          missing,
          said,
          heardWords: said.split(/\s+/).filter(Boolean).length
        };
      }

      if (direction === "left" && mentionsBlueStar) {
        state.awaitingReason = "left turn";
        return {
          complete: false,
          refusal: false,
          alternative: describesBlueStarOnRight(said)
            ? "I heard your main instruction: go left. But you also said the blue star is on the right. That does not match, so I will stay safe and wait."
            : "I heard left. From our cockpit, the blue star is on the right. Tell me why you want left, or say right when you are ready.",
          response: null,
          successResponse: null,
          conversation: state,
          matched,
          missing,
          said,
          heardWords: said.split(/\s+/).filter(Boolean).length
        };
      }

      if (direction && !mentionsBlueStar) {
        return {
          complete: false,
          refusal: false,
          alternative: "I need the landmark too. Which star should I use: the blue star or the red star?",
          response: null,
          successResponse: null,
          conversation: { awaitingReason: null, alternative: null },
          matched,
          missing,
          said,
          heardWords: said.split(/\s+/).filter(Boolean).length
        };
      }

      if (state.awaitingReason === "left turn" && isExplanation(said)) {
        return {
          complete: false,
          refusal: false,
          alternative: "I hear your reason. In this fog the blue star is still the safe light on our right, so I will wait for you to say, “Please turn right at the blue star.”",
          response: null,
          successResponse: null,
          conversation: { awaitingReason: null, alternative: null },
          matched,
          missing,
          said,
          heardWords: said.split(/\s+/).filter(Boolean).length
        };
      }
    }

    return {
      complete: false,
      refusal: false,
      alternative: null,
      response: null,
      successResponse: null,
      conversation: state,
      matched,
      missing,
      said,
      heardWords: said.split(/\s+/).filter(Boolean).length
    };
  }

  function evaluate(mission, transcript) {
    return interpret(mission, transcript, {});
  }

  function storyResponse(transcript) {
    const said = normalize(transcript);
    if (!said) return "I played your voice, but the speech engine did not return words. You can try again or tell your family beside you.";
    const ideas = [];
    if (/\b(package|present|gift|red)\b/.test(said)) ideas.push("the red birthday package");
    if (/\b(apples?|snack|food|hungry)\b/.test(said)) ideas.push("the sparkling star apples");
    if (/\b(right|star|fog|rocket|fly|pilot)\b/.test(said)) ideas.push("flying right through the fog");
    if (/\b(grandma|moon|happy|smile|love|thank)\b/.test(said)) ideas.push("Moon Grandma's happy smile");
    if (ideas.length) return `I heard you talk about ${ideas.join(", ")}. You retold the story with your own words!`;
    return "I heard your voice and your story. Try again with words like package, apples, right, Grandma, or happy.";
  }

  return { missions, normalize, evaluate, interpret, storyResponse };
})();

if (typeof module !== "undefined" && module.exports) module.exports = SpeakingWorldRules;
