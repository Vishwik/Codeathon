const defaultCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    ...defaultCorsHeaders
  });
  res.end(JSON.stringify(payload));
}

export function requestHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, defaultCorsHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "codeathon-api",
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api") {
    sendJson(res, 200, {
      message: "Codeathon API is ready."
    });
    return;
  }

  sendJson(res, 404, {
    error: "Not found"
  });
}
