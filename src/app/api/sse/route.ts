import { NextRequest } from "next/server";
import { addSSEClient, removeSSEClient } from "@/lib/sse";
import { getAdminFromRequest, getTeamFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // If running in a serverless environment (e.g. Vercel), long-lived SSE connections
  // starve serverless concurrency limits and cannot broadcast across instances.
  // Returning 204 tells the browser not to hold open the connection or retry.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return new Response(null, { status: 204 });
  }

  const admin = getAdminFromRequest(req);
  const team = getTeamFromRequest(req);

  const role = admin ? "admin" : "participant";
  const teamId = team?.teamId;
  const clientId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(clientId, controller, role, teamId);

      // Send initial connection packet
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`event: CONNECTED\ndata: ${JSON.stringify({ clientId, role, time: new Date().toISOString() })}\n\n`)
      );

      // Set up heartbeat timer for this connection
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
          removeSSEClient(clientId);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        removeSSEClient(clientId);
      });
    },
    cancel() {
      removeSSEClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
