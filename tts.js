const TTS = (() => {
  const synth = window.speechSynthesis;
  let rate = 0.85;

  function supported() {
    return !!synth;
  }

  // text: string
  // onWord: (wordIndex) => void  — called each time a new word starts
  // onEnd: () => void
  function speak(text, onWord, onEnd) {
    if (!synth) return;
    synth.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.rate = rate;
    utt.pitch = 1.1;

    if (onWord) {
      const positions = _wordPositions(text);
      utt.addEventListener('boundary', e => {
        if (e.name !== 'word') return;
        const idx = positions.findIndex(p => e.charIndex >= p.s && e.charIndex < p.e);
        if (idx >= 0) onWord(idx);
      });
    }

    if (onEnd) utt.addEventListener('end', onEnd);

    // iOS Safari workaround: voices may not load until voiceschanged fires
    const go = () => synth.speak(utt);
    if (synth.getVoices().length === 0) {
      synth.addEventListener('voiceschanged', go, { once: true });
    } else {
      go();
    }
  }

  function stop() {
    if (synth) synth.cancel();
  }

  function setRate(r) {
    rate = parseFloat(r);
  }

  function getRate() {
    return rate;
  }

  function _wordPositions(text) {
    const out = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text))) {
      out.push({ s: m.index, e: m.index + m[0].length });
    }
    return out;
  }

  return { supported, speak, stop, setRate, getRate };
})();
