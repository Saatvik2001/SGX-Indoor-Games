type Client = {
  id: string;
  res: any;
};

const clientsByEvent: Record<string, Client[]> = {};

export function addClient(eventId: string, client: Client) {
  clientsByEvent[eventId] = clientsByEvent[eventId] || [];
  clientsByEvent[eventId].push(client);
}

export function removeClient(eventId: string, clientId: string) {
  if (!clientsByEvent[eventId]) return;
  clientsByEvent[eventId] = clientsByEvent[eventId].filter(c => c.id !== clientId);
}

export function emitEvent(eventId: string, type: string, payload: any) {
  const list = clientsByEvent[eventId] || [];
  const data = JSON.stringify({ type, payload });
  for (const client of list) {
    try {
      client.res.write(`event: ${type}\n`);
      client.res.write(`data: ${data}\n\n`);
    } catch (e) {
      // ignore
    }
  }
}

export function emitGlobal(type: string, payload: any) {
  for (const eventId of Object.keys(clientsByEvent)) {
    emitEvent(eventId, type, payload);
  }
}

export default { addClient, removeClient, emitEvent, emitGlobal };
