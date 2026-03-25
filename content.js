// Safe guard - don't crash if chrome APIs unavailable
if (typeof chrome === 'undefined' || !chrome.storage) {
  // silently exit
} else {

// --- Sound sets: each set has multiple WAV variants for variety ---
const SOUND_SETS = {
  click1: ['click1/click1_1.wav','click1/click1_2.wav','click1/click1_3.wav'],
  click2: ['click2/click2_1.wav','click2/click2_2.wav','click2/click2_3.wav'],
  click3: ['click3/click3_1.wav','click3/click3_2.wav','click3/click3_3.wav'],
  click4: ['click4/click4_1.wav','click4/click4_2.wav','click4/click4_3.wav','click4/click4_4.wav','click4/click4_5.wav','click4/click4_6.wav'],
  click5: ['click5/click5_1.wav','click5/click5_2.wav','click5/click5_3.wav','click5/click5_4.wav','click5/click5_5.wav','click5/click5_6.wav'],
  click6: ['click6/click6_1.wav','click6/click6_2.wav','click6/click6_3.wav'],
  click7: ['click7/click7_1.wav','click7/click7_2.wav','click7/click7_3.wav'],
  click14: ['click14/click14_1.wav','click14/click14_2.wav','click14/click14_3.wav','click14/click14_4.wav','click14/click14_5.wav','click14/click14_6.wav','click14/click14_7.wav','click14/click14_8.wav'],
  click15: ['click15/click15_1.wav','click15/click15_2.wav','click15/click15_3.wav','click15/click15_4.wav','click15/click15_5.wav'],
  click16: ['click16/click16_1.wav','click16/click16_2.wav','click16/click16_3.wav','click16/click16_4.wav','click16/click16_5.wav','click16/click16_6.wav','click16/click16_7.wav','click16/click16_8.wav','click16/click16_9.wav','click16/click16_10.wav','click16/click16_11.wav'],
};

let settings = { enabled: true, volume: 0.5, soundStyle: 'click1' };

// Cache decoded AudioBuffers per file
let audioContext = null;
const bufferCache = {};
const loadingSet = new Set();

function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
}

async function loadBuffer(path) {
  if (bufferCache[path]) return bufferCache[path];
  if (loadingSet.has(path)) return null;
  loadingSet.add(path);
  try {
    const url = chrome.runtime.getURL('sound/' + path);
    const res = await fetch(url);
    const ab = await res.arrayBuffer();
    bufferCache[path] = await audioContext.decodeAudioData(ab);
  } catch(e) {}
  loadingSet.delete(path);
  return bufferCache[path] || null;
}

async function preloadSet(setKey) {
  initAudioContext();
  const paths = SOUND_SETS[setKey];
  if (!paths) return;
  for (const p of paths) loadBuffer(p);
}

// Preload default set on startup
chrome.storage.sync.get(['enabled','volume','soundStyle'], (res) => {
  if (chrome.runtime.lastError) return;
  settings = { ...settings, ...res };
  preloadSet(settings.soundStyle);
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled)    settings.enabled    = changes.enabled.newValue;
  if (changes.volume)     settings.volume     = changes.volume.newValue;
  if (changes.soundStyle) {
    settings.soundStyle = changes.soundStyle.newValue;
    preloadSet(settings.soundStyle);
  }
});

async function playKeyboardSound() {
  try {
    initAudioContext();
    const paths = SOUND_SETS[settings.soundStyle];
    if (!paths) return;
    // pick a random variant
    const path = paths[Math.floor(Math.random() * paths.length)];
    let buf = bufferCache[path];
    if (!buf) { buf = await loadBuffer(path); }
    if (!buf) return;

    const source = audioContext.createBufferSource();
    source.buffer = buf;
    const gain = audioContext.createGain();
    gain.gain.value = settings.volume;
    source.connect(gain);
    gain.connect(audioContext.destination);
    source.start();
  } catch(e) {}
}

window.addEventListener('keydown', function(e) {
  if (!settings.enabled || e.repeat) return;
  playKeyboardSound();
}, true);

} // end chrome check
