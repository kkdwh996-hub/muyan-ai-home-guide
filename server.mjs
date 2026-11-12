import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { answerQuery, getCatalog } from "./lib/engine.mjs";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = resolve(projectRoot, "public");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

const handoffTickets = new Map();

function securityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "microphone=(self)");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; font-src 'self' data:;"
  );
}

function sendJson(response, statusCode, data) {
  securityHeaders(response);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

async function readJsonBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > 256_000) {
      const error = new Error("请求内容过大");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("请求内容不是有效的 JSON");
    error.statusCode = 400;
    throw error;
  }
}

function normalizeProfile(profile = {}) {
  let budget = null;
  if (
    profile.budget &&
    typeof profile.budget === "object" &&
    Number.isFinite(Number(profile.budget.max)) &&
    Number(profile.budget.max) > 0
  ) {
    budget = {
      min: Number.isFinite(Number(profile.budget.min))
        ? Number(profile.budget.min)
        : null,
      max: Number(profile.budget.max),
      source:
        typeof profile.budget.source === "string"
          ? profile.budget.source
          : "ceiling"
    };
  } else if (
    Number.isFinite(Number(profile.budget)) &&
    Number(profile.budget) > 0
  ) {
    budget = { min: null, max: Number(profile.budget), source: "ceiling" };
  }
  return {
    budget,
    householdSize:
      Number.isFinite(Number(profile.householdSize)) &&
      Number(profile.householdSize) > 0
        ? Number(profile.householdSize)
        : null,
    priorities: Array.isArray(profile.priorities)
      ? profile.priorities.filter((item) => typeof item === "string").slice(0, 8)
      : [],
    preferredCategory:
      typeof profile.preferredCategory === "string" ? profile.preferredCategory : ""
  };
}

function staticPath(urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  if (pathname === "/") pathname = "/index.html";
  const candidate = resolve(publicRoot, `.${normalize(pathname)}`);
  if (candidate !== publicRoot && !candidate.startsWith(`${publicRoot}${sep}`)) {
    return null;
  }
  return candidate;
}

function serveStatic(request, response, urlPath) {
  const filePath = staticPath(urlPath);
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    securityHeaders(response);
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("页面不存在");
    return;
  }

  securityHeaders(response);
  const extension = extname(filePath).toLowerCase();
  const isHtml = extension === ".html";
  response.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control": isHtml ? "no-cache" : "public, max-age=3600"
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

export function createAppServer() {
  return createServer(async (request, response) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, {
        status: "ok",
        service: "慕言 AI 家电顾问",
        voicePipeline: ["asr", "intent", "rag", "answer", "tts"],
        catalogSize: getCatalog().length
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/catalog") {
      sendJson(response, 200, { products: getCatalog() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/assistant") {
      try {
        const body = await readJsonBody(request);
        const query = typeof body.query === "string" ? body.query.trim() : "";
        if (!query) {
          sendJson(response, 400, { error: "请先说出或输入你的问题" });
          return;
        }
        if (query.length > 800) {
          sendJson(response, 400, { error: "问题过长，请精简后重试" });
          return;
        }

        const startedAt = performance.now();
        const profile = normalizeProfile(body.profile);
        const context = {
          lastProductIds: Array.isArray(body.context?.lastProductIds)
            ? body.context.lastProductIds.filter((id) => typeof id === "string").slice(0, 8)
            : [],
          channel: body.channel === "voice" ? "voice" : "text"
        };
        const result = answerQuery({ query, profile, context });
        const productIds = Array.isArray(result.productIds) ? result.productIds : [];
        const products = getCatalog()
          .filter((product) => productIds.includes(product.id))
          .sort((a, b) => productIds.indexOf(a.id) - productIds.indexOf(b.id));

        sendJson(response, 200, {
          ...result,
          requestId: result.requestId || randomUUID(),
          products,
          latencyMs: Math.max(1, Math.round(performance.now() - startedAt))
        });
      } catch (error) {
        sendJson(response, error.statusCode || 500, {
          error:
            error.statusCode && error.statusCode < 500
              ? error.message
              : "顾问暂时走神了，请稍后再试"
        });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/handoff") {
      try {
        const body = await readJsonBody(request);
        const ticketId = `MY-${String(Date.now()).slice(-6)}-${Math.floor(
          100 + Math.random() * 900
        )}`;
        const ticket = {
          ticketId,
          status: "queued",
          queuePosition: 1,
          estimatedWaitSeconds: 10,
          summary:
            typeof body.summary === "string"
              ? body.summary.slice(0, 500)
              : "用户请求人工协助",
          createdAt: new Date().toISOString()
        };
        handoffTickets.set(ticketId, ticket);
        setTimeout(() => {
          const current = handoffTickets.get(ticketId);
          if (current) {
            current.status = "connected";
            current.agentName = "人工顾问小林";
          }
        }, 1800);
        sendJson(response, 201, ticket);
      } catch (error) {
        sendJson(response, error.statusCode || 500, {
          error: "工单创建失败，请稍后重试"
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/handoff/")) {
      const ticketId = decodeURIComponent(url.pathname.split("/").pop() || "");
      const ticket = handoffTickets.get(ticketId);
      if (!ticket) {
        sendJson(response, 404, { error: "未找到该服务工单" });
        return;
      }
      sendJson(response, 200, ticket);
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      serveStatic(request, response, url.pathname);
      return;
    }

    sendJson(response, 405, { error: "不支持的请求方式" });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createAppServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(`慕言 AI 家电顾问已启动：http://localhost:${port}`);
  });
}
