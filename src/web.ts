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

if (
  !frequencyEl ||
  !signalBarEl ||
  !signalTextEl ||
  !stationEl ||
  !logEl ||
  !noiseEl ||
  !propagationEl
) {
  throw new Error("Missing UI elements");
}

const band = { min: 3000, max: 15000 };
const mikeFrequencies = [4625, 7810, 10200, 11475];
const carloFrequencies = [3520, 5120, 6800, 9275, 13260];

let currentFrequency = randomBetween(band.min, band.max);
let targetFrequency = randomBetween(band.min, band.max);
let lastRetune = performance.now();
let lastMessageAt = 0;

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

  if (now - lastRetune > nextRetuneIn) {
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

  const drift = (targetFrequency - currentFrequency) * 0.08;
  currentFrequency += drift * deltaSeconds * 5;

  presences = presences.map((presence) =>
    now > presence.end ? schedulePresence(now, presence.station) : presence
  );

  const { signalStrength, tuneFactor, noiseLevel, activePresence } =
    computeSignal(currentFrequency, now);

  updateDisplay({
    frequency: currentFrequency,
    signalStrength,
    tuneFactor,
    noiseLevel,
    activePresence
  });

  if (signalStrength > 0.45 && now - lastMessageAt > 1800 && activePresence) {
    lastMessageAt = now;
    const groupCount = Math.floor(randomBetween(7, 13));
    const groups: string[] = [];
    for (let index = 0; index < groupCount; index += 1) {
      groups.push(nextGroup(activePresence.station).text);
    }
    appendLog(`${activePresence.station} ${groups.join(" | ")}`);
  }
}, driftInterval);

function computeSignal(frequency: number, now: number) {
  let bestStrength = 0;
  let bestTune = 0;
  let bestPresence: Presence | null = null;

  for (const presence of presences) {
    if (now < presence.start || now > presence.end) {
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

function randomBetween(min: number, max: number) {
  return rng() * (max - min) + min;
}

function pick<T>(list: T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
