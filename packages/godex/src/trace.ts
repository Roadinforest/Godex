import { appendFile } from "node:fs/promises";
import { join } from "node:path";

import { ensureDir } from "./fs-utils.ts";
import { nowIso } from "./ids.ts";

export interface TraceEvent {
	type: string;
	taskId: string;
	agentId?: string;
	message?: string;
	data?: unknown;
}

export class TraceLogger {
	private tracePath: string;

	constructor(root: string, taskId: string) {
		this.tracePath = join(root, ".godex", "traces", `${taskId}.jsonl`);
	}

	async append(event: TraceEvent): Promise<void> {
		await ensureDir(join(this.tracePath, ".."));
		await appendFile(this.tracePath, `${JSON.stringify({ timestamp: nowIso(), ...event })}\n`, "utf8");
	}

	get path(): string {
		return this.tracePath;
	}
}
