import { createSeededRng } from "./rng";
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

let currentFrequency = randomBetween(band.min, band.max);
let targetFrequency = randomBetween(band.min, band.max);
let lastRetune = performance.now();
let lastMessageAt = 0;

interface Presence {
  frequency: number;
  start: number;
  end: number;
  propagation: number;
}

let mikePresence = schedulePresence(performance.now());

const logLines: string[] = [];
const maxLogLines = 8;

const driftInterval = 200;
const retuneEvery = () => randomBetween(4000, 8000);
let nextRetuneIn = retuneEvery();

setInterval(() => {
  const now = performance.now();
  const deltaSeconds = driftInterval / 1000;

  if (now - lastRetune > nextRetuneIn) {
    const mikeActive = now >= mikePresence.start && now <= mikePresence.end;
    if (mikeActive && rng() < 0.55) {
      targetFrequency =
        mikePresence.frequency + randomBetween(-2.5, 2.5);
    } else {
      targetFrequency = randomBetween(band.min, band.max);
    }
    lastRetune = now;
    nextRetuneIn = retuneEvery();
  }

  const drift = (targetFrequency - currentFrequency) * 0.08;
  currentFrequency += drift * deltaSeconds * 5;

  if (now > mikePresence.end) {
    mikePresence = schedulePresence(now);
  }

  const { signalStrength, tuneFactor, noiseLevel } = computeSignal(
    currentFrequency,
    now
  );

  updateDisplay({
    frequency: currentFrequency,
    signalStrength,
    tuneFactor,
    noiseLevel,
    propagation: mikePresence.propagation
  });

  if (signalStrength > 0.45 && now - lastMessageAt > 1800) {
    lastMessageAt = now;
    const groupCount = Math.floor(randomBetween(7, 13));
    const groups: string[] = [];
    for (let index = 0; index < groupCount; index += 1) {
      groups.push(nextMikeGroup(rng).text);
    }
    appendLog(`MIKE ${groups.join(" | ")}`);
  }
}, driftInterval);

function computeSignal(frequency: number, now: number) {
  const active = now >= mikePresence.start && now <= mikePresence.end;
  let tuneFactor = 0;
  let propagation = 0;

  if (active) {
    const delta = Math.abs(frequency - mikePresence.frequency);
    tuneFactor = clamp(1 - delta / 8, 0, 1);
    propagation = mikePresence.propagation;
  }

  const fade = 0.6 + 0.4 * Math.sin(now / 1200) + rng() * 0.1;
  const signalStrength = clamp(tuneFactor * propagation * fade, 0, 1);
  const noiseLevel = clamp(0.2 + (1 - signalStrength) * 0.7 + rng() * 0.08, 0, 1);

  return { signalStrength, tuneFactor, noiseLevel };
}

function schedulePresence(now: number): Presence {
  const gap = randomBetween(6000, 16000);
  const duration = randomBetween(12000, 28000);
  const frequency = pick(mikeFrequencies);
  return {
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
  propagation: number;
}) {
  frequencyEl.textContent = params.frequency.toFixed(1);
  signalBarEl.style.width = `${Math.round(params.signalStrength * 100)}%`;
  signalTextEl.textContent = `${Math.round(params.signalStrength * 100)}%`;
  noiseEl!.textContent = `${Math.round(params.noiseLevel * 100)}%`;
  propagationEl!.textContent = `${Math.round(params.propagation * 100)}%`;

  if (params.signalStrength > 0.6) {
    stationEl.textContent = `MIKE ${mikePresence.frequency.toFixed(1)} kHz`;
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

function randomBetween(min: number, max: number) {
  return rng() * (max - min) + min;
}

function pick<T>(list: T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
