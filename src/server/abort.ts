
export function maybeAbort(signal?: AbortSignal): void {
  if (signal && signal.aborted) {
    throw new Aborted();
  }
}

export class Aborted extends Error {
  constructor() {
    super('Aborted');
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, Aborted.prototype);
  }
}
