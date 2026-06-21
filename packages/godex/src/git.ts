import { spawn } from "node:child_process";
import { resolve } from "node:path";

import type { GitDiffSummary } from "./types.ts";

interface GitResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

export async function runGit(args: string[], cwd: string): Promise<GitResult> {
	return new Promise((resolvePromise, reject) => {
		const child = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];

		child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
		child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
		child.on("error", reject);
		child.on("close", (exitCode) => {
			const result = {
				stdout: Buffer.concat(stdout).toString("utf8"),
				stderr: Buffer.concat(stderr).toString("utf8"),
				exitCode,
			};
			if (exitCode === 0) {
				resolvePromise(result);
				return;
			}
			reject(new Error(`git ${args.join(" ")} failed with ${exitCode}: ${result.stderr.trim()}`));
		});
	});
}

export async function findGitRoot(path: string): Promise<string> {
	const result = await runGit(["rev-parse", "--show-toplevel"], path);
	return resolve(result.stdout.trim());
}

export async function getCurrentRef(repoRoot: string): Promise<string> {
	const result = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot);
	const branch = result.stdout.trim();
	if (branch !== "HEAD") return branch;
	const detached = await runGit(["rev-parse", "HEAD"], repoRoot);
	return detached.stdout.trim();
}

export async function collectDiffSummary(worktreePath: string): Promise<GitDiffSummary> {
	const stat = await runGit(["diff", "--stat"], worktreePath);
	const patch = await runGit(["diff", "--binary"], worktreePath);
	const names = await runGit(["diff", "--name-only"], worktreePath);
	return {
		stat: stat.stdout.trim(),
		patch: patch.stdout,
		changedFiles: names.stdout
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0),
	};
}
