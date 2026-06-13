import { createSeededRng } from "./rng";
import { nextCarloGroup } from "./stations/carlo";
import { nextMikeGroup } from "./stations/mike";

const rng = createSeededRng(Date.now());

const frequencyEl = document.querySelector<HTMLSpanElement>("#frequency");
const signalBarEl = document.querySelector<HTMLDivElement>("#signal-bar");
const signalTextEl = document.querySelector<HTMLSpanElement>("#signal-text");
const stationEl = document.querySelector<HTMLSpanElement>("#station");
const logEl = document.querySelector<HTMLDivElement>("#log");
const noiseEl = document.querySelector<HTMLSpanElement>("#noise");
const propagationEl = document.querySelector<HTMLSpanElement>("#propagation");
const audioToggleEl = document.querySelector<HTMLButtonElement>("#audio-toggle");
const audioStatusEl = document.querySelector<HTMLSpanElement>("#audio-status");

if (
  !frequencyEl ||
  !signalBarEl ||
  !signalTextEl ||
  !stationEl ||
  !logEl ||
  !noiseEl ||
  !propagationEl ||
  !audioToggleEl ||
  !audioStatusEl
) {
  throw new Error("Missing UI elements");
}

const audioState = createAudioState();
audioToggleEl.addEventListener("click", async () => {
  if (!audioState.ready) {
    await audioState.init();
  } else {
    audioState.toggle();
  }
});

const band = { min: 3000, max: 15000 };
const mikeFrequencies = [4625, 7810, 10200, 11475];
const carloFrequencies = [3520, 5120, 6800, 9275, 13260];

let currentFrequency = randomBetween(band.min, band.max);
let targetFrequency = randomBetween(band.min, band.max);
let lastRetune = performance.now();
let lastMessageAt = 0;
let lastSpokenAt = 0;
let holdUntil = 0;
let lockedPresence: Presence | null = null;

interface Presence {
  station: "MIKE" | "CARLO";
  frequency: number;
  start: number;
  end: number;
  propagation: number;
}

let presences: Presence[] = [
  schedulePresence(performance.now(), "MIKE"),
  schedulePresence(performance.now(), "CARLO")
];

const logLines: string[] = [];
const maxLogLines = 8;

const driftInterval = 200;
const retuneEvery = () => randomBetween(4000, 8000);
let nextRetuneIn = retuneEvery();

setInterval(() => {
  const now = performance.now();
  const deltaSeconds = driftInterval / 1000;
  const holdActive = holdUntil > now;

  if (!holdActive && holdUntil !== 0 && now >= holdUntil) {
    holdUntil = 0;
    lockedPresence = null;
  }

  if (!holdActive && now - lastRetune > nextRetuneIn) {
    const activePresences = presences.filter(
      (presence) => now >= presence.start && now <= presence.end
    );

    if (activePresences.length > 0 && rng() < 0.6) {
      const targetPresence = pick(activePresences);
      targetFrequency =
        targetPresence.frequency + randomBetween(-2.5, 2.5);
    } else {
      targetFrequency = randomBetween(band.min, band.max);
    }

    lastRetune = now;
    nextRetuneIn = retuneEvery();
  }

  if (!holdActive) {
    const drift = (targetFrequency - currentFrequency) * 0.08;
    currentFrequency += drift * deltaSeconds * 5;
  } else if (lockedPresence) {
    currentFrequency = lockedPresence.frequency;
  }

  presences = presences.map((presence) =>
    now > presence.end ? schedulePresence(now, presence.station) : presence
  );

  const { signalStrength, tuneFactor, noiseLevel, activePresence } =
    computeSignal(currentFrequency, now, holdActive);

  updateDisplay({
    frequency: currentFrequency,
    signalStrength,
    tuneFactor,
    noiseLevel,
    activePresence
  });

  audioState.setNoiseLevel(noiseLevel, signalStrength);

  if (signalStrength > 0.45 && now - lastMessageAt > 1800 && activePresence) {
    lastMessageAt = now;
    const groupCount = Math.floor(randomBetween(7, 13));
    const groups: string[] = [];
    for (let index = 0; index < groupCount; index += 1) {
      groups.push(nextGroup(activePresence.station).text);
    }
    const message = `${activePresence.station} ${groups.join(" | ")}`;
    appendLog(message);

    const speechText = buildSpeech(activePresence.station, groups);
    const estimatedDuration = estimateSpeechDuration(speechText);
    lockedPresence = activePresence;

    if (audioState.ready && now - lastSpokenAt > 4000) {
      lastSpokenAt = now;
      holdUntil = Number.POSITIVE_INFINITY;
      audioState.speak(speechText, estimatedDuration).then(() => {
        holdUntil = performance.now();
      });
    } else {
      holdUntil = now + estimatedDuration;
    }
  }
}, driftInterval);

function computeSignal(frequency: number, now: number, holdActive: boolean) {
  let bestStrength = 0;
  let bestTune = 0;
  let bestPresence: Presence | null = null;

  for (const presence of presences) {
    const lockedMatch =
      holdActive && lockedPresence?.station === presence.station;
    if (!lockedMatch && (now < presence.start || now > presence.end)) {
      continue;
    }

    const delta = Math.abs(frequency - presence.frequency);
    const tuneFactor = clamp(1 - delta / 8, 0, 1);
    const fade = 0.6 + 0.4 * Math.sin(now / 1200) + rng() * 0.1;
    const strength = clamp(tuneFactor * presence.propagation * fade, 0, 1);

    if (strength > bestStrength) {
      bestStrength = strength;
      bestTune = tuneFactor;
      bestPresence = presence;
    }
  }

  const noiseLevel = clamp(0.2 + (1 - bestStrength) * 0.7 + rng() * 0.08, 0, 1);

  return {
    signalStrength: bestStrength,
    tuneFactor: bestTune,
    noiseLevel,
    activePresence: bestPresence
  };
}

function schedulePresence(now: number, station: "MIKE" | "CARLO"): Presence {
  const gap = randomBetween(6000, 16000);
  const duration = randomBetween(12000, 28000);
  const frequency =
    station === "MIKE" ? pick(mikeFrequencies) : pick(carloFrequencies);
  return {
    station,
    frequency,
    start: now + gap,
    end: now + gap + duration,
    propagation: randomBetween(0.55, 1)
  };
}

function updateDisplay(params: {
  frequency: number;
  signalStrength: number;
  tuneFactor: number;
  noiseLevel: number;
  activePresence: Presence | null;
}) {
  frequencyEl.textContent = params.frequency.toFixed(1);
  signalBarEl.style.width = `${Math.round(params.signalStrength * 100)}%`;
  signalTextEl.textContent = `${Math.round(params.signalStrength * 100)}%`;
  noiseEl!.textContent = `${Math.round(params.noiseLevel * 100)}%`;
  propagationEl!.textContent = params.activePresence
    ? `${Math.round(params.activePresence.propagation * 100)}%`
    : "--";

  if (params.signalStrength > 0.6 && params.activePresence) {
    stationEl.textContent = `${params.activePresence.station} ${params.activePresence.frequency.toFixed(1)} kHz`;
  } else if (params.tuneFactor > 0.2) {
    stationEl.textContent = "Weak carrier";
  } else {
    stationEl.textContent = "Searching...";
  }
}

function appendLog(message: string) {
  logLines.unshift(message);
  if (logLines.length > maxLogLines) {
    logLines.pop();
  }

  logEl.innerHTML = "";
  for (const line of logLines) {
    const entry = document.createElement("div");
    entry.className = "log__entry";
    entry.textContent = line;
    logEl.appendChild(entry);
  }
}

function nextGroup(station: "MIKE" | "CARLO") {
  return station === "MIKE" ? nextMikeGroup(rng) : nextCarloGroup(rng);
}

function buildSpeech(station: "MIKE" | "CARLO", groups: string[]) {
  if (station === "MIKE") {
    return groups.join(" ").replaceAll("fifteen", "1 5");
  }

  return groups.join(" ");
}

function estimateSpeechDuration(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const millis = words * 420;
  return clamp(millis, 3000, 12000);
}

function createAudioState() {
  let context: AudioContext | null = null;
  let noiseSource: AudioBufferSourceNode | null = null;
  let noiseGain: GainNode | null = null;
  let masterGain: GainNode | null = null;
  let running = false;

  const init = async () => {
    if (context) {
      return;
    }

    context = new AudioContext();
    masterGain = context.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(context.destination);

    const bufferSize = context.sampleRate * 2;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    noiseSource = context.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    noiseGain = context.createGain();
    noiseGain.gain.value = 0;

    noiseSource.connect(noiseGain).connect(masterGain);
    noiseSource.start();

    running = true;
    audioToggleEl.textContent = "Mute audio";
    audioStatusEl.textContent = "Audio active";
  };

  const toggle = async () => {
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      await context.resume();
      running = true;
      audioToggleEl.textContent = "Mute audio";
      audioStatusEl.textContent = "Audio active";
      return;
    }

    await context.suspend();
    running = false;
    audioToggleEl.textContent = "Start audio";
    audioStatusEl.textContent = "Audio muted";
  };

  const setNoiseLevel = (noiseLevel: number, signalStrength: number) => {
    if (!noiseGain || !running) {
      return;
    }

    const base = 0.1 + noiseLevel * 0.6;
    const duck = 1 - signalStrength * 0.6;
    noiseGain.gain.value = base * duck;
  };

  const speak = (text: string, fallbackMs: number) => {
    if (!running) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.82;
      utterance.pitch = 0.2;
      utterance.volume = 0.9;

      let resolved = false;
      const finish = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve();
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
      setTimeout(finish, fallbackMs);
    });
  };

  return {
    get ready() {
      return !!context && running;
    },
    init,
    toggle,
    setNoiseLevel,
    speak
  };
}

function randomBetween(min: number, max: number) {
  return rng() * (max - min) + min;
}

function pick<T>(list: T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
