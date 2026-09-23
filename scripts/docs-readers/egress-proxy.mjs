#!/usr/bin/env node
/**
 * The allowlisting egress proxy that sits beside every reader container.
 *
 * The reader's own network is internal (no route out), so this proxy is its only way off the
 * box. It tunnels a CONNECT only to a `host:port` named in `EGRESS_ALLOW` (a comma-separated
 * list), refuses everything else with a 403, and writes one JSON line per decision to stdout,
 * which the runner reads back through `podman logs` and merges into the report. Every
 * allowlisted endpoint is HTTPS, so a plain-HTTP request is always refused.
 */
import http from 'node:http';
import net from 'node:net';

const allow = new Set(
  (process.env.EGRESS_ALLOW ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
);
const port = Number(process.env.EGRESS_PORT ?? 3128);

/**
 * Write one decision record to stdout.
 * @param record - The fields to log; a timestamp is added.
 */
function log(record) {
  process.stdout.write(`${JSON.stringify({ ...record, time: new Date().toISOString() })}\n`);
}

const server = http.createServer((req, res) => {
  log({ decision: 'blocked', method: req.method, target: req.url, reason: 'plain-http' });
  res.writeHead(403, { 'content-type': 'text/plain' });
  res.end('egress blocked\n');
});

server.on('connect', (req, clientSocket, head) => {
  const target = String(req.url ?? '').toLowerCase();
  const [host, portText] = target.split(':');
  if (!allow.has(target) || !host || !portText) {
    log({ decision: 'blocked', method: 'CONNECT', target, reason: 'not-allowlisted' });
    clientSocket.end('HTTP/1.1 403 Forbidden\r\ncontent-length: 0\r\n\r\n');
    return;
  }
  log({ decision: 'allowed', method: 'CONNECT', target });
  const upstream = net.connect(Number(portText), host, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (head.length > 0) upstream.write(head);
    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });
  const close = () => {
    upstream.destroy();
    clientSocket.destroy();
  };
  upstream.on('error', close);
  clientSocket.on('error', close);
});

// As PID 1 in its container, the process gets no default SIGTERM handler.
process.on('SIGTERM', () => process.exit(0));

server.listen(port, '0.0.0.0', () => {
  log({ decision: 'listening', port, allow: [...allow] });
});
