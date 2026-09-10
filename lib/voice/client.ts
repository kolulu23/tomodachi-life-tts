import type { SpeechRequest, SpeechResult } from './types';
/** One persistent worker; cancellation discards it, interrupting synchronous synthesis. */
export class VoiceClient {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private rejectReady: ((error: Error) => void) | null = null;
  private pending: {
    id: number;
    resolve: (value: SpeechResult) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private nextId = 0;
  init() {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      this.rejectReady = reject;
      this.worker = new Worker('/engine/worker.js', { type: 'module' });
      this.worker.onerror = () =>
        this.dispose(
          new Error('The speech engine failed to load. Please retry.'),
        );
      this.worker.onmessage = ({ data }) => {
        if (data.type === 'ready') {
          this.rejectReady = null;
          resolve();
        } else if (data.type === 'error') {
          if (data.id === undefined) this.dispose(new Error(data.error));
          else if (this.pending && this.pending.id === data.id) {
            clearTimeout(this.pending.timer);
            this.pending.reject(new Error(data.error));
            this.pending = null;
          }
        } else if (
          data.type === 'result' &&
          this.pending &&
          this.pending.id === data.id
        ) {
          clearTimeout(this.pending.timer);
          this.pending.resolve(data);
          this.pending = null;
        }
      };
    });
    const timer = setTimeout(
      () =>
        this.dispose(
          new Error(
            'Speech engine loading timed out. Check your connection and retry.',
          ),
        ),
      60000,
    );
    this.ready.then(
      () => clearTimeout(timer),
      () => clearTimeout(timer),
    );
    return this.ready;
  }
  async generate(request: SpeechRequest): Promise<SpeechResult> {
    await this.init();
    if (this.pending) throw new Error('A voice is already being generated.');
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      const timer = setTimeout(
        () =>
          this.dispose(
            new Error('Generation timed out. Try a shorter phrase.'),
          ),
        45000,
      );
      this.pending = { id, resolve, reject, timer };
      this.worker!.postMessage({ id, request });
    });
  }
  dispose(error = new Error('Generation cancelled.')) {
    this.worker?.terminate();
    this.worker = null;
    this.rejectReady?.(error);
    this.rejectReady = null;
    this.ready = null;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = null;
    }
  }
}
