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

## Getting Started (planned)

```bash
npm install
npm run dev
```

## Status

Project scaffolding in progress. Next steps: set up the web app shell and implement the tuning engine.
