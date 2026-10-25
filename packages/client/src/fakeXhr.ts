/**
 * Hand-written stand-in for `XMLHttpRequest`, shared by the sync tests. Each
 * `new` registers the instance in `FakeXhr.instances` so a test can inspect
 * the request and answer it by hand (`respond`, `fail`).
 */
export class FakeXhr {
  static instances: FakeXhr[] = [];

  method = "";
  url = "";
  body: string | null = null;
  headers: Record<string, string> = {};
  timeout = 0;
  readyState = 0;
  status = 0;
  responseText = "";
  aborted = false;
  onreadystatechange: (() => void) | null = null;

  constructor() {
    FakeXhr.instances.push(this);
  }

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  send(body?: string): void {
    this.body = body ?? null;
  }

  abort(): void {
    this.aborted = true;
  }

  /** Answers the request with an HTTP status and a body. */
  respond(status: number, body: unknown): void {
    this.status = status;
    this.responseText = typeof body === "string" ? body : JSON.stringify(body);
    this.readyState = 4;
    this.onreadystatechange?.();
  }

  /** Ends the request with no HTTP response (offline, DNS, native timeout). */
  fail(): void {
    this.status = 0;
    this.readyState = 4;
    this.onreadystatechange?.();
  }

  static install(): void {
    FakeXhr.instances = [];
    (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest =
      FakeXhr;
  }

  static uninstall(): void {
    FakeXhr.instances = [];
    (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest =
      undefined;
  }
}
