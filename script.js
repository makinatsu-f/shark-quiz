const ASSET = "assets/";

const sharks = [
  { file: "hammerhead_shark.png", name: "シュモクザメ" },
  { file: "sand_tiger_shark.png", name: "シロワニ" },
  { file: "whale_shark.png", name: "ジンベエザメ" },
  { file: "tiger_shark.png", name: "トラフザメ" },
  { file: "horn_shark.png", name: "ネコザメ" },
  { file: "great_white_shark.png", name: "ホホジロザメ" }
];

const decorAssets = [
  {file:"jellyfish.png", cls:"jelly", min:3, max:4, size:[58,90], y:[10,46]},
  {file:"bubbles.png", cls:"bubble", min:3, max:5, size:[42,86], y:[10,65]},
  {file:"small_fish.png", cls:"fish", min:1, max:2, size:[100,170], y:[8,32]},
  {file:"seaweed_blue.png", cls:"seaweed", min:2, max:3, size:[110,190], y:[68,92]},
  {file:"seaweed_pink.png", cls:"seaweed", min:1, max:2, size:[110,190], y:[68,92]},
  {file:"rock_cluster.png", cls:"rock", min:1, max:1, size:[100,175], y:[72,91]},
  {file:"rock_small.png", cls:"rock", min:1, max:2, size:[55,105], y:[74,94]},
  {file:"rock_tall.png", cls:"rock", min:1, max:1, size:[75,125], y:[70,90]},
  {file:"starfish_blue.png", cls:"star", min:0, max:1, size:[55,105], y:[76,92]},
  {file:"starfish_pink.png", cls:"star", min:1, max:1, size:[55,105], y:[74,91]},
  {file:"urchin.png", cls:"urchin", min:1, max:2, size:[50,90], y:[78,94]}
];

const comments = [
  "控えめに言って、サメ猛者だな？",
  "……さては、サメ博士だな？",
  "これはもう、サメ博士だな？",
  "サメ、わかりすぎじゃない？",
  "その速さ……サメ博士だな？",
  "おぬし……サメに詳しいな？",
  "まさか……サメのプロ？",
  "サメを見る目が違うな？",
  "その正解速度、ただ者じゃないな？",
  "そのサメ愛、ただものじゃないな？",
  "サメの気配、読んでたな？",
  "これは……サメの申し子！？"
];

const answerNames = sharks.map(s => s.name);
const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");
const startBtn = document.getElementById("startBtn");
const challengeBtn = document.getElementById("challengeBtn");
const againBtn = document.getElementById("againBtn");
const homeBtn = document.getElementById("homeBtn");
const answerGrid = document.getElementById("answerGrid");
const questionNo = document.getElementById("questionNo");
const timerEl = document.getElementById("timer");
const totalTimeEl = document.getElementById("totalTime");
const resultCommentEl = document.getElementById("resultComment");
const decorLayer = document.getElementById("decorLayer");
const canvas = document.getElementById("sharkCanvas");
const ctx = canvas.getContext("2d");
const flash = document.getElementById("correctFlash");
const wrongSound = new Audio(ASSET + "wrong.mp3.wav");
const correctSound = new Audio(ASSET + "correct.mp3.wav");
const deepSeaDash = new Audio(ASSET + "deep_sea_dash.mp3");
deepSeaDash.volume = 0.3;
deepSeaDash.loop = true;

let currentShark = null;
let questionIndex = 0;
let questionStart = 0;
let totalElapsed = 0;
let challengeScore = 0;
let rafId = 0;
let sharkImage = new Image();
let sharkReady = false;
let revealShark = false;
let sharkX = 0.5;
let sharkY = 0.47;
let sharkDrift = 0;
let sharkDriftDir = 1;
let nextDriftChange = 0;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

function setupDecor() {
  decorLayer.innerHTML = "";
  for (const spec of decorAssets) {
    const count = randomInt(spec.min, spec.max);
    for (let i=0;i<count;i++) {
      const img = document.createElement("img");
      img.className = `decor ${spec.cls}`;
      img.src = ASSET + spec.file;
      const size = randomInt(spec.size[0], spec.size[1]);
      const x = randomInt(8,92);
      const y = randomInt(spec.y[0],spec.y[1]);
      const dur = randomInt(4,10) + (Math.random()*2).toFixed(1);
      img.style.setProperty("--size", `${size}px`);
      img.style.left = `${x}%`;
      img.style.top = `${y}%`;
      img.style.setProperty("--dur", `${dur}s`);
      img.style.setProperty("--opacity", `${(0.72 + Math.random()*0.25).toFixed(2)}`);
      img.style.animationDelay = `${(-Math.random()*6).toFixed(2)}s`;
      // Keep the quiz target visually dominant.
      if (spec.cls === "rock" || spec.cls === "urchin" || spec.cls === "star") {
        img.style.zIndex = "5";
      } else {
        img.style.zIndex = "2";
      }
      decorLayer.appendChild(img);
    }
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width*dpr));
  canvas.height = Math.max(1, Math.floor(rect.height*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener("resize", resizeCanvas);

function loadShark(shark) {
  sharkReady = false;
  sharkImage = new Image();
  sharkImage.onload = () => {
    sharkReady = true;
  };
  sharkImage.src = ASSET + shark.file;
}

function drawMosaicImage(img, timeMs) {
  if (!sharkReady) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0,0,w,h);

  // Shark gently swims left/right.
  if (timeMs > nextDriftChange) {
    sharkDriftDir *= -1;
    nextDriftChange = timeMs + 1800 + Math.random()*1600;
  }
  sharkDrift += sharkDriftDir * 0.00022;
  sharkDrift = clamp(sharkDrift,-0.055,0.055);

  // Fit the square source inside the canvas while keeping the shark large.
  const maxW = w * 0.88;
  const maxH = h * 0.80;
  const scale = Math.min(maxW/img.naturalWidth, maxH/img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = w*(0.5 + sharkDrift);
  const cy = h*0.50;
  const dx = cx - dw/2;
  const dy = cy - dh/2;
  
  if (revealShark) {
  ctx.drawImage(img, dx, dy, dw, dh);
  return;
}

  // Continuous pixelation: starts very coarse, gradually becomes clear.
  const elapsed = Math.max(0, performance.now() - questionStart);
  const progress = clamp(elapsed / 10000, 0, 1);
  const eased = progress * progress * (3 - 2*progress);
  const cells = Math.round(8 + eased * 120);
  const smallW = Math.max(8, Math.round(dw * cells / 220));
  const smallH = Math.max(8, Math.round(dh * cells / 220));

  const off = drawMosaicImage.off || (drawMosaicImage.off = document.createElement("canvas"));
  off.width = smallW;
  off.height = smallH;
  const octx = off.getContext("2d");
  octx.clearRect(0,0,smallW,smallH);
  octx.imageSmoothingEnabled = true;
  octx.drawImage(img,0,0,smallW,smallH);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off,dx,dy,dw,dh);
  ctx.restore();
}

function animationLoop(now) {
  drawMosaicImage(sharkImage, now);
  const elapsed = (performance.now()-questionStart)/1000;
  timerEl.textContent = Math.max(0,elapsed).toFixed(2);

  if (challengeMode && performance.now() >= challengeEndTime) {
  finishChallenge();
  return;
}
  
  rafId = requestAnimationFrame(animationLoop);
}

function renderAnswers() {
  answerGrid.innerHTML = "";
  shuffle(answerNames).forEach(name => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = name;
    btn.addEventListener("click", () => chooseAnswer(name, btn));
    answerGrid.appendChild(btn);
  });
}

function chooseAnswer(name, btn) {
  if (!currentShark) return;
  if (name !== currentShark.name) {
    btn.classList.remove("wrong");
    void btn.offsetWidth;
    btn.classList.add("wrong");
    if (navigator.vibrate) navigator.vibrate(85);
    wrongSound.currentTime = 0;
　　wrongSound.play();
    return;
  }

  const elapsed = performance.now() - questionStart;
  totalElapsed += elapsed;

  if (challengeMode) {
  challengeScore++;
}

  correctSound.currentTime = 0;
　correctSound.play();
  
  revealShark = true;
  flash.classList.remove("show");
  void flash.offsetWidth;
  flash.classList.add("show");

  // Stop accepting clicks during the tiny transition.
  currentShark = null;
  setTimeout(() => {
    questionIndex++;
    if (!challengeMode && questionIndex >= 10) {
      finishGame();
    } else {
      startQuestion();
    }
  }, 220);
}

function startQuestion() {
  revealShark = false;
  currentShark = sharks[Math.floor(Math.random()*sharks.length)];
  questionNo.textContent = questionIndex + 1;
  timerEl.textContent = "0.00";
  questionStart = performance.now();
  sharkX = 0.5;
  sharkDrift = 0;
  sharkDriftDir = Math.random()<.5 ? -1 : 1;
  nextDriftChange = performance.now()+1400;
  loadShark(currentShark);
  setupDecor();
  renderAnswers();
}
let challengeEndTime = 0;

function startGame() {
  cancelAnimationFrame(rafId);
  startScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  questionIndex = 0;
  totalElapsed = 0;
  challengeScore = 0;

  if (challengeMode) {
  challengeEndTime = performance.now() + 31000;
}
  
  resizeCanvas();
  startQuestion();
  rafId = requestAnimationFrame(animationLoop);
}

function finishGame() {
  cancelAnimationFrame(rafId);
  const seconds = (totalElapsed/1000).toFixed(2);
  totalTimeEl.innerHTML = `${seconds}<span>秒</span>`;
  resultCommentEl.textContent = comments[Math.floor(Math.random()*comments.length)];
  gameScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");
}

function finishChallenge() {
  cancelAnimationFrame(rafId);
　deepSeaDash.pause();
  
  totalTimeEl.innerHTML = `30<span>秒</span>`;
  resultCommentEl.textContent = `30秒で ${challengeScore}問正解！`;

  gameScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");
}
let challengeMode = false;

startBtn.addEventListener("click", startGame);

challengeBtn.addEventListener("click", () => {
  challengeMode = true;
  deepSeaDash.currentTime = 0;
  deepSeaDash.play();
  startGame();
});

againBtn.addEventListener("click", () => {
  if (challengeMode) {
    deepSeaDash.currentTime = 0;
    deepSeaDash.play();
  }

  startGame();
});

homeBtn.addEventListener("click", () => {
  deepSeaDash.pause();
  deepSeaDash.currentTime = 0;

  resultScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
});
