import type { Rng } from "../rng";

export const MIKE_BASE_SYMBOLS = ["1", "3", "5", "7", "9"] as const;
export const MIKE_RARE_SYMBOL = "fifteen" as const;
export const MIKE_DEFAULT_RARE_PROBABILITY = 0.02;

export interface StationMikeConfig {
  rareProbability?: number;
}

export interface MikeGroup {
  station: "MIKE";
  symbols: string[];
  text: string;
}

export const nextMikeGroup = (
  rng: Rng,
  config: StationMikeConfig = {}
): MikeGroup => {
  const rareProbability =
    config.rareProbability ?? MIKE_DEFAULT_RARE_PROBABILITY;
  const symbols: string[] = [];

  for (let index = 0; index < 5; index += 1) {
    const useRare = rng() < rareProbability;
    if (useRare) {
      symbols.push(MIKE_RARE_SYMBOL);
      continue;
    }

    const pick = Math.floor(rng() * MIKE_BASE_SYMBOLS.length);
    symbols.push(MIKE_BASE_SYMBOLS[pick]);
  }

  return {
    station: "MIKE",
    symbols,
    text: symbols.join(" ")
  };
};

export function* mikeGroupStream(
  rng: Rng,
  config: StationMikeConfig = {}
): Generator<MikeGroup> {
  while (true) {
    yield nextMikeGroup(rng, config);
  }
}
