(function () {
  const elements = {
    app: document.getElementById("app"),
    video: document.getElementById("scene-video"),
    sceneObjects: document.getElementById("scene-objects"),
    progress: document.getElementById("progress"),
    startScreen: document.getElementById("start-screen"),
    startButton: document.getElementById("start-button"),
    mission: document.getElementById("mission"),
    missionNumber: document.getElementById("mission-number"),
    missionTitle: document.getElementById("mission-title"),
    speakerAvatar: document.getElementById("speaker-avatar"),
    speakerName: document.getElementById("speaker-name"),
    npcLine: document.getElementById("npc-line"),
    missionGoal: document.getElementById("mission-goal"),
    cueCards: document.getElementById("cue-cards"),
    modelLine: document.getElementById("model-line"),
    feedback: document.getElementById("feedback"),
    listenButton: document.getElementById("listen-button"),
    recordButton: document.getElementById("record-button"),
    playbackButton: document.getElementById("playback-button"),
    playback: document.getElementById("playback"),
    nextButton: document.getElementById("next-button"),
    recordingState: document.getElementById("recording-state"),
    transcript: document.getElementById("transcript"),
    finish: document.getElementById("finish"),
    storyButton: document.getElementById("story-button"),
    restartButton: document.getElementById("restart-button"),
    storyResult: document.getElementById("story-result")
  };

  const missions = SpeakingWorldRules.missions;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let missionIndex = 0;
  let currentMission = null;
  let storyMode = false;
  let mediaStream = null;
  let recorder = null;
  let recording = false;
  let chunks = [];
  let countdownTimer = null;
  let stopTimer = null;
  let finalTranscript = "";
  let conversation = { awaitingReason: null, alternative: null };

  function speak(text, rate = 0.88) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    utterance.pitch = 1.12;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => item.lang === "en-US") || voices.find((item) => item.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }

  function renderProgress() {
    elements.progress.innerHTML = "";
    missions.forEach((mission, index) => {
      const dot = document.createElement("span");
      if (index < missionIndex) dot.className = "done";
      if (index === missionIndex && !elements.finish.classList.contains("hidden")) dot.className = "done";
      if (index === missionIndex && elements.finish.classList.contains("hidden")) dot.className = "active";
      elements.progress.appendChild(dot);
    });
  }

  function clearRecordingUi() {
    elements.recordingState.textContent = "";
    elements.recordingState.classList.remove("recording");
    elements.transcript.innerHTML = "";
    elements.feedback.textContent = "";
    elements.feedback.className = "feedback";
    elements.playbackButton.disabled = true;
    elements.playback.classList.remove("ready");
    elements.playback.removeAttribute("src");
    elements.nextButton.classList.add("hidden");
  }

  function renderMission(index) {
    missionIndex = index;
    currentMission = missions[index];
    storyMode = false;
    conversation = { awaitingReason: null, alternative: null };
    elements.startScreen.classList.add("hidden");
    elements.finish.classList.add("hidden");
    elements.mission.classList.remove("hidden");
    elements.missionNumber.textContent = `Mission ${index + 1}`;
    elements.missionTitle.textContent = currentMission.title;
    elements.speakerAvatar.textContent = currentMission.speakerAvatar;
    elements.speakerName.textContent = currentMission.speakerName;
    elements.npcLine.textContent = currentMission.line;
    elements.missionGoal.textContent = `Your job: ${currentMission.goal}`;
    elements.modelLine.textContent = `Try: “${currentMission.model}”`;
    elements.nextButton.textContent = index === missions.length - 1 ? "🏁 Finish mission" : "➡ Continue";
    elements.recordButton.textContent = "🎤 Record";
    elements.sceneObjects.innerHTML = "";
    elements.cueCards.innerHTML = "";
    currentMission.cues.forEach((cue) => {
      const card = document.createElement("li");
      card.className = "cue-card";
      const emoji = document.createElement("span");
      emoji.textContent = cue.emoji;
      const label = document.createElement("span");
      label.textContent = cue.label;
      card.append(emoji, label);
      elements.cueCards.appendChild(card);
    });
    clearRecordingUi();
    renderProgress();
    elements.video.src = currentMission.scene;
    elements.video.load();
    elements.video.play().catch(() => undefined);
    setTimeout(() => speak(currentMission.line), 350);
  }

  function celebrate(mission) {
    const object = document.createElement("div");
    object.className = `object ${mission.successClass}`;
    object.textContent = mission.successEmoji;
    elements.sceneObjects.appendChild(object);
    for (let index = 0; index < 16; index += 1) {
      const spark = document.createElement("div");
      spark.className = "spark";
      spark.style.left = `${45 + Math.random() * 10}%`;
      spark.style.top = `${45 + Math.random() * 10}%`;
      spark.style.background = index % 2 ? "#82f7a8" : "#ffd166";
      spark.style.animationDelay = `${Math.random() * .5}s`;
      elements.sceneObjects.appendChild(spark);
    }
  }

  function handleRecordingResult(transcript) {
    const evaluation = SpeakingWorldRules.interpret(currentMission, transcript, conversation);
    conversation = evaluation.conversation || conversation;
    elements.transcript.innerHTML = `<strong>I heard:</strong> ${transcript ? transcript : "no words returned"}`;
    if (evaluation.complete) {
      elements.feedback.className = "feedback ok";
      elements.feedback.innerHTML = `<strong>Great speaking!</strong> ${evaluation.successResponse}<br><small>${evaluation.successWhy}</small>`;
      elements.nextButton.classList.remove("hidden");
      celebrate(currentMission);
      speak(evaluation.successResponse, 0.92);
      return;
    }

    if (evaluation.refusal) {
      elements.feedback.className = "feedback";
      elements.feedback.innerHTML = `<strong>${currentMission.speakerName} understands your answer is no.</strong> ${currentMission.refusalResponse}`;
      elements.nextButton.classList.add("hidden");
      speak(currentMission.refusalResponse, 0.86);
      return;
    }

    if (!transcript) {
      elements.feedback.className = "feedback";
      elements.feedback.innerHTML = "<strong>I have your recording, but no words came back.</strong> I cannot understand this try, so it cannot count as mission complete. Speak a little louder after you see “Listening,” or use a browser with speech-to-text and press Record again.";
      speak("I have your recording, but no words came back. This try cannot count as mission complete. Please try again.", 0.86);
      return;
    }

    if (evaluation.alternative) {
      elements.feedback.className = "feedback";
      elements.feedback.innerHTML = `<strong>${currentMission.speakerName} heard your idea.</strong> ${evaluation.alternative}`;
      elements.nextButton.classList.add("hidden");
      speak(evaluation.alternative, 0.86);
      return;
    }

    if (conversation.awaitingReason) {
      elements.feedback.className = "feedback";
      elements.feedback.innerHTML = `<strong>${currentMission.speakerName} is listening for your reason.</strong> You can start with, “Because…” and say why your idea is good for Moon Grandma.`;
      elements.nextButton.classList.add("hidden");
      speak("I am listening for your reason. You can start with because.", 0.86);
      return;
    }

    const tips = evaluation.missing.map((item) => item.tip).join(" ");
    elements.feedback.className = "feedback";
    elements.feedback.innerHTML = `<strong>Good try!</strong> ${currentMission.speakerName} needs a little more information. ${tips}`;
    speak(`Good try. ${tips}`, 0.84);
  }

  function createRecognition() {
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let text = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) text += event.results[index][0].transcript;
      }
      if (text) finalTranscript = `${finalTranscript} ${text}`.trim();
      elements.transcript.innerHTML = `<strong>Listening:</strong> ${finalTranscript}`;
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed") elements.recordingState.textContent = "Microphone permission is needed.";
      if (event.error === "no-speech") elements.recordingState.textContent = "I did not hear speech yet.";
    };
    return recognition;
  }

  async function startRecording() {
    if (recording) {
      stopRecording();
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      elements.recordingState.textContent = "This browser cannot access the microphone.";
      return;
    }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      elements.recordingState.textContent = "Microphone permission was not granted. I will not count this as speaking. Ask a grown-up to choose Allow, then press Record again.";
      return;
    }

    finalTranscript = "";
    chunks = [];
    recording = true;
    elements.recordButton.textContent = "⏹ Stop";
    elements.recordingState.textContent = "Listening… speak now";
    elements.recordingState.classList.add("recording");
    elements.transcript.textContent = "";
    elements.feedback.textContent = "";
    elements.nextButton.classList.add("hidden");

    const mimeType = ["audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      if (chunks.length) {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        elements.playback.src = url;
        elements.playback.classList.add("ready");
        elements.playbackButton.disabled = false;
      }
      mediaStream.getTracks().forEach((track) => track.stop());
      setTimeout(() => {
        recording = false;
        elements.recordButton.textContent = "🎤 Try again";
        elements.recordingState.classList.remove("recording");
        elements.recordingState.textContent = "Listen to yourself, then continue or try again.";
        if (storyMode) {
          const response = SpeakingWorldRules.storyResponse(finalTranscript);
          elements.storyResult.textContent = response;
          speak(response, 0.92);
        } else {
          handleRecordingResult(finalTranscript);
        }
      }, 500);
    };
    recorder.start();

    let recognition = null;
    if (SpeechRecognition) {
      recognition = createRecognition();
      recognition.onend = () => {
        if (recognition) recognition = null;
      };
      try {
        recognition.start();
      } catch (error) {
        elements.recordingState.textContent = "Speech engine is busy. Please wait and try again.";
      }
    } else {
      elements.transcript.innerHTML = "<strong>Note:</strong> This browser has no speech-to-text engine.";
    }

    let remaining = 7;
    countdownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining > 0 && recording) elements.recordingState.textContent = `Listening… ${remaining}`;
    }, 1000);
    stopTimer = setTimeout(stopRecording, 7000);
    recorder._recognition = recognition;
  }

  function stopRecording() {
    clearInterval(countdownTimer);
    clearTimeout(stopTimer);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    if (recorder && recorder._recognition) {
      try { recorder._recognition.stop(); } catch (error) { /* recognition may already be stopped */ }
    }
  }

  elements.startButton.addEventListener("click", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    renderMission(0);
  });

  elements.listenButton.addEventListener("click", () => {
    if (storyMode) speak("Tell me the story of our space mail mission.", 0.88);
    else speak(`${currentMission.line} ${currentMission.model}`, 0.86);
  });

  elements.recordButton.addEventListener("click", startRecording);
  elements.playbackButton.addEventListener("click", () => elements.playback.play());
  elements.nextButton.addEventListener("click", () => {
    if (missionIndex < missions.length - 1) renderMission(missionIndex + 1);
    else {
      elements.mission.classList.add("hidden");
      elements.finish.classList.remove("hidden");
      elements.storyResult.textContent = "";
      renderProgress();
      speak("Mission complete! Moon Grandma says thank you, brave space speaker.", 0.9);
    }
  });

  elements.storyButton.addEventListener("click", () => {
    storyMode = true;
    elements.storyResult.textContent = "Tell what happened in the story. You have seven seconds.";
    speak("Tell me the story of our space mail mission.", 0.88);
    startRecording();
  });

  elements.restartButton.addEventListener("click", () => renderMission(0));

  renderProgress();
})();
