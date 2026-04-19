import { mkdir, rm } from 'node:fs/promises';
import net, { type Server, type Socket } from 'node:net';
import path from 'node:path';
import type { Engine } from '@ctrlr/core';
import { ipcRequest, type IpcResponse } from './messages.js';

export interface IpcServerOptions {
  endpoint: string;
  engine: Engine;
}

/**
 * Newline-delimited JSON protocol over a Unix socket / Windows named pipe.
 * One request → one response, then the connection is closed by the client.
 */
export async function startIpcServer(options: IpcServerOptions): Promise<Server> {
  const { endpoint, engine } = options;

  if (process.platform !== 'win32') {
    await mkdir(path.dirname(endpoint), { recursive: true });
    await rm(endpoint, { force: true });
  }

  const server = net.createServer((socket) => handleConnection(socket, engine));

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(endpoint, () => {
      server.off('error', reject);
      resolve();
    });
  });

  return server;
}

function handleConnection(socket: Socket, engine: Engine): void {
  let buffer = '';
  socket.setEncoding('utf8');
  socket.on('data', (chunk: string) => {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      void respond(socket, line, engine);
    }
  });
  socket.on('error', () => {
    // ignore disconnects
  });
}

async function respond(socket: Socket, line: string, engine: Engine): Promise<void> {
  let resp: IpcResponse;
  try {
    const json = JSON.parse(line);
    const req = ipcRequest.parse(json);
    resp = await execute(engine, req);
  } catch (err) {
    resp = { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
  socket.write(`${JSON.stringify(resp)}\n`);
  socket.end();
}

async function execute(
  engine: Engine,
  req: import('./messages.js').IpcRequest,
): Promise<IpcResponse> {
  switch (req.kind) {
    case 'ping':
      return { ok: true, message: 'pong' };
    case 'quit': {
      // Schedule shutdown so we have time to ack the client.
      setTimeout(() => {
        void engine.shutdown().then(() => process.exit(0));
      }, 50);
      return { ok: true, message: 'shutting down' };
    }
    case 'send': {
      if (req.agent) {
        await engine.sendToAgent(req.agent, req.text, req.appendNewline);
        return { ok: true, message: `sent to ${req.agent}` };
      }
      await engine.broadcast(req.text, req.appendNewline);
      return { ok: true, message: 'broadcast' };
    }
    case 'focus':
      engine.setFocus(req.agent);
      return { ok: true, message: `focused ${req.agent}` };
    case 'restart':
      await engine.restartAgent(req.agent);
      return { ok: true, message: `restarted ${req.agent}` };
    case 'list_agents':
      return {
        ok: true,
        data: engine.getState().agents.map((a) => ({
          id: a.spec.id,
          label: a.spec.label,
          status: a.status,
        })),
      };
  }
}
