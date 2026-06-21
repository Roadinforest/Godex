import { resolve } from "node:path";
import { main as runCodingAgentMain } from "@earendil-works/pi-coding-agent";

import { ensureGodotProject, type inspectGodotProject } from "./godot.ts";

export interface GodexChatOptions {
	projectRoot: string;
	args: string[];
}

export async function runGodexChat(options: GodexChatOptions): Promise<void> {
	const projectRoot = resolve(options.projectRoot);
	const project = await ensureGodotProject(projectRoot);

	const previousCwd = process.cwd();
	process.chdir(projectRoot);
	try {
		await runCodingAgentMain(["--append-system-prompt", buildGodexSystemPrompt(project), ...options.args]);
	} finally {
		process.chdir(previousCwd);
	}
}

function buildGodexSystemPrompt(project: Awaited<ReturnType<typeof inspectGodotProject>>): string {
	const name = project.name ?? "Unnamed Godot project";
	return [
		"You are Godex, a Godot-focused coding agent running inside the target Godot project.",
		"",
		"Project context:",
		`- Name: ${name}`,
		`- Root: ${project.projectPath}`,
		`- Scenes discovered: ${project.scenes.length}`,
		`- Scripts discovered: ${project.scripts.length}`,
		`- Assets discovered: ${project.assets.length}`,
		`- Config files discovered: ${project.configFiles.length}`,
		`- Top-level directories: ${project.directories.join(", ") || "(none)"}`,
		"",
		"Godex operating rules:",
		"- Prefer Godot project structure: scenes, scripts, assets, resources, addons, and project.godot.",
		"- Read relevant .gd, .tscn, .tres, and project.godot files before editing them.",
		"- Preserve Godot resource paths and scene references when moving or editing assets.",
		"- Use Godot CLI validation when available, such as `godot --headless --path . --quit`.",
		"- Explain validation results and any remaining manual checks clearly.",
		"- Keep changes scoped to the user's Godot task unless they explicitly ask for broader work.",
	].join("\n");
}
