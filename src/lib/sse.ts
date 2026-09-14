type ClientController = ReadableStreamDefaultController<Uint8Array>;

interface SSEClient {
  id: string;
  controller: ClientController;
  role: "admin" | "participant";
  teamId?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var sseClientsGlobal: Map<string, SSEClient> | undefined;
}

const clients: Map<string, SSEClient> =
  globalThis.sseClientsGlobal ?? new Map<string, SSEClient>();

if (process.env.NODE_ENV !== "production") {
  globalThis.sseClientsGlobal = clients;
}

const encoder = new TextEncoder();

export function addSSEClient(
  id: string,
  controller: ClientController,
  role: "admin" | "participant" = "participant",
  teamId?: string
) {
  clients.set(id, { id, controller, role, teamId });
}

export function removeSSEClient(id: string) {
  clients.delete(id);
}

export function broadcastEvent(
  eventType: string,
  data: Record<string, unknown>,
  targetRole?: "admin" | "participant",
  targetTeamId?: string
) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(payload);

  for (const [id, client] of clients.entries()) {
    if (targetRole && client.role !== targetRole) continue;
    if (targetTeamId && client.teamId && client.teamId !== targetTeamId) continue;

    try {
      client.controller.enqueue(encoded);
    } catch {
      // Stream closed or broken connection, clean up
      clients.delete(id);
    }
  }
}

export function broadcastHeartbeat() {
  const pingPayload = encoder.encode(`: ping\n\n`);
  for (const [id, client] of clients.entries()) {
    try {
      client.controller.enqueue(pingPayload);
    } catch {
      clients.delete(id);
    }
  }
}

export function getConnectedClientCount() {
  return clients.size;
}
