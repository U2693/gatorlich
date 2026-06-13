import { createSeededRng } from "./rng";
import { nextCarloGroup } from "./stations/carlo";
import { nextMikeGroup } from "./stations/mike";

const [, , stationArg] = process.argv;
const station = stationArg?.toUpperCase();

if (!station) {
  console.error("Usage: bun run test <STATION>");
  process.exit(1);
}

const seed = process.env.SEED ? Number(process.env.SEED) : Date.now();
const rng = createSeededRng(Number.isFinite(seed) ? seed : Date.now());

const lineCount = 10;

switch (station) {
  case "MIKE": {
    for (let index = 0; index < lineCount; index += 1) {
      const group = nextMikeGroup(rng);
      console.log(group.text);
    }
    break;
  }
  case "CARLO": {
    for (let index = 0; index < lineCount; index += 1) {
      const group = nextCarloGroup(rng);
      console.log(group.text);
    }
    break;
  }
  default:
    console.error(`Unknown station: ${station}`);
    process.exit(1);
}
