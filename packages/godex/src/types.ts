export type TaskStatus = "pending" | "running" | "completed" | "failed";

export type AgentStatus = "pending" | "running" | "completed" | "failed";

export type ValidationStatus = "passed" | "failed" | "skipped";

export type TaskMode = "single-worktree" | "multi-worktree";

export interface GodexTask {
	taskId: string;
	projectRoot: string;
	goal: string;
	mode: TaskMode;
	status: TaskStatus;
	createdAt: string;
	updatedAt: string;
	agents: AgentRun[];
}

export interface AgentRun {
	taskId: string;
	agentId: string;
	worktreePath: string;
	branch: string;
	sandboxId: string;
	status: AgentStatus;
	createdAt: string;
	updatedAt: string;
	result?: AgentResult;
}

export interface AgentResult {
	agentId: string;
	status: AgentStatus;
	project: GodotProjectInfo;
	validation: ValidationResult;
	diff: GitDiffSummary;
	logPath: string;
}

export interface GodotProjectInfo {
	projectPath: string;
	projectFile: string;
	name?: string;
	hasProjectFile: boolean;
	scenes: string[];
	scripts: string[];
	assets: string[];
	configFiles: string[];
	directories: string[];
	warnings: string[];
}

export interface ValidationResult {
	status: ValidationStatus;
	checks: ValidationCheck[];
	command?: ExecResult;
}

export interface ValidationCheck {
	name: string;
	status: ValidationStatus;
	message: string;
}

export interface ExecResult {
	command: string[];
	cwd: string;
	exitCode: number | null;
	stdout: string;
	stderr: string;
	durationMs: number;
	timedOut: boolean;
	truncated: boolean;
}

export interface SandboxOptions {
	workspace: string;
	cwd?: string;
	timeoutMs?: number;
	maxOutputBytes?: number;
	env?: Record<string, string>;
}

export interface SandboxInfo {
	sandboxId: string;
	taskId: string;
	agentId: string;
	workspace: string;
	tmpDir: string;
	network: "off";
	status: "ready" | "destroyed";
}

export interface WorktreeInfo {
	taskId: string;
	agentId: string;
	worktreePath: string;
	branch: string;
	status: AgentStatus;
	createdAt: string;
}

export interface GitDiffSummary {
	stat: string;
	patch: string;
	changedFiles: string[];
}

export interface RunTaskOptions {
	projectRoot: string;
	goal: string;
	agents: number;
	baseRef?: string;
	godotBin?: string;
	runProject: boolean;
	timeoutMs: number;
}

export interface AggregatedResult {
	task: GodexTask;
	bestAgentId?: string;
	summary: string;
	agents: AgentResult[];
}
