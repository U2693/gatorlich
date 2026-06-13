import { resolve } from "path";

const publicDir = process.env.PUBLIC_DIR ?? "public";
const basePath = resolve(publicDir);

const server = Bun.serve({
  port: 7890,
  fetch: async (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === "/") {
      pathname = "/index.html";
    }

    const filePath = resolve(basePath, `.${pathname}`);
    if (!filePath.startsWith(basePath)) {
      return new Response("Not found", { status: 404 });
    }

    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(file);
  }
});

console.log(`gatorlich server running on http://localhost:${server.port}`);
console.log(`Serving files from ${basePath}`);
