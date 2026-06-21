import type { AgentResult, AggregatedResult, GodexTask } from "./types.ts";

export function aggregateResults(task: GodexTask, agents: AgentResult[]): AggregatedResult {
	const best = [...agents].sort(compareAgentResults)[0];
	const passed = agents.filter((agent) => agent.validation.status === "passed").length;
	const changed = agents.reduce((sum, agent) => sum + agent.diff.changedFiles.length, 0);
	const summary = [
		`Task ${task.taskId} ${task.status}`,
		`${agents.length} agent run(s), ${passed} passed validation`,
		`${changed} changed file(s) across candidates`,
		best ? `Best candidate: ${best.agentId}` : "No candidate produced a result",
	].join("\n");

	return {
		task,
		bestAgentId: best?.agentId,
		summary,
		agents,
	};
}

function compareAgentResults(left: AgentResult, right: AgentResult): number {
	const leftPassed = left.validation.status === "passed" ? 0 : 1;
	const rightPassed = right.validation.status === "passed" ? 0 : 1;
	if (leftPassed !== rightPassed) return leftPassed - rightPassed;
	return left.diff.changedFiles.length - right.diff.changedFiles.length;
}
