/**
 * Collects teardown callbacks for everything a level creates (meshes, lights,
 * particle systems, render observers) so the whole level can be torn down in
 * one call when the party takes the stairs to another floor.
 */
export class Disposables {
  private fns: Array<() => void> = [];

  add(fn: () => void): void {
    this.fns.push(fn);
  }

  /** Convenience for anything with a `dispose()` method (meshes, lights, …). */
  addDisposable(obj: { dispose(): void }): void {
    this.fns.push(() => obj.dispose());
  }

  disposeAll(): void {
    // Tear down in reverse creation order.
    for (let i = this.fns.length - 1; i >= 0; i--) this.fns[i]();
    this.fns = [];
  }
}
