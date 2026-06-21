import { join } from "node:path";

import { ensureDir, writeJson } from "./fs-utils.ts";
import { collectDiffSummary } from "./git.ts";
import { inspectGodotProject, validateGodotProject } from "./godot.ts";
import type { SandboxRunner } from "./sandbox-runner.ts";
import type { TraceLogger } from "./trace.ts";
import type { AgentResult, AgentRun } from "./types.ts";

export class GodotHarness {
	private runner: SandboxRunner;
	private trace: TraceLogger;

	constructor(runner: SandboxRunner, trace: TraceLogger) {
		this.runner = runner;
		this.trace = trace;
	}

	async runAgent(
		agent: AgentRun,
		options: {
			godotBin?: string;
			runProject: boolean;
			timeoutMs: number;
		},
	): Promise<AgentResult> {
		await this.trace.append({
			type: "agent.start",
			taskId: agent.taskId,
			agentId: agent.agentId,
			data: { worktreePath: agent.worktreePath },
		});

		const sandbox = await this.runner.prepareWorkspace(agent.taskId, agent.agentId, agent.worktreePath);
		const project = await inspectGodotProject(agent.worktreePath);
		const validation = await validateGodotProject(agent.worktreePath, this.runner, options);
		const diff = await collectDiffSummary(agent.worktreePath);
		const logPath = join(agent.worktreePath, ".godex", "logs", `${agent.agentId}.json`);
		const status = validation.status === "failed" ? ("failed" as const) : ("completed" as const);
		const result: AgentResult = { agentId: agent.agentId, status, project, validation, diff, logPath };

		await ensureDir(join(logPath, ".."));
		await writeJson(logPath, result);
		await this.runner.destroySandbox(sandbox);
		await this.trace.append({
			type: "agent.finish",
			taskId: agent.taskId,
			agentId: agent.agentId,
			data: { status, validation: validation.status, changedFiles: diff.changedFiles },
		});

		return result;
	}
}
