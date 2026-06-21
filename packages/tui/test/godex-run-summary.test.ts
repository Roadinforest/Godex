import assert from "node:assert";
import { describe, it } from "node:test";
import { GodexRunSummary } from "../src/components/godex-run-summary.ts";
import { visibleWidth } from "../src/utils.ts";

describe("GodexRunSummary", () => {
	it("renders Godex task and candidate status", () => {
		const summary = new GodexRunSummary({
			taskId: "task-001",
			status: "completed",
			goal: "Add double jump",
			mode: "multi-worktree",
			bestAgentId: "agent-b",
			agents: [
				{
					agentId: "agent-a",
					status: "completed",
					validation: "passed",
					changedFiles: 3,
					branch: "godex/task-001-agent-a",
				},
				{
					agentId: "agent-b",
					status: "completed",
					validation: "passed",
					changedFiles: 1,
					worktreePath: ".godex/worktrees/task-001-agent-b",
				},
			],
		});

		const lines = summary.render(80);

		assert.ok(lines.some((line) => line.includes("Godex task-001")));
		assert.ok(lines.some((line) => line.includes("Status completed multi-worktree")));
		assert.ok(lines.some((line) => line.includes("Best agent-b")));
		assert.ok(lines.some((line) => line.includes("agent-b best")));
		for (const line of lines) {
			assert.equal(visibleWidth(line), 80);
		}
	});

	it("limits visible agents and keeps narrow output within width", () => {
		const summary = new GodexRunSummary({
			taskId: "task-with-a-long-name",
			status: "running",
			goal: "Create several Godot menu visual candidates",
			bestAgentId: "agent-a",
			maxAgents: 1,
			agents: [
				{
					agentId: "agent-a",
					status: "running",
					validation: "skipped",
					changedFiles: 0,
					worktreePath: ".godex/worktrees/task-with-a-long-name-agent-a",
				},
				{
					agentId: "agent-b",
					status: "pending",
					validation: "skipped",
					changedFiles: 0,
				},
			],
		});

		const lines = summary.render(32);

		assert.ok(lines.some((line) => line.includes("1 more agent")));
		assert.ok(!lines.some((line) => line.includes("agent-b status")));
		for (const line of lines) {
			assert.ok(visibleWidth(line) <= 32);
		}
	});

	it("invalidates cached output when options change", () => {
		const summary = new GodexRunSummary({
			taskId: "task-001",
			status: "running",
			agents: [],
		});

		assert.ok(summary.render(40).some((line) => line.includes("running")));

		summary.setOptions({
			taskId: "task-001",
			status: "failed",
			agents: [],
		});

		assert.ok(summary.render(40).some((line) => line.includes("failed")));
	});
});
