const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const LANDMARKER_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm";
const ORT_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/";
const YUNET_URL = new URL("yunet.onnx", import.meta.url).href;
const YUNET_STRIDES = [8, 16, 32];
const YUNET_MAX_SIDE = 320;
const YUNET_SCORE = 0.6;
const YUNET_NMS = 0.3;
const OWL_MODEL = "Xenova/owlvit-base-patch32";
const OWL_LOCAL = new URL("models/", import.meta.url).href;
const OWL_ONNX_PARTS = ["model_quantized.onnx.part0", "model_quantized.onnx.part1"];
const OWL_LABELS = ["a human face", "a painted face", "a drawn face", "a smiley face"];
const MAX_FACES = 3;
const MIN_FACE_SIZE = 0.14;
const OWL_THRESHOLD = 0.1;

const hint = document.getElementById("hint");
const liveStage = document.getElementById("live-stage");
const paintStage = document.getElementById("paint-stage");
const liveDock = document.getElementById("live-dock");
const paintDock = document.getElementById("paint-dock");
const tabButtons = document.querySelectorAll(".tabs [data-tab]");

const video = document.getElementById("webcam");
const liveCanvas = document.getElementById("live-canvas");
const liveCtx = liveCanvas.getContext("2d");
const startBtn = document.getElementById("start-btn");
const flipBtn = document.getElementById("flip-btn");
const liveModelSelect = document.getElementById("live-model");

const still = document.getElementById("still");
const paintCanvas = document.getElementById("paint-canvas");
const paintCtx = paintCanvas.getContext("2d");
const fileInput = document.getElementById("file-input");
const fileBtn = document.getElementById("file-btn");
const paintBusy = document.getElementById("paint-busy");
const paintBusyText = document.getElementById("paint-busy-text");

const STATUS = {
  mediapipeLoading: "در حال بارگذاری MediaPipe Face Landmarker…",
  mediapipeReady: "MediaPipe Face Landmarker آماده است.",
  mediapipeFail: "بارگذاری MediaPipe Face Landmarker شکست خورد.",
  yunetLoading: "در حال بارگذاری YuNet…",
  yunetReady: "YuNet آماده است.",
  yunetFail: "بارگذاری YuNet شکست خورد.",
  owlLoading: "در حال بارگذاری مدل تصویر…",
  owlReady: "مدل تصویر آماده است.",
  owlFail: "بارگذاری مدل تصویر شکست خورد."
};

let tab = "live";
let liveModel = liveModelSelect.value === "yunet" ? "yunet" : "mediapipe";
let FaceLandmarker;
let drawingUtils;
let faceLandmarker;
let loadingLandmarker = false;
let lastVideoTime = -1;
let lastTimestamp = 0;
let running = false;
let starting = false;
let facingMode = "user";
let pageVisible = true;

let owlDetector = null;
let loadingOwl = false;
let checking = false;
let stillUrl = "";

let yunetSession = null;
let loadingYunet = false;
let yunetBusy = false;
let ortLib;
const yunetFrame = document.createElement("canvas");
const yunetFrameCtx = yunetFrame.getContext("2d", { willReadFrequently: true });

function setHint(text) {
  hint.innerHTML = text ? `<p>${text}</p>` : "";
}

function setBusy(on, text) {
  paintBusy.classList.toggle("hidden", !on);
  fileBtn.classList.toggle("busy", on);
  fileInput.disabled = on;
  if (text) {
    paintBusyText.textContent = text;
    setHint(text);
  }
}

function yieldPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function setMirrored(mirror) {
  video.classList.toggle("mirror", mirror);
  liveCanvas.classList.toggle("mirror", mirror && liveModel !== "yunet");
}

function syncMirror() {
  setMirrored(facingMode === "user");
}

function stopStream() {
  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

function liveHint() {
  if (liveModel === "yunet") {
    if (yunetSession) return STATUS.yunetReady;
    if (loadingYunet) return STATUS.yunetLoading;
    return "";
  }
  if (faceLandmarker) return STATUS.mediapipeReady;
  if (loadingLandmarker) return STATUS.mediapipeLoading;
  return "";
}

function showLiveHint() {
  if (tab === "live") setHint(liveHint());
}

function switchTab(next) {
  if (next === tab) return;
  tab = next;
  const live = tab === "live";
  liveStage.classList.toggle("hidden", !live);
  liveDock.classList.toggle("hidden", !live);
  paintStage.classList.toggle("hidden", live);
  paintDock.classList.toggle("hidden", live);
  for (const button of tabButtons) {
    button.classList.toggle("active", button.dataset.tab === tab);
  }
  if (!live && running) stopLive();
  if (live) {
    showLiveHint();
    if (liveModel === "yunet") initYunet();
    else initLandmarker();
  } else {
    if (loadingOwl) setHint(STATUS.owlLoading);
    else if (owlDetector) setHint(STATUS.owlReady);
    else setHint("");
    initOwl();
  }
}

function setLiveModel(next) {
  const model = next === "yunet" ? "yunet" : "mediapipe";
  if (model === liveModel) return;
  liveModel = model;
  liveModelSelect.value = model;
  lastVideoTime = -1;
  liveCtx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
  syncMirror();
  showLiveHint();
  if (model === "yunet") initYunet();
  else initLandmarker();
}

async function loadMediaPipe() {
  if (FaceLandmarker) return;
  const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14");
  FaceLandmarker = vision.FaceLandmarker;
  drawingUtils = new vision.DrawingUtils(liveCtx);
}

async function createLandmarker(delegate) {
  const filesetResolver = await visionFileset();
  return FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: { modelAssetPath: LANDMARKER_URL, delegate },
    runningMode: "VIDEO",
    numFaces: MAX_FACES,
    minFaceDetectionConfidence: 0.6,
    minFacePresenceConfidence: 0.6,
    minTrackingConfidence: 0.5
  });
}

let filesetResolver;
async function visionFileset() {
  if (!filesetResolver) {
    const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14");
    filesetResolver = await vision.FilesetResolver.forVisionTasks(WASM_URL);
  }
  return filesetResolver;
}

let landmarkerReady;

async function initLandmarker() {
  if (faceLandmarker) return;
  if (landmarkerReady) return landmarkerReady;
  loadingLandmarker = true;
  landmarkerReady = (async () => {
    showLiveHint();
    try {
      await loadMediaPipe();
      try {
        faceLandmarker = await createLandmarker("GPU");
      } catch {
        faceLandmarker = await createLandmarker("CPU");
      }
      loadingLandmarker = false;
      showLiveHint();
    } catch (err) {
      landmarkerReady = null;
      loadingLandmarker = false;
      if (tab === "live" && liveModel === "mediapipe") setHint(STATUS.mediapipeFail);
      throw err;
    } finally {
      loadingLandmarker = false;
    }
  })();
  return landmarkerReady;
}

let yunetReady;

async function loadOrt() {
  if (ortLib) return ortLib;
  const ort = await import(`${ORT_CDN}ort.wasm.min.mjs`);
  ort.env.wasm.wasmPaths = ORT_CDN;
  ort.env.wasm.numThreads = 1;
  ortLib = ort;
  return ort;
}

async function initYunet() {
  if (yunetSession) return;
  if (yunetReady) return yunetReady;
  loadingYunet = true;
  yunetReady = (async () => {
    showLiveHint();
    try {
      const ort = await loadOrt();
      yunetSession = await ort.InferenceSession.create(YUNET_URL, {
        executionProviders: ["wasm"]
      });
      loadingYunet = false;
      showLiveHint();
    } catch (err) {
      yunetReady = null;
      yunetSession = null;
      loadingYunet = false;
      if (tab === "live" && liveModel === "yunet") setHint(STATUS.yunetFail);
      throw err;
    } finally {
      loadingYunet = false;
    }
  })();
  return yunetReady;
}

function yunetInputSize(width, height) {
  const scale = YUNET_MAX_SIDE / Math.max(width, height);
  return {
    w: Math.max(32, Math.round((width * scale) / 32) * 32),
    h: Math.max(32, Math.round((height * scale) / 32) * 32)
  };
}

function decodeYunet(outputs, width, height) {
  const faces = [];
  for (const stride of YUNET_STRIDES) {
    const cls = outputs[`cls_${stride}`].data;
    const obj = outputs[`obj_${stride}`].data;
    const bbox = outputs[`bbox_${stride}`].data;
    const kps = outputs[`kps_${stride}`].data;
    const cols = width / stride;
    const count = cls.length;
    for (let i = 0; i < count; i += 1) {
      const score = Math.sqrt(Math.min(1, Math.max(0, cls[i])) * Math.min(1, Math.max(0, obj[i])));
      if (score < YUNET_SCORE) continue;
      const col = i % cols;
      const row = (i / cols) | 0;
      const o = i * 4;
      const k = i * 10;
      const cx = (col + bbox[o]) * stride;
      const cy = (row + bbox[o + 1]) * stride;
      const w = Math.exp(bbox[o + 2]) * stride;
      const h = Math.exp(bbox[o + 3]) * stride;
      faces.push({
        x: cx - w / 2,
        y: cy - h / 2,
        w,
        h,
        score,
        kps: [0, 1, 2, 3, 4].map((p) => ({
          x: (col + kps[k + p * 2]) * stride,
          y: (row + kps[k + p * 2 + 1]) * stride
        }))
      });
    }
  }
  const sorted = faces.sort((a, b) => b.score - a.score);
  const kept = [];
  for (const face of sorted) {
    if (kept.every((other) => iou(face, other) < YUNET_NMS)) kept.push(face);
    if (kept.length >= MAX_FACES) break;
  }
  return kept;
}

async function runYunet(source, srcW, srcH) {
  const { w, h } = yunetInputSize(srcW, srcH);
  if (yunetFrame.width !== w) yunetFrame.width = w;
  if (yunetFrame.height !== h) yunetFrame.height = h;
  yunetFrameCtx.drawImage(source, 0, 0, w, h);
  const pixels = yunetFrameCtx.getImageData(0, 0, w, h).data;
  const plane = w * h;
  const tensor = new Float32Array(plane * 3);
  for (let i = 0; i < plane; i += 1) {
    tensor[i] = pixels[i * 4 + 2];
    tensor[plane + i] = pixels[i * 4 + 1];
    tensor[2 * plane + i] = pixels[i * 4];
  }
  const input = new ortLib.Tensor("float32", tensor, [1, 3, h, w]);
  const outputs = await yunetSession.run({ [yunetSession.inputNames[0]]: input });
  const sx = srcW / w;
  const sy = srcH / h;
  return decodeYunet(outputs, w, h).map((face) => ({
    x: face.x * sx,
    y: face.y * sy,
    w: face.w * sx,
    h: face.h * sy,
    score: face.score,
    kps: face.kps.map((point) => ({ x: point.x * sx, y: point.y * sy }))
  }));
}

async function detectYunetFrame() {
  if (yunetBusy || !yunetSession || video.readyState < 2) return;
  yunetBusy = true;
  try {
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    if (!srcW || !srcH) return;
    const faces = await runYunet(video, srcW, srcH);
    if (tab !== "live" || liveModel !== "yunet" || !running) return;
    const sx = liveCanvas.width / srcW;
    const sy = liveCanvas.height / srcH;
    drawYunet(faces.map((face) => ({
      x: face.x * sx,
      y: face.y * sy,
      w: face.w * sx,
      h: face.h * sy,
      score: face.score,
      kps: face.kps.map((point) => ({ x: point.x * sx, y: point.y * sy }))
    })));
  } catch {
    /* keep last overlay */
  } finally {
    yunetBusy = false;
  }
}

function labelFacing(label) {
  const text = (label || "").toLowerCase();
  if (/back|rear|environment|world/.test(text)) return "environment";
  if (/front|user|selfie/.test(text)) return "user";
  return "";
}

async function chooseCameraId(facing) {
  if (!navigator.mediaDevices?.enumerateDevices) return "";
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput");
  if (!devices.length) return "";
  const match = devices.find((device) => labelFacing(device.label) === facing);
  if (match) return match.deviceId;
  if (devices.length > 1) {
    return facing === "environment" ? devices[devices.length - 1].deviceId : devices[0].deviceId;
  }
  return "";
}

async function getCameraStream(facing, any) {
  if (!window.isSecureContext) throw new Error("secure context required");
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
  const deviceId = await chooseCameraId(facing);
  const attempts = [];
  if (deviceId) {
    attempts.push({ audio: false, video: { deviceId: { exact: deviceId } } });
    attempts.push({ audio: false, video: { deviceId } });
  }
  attempts.push({ audio: false, video: { facingMode: { exact: facing } } });
  attempts.push({ audio: false, video: { facingMode: facing } });
  attempts.push({ audio: false, video: { facingMode: { ideal: facing } } });
  if (any) attempts.push({ audio: false, video: true });
  let lastError;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function applyStreamFacing(stream) {
  const track = stream.getVideoTracks()[0];
  const mode = track && track.getSettings && track.getSettings().facingMode;
  if (mode === "user" || mode === "environment") facingMode = mode;
  syncMirror();
}

async function startWebcam(any) {
  stopStream();
  await new Promise((resolve) => setTimeout(resolve, 40));
  const stream = await getCameraStream(facingMode, any);
  video.srcObject = stream;
  applyStreamFacing(stream);
  if (video.readyState < 1) {
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });
  }
  await video.play();
  lastVideoTime = -1;
}

function syncLiveCanvas() {
  if (video.videoWidth > 0 && liveCanvas.width !== video.videoWidth) {
    liveCanvas.width = video.videoWidth;
  }
  if (video.videoHeight > 0 && liveCanvas.height !== video.videoHeight) {
    liveCanvas.height = video.videoHeight;
  }
}

function boxFromLandmarks(landmarks) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function isRealFace(landmarks) {
  const box = boxFromLandmarks(landmarks);
  if (box.w < MIN_FACE_SIZE || box.h < MIN_FACE_SIZE) return false;
  if (box.h < box.w * 0.75 || box.h > box.w * 2.1) return false;

  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const nose = landmarks[1];
  const mouth = landmarks[13];
  if (!leftEye || !rightEye || !nose || !mouth) return false;

  const eyeDist = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y);
  if (eyeDist < box.w * 0.18 || eyeDist > box.w * 0.72) return false;
  if (Math.abs(leftEye.y - rightEye.y) > box.h * 0.22) return false;

  const eyeY = (leftEye.y + rightEye.y) / 2;
  if (mouth.y <= eyeY) return false;
  if (nose.y <= eyeY || nose.y >= mouth.y) return false;
  if (Math.abs(nose.x - (leftEye.x + rightEye.x) / 2) > box.w * 0.28) return false;
  return true;
}

function faceStroke(width, height) {
  return Math.max(5, Math.round(Math.min(width, height) * 0.01));
}

function drawLive(faces) {
  liveCtx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
  if (!drawingUtils || !FaceLandmarker) return;
  for (const landmarks of faces) {
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
      color: "#0366d680",
      lineWidth: 1
    });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
      color: "#d73a49"
    });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
      color: "#22863a"
    });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
      color: "#e36209"
    });
  }
}

function drawYunet(faces) {
  liveCtx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
  liveCtx.save();
  liveCtx.font = "600 14px Shabnam, sans-serif";
  liveCtx.textAlign = "left";
  const flip = video.classList.contains("mirror");
  const stroke = faceStroke(liveCanvas.width, liveCanvas.height);
  const radius = Math.max(3, Math.round(stroke * 0.7));
  const colors = ["#d73a49", "#22863a", "#0366d6", "#e36209", "#e36209"];
  for (const face of faces) {
    const x = flip ? liveCanvas.width - face.x - face.w : face.x;
    const y = face.y;
    liveCtx.strokeStyle = "#22c55e";
    liveCtx.lineWidth = stroke;
    liveCtx.strokeRect(x, y, face.w, face.h);
    liveCtx.fillStyle = "#22c55e";
    liveCtx.fillText(`${Math.round(face.score * 100)}%`, Math.max(4, x), Math.max(16, y - 6));
    face.kps.forEach((point, index) => {
      liveCtx.fillStyle = colors[index];
      liveCtx.beginPath();
      liveCtx.arc(flip ? liveCanvas.width - point.x : point.x, point.y, radius, 0, Math.PI * 2);
      liveCtx.fill();
    });
  }
  liveCtx.restore();
}

function predictLoop() {
  if (!running || tab !== "live") return;

  if (pageVisible && video.readyState >= 2) {
    syncLiveCanvas();
    if (lastVideoTime !== video.currentTime) {
      if (liveModel === "mediapipe" && faceLandmarker) {
        lastVideoTime = video.currentTime;
        const timestamp = Math.max(performance.now(), lastTimestamp + 1);
        lastTimestamp = timestamp;
        try {
          const results = faceLandmarker.detectForVideo(video, timestamp);
          drawLive((results.faceLandmarks || []).filter(isRealFace).slice(0, MAX_FACES));
        } catch {
          /* keep last overlay */
        }
      } else if (liveModel === "yunet" && yunetSession && !yunetBusy) {
        lastVideoTime = video.currentTime;
        detectYunetFrame();
      }
    }
  }
  requestAnimationFrame(predictLoop);
}

async function startLive() {
  if (starting || running) return;
  starting = true;
  startBtn.textContent = "در حال شروع...";
  try {
    await startWebcam(true);
    running = true;
    startBtn.textContent = "توقف";
    flipBtn.classList.remove("hidden");
    try {
      if (liveModel === "yunet") await initYunet();
      else await initLandmarker();
      requestAnimationFrame(predictLoop);
    } catch {
      setHint(liveModel === "yunet" ? STATUS.yunetFail : STATUS.mediapipeFail);
    }
  } catch {
    running = false;
    stopStream();
    startBtn.textContent = "شروع دوربین";
    flipBtn.classList.add("hidden");
  } finally {
    starting = false;
    startBtn.disabled = false;
  }
}

function stopLive() {
  running = false;
  starting = false;
  stopStream();
  liveCtx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
  startBtn.textContent = "شروع دوربین";
  startBtn.disabled = false;
  flipBtn.classList.add("hidden");
}

function iou(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

function nms(boxes) {
  const sorted = boxes.slice().sort((a, b) => b.score - a.score);
  const kept = [];
  for (const box of sorted) {
    if (kept.every((other) => iou(box, other) < 0.4)) kept.push(box);
    if (kept.length >= 5) break;
  }
  return kept;
}

function normalizeDetections(results, width, height) {
  return nms((results || []).map((item) => {
    const box = item.box || {};
    const pixel = box.xmax > 1.5 || box.ymax > 1.5;
    const xmin = pixel ? box.xmin / width : box.xmin;
    const ymin = pixel ? box.ymin / height : box.ymin;
    const xmax = pixel ? box.xmax / width : box.xmax;
    const ymax = pixel ? box.ymax / height : box.ymax;
    return {
      x: xmin,
      y: ymin,
      w: xmax - xmin,
      h: ymax - ymin,
      score: item.score || 0
    };
  }).filter((box) => box.w >= 0.04 && box.h >= 0.04 && box.score >= OWL_THRESHOLD));
}

function drawPaint(faces) {
  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  paintCtx.save();
  paintCtx.font = "600 14px Shabnam, sans-serif";
  paintCtx.textAlign = "left";
  for (const face of faces) {
    const x = face.x * paintCanvas.width;
    const y = face.y * paintCanvas.height;
    const w = face.w * paintCanvas.width;
    const h = face.h * paintCanvas.height;
    paintCtx.strokeStyle = "#22c55e";
    paintCtx.lineWidth = faceStroke(paintCanvas.width, paintCanvas.height);
    paintCtx.strokeRect(x, y, w, h);
    paintCtx.fillStyle = "#22c55e";
    paintCtx.fillText(`${Math.round(face.score * 100)}%`, Math.max(4, x), Math.max(16, y - 6));
  }
  paintCtx.restore();
}

let owlReady;

async function initOwl() {
  if (owlDetector) return;
  if (owlReady) return owlReady;
  loadingOwl = true;
  setHint(STATUS.owlLoading);
  owlReady = (async () => {
    const nativeFetch = globalThis.fetch.bind(globalThis);
    async function readPart(url, onChunk) {
      const res = await nativeFetch(url);
      if (!res.ok) throw new Error(`failed to load ${url}`);
      const total = Number(res.headers.get("content-length")) || 0;
      if (!res.body || !res.body.getReader) {
        const buffer = await res.arrayBuffer();
        onChunk(buffer.byteLength, total || buffer.byteLength);
        return buffer;
      }
      const reader = res.body.getReader();
      const pieces = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pieces.push(value);
        received += value.byteLength;
        onChunk(value.byteLength, total);
      }
      const joined = new Uint8Array(received);
      let offset = 0;
      for (const piece of pieces) {
        joined.set(piece, offset);
        offset += piece.byteLength;
      }
      return joined.buffer;
    }
    globalThis.fetch = async (input, init) => {
      const url = String(typeof input === "string" ? input : input && input.url || "");
      if (url.includes("/onnx/model_quantized.onnx") && !url.includes(".part")) {
        const base = new URL("models/Xenova/owlvit-base-patch32/onnx/", import.meta.url);
        const chunks = [];
        let loaded = 0;
        let total = 0;
        const known = [];
        for (const part of OWL_ONNX_PARTS) {
          const partUrl = new URL(part, base).href;
          const head = await nativeFetch(partUrl, { method: "HEAD" }).catch(() => null);
          known.push(Number(head && head.headers.get("content-length")) || 0);
        }
        total = known.reduce((sum, size) => sum + size, 0);
        for (const part of OWL_ONNX_PARTS) {
          const buffer = await readPart(new URL(part, base).href, (bytes, partTotal) => {
            loaded += bytes;
            if (!total && partTotal) total = partTotal * OWL_ONNX_PARTS.length;
            if (tab !== "paint") return;
            const pct = total ? Math.min(99, Math.round((loaded / total) * 100)) : 0;
            setHint(`${STATUS.owlLoading} ${pct}٪`);
          });
          chunks.push(buffer);
        }
        if (tab === "paint") setHint(`${STATUS.owlLoading} 100٪`);
        return new Response(new Blob(chunks), {
          headers: { "Content-Type": "application/octet-stream" }
        });
      }
      return nativeFetch(input, init);
    };
    try {
      const { pipeline, env } = await import(TRANSFORMERS_URL);
      env.allowLocalModels = true;
      env.allowRemoteModels = false;
      env.useBrowserCache = true;
      env.localModelPath = OWL_LOCAL;
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.proxy = false;
      env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/";
      owlDetector = await pipeline("zero-shot-object-detection", OWL_MODEL, {
        quantized: true
      });
      if (tab === "paint" && !checking) setHint(STATUS.owlReady);
    } catch (err) {
      owlReady = null;
      owlDetector = null;
      if (tab === "paint") setHint(STATUS.owlFail);
      throw err;
    } finally {
      globalThis.fetch = nativeFetch;
      loadingOwl = false;
    }
  })();
  return owlReady;
}

async function checkPaint() {
  if (checking) return;
  checking = true;
  setBusy(true, "در حال پردازش تصویر… چند ثانیه صبر کنید");
  await yieldPaint();
  try {
    try {
      await still.decode();
    } catch {
      setHint("اول یک تصویر انتخاب کنید.");
      return;
    }
    if (!still.naturalWidth) {
      setHint("اول یک تصویر انتخاب کنید.");
      return;
    }
    if (!owlDetector) {
      setBusy(true, "در حال بارگذاری مدل… چند ثانیه صبر کنید");
      await yieldPaint();
      try {
        await initOwl();
      } catch {
        setBusy(false, STATUS.owlFail);
        return;
      }
      if (!owlDetector) {
        setBusy(false, STATUS.owlFail);
        return;
      }
      setBusy(true, "در حال پردازش تصویر… چند ثانیه صبر کنید");
      await yieldPaint();
    }
    paintCanvas.width = still.naturalWidth;
    paintCanvas.height = still.naturalHeight;
    const results = await owlDetector(still.src, OWL_LABELS, {
      threshold: OWL_THRESHOLD,
      topk: 8
    });
    const faces = normalizeDetections(results, still.naturalWidth, still.naturalHeight);
    drawPaint(faces);
    setHint(faces.length ? `${faces.length} چهره پیدا شد.` : "چهره‌ای پیدا نشد.");
  } catch {
    setHint("بررسی این تصویر شکست خورد.");
  } finally {
    checking = false;
    setBusy(false);
  }
}

function showStill(url, width, height) {
  if (stillUrl) URL.revokeObjectURL(stillUrl);
  stillUrl = url;
  still.src = url;
  still.classList.remove("hidden");
  paintCanvas.width = width;
  paintCanvas.height = height;
  paintCtx.clearRect(0, 0, width, height);
}

for (const button of tabButtons) {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
}

liveModelSelect.addEventListener("change", () => {
  setLiveModel(liveModelSelect.value);
});

startBtn.addEventListener("click", () => {
  if (starting) return;
  if (running) stopLive();
  else startLive();
});

flipBtn.addEventListener("click", async () => {
  if (!running) return;
  facingMode = facingMode === "user" ? "environment" : "user";
  try {
    await startWebcam(false);
  } catch {
    facingMode = facingMode === "user" ? "environment" : "user";
    syncMirror();
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0];
  fileInput.value = "";
  if (!file || checking) return;
  setBusy(true, "در حال پردازش تصویر… چند ثانیه صبر کنید");
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    showStill(url, image.naturalWidth, image.naturalHeight);
    checkPaint();
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    setBusy(false);
    setHint("این فایل تصویر نیست.");
  };
  image.src = url;
});

document.addEventListener("visibilitychange", () => {
  pageVisible = document.visibilityState === "visible";
});

window.addEventListener("pagehide", (event) => {
  if (starting || event.persisted) return;
  if (running) stopLive();
});

initYunet();
