// Online payments are not integrated yet. Never trust unsigned payment events.
// Replace this stub only after provider signature, amount, currency and retry
// verification are implemented together with server-created checkout sessions.
Deno.serve(() => new Response(JSON.stringify({ error: 'Online payments are not configured.' }), {
  status: 503,
  headers: { 'Content-Type': 'application/json' },
}));
