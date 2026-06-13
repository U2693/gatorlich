import type { Rng } from "../rng";

export const CARLO_SYMBOLS = [
  "cero",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve"
] as const;

export interface CarloGroup {
  station: "CARLO";
  symbols: string[];
  text: string;
}

export const nextCarloGroup = (rng: Rng): CarloGroup => {
  const symbols: string[] = [];

  for (let index = 0; index < 5; index += 1) {
    const pick = Math.floor(rng() * CARLO_SYMBOLS.length);
    symbols.push(CARLO_SYMBOLS[pick]);
  }

  return {
    station: "CARLO",
    symbols,
    text: symbols.join(" ")
  };
};

export function* carloGroupStream(rng: Rng): Generator<CarloGroup> {
  while (true) {
    yield nextCarloGroup(rng);
  }
}
