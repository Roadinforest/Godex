import { spawn } from "node:child_process";
import { join, resolve } from "node:path";

import { assertInside, ensureDir, removePath } from "./fs-utils.ts";
import type { ExecResult, SandboxInfo, SandboxOptions } from "./types.ts";

const defaultTimeoutMs = 15_000;
const defaultMaxOutputBytes = 256 * 1024;
const deniedCommands = new Set(["curl", "nc", "ncat", "netcat", "rm", "scp", "ssh", "sudo", "wget"]);

export class SandboxRunner {
	private metadataRoot: string;

	constructor(metadataRoot: string) {
		this.metadataRoot = resolve(metadataRoot);
	}

	async prepareWorkspace(taskId: string, agentId: string, workspace: string): Promise<SandboxInfo> {
		const tmpDir = join(this.metadataRoot, "tmp", `${taskId}-${agentId}`);
		await ensureDir(tmpDir);
		return {
			sandboxId: `sbx-${taskId}-${agentId}`,
			taskId,
			agentId,
			workspace: resolve(workspace),
			tmpDir,
			network: "off",
			status: "ready",
		};
	}

	async destroySandbox(info: SandboxInfo): Promise<void> {
		await removePath(info.tmpDir);
		info.status = "destroyed";
	}

	async execute(command: string[], options: SandboxOptions): Promise<ExecResult> {
		if (command.length === 0) throw new Error("Command cannot be empty");
		const executable = command[0] ?? "";
		if (deniedCommands.has(executable)) throw new Error(`Command is denied by sandbox policy: ${executable}`);

		const workspace = resolve(options.workspace);
		const cwd = assertInside(workspace, options.cwd ?? workspace);
		const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
		const maxOutputBytes = options.maxOutputBytes ?? defaultMaxOutputBytes;
		const start = Date.now();

		const env = this.createEnv(options.env);
		return new Promise((resolvePromise, reject) => {
			const child = spawn(executable, command.slice(1), {
				cwd,
				detached: true,
				env,
				shell: false,
				stdio: ["ignore", "pipe", "pipe"],
			});
			const childPid = child.pid;
			const stdout: Buffer[] = [];
			const stderr: Buffer[] = [];
			let outputBytes = 0;
			let timedOut = false;
			let truncated = false;

			const append = (target: Buffer[], chunk: Buffer) => {
				if (outputBytes >= maxOutputBytes) {
					truncated = true;
					return;
				}
				const remaining = maxOutputBytes - outputBytes;
				if (chunk.byteLength > remaining) {
					target.push(chunk.subarray(0, remaining));
					outputBytes += remaining;
					truncated = true;
					return;
				}
				target.push(chunk);
				outputBytes += chunk.byteLength;
			};

			const timer = setTimeout(() => {
				timedOut = true;
				if (childPid) {
					try {
						process.kill(-childPid, "SIGTERM");
					} catch {
						child.kill("SIGTERM");
					}
					setTimeout(() => {
						if (child.killed) return;
						try {
							process.kill(-childPid, "SIGKILL");
						} catch {
							child.kill("SIGKILL");
						}
					}, 500).unref();
				}
			}, timeoutMs);
			timer.unref();

			child.stdout.on("data", (chunk: Buffer) => append(stdout, chunk));
			child.stderr.on("data", (chunk: Buffer) => append(stderr, chunk));
			child.on("error", (error) => {
				clearTimeout(timer);
				reject(error);
			});
			child.on("close", (exitCode) => {
				clearTimeout(timer);
				resolvePromise({
					command,
					cwd,
					exitCode,
					stdout: Buffer.concat(stdout).toString("utf8"),
					stderr: Buffer.concat(stderr).toString("utf8"),
					durationMs: Date.now() - start,
					timedOut,
					truncated,
				});
			});
		});
	}

	private createEnv(extra?: Record<string, string>): Record<string, string> {
		const env: Record<string, string> = {};
		const path = process.env.PATH;
		if (path) env.PATH = path;
		env.HOME = this.metadataRoot;
		env.TMPDIR = join(this.metadataRoot, "tmp");
		env.NO_COLOR = "1";
		env.CI = "1";

		for (const [key, value] of Object.entries(extra ?? {})) {
			if (/^[A-Z_][A-Z0-9_]*$/.test(key)) env[key] = value;
		}

		return env;
	}
}
