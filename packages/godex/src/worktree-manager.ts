import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { ensureDir, readJson, removePath, writeJson } from "./fs-utils.ts";
import { findGitRoot, getCurrentRef, runGit } from "./git.ts";
import { nowIso, sanitizeName } from "./ids.ts";
import type { WorktreeInfo } from "./types.ts";

export class WorktreeManager {
	private repoRoot: string;

	constructor(repoRoot: string) {
		this.repoRoot = resolve(repoRoot);
	}

	async createWorktree(taskId: string, agentId: string, baseRef?: string): Promise<WorktreeInfo> {
		const gitRoot = await findGitRoot(this.repoRoot);
		const worktreeRoot = join(gitRoot, ".godex", "worktrees");
		await ensureDir(worktreeRoot);

		const branch = `godex/${sanitizeName(taskId)}-${sanitizeName(agentId)}`;
		const worktreePath = join(worktreeRoot, `${sanitizeName(taskId)}-${sanitizeName(agentId)}`);
		const ref = baseRef ?? (await getCurrentRef(gitRoot));

		await runGit(["worktree", "add", "-B", branch, worktreePath, ref], gitRoot);

		const info = {
			taskId,
			agentId,
			worktreePath,
			branch,
			status: "pending" as const,
			createdAt: nowIso(),
		};
		await this.writeWorktreeInfo(info);
		return info;
	}

	async listWorktrees(taskId?: string): Promise<WorktreeInfo[]> {
		const gitRoot = await findGitRoot(this.repoRoot);
		const metadataRoot = join(gitRoot, ".godex", "worktrees");
		await ensureDir(metadataRoot);
		const entries = await readdir(metadataRoot, { withFileTypes: true });
		const infos: WorktreeInfo[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const metadataPath = join(metadataRoot, entry.name, ".godex-worktree.json");
			try {
				const info = await readJson<WorktreeInfo>(metadataPath);
				if (!taskId || info.taskId === taskId) infos.push(info);
			} catch {}
		}

		return infos.sort((left, right) => left.agentId.localeCompare(right.agentId));
	}

	async removeWorktree(info: WorktreeInfo): Promise<void> {
		const gitRoot = await findGitRoot(this.repoRoot);
		await runGit(["worktree", "remove", "--force", info.worktreePath], gitRoot);
		await runGit(["branch", "-D", info.branch], gitRoot).catch(() => undefined);
		await removePath(info.worktreePath);
	}

	private async writeWorktreeInfo(info: WorktreeInfo): Promise<void> {
		await writeJson(join(info.worktreePath, ".godex-worktree.json"), info);
	}
}
