export function assertExclusiveLoopbackPorts(ports: readonly number[]): Promise<void>;
export function fixtureHealth(name: string, runId?: string): string;
export function monitorOwnedChild(child: import('node:child_process').ChildProcess, isStopping: () => boolean, onFailure: () => void): void;
