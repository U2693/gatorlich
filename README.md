# gatorlich

A browser-based shortwave radio vignette that drifts across frequencies and catches eerie numbers stations. The radio tunes at random, each station has its own symbol set, and propagation plus atmospheric noise shape what you hear.

## Vision

- **Shortwave radio UI** with a single tuning control and a live frequency readout.
- **Random tuning drift** that lands on stations at different times and frequencies.
- **Numbers stations** with distinct symbol lists and repeating schedules.
- **Atmospheric noise + propagation** layers that vary over time to simulate fading and static.

## Planned Components

- **Tuning engine**: randomized scanning, step sizes, dwell times, and band limits.
- **Station model**: schedules, symbol sets, and multiple frequency appearances.
- **Audio simulation**: static, fading, and signal strength shaping.
- **Visualizer**: frequency dial, signal meter, and subtle UI flicker.

## Station MIKE

- Five-symbol groups drawn from `1 3 5 7 9`.
- Rarely emits the word `fifteen` instead of a digit.

## Serve

```bash
bun install
bun run dev
```

This starts a watch build for `/public/app.js` and serves on `http://localhost:7890`.

## Build

```bash
bun run build
bun run start
```

## Status

Station MIKE implemented with a basic radio UI, random tuning, and simulated noise/propagation.
