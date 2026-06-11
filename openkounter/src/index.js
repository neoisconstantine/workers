/**
 * OpenKounter - Cloudflare Worker 自建计数器
 *
 * API:
 *   GET  /api/counter?target=<target>  → 查询计数器
 *   POST /api/counter                   → 批量递增计数器
 *     body: { action: "batch_inc", requests: [{ target: "xxx" }, ...] }
 *
 * 兼容 Fluid 主题的 OpenKounter 前端统计插件。
 */

// KV 命名空间绑定（在 wrangler.toml 中声明）
// 变量名: COUNTERS

const DEFAULT_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...DEFAULT_CORS,
    },
  });
}

function errorResponse(message, code = 1, status = 400) {
  return jsonResponse({ code, message }, status);
}

function successResponse(data) {
  return jsonResponse({ code: 0, data });
}

// ---------- GET /api/counter ----------
async function handleGet(request, env) {
  const url = new URL(request.url);
  const target = url.searchParams.get('target');

  if (!target) {
    return errorResponse('Missing "target" query parameter');
  }

  const value = await env.COUNTERS.get(target);
  const time = value ? parseInt(value, 10) : 0;

  return successResponse({ target, time });
}

// ---------- POST /api/counter ----------
async function handlePost(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (body.action !== 'batch_inc') {
    return errorResponse('Unsupported action. Use "batch_inc"');
  }

  const requests = body.requests;
  if (!Array.isArray(requests) || requests.length === 0) {
    return errorResponse('"requests" must be a non-empty array');
  }

  // 批量递增：逐个写入 KV
  // KV 不支持事务，逐个 put 在大多数场景下足够
  for (const req of requests) {
    if (!req.target) continue;

    const key = req.target;
    const current = await env.COUNTERS.get(key);
    const next = (current ? parseInt(current, 10) : 0) + 1;
    await env.COUNTERS.put(key, next.toString());
  }

  return successResponse({ incremented: requests.length });
}

// ---------- OPTIONS (CORS 预检) ----------
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      ...DEFAULT_CORS,
    },
  });
}

// ---------- 入口 ----------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // OPTIONS 预检
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // 路由
    if (path === '/api/counter') {
      switch (request.method) {
        case 'GET':
          return handleGet(request, env);
        case 'POST':
          return handlePost(request, env);
        default:
          return errorResponse('Method not allowed', 1, 405);
      }
    }

    // 健康检查
    if (path === '/health' || path === '/') {
      return successResponse({ status: 'ok' });
    }

    return errorResponse('Not found', 1, 404);
  },
};
