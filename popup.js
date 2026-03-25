const SOUND_SETS = {
  click1:  { label: 'Osu', icon: '🌸' },
  click2:  { label: 'Hitokage', icon: '🔥' },
  click3:  { label: 'Semimecha', icon: '⚙️' },
  click4:  { label: 'Lubed', icon: '🧈' },
  click5:  { label: 'Nk cream', icon: '🎵' },
  click6:  { label: 'Topre', icon: '💎' },
  click7:  { label: 'Mx Black', icon: '🖤' },
  click14: { label: 'Stealth', icon: '🌙' },
  click15: { label: 'Box Pink', icon: '🌸' },
  click16: { label: 'Gateron Yellow', icon: '💛' },
};

const SOUND_FILE_MAP = {
  click1:  ['click1/click1_1.wav','click1/click1_2.wav','click1/click1_3.wav'],
  click2:  ['click2/click2_1.wav','click2/click2_2.wav','click2/click2_3.wav'],
  click3:  ['click3/click3_1.wav','click3/click3_2.wav','click3/click3_3.wav'],
  click4:  ['click4/click4_1.wav','click4/click4_2.wav','click4/click4_3.wav'],
  click5:  ['click5/click5_1.wav','click5/click5_2.wav','click5/click5_3.wav'],
  click6:  ['click6/click6_1.wav','click6/click6_2.wav','click6/click6_3.wav'],
  click7:  ['click7/click7_1.wav','click7/click7_2.wav','click7/click7_3.wav'],
  click14: ['click14/click14_1.wav','click14/click14_2.wav','click14/click14_3.wav'],
  click15: ['click15/click15_1.wav','click15/click15_2.wav','click15/click15_3.wav'],
  click16: ['click16/click16_1.wav','click16/click16_2.wav','click16/click16_3.wav'],
};

let audioContext = null;
const bufferCache = {};

function initAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

async function loadBuffer(path) {
  if (bufferCache[path]) return bufferCache[path];
  initAudio();
  try {
    const url = chrome.runtime.getURL('sound/' + path);
    const res = await fetch(url);
    const ab = await res.arrayBuffer();
    bufferCache[path] = await audioContext.decodeAudioData(ab);
  } catch(e) {}
  return bufferCache[path] || null;
}

async function playPreview(setKey, volume) {
  const paths = SOUND_FILE_MAP[setKey];
  if (!paths) return;
  const path = paths[Math.floor(Math.random() * paths.length)];
  const buf = await loadBuffer(path);
  if (!buf) return;
  initAudio();
  const source = audioContext.createBufferSource();
  source.buffer = buf;
  const gain = audioContext.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(audioContext.destination);
  source.start();
}

// Build the grid of style buttons
function buildStyleGrid(currentStyle) {
  const grid = document.getElementById('styleGrid');
  grid.innerHTML = '';
  Object.entries(SOUND_SETS).forEach(([key, info]) => {
    const btn = document.createElement('button');
    btn.className = 'style-btn' + (key === currentStyle ? ' active' : '');
    btn.dataset.style = key;
    btn.innerHTML = `<span class="style-icon">${info.icon}</span><span class="style-name">${info.label}</span>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      chrome.storage.sync.set({ soundStyle: key });
      chrome.storage.sync.get(['volume'], (res) => {
        playPreview(key, res.volume !== undefined ? res.volume : 0.5);
      });
    });
    grid.appendChild(btn);
  });
}

// Init
chrome.storage.sync.get(['enabled','volume','soundStyle'], (res) => {
  const enabled     = res.enabled     !== undefined ? res.enabled     : true;
  const savedVolume = res.volume      !== undefined ? res.volume      : 0.5;
  const soundStyle  = res.soundStyle  || 'click1';

  document.getElementById('enableToggle').checked = enabled;
  document.getElementById('volumeSlider').value   = Math.round(savedVolume * 100);
  document.getElementById('volDisplay').textContent = Math.round(savedVolume * 100) + '%';

  buildStyleGrid(soundStyle);
});

document.getElementById('enableToggle').addEventListener('change', (e) => {
  chrome.storage.sync.set({ enabled: e.target.checked });
});

document.getElementById('volumeSlider').addEventListener('input', (e) => {
  const pct = parseInt(e.target.value);
  document.getElementById('volDisplay').textContent = pct + '%';
  chrome.storage.sync.set({ volume: pct / 100 });
});
