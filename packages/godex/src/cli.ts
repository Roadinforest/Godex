#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { formatProjectInfo, inspectGodotProject } from "./godot.ts";
import { loadTask, runGodexTask } from "./orchestrator.ts";
import type { RunTaskOptions } from "./types.ts";
import { WorktreeManager } from "./worktree-manager.ts";

interface ParsedCommand {
	command: string;
	positionals: string[];
	flags: Map<string, string | boolean>;
}

export async function main(argv: string[]): Promise<void> {
	try {
		const parsed = parseCommand(argv);
		if (parsed.command === "help" || parsed.flags.has("help")) {
			console.log(helpText());
			return;
		}

		if (parsed.command === "inspect") {
			const project = getStringFlag(parsed, "project") ?? process.cwd();
			console.log(formatProjectInfo(await inspectGodotProject(project)));
			return;
		}

		if (parsed.command === "run") {
			const options = parseRunOptions(parsed);
			const result = await runGodexTask(options);
			console.log(result.summary);
			return;
		}

		if (parsed.command === "result") {
			const taskId = parsed.positionals[0];
			if (!taskId) throw new Error("Missing task id");
			const project = getStringFlag(parsed, "project") ?? process.cwd();
			const task = await loadTask(project, taskId);
			console.log(JSON.stringify(task, null, 2));
			return;
		}

		if (parsed.command === "worktrees") {
			const action = parsed.positionals[0] ?? "list";
			if (action !== "list") throw new Error(`Unknown worktrees action: ${action}`);
			const project = getStringFlag(parsed, "project") ?? process.cwd();
			const taskId = getStringFlag(parsed, "task");
			const manager = new WorktreeManager(project);
			console.log(JSON.stringify(await manager.listWorktrees(taskId), null, 2));
			return;
		}

		if (parsed.command === "cleanup") {
			const taskId = parsed.positionals[0];
			if (!taskId) throw new Error("Missing task id");
			const project = getStringFlag(parsed, "project") ?? process.cwd();
			const manager = new WorktreeManager(project);
			const worktrees = await manager.listWorktrees(taskId);
			for (const worktree of worktrees) await manager.removeWorktree(worktree);
			console.log(`Removed ${worktrees.length} worktree(s) for ${taskId}`);
			return;
		}

		throw new Error(`Unknown command: ${parsed.command}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`godex: ${message}`);
		process.exitCode = 1;
	}
}

export function parseCommand(argv: string[]): ParsedCommand {
	const [command = "help", ...rest] = argv;
	const flags = new Map<string, string | boolean>();
	const positionals: string[] = [];

	for (let index = 0; index < rest.length; index += 1) {
		const arg = rest[index] ?? "";
		if (!arg.startsWith("--")) {
			positionals.push(arg);
			continue;
		}
		const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
		if (!rawKey) throw new Error(`Invalid flag: ${arg}`);
		if (inlineValue !== undefined) {
			flags.set(rawKey, inlineValue);
			continue;
		}
		const next = rest[index + 1];
		if (next && !next.startsWith("--")) {
			flags.set(rawKey, next);
			index += 1;
			continue;
		}
		flags.set(rawKey, true);
	}

	return { command, flags, positionals };
}

function parseRunOptions(parsed: ParsedCommand): RunTaskOptions {
	const projectRoot = resolve(getStringFlag(parsed, "project") ?? process.cwd());
	const goal = getStringFlag(parsed, "goal");
	if (!goal) throw new Error("Missing --goal");
	const agents = getNumberFlag(parsed, "agents") ?? 1;
	if (!Number.isInteger(agents) || agents < 1) throw new Error("--agents must be a positive integer");

	return {
		projectRoot,
		goal,
		agents,
		baseRef: getStringFlag(parsed, "base-ref"),
		godotBin: getStringFlag(parsed, "godot-bin"),
		runProject: parsed.flags.has("run-project"),
		timeoutMs: getNumberFlag(parsed, "timeout-ms") ?? 15_000,
	};
}

function getStringFlag(parsed: ParsedCommand, name: string): string | undefined {
	const value = parsed.flags.get(name);
	if (value === undefined || typeof value === "boolean") return undefined;
	return value;
}

function getNumberFlag(parsed: ParsedCommand, name: string): number | undefined {
	const value = getStringFlag(parsed, name);
	if (value === undefined) return undefined;
	const parsedValue = Number(value);
	if (!Number.isFinite(parsedValue)) throw new Error(`--${name} must be a number`);
	return parsedValue;
}

function helpText(): string {
	return [
		"Usage:",
		"  godex inspect --project <godot-project>",
		"  godex run --project <godot-project> --goal <goal> [--agents 2] [--run-project] [--godot-bin godot]",
		"  godex result <task-id> --project <godot-project>",
		"  godex worktrees list --project <godot-project> [--task <task-id>]",
		"  godex cleanup <task-id> --project <godot-project>",
	].join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main(process.argv.slice(2));
}
