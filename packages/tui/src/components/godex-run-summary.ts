import type { Component } from "../tui.ts";
import { truncateToWidth, visibleWidth } from "../utils.ts";

export type GodexTaskStatus = "pending" | "running" | "completed" | "failed";
export type GodexAgentStatus = "pending" | "running" | "completed" | "failed";
export type GodexValidationStatus = "passed" | "failed" | "skipped";

export interface GodexRunSummaryAgent {
	agentId: string;
	status: GodexAgentStatus;
	validation?: GodexValidationStatus;
	changedFiles?: number;
	worktreePath?: string;
	branch?: string;
}

export interface GodexRunSummaryTheme {
	title: (text: string) => string;
	label: (text: string) => string;
	success: (text: string) => string;
	warning: (text: string) => string;
	danger: (text: string) => string;
	muted: (text: string) => string;
	best: (text: string) => string;
}

export interface GodexRunSummaryOptions {
	taskId: string;
	status: GodexTaskStatus;
	goal?: string;
	mode?: "single-worktree" | "multi-worktree";
	bestAgentId?: string;
	agents: GodexRunSummaryAgent[];
	maxAgents?: number;
	theme?: Partial<GodexRunSummaryTheme>;
}

const defaultTheme: GodexRunSummaryTheme = {
	title: (text) => text,
	label: (text) => text,
	success: (text) => text,
	warning: (text) => text,
	danger: (text) => text,
	muted: (text) => text,
	best: (text) => text,
};

export class GodexRunSummary implements Component {
	private options: GodexRunSummaryOptions;
	private cachedWidth?: number;
	private cachedSignature?: string;
	private cachedLines?: string[];

	constructor(options: GodexRunSummaryOptions) {
		this.options = options;
	}

	setOptions(options: GodexRunSummaryOptions): void {
		this.options = options;
		this.invalidate();
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedSignature = undefined;
		this.cachedLines = undefined;
	}

	render(width: number): string[] {
		const renderWidth = Math.max(1, width);
		const signature = JSON.stringify(this.options);
		if (this.cachedLines && this.cachedWidth === renderWidth && this.cachedSignature === signature) {
			return this.cachedLines;
		}

		const theme = { ...defaultTheme, ...this.options.theme };
		const lines = this.renderLines(renderWidth, theme);
		this.cachedWidth = renderWidth;
		this.cachedSignature = signature;
		this.cachedLines = lines;
		return lines;
	}

	private renderLines(width: number, theme: GodexRunSummaryTheme): string[] {
		const lines: string[] = [];
		lines.push(this.fit(theme.title(`Godex ${this.options.taskId}`), width));

		const mode = this.options.mode ? ` ${this.options.mode}` : "";
		lines.push(this.fit(`${theme.label("Status")} ${this.styleStatus(this.options.status, theme)}${mode}`, width));

		if (this.options.goal) {
			lines.push(this.fit(`${theme.label("Goal")} ${this.options.goal}`, width));
		}

		const passed = this.options.agents.filter((agent) => agent.validation === "passed").length;
		const failed = this.options.agents.filter(
			(agent) => agent.status === "failed" || agent.validation === "failed",
		).length;
		const changed = this.options.agents.reduce((sum, agent) => sum + (agent.changedFiles ?? 0), 0);
		lines.push(
			this.fit(
				`${theme.label("Agents")} ${this.options.agents.length} total, ${passed} passed, ${failed} failed, ${changed} changed files`,
				width,
			),
		);

		if (this.options.bestAgentId) {
			lines.push(this.fit(`${theme.label("Best")} ${theme.best(this.options.bestAgentId)}`, width));
		}

		const visibleAgents = this.options.agents.slice(0, this.options.maxAgents ?? this.options.agents.length);
		for (const agent of visibleAgents) {
			lines.push(this.fit(this.renderAgent(agent, theme), width));
		}

		const hiddenCount = this.options.agents.length - visibleAgents.length;
		if (hiddenCount > 0) {
			lines.push(this.fit(theme.muted(`... ${hiddenCount} more agent(s)`), width));
		}

		return lines;
	}

	private renderAgent(agent: GodexRunSummaryAgent, theme: GodexRunSummaryTheme): string {
		const validation = agent.validation ? ` validation=${this.styleValidation(agent.validation, theme)}` : "";
		const changedFiles = agent.changedFiles === undefined ? "" : ` changed=${agent.changedFiles}`;
		const branch = agent.branch ? ` branch=${agent.branch}` : "";
		const path = agent.worktreePath ? ` path=${agent.worktreePath}` : "";
		const best = agent.agentId === this.options.bestAgentId ? ` ${theme.best("best")}` : "";
		return `- ${agent.agentId}${best} status=${this.styleStatus(agent.status, theme)}${validation}${changedFiles}${branch}${path}`;
	}

	private styleStatus(status: GodexTaskStatus | GodexAgentStatus, theme: GodexRunSummaryTheme): string {
		if (status === "completed") return theme.success(status);
		if (status === "failed") return theme.danger(status);
		if (status === "running") return theme.warning(status);
		return theme.muted(status);
	}

	private styleValidation(status: GodexValidationStatus, theme: GodexRunSummaryTheme): string {
		if (status === "passed") return theme.success(status);
		if (status === "failed") return theme.danger(status);
		return theme.muted(status);
	}

	private fit(text: string, width: number): string {
		const truncated = truncateToWidth(text, width, "");
		const padding = Math.max(0, width - visibleWidth(truncated));
		return truncated + " ".repeat(padding);
	}
}
