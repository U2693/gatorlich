const buildProcess = Bun.spawn([
  "bun",
  "build",
  "src/web.ts",
  "--outfile",
  "public/app.js",
  "--watch"
], {
  stdout: "inherit",
  stderr: "inherit"
});

const serverProcess = Bun.spawn(["bun", "run", "src/server.ts"], {
  stdout: "inherit",
  stderr: "inherit"
});

const handleExit = () => {
  buildProcess.kill();
  serverProcess.kill();
};

process.on("SIGINT", () => {
  handleExit();
  process.exit(0);
});

process.on("SIGTERM", () => {
  handleExit();
  process.exit(0);
});

const buildExit = await buildProcess.exited;
const serverExit = await serverProcess.exited;

console.log(`Dev build exited with code ${buildExit}.`);
console.log(`Dev server exited with code ${serverExit}.`);
