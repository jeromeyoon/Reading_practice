const SKIP_WORDS = new Set([
  'a','an','the',
  'is','are','was','am','were','be','been',
  'i','he','she','it','we','they','you',
  'this','that','these','those',
  'and','or','but','so',
  'in','on','at','to','of','for','with','by','from','up','out',
  'my','his','her','our','their','your','its',
  'not','no',
  'do','does','did','have','has','had',
  'can','will','would','could','should','may','might',
  'what','where','when','who','how','like'
]);

const SentenceDB = (() => {
  const KEY = 'reading_sentences';

  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function add(text) {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const list = getAll();
    list.push({ id: Date.now(), text: trimmed });
    save(list);
    return true;
  }

  function remove(id) {
    save(getAll().filter(s => s.id !== id));
  }

  function exportJSON() {
    const data = JSON.stringify(getAll(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reading_sentences.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function syncFromGitHub() {
    const url = 'https://raw.githubusercontent.com/jeromeyoon/Reading_practice/main/data/sentences.json?t=' + Date.now();
    try {
      const res = await fetch(url);
      if (!res.ok) return false;
      const remote = await res.json();
      const local = getAll();
      const remoteTexts = new Set(remote.map(s => s.text));
      const localOnly = local.filter(s => !remoteTexts.has(s.text));
      save([...remote, ...localOnly]);
      return true;
    } catch {
      return false;
    }
  }

  function importJSON(file, onDone) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!Array.isArray(parsed)) throw new Error('invalid');
        const current = new Set(getAll().map(s => s.text));
        let added = 0;
        parsed.forEach(s => {
          if (s.text && !current.has(s.text)) {
            add(s.text);
            current.add(s.text);
            added++;
          }
        });
        if (onDone) onDone(added);
      } catch {
        alert('파일을 읽을 수 없어요. JSON 형식을 확인해 주세요.');
      }
    };
    reader.readAsText(file);
  }

  return { getAll, add, remove, exportJSON, importJSON, syncFromGitHub };
})();
