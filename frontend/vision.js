import { FilesetResolver, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const EYE_L = [33, 160, 158, 133, 153, 144];
const EYE_R = [362, 385, 387, 263, 373, 380];
const LIP_TOP = 13;
const LIP_BOTTOM = 14;
const CORNER_L = 33;
const CORNER_R = 263;
const EYE_RING_L = [33, 7, 163, 144, 145, 153, 154, 155, 133, 246];
const EYE_RING_R = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466];
const MOUTH_RING = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];

const CAL_SAMPLES = 30;
const MAX_CAL_FRAMES = 500;
const EAR_FACTOR = 0.85;
const YAWN_FACTOR = 2.5;

let faceLandmarker = null;
let currentLandmarks = null;
let calibrating = false;
let calFrames = 0;
let calSamples = 0;
let earSum = 0;
let lipSum = 0;
let eyeThresh = 0.25;
let yawnThresh = 18;

export async function loadModel() {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces: 1,
  });
  return faceLandmarker;
}

export function detect(video) {
  const result = faceLandmarker.detectForVideo(video, performance.now());
  currentLandmarks =
    result.faceLandmarks && result.faceLandmarks.length ? result.faceLandmarks[0] : null;
  return currentLandmarks;
}

function dist(a, b, w, h) {
  const dx = (a.x - b.x) * w;
  const dy = (a.y - b.y) * h;
  return Math.hypot(dx, dy);
}

export function metrics(w, h) {
  if (!currentLandmarks) return null;
  const lm = currentLandmarks;
  const earL =
    (dist(lm[EYE_L[1]], lm[EYE_L[5]], w, h) + dist(lm[EYE_L[2]], lm[EYE_L[4]], w, h)) /
    (2 * dist(lm[EYE_L[0]], lm[EYE_L[3]], w, h));
  const earR =
    (dist(lm[EYE_R[1]], lm[EYE_R[5]], w, h) + dist(lm[EYE_R[2]], lm[EYE_R[4]], w, h)) /
    (2 * dist(lm[EYE_R[0]], lm[EYE_R[3]], w, h));
  const ear = (earL + earR) / 2;
  const lip = dist(lm[LIP_TOP], lm[LIP_BOTTOM], w, h);
  return { ear, lip };
}

export function drawOverlay(ctx, w, h) {
  if (!currentLandmarks) return;
  const lm = currentLandmarks;
  ctx.strokeStyle = "rgba(63, 185, 80, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  EYE_RING_L.concat(EYE_RING_L[0]).forEach((idx, i) => {
    const p = lm[idx];
    if (i === 0) ctx.moveTo(p.x * w, p.y * h);
    else ctx.lineTo(p.x * w, p.y * h);
  });
  ctx.stroke();
  ctx.beginPath();
  EYE_RING_R.concat(EYE_RING_R[0]).forEach((idx, i) => {
    const p = lm[idx];
    if (i === 0) ctx.moveTo(p.x * w, p.y * h);
    else ctx.lineTo(p.x * w, p.y * h);
  });
  ctx.stroke();
  ctx.beginPath();
  MOUTH_RING.concat(MOUTH_RING[0]).forEach((idx, i) => {
    const p = lm[idx];
    if (i === 0) ctx.moveTo(p.x * w, p.y * h);
    else ctx.lineTo(p.x * w, p.y * h);
  });
  ctx.stroke();
  ctx.fillStyle = "rgba(88, 166, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(lm[EYE_L[0]].x * w, lm[EYE_L[0]].y * h, 2, 0, Math.PI * 2);
  ctx.arc(lm[EYE_R[0]].x * w, lm[EYE_R[0]].y * h, 2, 0, Math.PI * 2);
  ctx.arc(lm[CORNER_L].x * w, lm[CORNER_L].y * h, 2, 0, Math.PI * 2);
  ctx.arc(lm[CORNER_R].x * w, lm[CORNER_R].y * h, 2, 0, Math.PI * 2);
  ctx.fill();
}

export function beginCalibration() {
  calibrating = true;
  calFrames = 0;
  calSamples = 0;
  earSum = 0;
  lipSum = 0;
}

export function isCalibrating() {
  return calibrating;
}

export function calibrationTick(hasFace, m) {
  if (!calibrating) return null;
  calFrames += 1;
  if (hasFace && m) {
    calSamples += 1;
    earSum += m.ear;
    lipSum += m.lip;
  }
  if (calSamples >= CAL_SAMPLES) {
    eyeThresh = (earSum / calSamples) * EAR_FACTOR;
    yawnThresh = (lipSum / calSamples) * YAWN_FACTOR;
    calibrating = false;
    return { done: true, partial: false, samples: calSamples };
  }
  if (calFrames >= MAX_CAL_FRAMES) {
    if (calSamples > 0) {
      eyeThresh = (earSum / calSamples) * EAR_FACTOR;
      yawnThresh = (lipSum / calSamples) * YAWN_FACTOR;
    }
    calibrating = false;
    return { done: true, partial: true, samples: calSamples };
  }
  return { done: false, samples: calSamples, target: CAL_SAMPLES };
}

export function thresholds() {
  return { eyeThresh, yawnThresh };
}