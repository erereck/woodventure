import type { Command, Envelope, Snapshot } from './model';
/** Single authority today; replace delivery with host-validated WebRTC messages later.
 * No renderer/input objects cross this boundary. Matter is NOT deterministic lockstep.
 */
export interface CommandPort { send(command: Command): void }
export interface SnapshotPort { capture(): Snapshot; restore(snapshot: Snapshot): void }
export class LocalTransport implements CommandPort {
  private seq = 0;
  constructor(private receive: (message: Envelope) => void, private tick: () => number, readonly actor='local') {}
  send(command:Command) { this.receive({ seq: ++this.seq, tick:this.tick(), actor:this.actor, command }); }
}
