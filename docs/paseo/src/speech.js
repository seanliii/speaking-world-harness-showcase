const SpeechRecognition =
  typeof window === 'undefined' ? undefined : window.SpeechRecognition || window.webkitSpeechRecognition;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const mediaErrorMessage = (error) => {
  if (error instanceof Error) {
    if (error.name === 'NotAllowedError') return 'Microphone permission was denied.';
    if (error.name === 'NotFoundError') return 'No microphone was found.';
  }
  return 'Audio recording is not available.';
};

export function createSpeechEngine() {
  const recognitionSupported = Boolean(SpeechRecognition);

  function speak(text, rate = 0.85) {
    if (!('speechSynthesis' in window) || !text) return Promise.resolve(false);

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(String(text));
      utterance.rate = Number.isFinite(rate) ? Math.min(Math.max(rate, 0.1), 10) : 0.85;
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }

  async function capture(stageId) {
    const result = { transcript: '', audioUrl: '', error: '' };

    if (!navigator.mediaDevices?.getUserMedia) {
      result.error = 'Audio recording is not supported.';
      return result;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      result.error = mediaErrorMessage(error);
      return result;
    }

    let recorder;
    try {
      recorder = new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      result.error = 'Audio recording is not supported.';
      return result;
    }

    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const audioUrl = new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(
          chunks.length > 0
            ? URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
            : ''
        );
        stream.getTracks().forEach((track) => track.stop());
      };
    });

    recorder.start();

    if (!recognitionSupported) {
      await wait(6000);
      if (recorder.state !== 'inactive') recorder.stop();
      result.audioUrl = await audioUrl;
      return result;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let recognitionError = '';
    let finishRecognition;
    const recognitionDone = new Promise((resolve) => {
      finishRecognition = resolve;
      recognition.onresult = (event) => {
        let transcript = '';
        for (let index = 0; index < event.results.length; index += 1) {
          const outcome = event.results[index];
          if (outcome.isFinal) transcript += `${outcome[0]?.transcript || ''} `;
        }
        result.transcript = transcript.replace(/\s+/g, ' ').trim();
      };
      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') recognitionError = 'Speech recognition permission was denied.';
        else if (event.error !== 'aborted' && event.error !== 'no-speech') recognitionError = 'Speech recognition failed.';
      };
      recognition.onend = resolve;
    });

    try {
      recognition.start();
    } catch {
      recognitionError = 'Speech recognition failed.';
      finishRecognition();
    }

    let timeoutId;
    const recognitionTimeout = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        try {
          recognition.abort();
        } catch {
        }
        resolve();
      }, 8000);
    });
    await Promise.race([recognitionDone, recognitionTimeout]);
    clearTimeout(timeoutId);

    if (recorder.state !== 'inactive') recorder.stop();
    result.audioUrl = await audioUrl;
    result.error = recognitionError;
    return result;
  }

  return { speak, capture, recognitionSupported };
}
