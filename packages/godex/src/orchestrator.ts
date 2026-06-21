import { join, resolve } from "node:path";

import { ensureDir, readJson, writeJson } from "./fs-utils.ts";
import { GodotHarness } from "./harness.ts";
import { createAgentId, createTaskId, nowIso } from "./ids.ts";
import { aggregateResults } from "./result-aggregator.ts";
import { SandboxRunner } from "./sandbox-runner.ts";
import { TraceLogger } from "./trace.ts";
import type { AgentRun, AggregatedResult, GodexTask, RunTaskOptions } from "./types.ts";
import { WorktreeManager } from "./worktree-manager.ts";

export async function runGodexTask(options: RunTaskOptions): Promise<AggregatedResult> {
	const projectRoot = resolve(options.projectRoot);
	const taskId = createTaskId();
	const metadataRoot = join(projectRoot, ".godex");
	const trace = new TraceLogger(projectRoot, taskId);
	const worktrees = new WorktreeManager(projectRoot);
	const now = nowIso();
	const task: GodexTask = {
		taskId,
		projectRoot,
		goal: options.goal,
		mode: options.agents > 1 ? "multi-worktree" : "single-worktree",
		status: "running",
		createdAt: now,
		updatedAt: now,
		agents: [],
	};

	await ensureDir(metadataRoot);
	await trace.append({ type: "task.start", taskId, data: { goal: options.goal, agents: options.agents } });
	await saveTask(projectRoot, task);

	const agentRuns: AgentRun[] = [];
	for (let index = 0; index < options.agents; index += 1) {
		const agentId = createAgentId(index);
		const worktree = await worktrees.createWorktree(taskId, agentId, options.baseRef);
		const agent: AgentRun = {
			...worktree,
			sandboxId: `sbx-${taskId}-${agentId}`,
			status: "running",
			updatedAt: nowIso(),
		};
		agentRuns.push(agent);
		task.agents = agentRuns;
		task.updatedAt = nowIso();
		await saveTask(projectRoot, task);
	}

	const runner = new SandboxRunner(metadataRoot);
	const harness = new GodotHarness(runner, trace);
	const results = await Promise.all(
		agentRuns.map((agent) =>
			harness.runAgent(agent, {
				godotBin: options.godotBin,
				runProject: options.runProject,
				timeoutMs: options.timeoutMs,
			}),
		),
	);

	task.agents = task.agents.map((agent) => {
		const result = results.find((candidate) => candidate.agentId === agent.agentId);
		return { ...agent, status: result?.status ?? "failed", result, updatedAt: nowIso() };
	});
	task.status = results.some((result) => result.status === "failed") ? "failed" : "completed";
	task.updatedAt = nowIso();

	const aggregated = aggregateResults(task, results);
	await saveTask(projectRoot, task);
	await writeJson(join(projectRoot, ".godex", "outputs", taskId, "result.json"), aggregated);
	await trace.append({
		type: "task.finish",
		taskId,
		data: { status: task.status, bestAgentId: aggregated.bestAgentId },
	});

	return aggregated;
}

export async function loadTask(projectRoot: string, taskId: string): Promise<GodexTask> {
	return readJson<GodexTask>(join(resolve(projectRoot), ".godex", "tasks", `${taskId}.json`));
}

export async function saveTask(projectRoot: string, task: GodexTask): Promise<void> {
	await writeJson(join(resolve(projectRoot), ".godex", "tasks", `${task.taskId}.json`), task);
}
