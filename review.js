const Review = (() => {
  function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  }

  function selectTarget(text) {
    const words = tokenize(text);
    const ARTICLES = new Set(['a', 'an', 'the']);
    const BE = new Set(['is', 'are', 'was', 'am', 'were']);

    for (let i = 1; i < words.length; i++) {
      if (ARTICLES.has(words[i - 1]) && !SKIP_WORDS.has(words[i])) {
        return { word: words[i], index: i };
      }
    }
    for (let i = 1; i < words.length; i++) {
      if (BE.has(words[i - 1]) && !SKIP_WORDS.has(words[i])) {
        return { word: words[i], index: i };
      }
    }
    for (let i = words.length - 1; i >= 0; i--) {
      if (!SKIP_WORDS.has(words[i])) {
        return { word: words[i], index: i };
      }
    }
    return null;
  }

  function getCandidates(targetWord, currentText, otherSentences) {
    const words = tokenize(currentText);
    const targetIdx = words.indexOf(targetWord);
    const precedingWord = targetIdx > 0 ? words[targetIdx - 1] : null;
    const ARTICLES = new Set(['a', 'an', 'the']);

    const byContext = [];
    const byArticle = [];
    const general = [];
    const seen = new Set([targetWord]);

    otherSentences.forEach(s => {
      const ws = tokenize(s.text);
      ws.forEach((w, i) => {
        if (seen.has(w) || SKIP_WORDS.has(w)) return;
        const prev = i > 0 ? ws[i - 1] : null;
        if (precedingWord && prev === precedingWord) {
          byContext.push(w);
        } else if (prev && ARTICLES.has(prev)) {
          byArticle.push(w);
        } else {
          general.push(w);
        }
        seen.add(w);
      });
    });

    const pool = [...byContext, ...byArticle, ...general];
    return pool.sort(() => Math.random() - 0.5).slice(0, 3);
  }

  function buildSession(sentences) {
    const allSentences = SentenceDB.getAll();
    const steps = [];

    sentences.forEach(s => {
      const words = tokenize(s.text);

      steps.push({ type: 'A', text: s.text });

      const shuffled = [...words].sort(() => Math.random() - 0.5);
      steps.push({ type: 'B', text: s.text, words, shuffled });

      const target = selectTarget(s.text);
      if (target) {
        const others = allSentences.filter(x => x.id !== s.id);
        const candidates = getCandidates(target.word, s.text, others);
        if (candidates.length >= 3) {
          const choices = [target.word, ...candidates.slice(0, 3)]
            .sort(() => Math.random() - 0.5);
          steps.push({
            type: 'C',
            text: s.text,
            words,
            target: target.word,
            targetIndex: target.index,
            choices,
          });
        }
      }
    });

    return steps;
  }

  return { tokenize, selectTarget, getCandidates, buildSession };
})();
