// An upload queue, written the way an AI writes one: long stretches of code,
// and a comment only where a decision was made. Real files look like this —
// six or seven explanations in a hundred and fifty lines, not one every third
// line. Open it and scroll with the reading pane beside you.

interface Upload {
    id: string;
    file: Blob;
    name: string;
    attempts: number;
    addedAt: number;
}

interface Result {
    id: string;
    url?: string;
    error?: string;
}

type Listener = (state: QueueState) => void;

interface QueueState {
    pending: number;
    active: number;
    done: Result[];
}

export class UploadQueue {
    private waiting: Upload[] = [];
    private running = new Map<string, AbortController>();
    private finished: Result[] = [];
    private listeners = new Set<Listener>();
    private paused = false;

    constructor(
        private endpoint: string,
        private maxParallel = 3,
        private maxAttempts = 4,
    ) {}

    add(file: Blob, name: string): string {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.waiting.push({ id, file, name, attempts: 0, addedAt: Date.now() });
        this.pump();
        return id;
    }

    cancel(id: string): void {
        const controller = this.running.get(id);
        if (controller) {
            controller.abort();
            this.running.delete(id);
        }
        this.waiting = this.waiting.filter(u => u.id !== id);
        this.announce();
    }

    pause(): void {
        this.paused = true;
        this.announce();
    }

    resume(): void {
        this.paused = false;
        this.pump();
    }

    onChange(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // Three at a time, not all of them. A browser will happily open dozens of
    // connections and then starve the ones that matter — the page's own
    // requests included. Three keeps the pipe busy without taking it over.
    private pump(): void {
        if (this.paused) { return; }

        while (this.running.size < this.maxParallel && this.waiting.length > 0) {
            const next = this.waiting.shift();
            if (!next) { break; }
            void this.send(next);
        }

        this.announce();
    }

    private async send(upload: Upload): Promise<void> {
        const controller = new AbortController();
        this.running.set(upload.id, controller);

        const body = new FormData();
        body.append('file', upload.file, upload.name);
        body.append('id', upload.id);

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                body,
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`${response.status} ${response.statusText}`);
            }

            const payload = await response.json();
            this.finished.push({ id: upload.id, url: payload.url });
        } catch (error) {
            await this.handleFailure(upload, error);
        } finally {
            this.running.delete(upload.id);
            this.pump();
        }
    }

    // Retries back off, and they back off with a random wobble on top. Without
    // the wobble every upload that failed during the same outage comes back at
    // the same instant and knocks the server over a second time — the thundering
    // herd. The wobble spreads them out for free.
    private async handleFailure(upload: Upload, error: unknown): Promise<void> {
        const aborted = error instanceof DOMException && error.name === 'AbortError';
        if (aborted) { return; }

        upload.attempts += 1;

        if (upload.attempts >= this.maxAttempts) {
            this.finished.push({
                id: upload.id,
                error: error instanceof Error ? error.message : String(error),
            });
            return;
        }

        const base = 500 * 2 ** (upload.attempts - 1);
        const wobble = Math.random() * base * 0.3;
        await new Promise(resolve => setTimeout(resolve, base + wobble));

        this.waiting.unshift(upload);
    }

    private announce(): void {
        const state: QueueState = {
            pending: this.waiting.length,
            active: this.running.size,
            done: [...this.finished],
        };

        for (const listener of this.listeners) {
            listener(state);
        }
    }
}

/**
 * Files are read in slices rather than all at once.
 *
 * A phone will let you pick a two gigabyte video and then run out of memory
 * turning it into one array. Slices keep the peak flat, and the size below is
 * the one that survived testing on the oldest device we support.
 */
export async function* slices(file: Blob, size = 4 * 1024 * 1024) {
    let offset = 0;

    while (offset < file.size) {
        yield file.slice(offset, offset + size);
        offset += size;
    }
}

export function humanSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

// The queue is deliberately not persisted. A half-finished upload restored
// from storage points at a Blob the browser threw away when the tab closed,
// so it would fail on the first attempt every time and look like a bug in the
// server. Losing the queue on refresh is the honest behaviour.
export function attach(queue: UploadQueue, input: HTMLInputElement): () => void {
    const onPick = () => {
        const files = Array.from(input.files ?? []);
        for (const file of files) {
            queue.add(file, file.name);
        }
        input.value = '';
    };

    input.addEventListener('change', onPick);
    return () => input.removeEventListener('change', onPick);
}
