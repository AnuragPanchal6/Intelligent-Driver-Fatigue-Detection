import {
  loadModel,
  detect,
  metrics,
  drawOverlay,
  beginCalibration,
  isCalibrating,
  calibrationTick,
  thresholds,
} from "./vision.js";

const DROWSY_FRAMES = 20;
const YAWN_FRAMES = 15;

const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const banner = document.getElementById("banner");
const calBanner = document.getElementById("calBanner");
const btnStart = document.getElementById("btnStart");
const btnCalibrate = document.getElementById("btnCalibrate");
const captureLed = document.getElementById("captureLed");
const captureText = document.getElementById("captureText");
const stateLight = document.getElementById("stateLight");
const mEar = document.getElementById("mEar");
const mLip = document.getElementById("mLip");
const mFps = document.getElementById("mFps");
const thEar = document.getElementById("thEar");
const thLip = document.getElementById("thLip");
const ledDrowsy = document.getElementById("ledDrowsy");
const ledYawn = document.getElementById("ledYawn");
const rowDrowsy = document.getElementById("rowDrowsy");
const rowYawn = document.getElementById("rowYawn");
const cBlinks = document.getElementById("cBlinks");
const calStatus = document.getElementById("calStatus");

let stream = null;
let rafId = null;
let modelReady = false;
let running = false;
let blinkCount = 0;
let yawnConsec = 0;
let closedCount = 0;
let wasClosed = false;
let drowsy = false;
let yawning = false;
let fpsFrames = 0;
let fpsTime = performance.now();
let fps = 0;

let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function beep() {
  ensureAudio();
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1000, t);
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.45);
}

function setBanner(text, cls) {
  banner.textContent = text;
  banner.className = `banner ${cls || ""}`;
}

function setCalBanner(text) {
  calBanner.textContent = text;
  calBanner.className = "banner cal";
}

function setState(cls, label) {
  stateLight.className = `state-light ${cls}`;
  stateLight.textContent = label;
}

function setLed(led, state) {
  led.className = `led led-sm ${state}`;
}

function syncAlerts() {
  if (drowsy) {
    setLed(ledDrowsy, "led-danger");
    rowDrowsy.classList.add("active");
  } else {
    setLed(ledDrowsy, "led-off");
    rowDrowsy.classList.remove("active");
  }
  if (yawning) {
    setLed(ledYawn, "led-warn");
    rowYawn.classList.add("active");
  } else {
    setLed(ledYawn, "led-off");
    rowYawn.classList.remove("active");
  }
}

function priorityAlert() {
  if (drowsy) {
    setState("state-drowsy", "Drowsy");
    setBanner("DROWSINESS ALERT!", "danger");
    return;
  }
  if (yawning) {
    setState("state-yawn", "Yawning");
    setBanner("YAWN ALERT!", "danger");
    return;
  }
  setState("state-monitoring", "Monitoring");
  banner.classList.add("hidden");
}

function measureFps() {
  fpsFrames += 1;
  const now = performance.now();
  if (now - fpsTime >= 1000) {
    fps = Math.round((fpsFrames * 1000) / (now - fpsTime));
    fpsFrames = 0;
    fpsTime = now;
  }
  mFps.textContent = fps;
}

function processAlertLogic(m) {
  const { eyeThresh, yawnThresh } = thresholds();

  if (m.ear < eyeThresh) {
    closedCount += 1;
    wasClosed = true;
  } else {
    if (wasClosed) {
      if (closedCount < DROWSY_FRAMES) {
        blinkCount += 1;
        cBlinks.textContent = blinkCount;
      }
      wasClosed = false;
      closedCount = 0;
    }
  }

  if (closedCount >= DROWSY_FRAMES) {
    if (!drowsy) beep();
    drowsy = true;
  } else {
    drowsy = false;
  }

  if (m.lip > yawnThresh) {
    yawnConsec += 1;
    if (yawnConsec >= YAWN_FRAMES && !yawning) {
      yawning = true;
      beep();
    }
  } else {
    yawnConsec = 0;
    yawning = false;
  }
}

function loop() {
  if (!running) return;
  rafId = requestAnimationFrame(loop);
  measureFps();

  const hasFace = detect(video);
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.drawImage(video, 0, 0, w, h);

  const m = metrics(w, h);
  if (m) {
    mEar.textContent = m.ear.toFixed(2);
    mLip.textContent = m.lip.toFixed(1);
  } else {
    mEar.textContent = "--";
    mLip.textContent = "--";
  }

  drawOverlay(ctx, w, h);

  if (isCalibrating()) {
    const tick = calibrationTick(hasFace, m);
    if (tick && !tick.done) {
      setCalBanner(`Calibrating… ${tick.samples}/${tick.target} samples (keep facing camera)`);
    }
    if (tick && tick.done) {
      const { eyeThresh, yawnThresh } = thresholds();
      thEar.textContent = eyeThresh.toFixed(2);
      thLip.textContent = yawnThresh.toFixed(1);
      calBanner.classList.add("hidden");
      if (tick.partial) {
        calStatus.textContent = tick.samples > 0
          ? "Calibration ended early (limited face time) — using partial baseline."
          : "No face seen during calibration — using default thresholds.";
      } else {
        calStatus.textContent = `Calibrated on ${tick.samples} frames. Roll started.`;
      }
      btnCalibrate.disabled = false;
    }
    setState("state-monitoring", "Calibrating");
    banner.classList.add("hidden");
    return;
  }

  if (m) {
    processAlertLogic(m);
  } else {
    closedCount = 0;
    yawnConsec = 0;
    wasClosed = false;
    drowsy = false;
    yawning = false;
  }

  syncAlerts();
  priorityAlert();
}

async function start() {
  ensureAudio();
  btnStart.disabled = true;
  btnStart.textContent = "Loading…";
  calStatus.textContent = "Loading AI model…";
  setCalBanner("Loading detection model…");

  if (!modelReady) {
    await loadModel();
    modelReady = true;
  }

  stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  running = true;
  blinkCount = 0;
  cBlinks.textContent = "0";
  setLed(captureLed, "led-on");
  captureText.textContent = "Camera running";
  btnStart.textContent = "Stop Camera";
  btnStart.disabled = false;
  beginCalibration();
  calStatus.textContent = "Calibrating… look at the camera.";
  setCalBanner("Calibrating… look at the camera.");
  btnCalibrate.disabled = true;
  loop();
}

function stop() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setLed(captureLed, "led-off");
  captureText.textContent = "Camera stopped";
  btnStart.textContent = "Start Camera";
  btnStart.disabled = false;
  setState("state-monitoring", "Monitoring");
  banner.classList.add("hidden");
  calBanner.classList.add("hidden");
  calStatus.textContent = "Press Start Camera to begin calibration.";
  btnCalibrate.disabled = true;
}

btnStart.addEventListener("click", () => {
  if (running) {
    stop();
  } else {
    start().catch((err) => {
      console.error(err);
      calStatus.textContent = `Failed to start: ${err.message}`;
      btnStart.textContent = "Start Camera";
      btnStart.disabled = false;
      btnCalibrate.disabled = true;
    });
  }
});

btnCalibrate.addEventListener("click", () => {
  beginCalibration();
  calStatus.textContent = "Calibrating… look at the camera.";
  setCalBanner("Calibrating… look at the camera.");
  btnCalibrate.disabled = true;
  blinkCount = 0;
  cBlinks.textContent = "0";
  drowsy = false;
  yawning = false;
  closedCount = 0;
  yawnConsec = 0;
  wasClosed = false;
  syncAlerts();
});

window.addEventListener("error", (e) => {
  if (e && e.message && e.message.indexOf("SecurityError") > -1) {
    calStatus.textContent = "Camera blocked. Allow camera access and retry.";
  }
});

setState("state-monitoring", "Monitoring");