const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const elements = {
  welcome: $("#welcome"),
  messages: $("#messages"),
  conversation: $("#conversation"),
  composer: $("#composer"),
  queryInput: $("#queryInput"),
  sendButton: $(".send-button"),
  heroMic: $("#heroMic"),
  composerMic: $("#composerMic"),
  voiceStage: $(".voice-stage"),
  heroBars: $("#heroBars"),
  voiceInstruction: $("#voiceInstruction"),
  supportNote: $("#supportNote"),
  pipeline: $("#voicePipeline"),
  pipelineStatus: $("#pipelineStatus"),
  speechDock: $("#speechDock"),
  speechCaption: $("#speechCaption"),
  speechStateLabel: $("#speechStateLabel"),
  pauseSpeechButton: $("#pauseSpeechButton"),
  replaySpeechButton: $("#replaySpeechButton"),
  stopSpeechButton: $("#stopSpeechButton"),
  profileTags: $("#profileTags"),
  clearProfileButton: $("#clearProfileButton"),
  sourceList: $("#sourceList"),
  sourceCount: $("#sourceCount"),
  autoSpeakToggle: $("#autoSpeakToggle"),
  speechRate: $("#speechRate"),
  speechRateValue: $("#speechRateValue"),
  voiceSelect: $("#voiceSelect"),
  largeTextButton: $("#largeTextButton"),
  newChatButton: $("#newChatButton"),
  handoffButton: $("#handoffButton"),
  handoffCard: $("#handoffCard"),
  handoffTitle: $("#handoffTitle"),
  handoffDescription: $("#handoffDescription"),
  handoffTicket: $("#handoffTicket"),
  handoffWait: $("#handoffWait"),
  returnToAi: $("#returnToAi"),
  toast: $("#toast"),
  compareDialog: $("#compareDialog"),
  closeCompare: $("#closeCompare"),
  compareContent: $("#compareContent")
};

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;
const speechSynthesisSupported =
  "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

const categoryLabels = {
  refrigerator: "冰箱",
  fridge: "冰箱",
  washer: "洗衣机",
  washing_machine: "洗衣机",
  air_conditioner: "空调",
  conditioner: "空调",
  aircon: "空调",
  television: "电视",
  tv: "电视",
  vacuum: "清洁电器",
  cleaner: "清洁电器",
  dishwasher: "洗碗机",
  冰箱: "冰箱",
  洗衣机: "洗衣机",
  空调: "空调",
  电视: "电视",
  清洁电器: "清洁电器",
  洗碗机: "洗碗机",
  厨电: "厨电"
};

const pipelineSteps = ["voice", "intent", "retrieval", "answer", "speak"];
const messageStore = [];
const catalog = new Map();
const selectedForCompare = new Set();
const localHandoffTickets = new Map();
let browserEnginePromise = null;
let localEngineActive =
  document.documentElement.dataset.staticApp === "true" ||
  location.hostname.endsWith(".github.io");

const state = {
  busy: false,
  profile: {},
  lastProductIds: [],
  currentAnswer: null,
  voiceState: "idle",
  listening: false,
  recognition: null,
  recognitionError: false,
  finalTranscript: "",
  manualStop: false,
  speechRun: 0,
  speechSegments: [],
  speechIndex: 0,
  autoSpeak: true,
  rate: 1,
  preferredVoice: "",
  pipelineTimers: [],
  meterStream: null,
  audioContext: null,
  meterFrame: 0,
  meterSyntheticTimer: 0,
  toastTimer: 0,
  currentRequestController: null,
  handoffPollTimer: 0
};

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function loadBrowserEngine() {
  if (!browserEnginePromise) {
    browserEnginePromise = import("./engine.js").catch((error) => {
      browserEnginePromise = null;
      throw new Error(`本地问答引擎加载失败：${error.message}`);
    });
  }
  return browserEnginePromise;
}

async function localAssistantRequest(payload) {
  const startedAt = performance.now();
  const engine = await loadBrowserEngine();
  const result = engine.answerQuery({
    query: payload.query,
    profile: payload.profile,
    context: payload.context
  });
  const allProducts = engine.getCatalog();
  const products = (result.productIds || [])
    .map((productId) => allProducts.find((product) => product.id === productId))
    .filter(Boolean);
  products.forEach((product) => catalog.set(product.id, product));
  return {
    ...result,
    products,
    latencyMs: Math.max(1, Math.round(performance.now() - startedAt))
  };
}

async function requestAssistant(payload, signal) {
  if (localEngineActive) {
    return localAssistantRequest(payload);
  }
  try {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "顾问服务暂时不可用");
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw error;
    localEngineActive = true;
    return localAssistantRequest(payload);
  }
}

function storageGet(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local storage may be unavailable in private browsing.
  }
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "待确认";
  return `¥${number.toLocaleString("zh-CN")}`;
}

function getCategoryLabel(category) {
  return categoryLabels[category] || category || "家电";
}

function getProduct(productId) {
  return catalog.get(productId) || null;
}

function getProducts(ids = []) {
  return ids.map(getProduct).filter(Boolean);
}

function getProductHighlight(product) {
  if (Array.isArray(product.highlights) && product.highlights.length) {
    return product.highlights.slice(0, 2).join(" · ");
  }
  if (product.energy || product.noise) {
    return [product.energy, product.noise].filter(Boolean).join(" · ");
  }
  return product.summary || "参数来自商品知识库";
}

function showToast(message, duration = 2800) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, duration);
}

function setSupportStatus() {
  const secure = window.isSecureContext || location.hostname === "localhost";
  if (SpeechRecognition && speechSynthesisSupported) {
    elements.supportNote.textContent = "语音输入 + 语音播报可用";
    elements.supportNote.className = "support-note ready";
    return;
  }
  if (SpeechRecognition && !speechSynthesisSupported) {
    elements.supportNote.textContent = "可语音输入，播报需更换浏览器";
    elements.supportNote.className = "support-note warning";
    return;
  }
  if (!SpeechRecognition && speechSynthesisSupported) {
    elements.supportNote.textContent = secure
      ? "当前浏览器需用键盘输入"
      : "语音识别需 HTTPS";
    elements.supportNote.className = "support-note warning";
    return;
  }
  elements.supportNote.textContent = "建议使用 Chrome 或 Edge";
  elements.supportNote.className = "support-note warning";
}

function loadPreferences() {
  state.autoSpeak = storageGet("muyan-auto-speak", "true") === "true";
  state.rate = Number(storageGet("muyan-speech-rate", "1"));
  if (!Number.isFinite(state.rate) || state.rate < 0.7 || state.rate > 1.25) {
    state.rate = 1;
  }
  state.preferredVoice = storageGet("muyan-voice", "");
  const largePrint = storageGet("muyan-large-print", "false") === "true";
  document.documentElement.classList.toggle("large-print", largePrint);
  elements.largeTextButton.setAttribute("aria-pressed", String(largePrint));
  elements.autoSpeakToggle.checked = state.autoSpeak;
  elements.speechRate.value = String(state.rate);
  updateRateLabel();
}

function updateRateLabel() {
  const label = state.rate < 0.9 ? "慢一点" : state.rate > 1.08 ? "快一点" : "正常";
  elements.speechRateValue.textContent = label;
}

function refreshVoiceList() {
  if (!speechSynthesisSupported) return;
  const allVoices = window.speechSynthesis.getVoices();
  const chineseVoices = allVoices.filter(
    (voice) =>
      /^zh/i.test(voice.lang) ||
      /Chinese|Mandarin|普通话|中文/i.test(voice.name)
  );
  elements.voiceSelect.replaceChildren();
  const defaultOption = createElement("option", "", "系统默认");
  defaultOption.value = "";
  elements.voiceSelect.append(defaultOption);
  chineseVoices.forEach((voice) => {
    const option = createElement("option", "", `${voice.name} · ${voice.lang}`);
    option.value = voice.name;
    elements.voiceSelect.append(option);
  });
  if (
    state.preferredVoice &&
    chineseVoices.some((voice) => voice.name === state.preferredVoice)
  ) {
    elements.voiceSelect.value = state.preferredVoice;
  } else {
    state.preferredVoice = "";
    elements.voiceSelect.value = "";
  }
}

function selectVoice() {
  if (!speechSynthesisSupported) return null;
  const voices = window.speechSynthesis.getVoices();
  if (state.preferredVoice) {
    const exact = voices.find((voice) => voice.name === state.preferredVoice);
    if (exact) return exact;
  }
  return (
    voices.find(
      (voice) =>
        /^zh(-|_)?CN/i.test(voice.lang) &&
        /Xiaoxiao|Microsoft|Google|Ting-Ting|Yaoyao|Huihui/i.test(voice.name)
    ) ||
    voices.find((voice) => /^zh/i.test(voice.lang)) ||
    null
  );
}

function initRecognition() {
  if (!SpeechRecognition) return;
  const recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    state.listening = true;
    state.finalTranscript = "";
    state.recognitionError = false;
    state.manualStop = false;
    setVoiceState("listening");
    beginAudioMeter();
    showToast("我在听，请说出你的需求");
  };

  recognition.onresult = (event) => {
    let interim = "";
    let final = state.finalTranscript;
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0]?.transcript || "";
      if (result.isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    state.finalTranscript = final;
    const liveText = `${final}${interim}`.trim();
    if (liveText) {
      elements.queryInput.value = liveText;
      resizeInput();
      elements.voiceInstruction.textContent = liveText;
    }
  };

  recognition.onerror = (event) => {
    state.recognitionError = true;
    const messages = {
      "not-allowed": "没有获得麦克风权限。请在浏览器设置中允许访问后重试。",
      "service-not-allowed": "当前浏览器未开放语音识别服务，可以先用文字提问。",
      "no-speech": "这次没有听到声音，点一下麦克风再试一次。",
      network: "语音识别网络连接不稳定，请稍后重试。",
      "audio-capture": "没有找到可用的麦克风，请检查设备连接。",
      aborted: ""
    };
    const message = messages[event.error] ?? "语音识别没有完成，请再试一次。";
    if (message) showToast(message, 4200);
  };

  recognition.onend = () => {
    state.listening = false;
    stopAudioMeter();
    if (state.voiceState === "listening") setVoiceState("idle");
    const transcript = state.finalTranscript.trim();
    if (!state.recognitionError && transcript) {
      elements.queryInput.value = "";
      resizeInput();
      sendQuery(transcript, { source: "voice" });
      return;
    }
    if (!state.recognitionError && !transcript) {
      showToast("没有听清，可以再说一次或直接输入问题");
    }
  };

  state.recognition = recognition;
}

function startListening() {
  if (!SpeechRecognition) {
    showToast("当前浏览器不支持语音识别，请使用最新版 Chrome 或 Edge；文字提问仍可正常使用。", 4600);
    elements.queryInput.focus();
    return;
  }
  if (!window.isSecureContext && location.hostname !== "localhost") {
    showToast("语音识别需要 HTTPS 安全连接，请通过项目正式链接访问。", 4200);
    return;
  }
  if (state.busy) {
    showToast("我先整理完当前回答，再听下一个问题");
    return;
  }
  if (state.voiceState === "speaking" || state.voiceState === "paused") {
    stopSpeaking({ keepDock: false, silent: true });
  }
  if (state.listening) {
    state.manualStop = true;
    state.recognition.stop();
    return;
  }
  try {
    state.recognition.start();
  } catch (error) {
    if (error?.name !== "InvalidStateError") {
      showToast("麦克风没有启动成功，请检查浏览器权限");
    }
  }
}

function setVoiceState(nextState) {
  state.voiceState = nextState;
  elements.voiceStage.classList.toggle("is-listening", nextState === "listening");
  elements.voiceStage.classList.toggle("is-thinking", nextState === "thinking");
  elements.voiceStage.classList.toggle("is-speaking", nextState === "speaking");
  elements.composerMic.classList.toggle("is-listening", nextState === "listening");

  const instructions = {
    idle: "按一下，直接说出你的需求",
    listening: "我在听，说完会自动识别",
    thinking: "正在结合你的需求查找合适商品",
    speaking: "正在读给你听，点麦克风可以打断",
    paused: "播报已暂停"
  };
  elements.voiceInstruction.textContent = instructions[nextState] || instructions.idle;

  if (nextState !== "listening") {
    elements.composerMic.setAttribute("aria-label", "语音输入");
    elements.heroMic.setAttribute("aria-label", "按下开始语音提问");
  } else {
    elements.composerMic.setAttribute("aria-label", "停止录音并发送");
    elements.heroMic.setAttribute("aria-label", "停止录音并发送");
  }
}

async function beginAudioMeter() {
  stopAudioMeter();
  if (!navigator.mediaDevices?.getUserMedia) {
    startSyntheticMeter();
    return;
  }
  try {
    state.meterStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      startSyntheticMeter();
      return;
    }
    state.audioContext = new AudioContext();
    if (state.audioContext.state === "suspended") {
      await state.audioContext.resume();
    }
    const source = state.audioContext.createMediaStreamSource(state.meterStream);
    const analyser = state.audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    source.connect(analyser);
    const values = new Uint8Array(analyser.frequencyBinCount);
    const bars = $$("#heroBars i");

    const draw = () => {
      if (!state.listening) return;
      analyser.getByteFrequencyData(values);
      let total = 0;
      const sampleCount = Math.min(values.length, 64);
      for (let index = 0; index < sampleCount; index += 1) total += values[index];
      const level = Math.min(1, total / sampleCount / 88);
      bars.forEach((bar, index) => {
        const offset = Math.abs(index - 3) * 0.11;
        const height = 3 + Math.max(0, level - offset) * 20;
        bar.style.height = `${height}px`;
      });
      state.meterFrame = requestAnimationFrame(draw);
    };
    if (!state.listening) {
      stopAudioMeter();
      return;
    }
    draw();
  } catch {
    startSyntheticMeter();
  }
}

function startSyntheticMeter() {
  window.clearInterval(state.meterSyntheticTimer);
  const bars = $$("#heroBars i");
  state.meterSyntheticTimer = window.setInterval(() => {
    if (!state.listening) return;
    bars.forEach((bar, index) => {
      const center = Math.abs(index - 3);
      const height = 5 + Math.random() * (17 - center * 2.2);
      bar.style.height = `${height}px`;
    });
  }, 105);
}

function stopAudioMeter() {
  cancelAnimationFrame(state.meterFrame);
  window.clearInterval(state.meterSyntheticTimer);
  state.meterSyntheticTimer = 0;
  if (state.meterStream) {
    state.meterStream.getTracks().forEach((track) => track.stop());
    state.meterStream = null;
  }
  if (state.audioContext) {
    state.audioContext.close().catch(() => {});
    state.audioContext = null;
  }
  $$("#heroBars i").forEach((bar) => {
    bar.style.height = "4px";
  });
}

function clearPipelineTimers() {
  state.pipelineTimers.forEach((timer) => window.clearTimeout(timer));
  state.pipelineTimers = [];
}

function resetPipeline() {
  clearPipelineTimers();
  $$("li", elements.pipeline).forEach((item) => {
    item.classList.remove("active", "done");
  });
  elements.pipelineStatus.textContent = "等待你开口";
}

function setPipelineStage(stage, status) {
  const item = $(`li[data-stage="${stage}"]`, elements.pipeline);
  if (!item) return;
  item.classList.toggle("active", status === "active");
  item.classList.toggle("done", status === "done");
}

function markPipelineThrough(stage, includeStage = true) {
  const endIndex = pipelineSteps.indexOf(stage);
  pipelineSteps.forEach((itemStage, index) => {
    if (index < endIndex || (includeStage && index === endIndex)) {
      setPipelineStage(itemStage, "done");
    }
  });
}

function beginPipeline(source) {
  resetPipeline();
  markPipelineThrough("voice");
  setPipelineStage("intent", "active");
  elements.pipelineStatus.textContent =
    source === "voice" ? "已听清，正在理解需求" : "正在理解你的需求";
  state.pipelineTimers.push(
    window.setTimeout(() => {
      markPipelineThrough("intent");
      setPipelineStage("retrieval", "active");
      elements.pipelineStatus.textContent = "正在检索商品与服务知识";
    }, 380)
  );
  state.pipelineTimers.push(
    window.setTimeout(() => {
      markPipelineThrough("retrieval");
      setPipelineStage("answer", "active");
      elements.pipelineStatus.textContent = "正在生成更合适的回答";
    }, 900)
  );
}

function finishTextPipeline() {
  clearPipelineTimers();
  markPipelineThrough("answer");
  if (state.autoSpeak && speechSynthesisSupported) {
    setPipelineStage("speak", "active");
    elements.pipelineStatus.textContent = "回答已生成，正在语音播报";
  } else {
    markPipelineThrough("speak");
    elements.pipelineStatus.textContent = "回答已生成";
  }
}

function hideWelcome() {
  elements.welcome.classList.add("is-hidden");
}

function scrollToLatest() {
  requestAnimationFrame(() => {
    elements.conversation.scrollTo({
      top: elements.conversation.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth"
    });
  });
}

function addUserMessage(text, source) {
  const article = createElement("article", "message user");
  const main = createElement("div", "message-main");
  const meta = createElement("div", "message-meta");
  if (source === "voice") {
    const voiceOrigin = createElement("span", "voice-origin");
    voiceOrigin.innerHTML =
      '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="4" y="1" width="4" height="6" rx="2"/><path d="M2.5 5.5a3.5 3.5 0 0 0 7 0M6 9v2"/></svg>';
    voiceOrigin.append("语音");
    meta.append(voiceOrigin);
  }
  meta.append(createElement("strong", "", "你"), createElement("span", "", "刚刚"));
  const bubble = createElement("div", "user-bubble", text);
  main.append(meta, bubble);
  article.append(main);
  elements.messages.append(article);
  messageStore.push({ role: "user", content: text, source });
  scrollToLatest();
}

function addThinkingMessage() {
  const article = createElement("article", "message assistant");
  article.dataset.thinking = "true";
  const avatar = createElement("div", "message-avatar", "慕");
  const main = createElement("div", "message-main");
  const card = createElement("div", "thinking-card");
  const dots = createElement("span", "thinking-dots");
  dots.innerHTML = "<i></i><i></i><i></i>";
  card.append(dots, createElement("span", "", "正在查知识库，也记得你刚才说过的话"));
  main.append(card);
  article.append(avatar, main);
  elements.messages.append(article);
  scrollToLatest();
  return article;
}

function appendRichText(container, text) {
  const segments = String(text || "").split(/(\*\*[^*]+\*\*)/g);
  segments.forEach((segment) => {
    if (!segment) return;
    if (segment.startsWith("**") && segment.endsWith("**")) {
      container.append(createElement("strong", "", segment.slice(2, -2)));
    } else {
      container.append(document.createTextNode(segment));
    }
  });
}

function addAnswerParagraphs(container, answer) {
  const paragraphs = String(answer || "").split(/\n+/).filter(Boolean);
  if (!paragraphs.length) {
    container.append(createElement("p", "", "我暂时没有整理出合适回答，请换个方式问一次。"));
    return;
  }
  paragraphs.forEach((paragraph) => {
    const p = createElement("p");
    appendRichText(p, paragraph);
    container.append(p);
  });
}

function applianceSvg(category) {
  switch (category) {
    case "refrigerator":
    case "fridge":
    case "冰箱":
      return '<svg viewBox="0 0 70 90" aria-hidden="true"><rect x="12" y="5" width="46" height="80" rx="7"/><path d="M12 36h46M19 15v13M19 46v13M42 15h8"/></svg>';
    case "washer":
    case "washing_machine":
    case "洗衣机":
      return '<svg viewBox="0 0 70 90" aria-hidden="true"><rect x="9" y="8" width="52" height="75" rx="7"/><circle cx="35" cy="49" r="21"/><circle cx="35" cy="49" r="13"/><path d="M16 20h22M51 17v6"/></svg>';
    case "air_conditioner":
    case "conditioner":
    case "aircon":
    case "空调":
      return '<svg viewBox="0 0 90 70" aria-hidden="true"><rect x="7" y="12" width="76" height="31" rx="9"/><path d="M17 33h56M24 51c4 5 8 5 12 0s8-5 12 0 8 5 12 0"/><circle cx="70" cy="24" r="1.5"/></svg>';
    case "television":
    case "tv":
    case "电视":
      return '<svg viewBox="0 0 90 76" aria-hidden="true"><rect x="8" y="5" width="74" height="52" rx="5"/><path d="M32 70h26M45 57v13M18 16h20"/></svg>';
    case "vacuum":
    case "cleaner":
    case "清洁电器":
      return '<svg viewBox="0 0 76 90" aria-hidden="true"><circle cx="37" cy="53" r="27"/><circle cx="37" cy="53" r="18"/><path d="M36 26V7h21M10 21l17 12"/><circle cx="37" cy="53" r="4"/></svg>';
    default:
      return '<svg viewBox="0 0 76 90" aria-hidden="true"><rect x="12" y="8" width="52" height="72" rx="9"/><path d="M22 24h32M22 36h22M22 48h28M22 63h18"/></svg>';
  }
}

function toggleCompareProduct(productId, button, card) {
  const product = getProduct(productId);
  if (!product) return;
  if (selectedForCompare.has(productId)) {
    selectedForCompare.delete(productId);
    button.setAttribute("aria-pressed", "false");
    card?.classList.remove("selected");
    showToast(`已移出对比：${product.name || "该商品"}`);
  } else {
    if (selectedForCompare.size >= 3) {
      showToast("最多同时对比 3 件商品，请先移出一件");
      return;
    }
    selectedForCompare.add(productId);
    button.setAttribute("aria-pressed", "true");
    card?.classList.add("selected");
    showToast(
      selectedForCompare.size === 1
        ? "已加入对比，再选 1 件就可以查看差异"
        : `已加入对比（${selectedForCompare.size}/3）`
    );
  }
  updateCompareCtas();
}

function createProductCard(product) {
  const card = createElement("article", "product-card");
  card.dataset.productId = product.id;
  if (selectedForCompare.has(product.id)) card.classList.add("selected");

  const visual = createElement("div", "product-visual");
  visual.innerHTML = applianceSvg(product.category);
  const badge = createElement(
    "span",
    "product-badge",
    product.badge || "知识库精选"
  );
  const compareButton = createElement("button", "compare-check");
  compareButton.type = "button";
  compareButton.setAttribute(
    "aria-label",
    `将${product.name || "商品"}加入对比`
  );
  compareButton.setAttribute(
    "aria-pressed",
    String(selectedForCompare.has(product.id))
  );
  compareButton.innerHTML =
    '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2 6 2.5 2.5L10 3"/></svg>';
  compareButton.addEventListener("click", () =>
    toggleCompareProduct(product.id, compareButton, card)
  );
  visual.append(badge, compareButton);

  const info = createElement("div", "product-info");
  info.append(
    createElement("span", "product-category", getCategoryLabel(product.category)),
    createElement("h5", "", product.name || "未命名家电")
  );
  const price = createElement("div", "product-price");
  price.append(
    createElement("small", "", "到手"),
    document.createTextNode(formatMoney(product.price))
  );
  const spec = createElement("div", "product-spec");
  const specParts = getProductHighlight(product)
    .split(" · ")
    .slice(0, 2);
  specParts.forEach((part, index) => {
    if (index) spec.append(createElement("i"));
    spec.append(document.createTextNode(part));
  });
  info.append(price, spec);
  card.append(visual, info);
  return card;
}

function createSourceStrip(sources) {
  const strip = createElement("div", "source-strip");
  strip.append(createElement("span", "", "来源"));
  sources.slice(0, 4).forEach((source) => {
    const chip = createElement(
      "span",
      "source-chip",
      source.title || source.section || "商品知识库"
    );
    chip.title = source.detail || source.section || "";
    strip.append(chip);
  });
  return strip;
}

function createComparisonTable(productIds) {
  const products = getProducts(productIds).slice(0, 3);
  if (products.length < 2) {
    return createElement("div", "compare-empty", "至少选择两件商品才能对比。");
  }
  const table = createElement("table", "compare-table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.append(createElement("th", "", "对比项"));
  products.forEach((product) => {
    headerRow.append(createElement("th", "", product.name || "商品"));
  });
  thead.append(headerRow);
  table.append(thead);
  const tbody = document.createElement("tbody");

  const rows = [
    ["价格", (product) => formatMoney(product.price)],
    ["类型", (product) => getCategoryLabel(product.category)],
    ["能效", (product) => product.energy || "详见商品页"],
    ["噪音", (product) => product.noise || "详见商品页"],
    ["核心优势", (product) => getProductHighlight(product)],
    ["适合人群", (product) => product.audience || product.summary || "按场景选择"]
  ];

  rows.forEach(([label, accessor]) => {
    const row = document.createElement("tr");
    row.append(createElement("td", "", label));
    products.forEach((product) => {
      row.append(createElement("td", "", accessor(product)));
    });
    tbody.append(row);
  });
  table.append(tbody);
  const wrap = createElement("div", "inline-compare");
  wrap.append(table);
  return wrap;
}

function renderAssistantMessage(data) {
  const article = createElement("article", "message assistant");
  article.dataset.requestId = data.requestId || "";
  const avatar = createElement("div", "message-avatar", "慕");
  const main = createElement("div", "message-main");
  const meta = createElement("div", "message-meta");
  meta.append(
    createElement("strong", "", "小慕"),
    createElement("span", "", "刚刚"),
    createElement("span", "", `可信度 ${Math.round((data.confidence || 0.9) * 100)}%`)
  );
  const card = createElement("div", "assistant-card");
  const copy = createElement("div", "assistant-copy");
  addAnswerParagraphs(copy, data.answer);
  card.append(copy);

  const products = Array.isArray(data.products)
    ? data.products
    : getProducts(data.productIds || []);
  if (products.length) {
    const actionRow = createElement("div", "answer-cta-row");
    if (products.length >= 2) {
      const compareAction = createElement("button", "mini-cta");
      compareAction.type = "button";
      compareAction.dataset.compareIds = products
        .map((product) => product.id)
        .join(",");
      compareAction.innerHTML =
        '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4h10M5 2v4M11 2v4M4 9h3v4H4V9ZM9 7h3v6H9V7Z"/></svg>';
      compareAction.append("查看参数对比");
      compareAction.addEventListener("click", () => {
        openCompare(
          selectedForCompare.size >= 2
            ? [...selectedForCompare]
            : products.map((product) => product.id)
        );
      });
      actionRow.append(compareAction);
    }
    if (data.followUps?.length) {
      const askAction = createElement("button", "mini-cta secondary");
      askAction.type = "button";
      askAction.dataset.prompt = data.followUps[0];
      askAction.textContent = "继续细化需求";
      askAction.addEventListener("click", () =>
        sendQuery(data.followUps[0], { source: "text" })
      );
      actionRow.append(askAction);
    }
    card.append(actionRow);

    const recommendBlock = createElement("section", "recommendation-block");
    const blockHeading = createElement("div", "block-heading");
    blockHeading.append(
      createElement("h4", "", "根据你的需求筛选"),
      createElement("span", "", `${products.length} 件候选 · 参数可溯源`)
    );
    const grid = createElement("div", "product-grid");
    products.slice(0, 3).forEach((product) => {
      catalog.set(product.id, product);
      grid.append(createProductCard(product));
    });
    recommendBlock.append(blockHeading, grid);
    card.append(recommendBlock);
  }

  const comparisonIds = Array.isArray(data.comparisonProductIds)
    ? data.comparisonProductIds
    : [];
  if (comparisonIds.length >= 2) {
    card.append(createComparisonTable(comparisonIds));
  }

  if (Array.isArray(data.sources) && data.sources.length) {
    card.append(createSourceStrip(data.sources));
  }

  if (Array.isArray(data.followUps) && data.followUps.length) {
    const followups = createElement("div", "followup-row");
    data.followUps.slice(0, 4).forEach((followup) => {
      const button = createElement("button", "followup-chip", followup);
      button.type = "button";
      button.addEventListener("click", () =>
        sendQuery(followup, { source: "text" })
      );
      followups.append(button);
    });
    card.append(followups);
  }

  main.append(meta, card);
  article.append(avatar, main);
  elements.messages.append(article);
  messageStore.push({ role: "assistant", content: data.answer || "" });
  renderSources(data.sources || []);
  scrollToLatest();
}

function addErrorMessage(message) {
  const article = createElement("article", "message assistant");
  const avatar = createElement("div", "message-avatar", "慕");
  const main = createElement("div", "message-main");
  const card = createElement("div", "error-copy");
  card.append(
    createElement(
      "span",
      "",
      message || "这次没有连上服务，请检查网络后再试一次。"
    )
  );
  main.append(card);
  article.append(avatar, main);
  elements.messages.append(article);
  scrollToLatest();
}

async function sendQuery(rawQuery, { source = "text" } = {}) {
  const query = String(rawQuery || "").trim();
  if (!query || state.busy) return;
  stopSpeaking({ keepDock: false, silent: true });
  state.busy = true;
  state.currentRequestController?.abort();
  state.currentRequestController = new AbortController();
  elements.sendButton.disabled = true;
  hideWelcome();
  addUserMessage(query, source);
  const thinking = addThinkingMessage();
  setVoiceState("thinking");
  beginPipeline(source);

  try {
    const minimumVisualDelay = delay(1050);
    const data = await Promise.all([
      requestAssistant({
        query,
        channel: source,
        profile: state.profile,
        context: {
          lastProductIds: state.lastProductIds,
          messages: messageStore.slice(-8)
        }
      }, state.currentRequestController.signal),
      minimumVisualDelay
    ]).then(([result]) => result);
    thinking.remove();
    state.currentAnswer = data;
    state.lastProductIds = Array.isArray(data.productIds)
      ? data.productIds
      : state.lastProductIds;
    if (data.profilePatch && typeof data.profilePatch === "object") {
      state.profile = { ...state.profile, ...data.profilePatch };
      renderProfile();
    }
    renderAssistantMessage(data);
    finishTextPipeline();
    setVoiceState("idle");
    if (Array.isArray(data.comparisonProductIds) && data.comparisonProductIds.length >= 2) {
      selectedForCompare.clear();
    }
    if (data.handoff) {
      showHandoffFromAssistant(data.handoff);
      createHandoffTicket(
        data.handoff.summary || getHandoffSummary(),
        data.handoff.reason || "AI 识别到人工服务需求"
      ).catch(() => {
        elements.handoffWait.textContent = "工单创建失败，可点击下方按钮重试";
      });
    }
    if (state.autoSpeak && speechSynthesisSupported && data.speech) {
      await delay(180);
      speakAnswer(data.speech);
    } else if (!state.autoSpeak) {
      elements.pipelineStatus.textContent = "回答已生成，自动播报已关闭";
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    thinking.remove();
    addErrorMessage(error.message);
    clearPipelineTimers();
    resetPipeline();
    setVoiceState("idle");
  } finally {
    state.busy = false;
    elements.sendButton.disabled = false;
    if (
      source === "text" &&
      window.matchMedia("(min-width: 721px)").matches
    ) {
      elements.queryInput.focus();
    }
  }
}

function renderProfile() {
  const profile = state.profile || {};
  const tags = [];
  if (profile.budget) {
    if (typeof profile.budget === "object") {
      const max = profile.budget.max;
      const min = profile.budget.min;
      tags.push(
        profile.budget.source === "ceiling" && max
          ? `预算 ${formatMoney(max)} 内`
          : min && max
          ? `预算 ${formatMoney(min)} - ${formatMoney(max)}`
          : `预算 ${formatMoney(max)} 内`
      );
    } else {
      tags.push(`预算 ${formatMoney(profile.budget)}`);
    }
  } else if (profile.budgetMin || profile.budgetMax) {
    tags.push(
      `预算 ${formatMoney(profile.budgetMin || 0)} - ${formatMoney(
        profile.budgetMax || 0
      )}`
    );
  }
  if (profile.householdSize) {
    tags.push(`${profile.householdSize} 口之家`);
  } else if (profile.household) {
    tags.push(String(profile.household));
  }
  if (profile.preferredCategory) {
    tags.push(getCategoryLabel(profile.preferredCategory));
  }
  if (Array.isArray(profile.priorities)) {
    profile.priorities
      .filter(Boolean)
      .slice(0, 5)
      .forEach((priority) => tags.push(priority));
  }

  elements.profileTags.replaceChildren();
  if (!tags.length) {
    elements.profileTags.append(
      createElement("span", "empty-tag", "说出需求后，我会记住")
    );
    return;
  }
  [...new Set(tags)].forEach((tag) => {
    elements.profileTags.append(createElement("span", "profile-tag", tag));
  });
}

function renderSources(sources) {
  elements.sourceList.replaceChildren();
  elements.sourceCount.textContent = String(sources.length);
  if (!sources.length) {
    const empty = createElement("div", "source-empty");
    empty.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11l3 3v13H5V4Zm11 0v4h4M8 12h8M8 16h6"/></svg>';
    empty.append("回答时会显示来源");
    elements.sourceList.append(empty);
    return;
  }
  sources.slice(0, 4).forEach((source) => {
    const item = createElement("div", "source-item");
    item.title = source.detail || "";
    item.append(
      createElement(
        "strong",
        "",
        source.title || source.section || "商品知识库"
      ),
      createElement(
        "span",
        "",
        source.detail || source.section || "已核验本次回答引用的资料"
      )
    );
    elements.sourceList.append(item);
  });
}

function renderCompareDetail(products) {
  elements.compareContent.replaceChildren();
  if (!products.length) {
    elements.compareContent.append(
      createElement(
        "div",
        "compare-empty",
        "还没有候选商品。先让小慕按你的需求推荐，再勾选两件以上商品。"
      )
    );
    return;
  }

  const header = createElement("div", "compare-product-head");
  const rank = createElement("div", "compare-rank");
  rank.append(
    createElement("strong", "", String(products.length).padStart(2, "0")),
    createElement("small", "", "件候选商品")
  );
  header.append(rank);
  products.forEach((product) => {
    const item = createElement("div", "compare-product");
    item.append(
      createElement("span", "", getCategoryLabel(product.category)),
      createElement("strong", "", product.name || "未命名商品"),
      createElement("b", "", formatMoney(product.price))
    );
    header.append(item);
  });
  elements.compareContent.append(header);

  const details = createElement("div", "compare-grid");
  products.forEach((product) => {
    const card = createElement("article", "compare-detail");
    card.append(createElement("h4", "", getCategoryLabel(product.category) + "参数"));
    const list = document.createElement("dl");
    const specs = product.specs && typeof product.specs === "object" ? product.specs : {};
    const fields = [
      ["能效", product.energy || specs.能效 || "待核验"],
      ["噪音", product.noise || specs.噪音 || "待核验"],
      ["人群", product.audience || "按使用场景选择"],
      ["优势", getProductHighlight(product)]
    ];
    Object.entries(specs)
      .filter(([key]) => !/能效|运行噪声|噪声|保修/.test(key))
      .slice(0, 5)
      .forEach(([key, value]) => fields.push([key, String(value)]));
    fields.forEach(([key, value]) => {
      list.append(createElement("dt", "", key), createElement("dd", "", value));
    });
    card.append(list);
    details.append(card);
  });
  elements.compareContent.append(details);
}

function openCompare(ids) {
  const validIds = [...new Set(ids)].filter((id) => getProduct(id)).slice(0, 3);
  if (validIds.length < 2) {
    showToast("至少勾选两件商品才能查看对比");
    return;
  }
  renderCompareDetail(getProducts(validIds));
  if (typeof elements.compareDialog.showModal === "function") {
    elements.compareDialog.showModal();
  } else {
    elements.compareDialog.setAttribute("open", "");
  }
}

function updateCompareCtas() {
  $$(".message .answer-cta-row").forEach((row) => {
    const compareButton = $("[data-compare-ids]", row);
    if (compareButton) {
      compareButton.textContent =
        selectedForCompare.size >= 2
          ? `对比已选 ${selectedForCompare.size} 件`
          : "查看参数对比";
    }
  });
}

function splitSpeech(text) {
  const cleaned = String(text || "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  const sentences = cleaned.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [cleaned];
  const segments = [];
  let current = "";
  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;
    if ((current + trimmed).length > 84 && current) {
      segments.push(current.trim());
      current = trimmed;
    } else {
      current += trimmed;
    }
  });
  if (current.trim()) segments.push(current.trim());
  return segments;
}

function updateSpeechUi(status) {
  elements.speechDock.hidden = false;
  elements.speechDock.classList.toggle("is-paused", status === "paused");
  if (status === "speaking") {
    elements.speechStateLabel.textContent = "正在语音回答";
  } else if (status === "paused") {
    elements.speechStateLabel.textContent = "播报已暂停";
  } else if (status === "stopped") {
    elements.speechStateLabel.textContent = "播报已停止";
  } else {
    elements.speechStateLabel.textContent = "语音回答完成";
  }
}

function speakSegment(index, runId) {
  if (runId !== state.speechRun) return;
  if (index >= state.speechSegments.length) {
    setVoiceState("idle");
    updateSpeechUi("finished");
    markPipelineThrough("speak");
    elements.pipelineStatus.textContent = "语音回答完成";
    return;
  }
  state.speechIndex = index;
  const caption = state.speechSegments[index];
  elements.speechCaption.textContent = caption;
  const utterance = new SpeechSynthesisUtterance(caption);
  utterance.lang = "zh-CN";
  utterance.rate = state.rate;
  utterance.pitch = 1;
  utterance.volume = 1;
  const voice = selectVoice();
  if (voice) utterance.voice = voice;
  utterance.onstart = () => {
    if (runId !== state.speechRun) return;
    setVoiceState("speaking");
    updateSpeechUi("speaking");
    elements.pipelineStatus.textContent = "正在语音播报回答";
    markPipelineThrough("answer");
    setPipelineStage("speak", "active");
  };
  utterance.onend = () => {
    if (runId !== state.speechRun) return;
    speakSegment(index + 1, runId);
  };
  utterance.onerror = (event) => {
    if (runId !== state.speechRun || event.error === "canceled") return;
    updateSpeechUi("stopped");
    elements.speechStateLabel.textContent = "语音播报未完成";
    setVoiceState("idle");
    showToast("系统声音暂时没有播放，可以直接阅读当前回答");
  };
  window.speechSynthesis.speak(utterance);
}

function speakAnswer(text) {
  if (!speechSynthesisSupported) {
    showToast("当前浏览器不支持语音播报，请使用最新版 Chrome 或 Edge。");
    return;
  }
  stopSpeaking({ keepDock: true, silent: true });
  const segments = splitSpeech(text);
  if (!segments.length) return;
  state.speechRun += 1;
  state.speechSegments = segments;
  state.speechIndex = 0;
  updateSpeechUi("speaking");
  setPipelineStage("speak", "active");
  elements.pipelineStatus.textContent = "正在语音播报回答";
  speakSegment(0, state.speechRun);
}

function stopSpeaking({ keepDock = false, silent = false } = {}) {
  state.speechRun += 1;
  state.speechSegments = [];
  state.speechIndex = 0;
  if (speechSynthesisSupported) window.speechSynthesis.cancel();
  if (
    state.voiceState === "speaking" ||
    state.voiceState === "paused"
  ) {
    setVoiceState("idle");
  }
  if (keepDock) {
    updateSpeechUi("stopped");
  } else {
    elements.speechDock.hidden = true;
    elements.speechDock.classList.remove("is-paused");
  }
  if (!silent) {
    markPipelineThrough("speak");
    elements.pipelineStatus.textContent = "播报已停止";
  }
}

function togglePauseSpeech() {
  if (!speechSynthesisSupported) return;
  if (state.voiceState === "speaking") {
    window.speechSynthesis.pause();
    setVoiceState("paused");
    updateSpeechUi("paused");
  } else if (state.voiceState === "paused") {
    window.speechSynthesis.resume();
    setVoiceState("speaking");
    updateSpeechUi("speaking");
  } else if (state.currentAnswer?.speech) {
    speakAnswer(state.currentAnswer.speech);
  }
}

function getHandoffSummary() {
  const recent = messageStore
    .filter((message) => message.role === "user")
    .slice(-4)
    .map((message) => message.content)
    .join("；");
  return recent || "用户希望获得人工家电选购协助";
}

function createLocalHandoffTicket(summary, reason) {
  const ticket = {
    ticketId: `MY-${String(Date.now()).slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
    status: "queued",
    queuePosition: 1,
    estimatedWaitSeconds: 10,
    summary,
    reason,
    createdAt: new Date().toISOString()
  };
  localHandoffTickets.set(ticket.ticketId, ticket);
  window.setTimeout(() => {
    const current = localHandoffTickets.get(ticket.ticketId);
    if (current) {
      current.status = "connected";
      current.agentName = "人工顾问小林";
    }
  }, 1800);
  return ticket;
}

async function createHandoffTicket(summary, reason) {
  let ticket;
  if (localEngineActive) {
    ticket = createLocalHandoffTicket(summary, reason);
  } else {
    try {
      const response = await fetch("/api/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, reason })
      });
      ticket = await response.json();
      if (!response.ok) throw new Error(ticket.error || "转接失败");
    } catch (error) {
      localEngineActive = true;
      ticket = createLocalHandoffTicket(summary, reason);
    }
  }
  elements.handoffCard.hidden = false;
  elements.handoffTitle.textContent = "已进入人工服务队列";
  elements.handoffDescription.textContent =
    "会话摘要已同步，人工顾问接入后会直接看到你的需求和推荐记录。";
  elements.handoffTicket.textContent = `工单 ${ticket.ticketId}`;
  elements.handoffWait.textContent = "预计 10 秒接入";
  pollHandoff(ticket.ticketId);
  return ticket;
}

async function requestHandoff(reason = "用户主动请求人工协助") {
  stopSpeaking({ keepDock: false, silent: true });
  hideWelcome();
  const summary = getHandoffSummary();
  addUserMessage("帮我转人工顾问", "text");
  const thinking = addThinkingMessage();
  elements.handoffCard.hidden = false;
  elements.handoffTitle.textContent = "正在连接人工顾问";
  elements.handoffDescription.textContent = "已带上本次对话摘要，无需重复描述。";
  elements.handoffTicket.textContent = "正在创建服务工单";
  elements.handoffWait.textContent = "请稍候";
  try {
    await createHandoffTicket(summary, reason);
    thinking.remove();

    const acknowledgement = {
      intent: "handoff",
      confidence: 0.99,
      answer:
        "好的，我已经整理好这次的选购需求，并创建了人工服务工单。你不需要再重复描述，接入后会由人工顾问继续协助。",
      speech:
        "好的，我已经整理好这次的选购需求，并创建了人工服务工单。你不需要再重复描述，接入后会由人工顾问继续协助。",
      productIds: [],
      comparisonProductIds: [],
      sources: [{ title: "人工服务规范", section: "复杂问题转接", detail: "转接时同步会话摘要与已识别需求" }],
      followUps: []
    };
    renderAssistantMessage(acknowledgement);
    state.currentAnswer = acknowledgement;
    if (state.autoSpeak && speechSynthesisSupported) {
      speakAnswer(acknowledgement.speech);
    }
  } catch (error) {
    thinking.remove();
    elements.handoffTitle.textContent = "人工服务暂未连接";
    elements.handoffDescription.textContent = error.message;
    elements.handoffWait.textContent = "请稍后重试";
    showToast(error.message);
  }
}

function showHandoffFromAssistant(handoff) {
  elements.handoffCard.hidden = false;
  elements.handoffTitle.textContent =
    handoff.status === "connected" ? "人工顾问已接入" : "正在连接人工顾问";
  elements.handoffDescription.textContent =
    handoff.summary || "已带上本次对话摘要，无需重复描述。";
  elements.handoffTicket.textContent = handoff.ticketId
    ? `工单 ${handoff.ticketId}`
    : "会话已准备";
  elements.handoffWait.textContent = handoff.agentName || "预计 10 秒接入";
}

async function pollHandoff(ticketId) {
  window.clearTimeout(state.handoffPollTimer);
  let attempts = 0;
  const poll = async () => {
    attempts += 1;
    try {
      let ticket = localHandoffTickets.get(ticketId);
      if (!ticket) {
        const response = await fetch(`/api/handoff/${encodeURIComponent(ticketId)}`);
        ticket = await response.json();
      }
      if (ticket.status === "connected") {
        elements.handoffTitle.textContent = `${ticket.agentName || "人工顾问"}已接入`;
        elements.handoffWait.textContent = "现在可以继续描述问题";
        elements.handoffDescription.textContent =
          "人工顾问已收到你的需求摘要，正在查看本次推荐与知识库来源。";
        showToast("人工顾问已接入");
        return;
      }
    } catch {
      // A transient poll failure should not discard the queued ticket.
    }
    if (attempts < 8) {
      state.handoffPollTimer = window.setTimeout(poll, 1500);
    }
  };
  state.handoffPollTimer = window.setTimeout(poll, 1800);
}

function newConversation() {
  stopSpeaking({ keepDock: false, silent: true });
  state.currentRequestController?.abort();
  state.busy = false;
  state.lastProductIds = [];
  state.currentAnswer = null;
  selectedForCompare.clear();
  messageStore.length = 0;
  elements.messages.replaceChildren();
  elements.welcome.classList.remove("is-hidden");
  elements.conversation.scrollTop = 0;
  state.profile = {};
  renderProfile();
  renderSources([]);
  elements.handoffCard.hidden = true;
  resetPipeline();
  setVoiceState("idle");
  elements.queryInput.value = "";
  resizeInput();
  if (window.matchMedia("(min-width: 721px)").matches) {
    elements.queryInput.focus();
  }
  showToast("已开始新对话");
}

function resizeInput() {
  const input = elements.queryInput;
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
}

function initEvents() {
  elements.heroMic.addEventListener("click", startListening);
  elements.composerMic.addEventListener("click", startListening);

  elements.composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = elements.queryInput.value.trim();
    if (!query) {
      elements.queryInput.focus();
      showToast("先说出或输入一个具体问题");
      return;
    }
    elements.queryInput.value = "";
    resizeInput();
    sendQuery(query, { source: "text" });
  });

  elements.queryInput.addEventListener("input", resizeInput);
  elements.queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      elements.composer.requestSubmit();
    }
  });

  elements.messages.addEventListener("click", (event) => {
    const prompt = event.target.closest("[data-prompt]");
    if (prompt) {
      sendQuery(prompt.dataset.prompt, { source: "text" });
    }
  });

  $$("[data-prompt]", elements.welcome).forEach((button) => {
    button.addEventListener("click", () =>
      sendQuery(button.dataset.prompt, { source: "text" })
    );
  });

  $$("[data-service]").forEach((button) => {
    button.addEventListener("click", () =>
      sendQuery(button.dataset.service, { source: "text" })
    );
  });

  elements.pauseSpeechButton.addEventListener("click", togglePauseSpeech);
  elements.stopSpeechButton.addEventListener("click", () =>
    stopSpeaking({ keepDock: false })
  );
  elements.replaySpeechButton.addEventListener("click", () => {
    if (state.currentAnswer?.speech) {
      speakAnswer(state.currentAnswer.speech);
    } else {
      showToast("当前没有可重新播报的回答");
    }
  });

  elements.autoSpeakToggle.addEventListener("change", () => {
    state.autoSpeak = elements.autoSpeakToggle.checked;
    storageSet("muyan-auto-speak", String(state.autoSpeak));
    if (!state.autoSpeak) stopSpeaking({ keepDock: false, silent: true });
    showToast(state.autoSpeak ? "回答后会自动读给你听" : "已关闭自动播报");
  });

  elements.speechRate.addEventListener("input", () => {
    state.rate = Number(elements.speechRate.value);
    updateRateLabel();
    storageSet("muyan-speech-rate", String(state.rate));
    if (state.voiceState === "speaking" && state.currentAnswer?.speech) {
      speakAnswer(state.currentAnswer.speech);
    }
  });

  elements.voiceSelect.addEventListener("change", () => {
    state.preferredVoice = elements.voiceSelect.value;
    storageSet("muyan-voice", state.preferredVoice);
    showToast("声音已更新，下一条回答会使用新声音");
  });

  elements.largeTextButton.addEventListener("click", () => {
    const enabled = !document.documentElement.classList.contains("large-print");
    document.documentElement.classList.toggle("large-print", enabled);
    elements.largeTextButton.setAttribute("aria-pressed", String(enabled));
    storageSet("muyan-large-print", String(enabled));
    showToast(enabled ? "大字模式已开启" : "大字模式已关闭");
  });

  elements.clearProfileButton.addEventListener("click", () => {
    state.profile = {};
    renderProfile();
    showToast("已清空本次选购偏好");
  });

  elements.newChatButton.addEventListener("click", newConversation);
  elements.handoffButton.addEventListener("click", () =>
    requestHandoff("用户主动请求转人工顾问")
  );
  elements.returnToAi.addEventListener("click", () => {
    elements.handoffCard.hidden = true;
    elements.queryInput.focus();
    showToast("已回到 AI 顾问，人工工单仍会保留");
  });
  elements.closeCompare.addEventListener("click", () =>
    elements.compareDialog.close()
  );
  elements.compareDialog.addEventListener("click", (event) => {
    if (event.target === elements.compareDialog) {
      elements.compareDialog.close();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.voiceState === "speaking") {
      window.speechSynthesis.pause();
      setVoiceState("paused");
      updateSpeechUi("paused");
    }
  });
  window.addEventListener("beforeunload", () => {
    if (speechSynthesisSupported) window.speechSynthesis.cancel();
  });
}

async function loadCatalog() {
  if (localEngineActive) {
    try {
      const engine = await loadBrowserEngine();
      engine.getCatalog().forEach((product) => {
        if (product?.id) catalog.set(product.id, product);
      });
      return;
    } catch (error) {
      showToast(error.message, 5200);
      return;
    }
  }
  try {
    const response = await fetch("/api/catalog");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "商品知识库加载失败");
    (data.products || []).forEach((product) => {
      if (product?.id) catalog.set(product.id, product);
    });
  } catch (error) {
    localEngineActive = true;
    try {
      const engine = await loadBrowserEngine();
      engine.getCatalog().forEach((product) => {
        if (product?.id) catalog.set(product.id, product);
      });
    } catch (engineError) {
      showToast(engineError.message, 5200);
    }
  }
}

async function init() {
  loadPreferences();
  setSupportStatus();
  initRecognition();
  initEvents();
  renderProfile();
  renderSources([]);
  if (speechSynthesisSupported) {
    refreshVoiceList();
    window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoiceList);
  }
  await loadCatalog();
  const hour = new Date().getHours();
  const greeting = $(".welcome-copy .eyebrow");
  if (greeting) {
    greeting.textContent = `${
      hour < 11 ? "早上好" : hour < 18 ? "下午好" : "晚上好"
    }，林女士`;
  }
}

init();
