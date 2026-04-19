import net from 'node:net';
import { type IpcRequest, type IpcResponse, ipcResponse } from './messages.js';

export async function ipcCall(endpoint: string, request: IpcRequest): Promise<IpcResponse> {
  return await new Promise((resolve, reject) => {
    const socket = net.createConnection(endpoint, () => {
      socket.write(`${JSON.stringify(request)}\n`);
    });

    let buffer = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      const idx = buffer.indexOf('\n');
      if (idx < 0) return;
      const line = buffer.slice(0, idx);
      try {
        const json = JSON.parse(line);
        const parsed = ipcResponse.parse(json);
        resolve(parsed);
      } catch (err) {
        reject(err);
      } finally {
        socket.end();
      }
    });
    socket.on('error', reject);
  });
}
