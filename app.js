const App = (() => {
  let session = null;
  let modeBPool = [];
  let modeBAnswer = [];

  function esc(t) {
    return String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function $(id) { return document.getElementById(id); }

  // ── screens ──────────────────────────────────────────────

  function showScreen(name) {
    TTS.stop();
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    $('screen-' + name).classList.add('active');
    if (name === 'home') _updateHome();
    if (name === 'manage') _renderList();
  }

  // ── home ─────────────────────────────────────────────────

  function _updateHome() {
    const count = SentenceDB.getAll().length;
    $('home-count').textContent = count;
    const btn = $('btn-start');
    const hint = $('home-hint');
    if (count < 3) {
      btn.disabled = true;
      hint.textContent = `복습을 시작하려면 문장이 3개 이상 필요해요 (현재 ${count}개)`;
    } else {
      btn.disabled = false;
      hint.textContent = '';
    }
  }

  // ── manage ───────────────────────────────────────────────

  function addSentence() {
    const el = $('input-sentence');
    const text = el.value.trim();
    if (!text) return;
    if (SentenceDB.add(text)) {
      el.value = '';
      el.focus();
      _renderList();
    }
  }

  function removeSentence(id) {
    if (!confirm('이 문장을 삭제할까요?')) return;
    SentenceDB.remove(id);
    _renderList();
  }

  function importFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    SentenceDB.importJSON(file, added => {
      alert(`${added}개 문장을 가져왔어요!`);
      _renderList();
      _updateHome();
    });
    e.target.value = '';
  }

  function _renderList() {
    const list = SentenceDB.getAll();
    const el = $('sentence-list');
    if (list.length === 0) {
      el.innerHTML = '<p class="empty-hint">문장이 없어요. 위에 입력해 주세요.</p>';
      return;
    }
    el.innerHTML = list.map((s, i) => `
      <div class="sentence-item">
        <span class="sentence-num">${i + 1}</span>
        <span class="sentence-text">${esc(s.text)}</span>
        <button class="btn-tts-small" onclick="TTS.speak('${esc(s.text)}')" title="듣기">🔊</button>
        <button class="btn-delete" onclick="App.removeSentence(${s.id})">✕</button>
      </div>
    `).join('');
  }

  // ── review ───────────────────────────────────────────────

  function startReview() {
    const all = SentenceDB.getAll();
    if (all.length < 3) return;
    const pick = [...all].sort(() => Math.random() - 0.5).slice(0, 5);
    const steps = Review.buildSession(pick);
    session = { steps, current: 0, score: { correct: 0, wrong: 0 } };
    showScreen('review');
    _renderStep();
  }

  function confirmExit() {
    if (confirm('복습을 그만 할까요?')) showScreen('home');
  }

  function _renderStep() {
    TTS.stop();
    const { steps, current } = session;
    const step = steps[current];
    const total = steps.length;

    $('review-progress-text').textContent = `${current + 1} / ${total}`;
    $('progress-fill').style.width = `${((current + 1) / total) * 100}%`;

    const badges = { A: '📖 읽기', B: '✏️ 단어 구성', C: '🔀 문장 변형' };
    $('mode-badge').textContent = badges[step.type];

    _hideFeedback();
    _hideNext();

    const content = $('review-content');
    if (step.type === 'A') _renderA(step, content);
    else if (step.type === 'B') _renderB(step, content);
    else if (step.type === 'C') _renderC(step, content);
  }

  // ── Mode A ───────────────────────────────────────────────

  function _renderA(step, el) {
    const words = step.text.split(/\s+/);
    const ttsBtn = TTS.supported()
      ? `<button class="btn-tts" id="btn-speak" onclick="App._speakA()">🔊 읽어줘</button>`
      : '';
    const speedCtrl = TTS.supported() ? `
      <div class="speed-row">
        <span class="speed-label">🐢</span>
        <input type="range" id="tts-rate" class="speed-slider"
          min="0.5" max="1.3" step="0.05" value="${TTS.getRate()}"
          oninput="TTS.setRate(this.value)">
        <span class="speed-label">🐇</span>
      </div>` : '';

    el.innerHTML = `
      <div class="mode-wrap">
        <p class="instruction">소리내어 읽어봐요 👇</p>
        <div class="sentence-display" id="word-display">
          ${words.map((w, i) =>
            `<span class="word-tap" data-i="${i}" onclick="App._tapWord(this)">${esc(w)}</span>`
          ).join(' ')}
        </div>
        ${ttsBtn}
        ${speedCtrl}
        <p class="sub-hint">단어를 탭하면 강조돼요</p>
      </div>
    `;
    _showNext();
  }

  function _speakA() {
    const step = session.steps[session.current];
    const spans = document.querySelectorAll('#word-display .word-tap');
    let prevIdx = -1;

    // Reset manual highlights
    spans.forEach(s => s.classList.remove('tts-speaking', 'highlighted'));

    const btn = $('btn-speak');
    if (btn) { btn.textContent = '⏹ 멈추기'; btn.onclick = () => { TTS.stop(); _resetSpeakBtn(); }; }

    TTS.speak(
      step.text,
      idx => {
        if (prevIdx >= 0 && spans[prevIdx]) spans[prevIdx].classList.remove('tts-speaking');
        prevIdx = idx;
        if (spans[idx]) {
          spans[idx].classList.add('tts-speaking');
          spans[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      },
      () => {
        if (prevIdx >= 0 && spans[prevIdx]) spans[prevIdx].classList.remove('tts-speaking');
        _resetSpeakBtn();
      }
    );
  }

  function _resetSpeakBtn() {
    const btn = $('btn-speak');
    if (btn) { btn.textContent = '🔊 읽어줘'; btn.onclick = () => App._speakA(); }
  }

  function _tapWord(el) {
    el.classList.toggle('highlighted');
  }

  // ── Mode B ───────────────────────────────────────────────

  function _renderB(step, el) {
    modeBPool = [...step.shuffled];
    modeBAnswer = [];
    const ttsHint = TTS.supported()
      ? `<button class="btn-tts-hint" onclick="App._speakHint()" title="정답 문장 듣기">🔊 힌트</button>`
      : '';

    el.innerHTML = `
      <div class="mode-wrap">
        <div class="instruction-row">
          <p class="instruction">단어를 순서대로 골라봐요 👇</p>
          ${ttsHint}
        </div>
        <div class="area-label">내 답</div>
        <div id="answer-area" class="answer-area"></div>
        <div class="area-label">단어 목록</div>
        <div id="pool-area" class="pool-area"></div>
        <button class="btn-check" onclick="App._checkB()">확인하기</button>
      </div>
    `;
    _renderBCards();
  }

  function _speakHint() {
    const step = session.steps[session.current];
    TTS.speak(step.text);
  }

  function _renderBCards() {
    const poolEl = $('pool-area');
    const answerEl = $('answer-area');
    if (!poolEl || !answerEl) return;

    poolEl.innerHTML = modeBPool.length === 0
      ? '<span class="empty-pool">단어를 모두 골랐어요!</span>'
      : modeBPool.map((w, i) =>
          `<button class="word-card" onclick="App._pickWord(${i})">${esc(w)}</button>`
        ).join('');

    answerEl.innerHTML = modeBAnswer.length === 0
      ? '<span class="answer-placeholder">단어를 눌러서 여기에 놓아요</span>'
      : modeBAnswer.map((w, i) =>
          `<button class="word-card answer-card" onclick="App._unpickWord(${i})">${esc(w)}</button>`
        ).join('');
  }

  function _pickWord(i) {
    modeBAnswer.push(modeBPool.splice(i, 1)[0]);
    _renderBCards();
  }

  function _unpickWord(i) {
    modeBPool.push(modeBAnswer.splice(i, 1)[0]);
    _renderBCards();
  }

  function _checkB() {
    const step = session.steps[session.current];
    if (modeBPool.length > 0) {
      _showFeedback('아직 단어가 남아 있어요!', 'error');
      return;
    }
    if (modeBAnswer.join(' ') === step.words.join(' ')) {
      session.score.correct++;
      _showFeedback('✅ 완벽해요!', 'success');
      if (TTS.supported()) TTS.speak(step.text);
      _showNext();
    } else {
      session.score.wrong++;
      _showFeedback('다시 해봐요! 단어를 탭하면 돌려보낼 수 있어요.', 'error');
    }
  }

  // ── Mode C ───────────────────────────────────────────────

  function _renderC(step, el) {
    const blank = step.words
      .map((w, i) => i === step.targetIndex
        ? '<span class="blank">_____</span>'
        : esc(w))
      .join(' ');

    el.innerHTML = `
      <div class="mode-wrap">
        <p class="instruction">빈칸에 들어갈 단어를 골라봐요 👇</p>
        <div class="sentence-display">${blank}</div>
        <div class="choices">
          ${step.choices.map(c =>
            `<button class="choice-btn" data-word="${esc(c)}" onclick="App._checkC(this)">${esc(c)}</button>`
          ).join('')}
        </div>
      </div>
    `;
  }

  function _checkC(el) {
    const step = session.steps[session.current];
    const chosen = el.dataset.word;
    document.querySelectorAll('.choice-btn').forEach(b => { b.disabled = true; });

    if (chosen === step.target) {
      el.classList.add('correct');
      session.score.correct++;
      _showFeedback('✅ 정답이에요!', 'success');
      if (TTS.supported()) setTimeout(() => TTS.speak(step.text), 400);
    } else {
      el.classList.add('wrong');
      session.score.wrong++;
      document.querySelectorAll('.choice-btn').forEach(b => {
        if (b.dataset.word === step.target) b.classList.add('correct');
      });
      _showFeedback(`아쉬워요! 정답은 "${step.target}" 이에요.`, 'error');
      if (TTS.supported()) setTimeout(() => TTS.speak(step.text), 600);
    }
    _showNext();
  }

  // ── navigation ───────────────────────────────────────────

  function nextStep() {
    session.current++;
    if (session.current >= session.steps.length) {
      _showComplete();
    } else {
      _renderStep();
    }
  }

  function _showComplete() {
    TTS.stop();
    const { correct, wrong } = session.score;
    const total = correct + wrong;
    const ratio = total > 0 ? correct / total : 1;
    const stars = ratio >= 0.8 ? '⭐⭐⭐' : ratio >= 0.5 ? '⭐⭐' : '⭐';
    $('complete-stars').textContent = stars;
    $('complete-score').textContent = total > 0
      ? `${correct} / ${total} 정답`
      : '잘 읽었어요!';
    showScreen('complete');
  }

  // ── feedback / next ──────────────────────────────────────

  function _showFeedback(msg, type) {
    const el = $('review-feedback');
    el.textContent = msg;
    el.className = 'review-feedback ' + type;
  }

  function _hideFeedback() {
    const el = $('review-feedback');
    el.textContent = '';
    el.className = 'review-feedback hidden';
  }

  function _showNext() { $('btn-next').classList.remove('hidden'); }
  function _hideNext() { $('btn-next').classList.add('hidden'); }

  // ── init ─────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    _updateHome();
    $('input-sentence').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addSentence();
      }
    });
  });

  return {
    showScreen,
    addSentence,
    removeSentence,
    importFile,
    startReview,
    nextStep,
    confirmExit,
    _tapWord,
    _speakA,
    _speakHint,
    _pickWord,
    _unpickWord,
    _checkB,
    _checkC,
  };
})();
