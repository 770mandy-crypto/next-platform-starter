// Streams a generator's events to the browser as newline-delimited JSON, and
// stops the generator as soon as nobody is reading (Stop, a closed tab).

export function ndjsonResponse(request, makeEvents, label = 'Research') {
    const upstream = new AbortController();
    const stop = () => upstream.abort();
    request.signal.addEventListener('abort', stop, { once: true });
    const encoder = new TextEncoder();
    const send = (controller, event) => {
        try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            return true;
        } catch {
            return false;
        }
    };

    const body = new ReadableStream({
        async start(controller) {
            try {
                for await (const event of makeEvents(upstream.signal)) {
                    if (!send(controller, event)) {
                        stop();
                        break;
                    }
                }
            } catch (error) {
                if (!upstream.signal.aborted) {
                    console.error(`${label} failed:`, error);
                    send(controller, { type: 'failed' });
                }
            } finally {
                request.signal.removeEventListener('abort', stop);
                try {
                    controller.close();
                } catch {}
            }
        },
        cancel() {
            stop();
        }
    });
    return new Response(body, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' } });
}
