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

  return { getAll, add, remove };
})();
