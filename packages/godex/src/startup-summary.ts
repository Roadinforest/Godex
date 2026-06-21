import type { GodotProjectInfo } from "./types.ts";

export interface GodexStartupSummaryOptions {
	initialized: boolean;
	args?: string[];
	width?: number;
}

export function formatGodexStartupSummary(project: GodotProjectInfo, options: GodexStartupSummaryOptions): string {
	const name = project.name ?? "Unnamed Godot project";
	const status = options.initialized ? "initialized new Godot project" : "existing Godot project";
	const width = Math.max(48, Math.min(options.width ?? 80, 120));
	const contentWidth = width - 4;
	const model = getModelLabel(options.args ?? []);
	const leftLines = [
		"",
		options.initialized ? "New Godot project initialized" : "Welcome back!",
		"",
		"        Godex",
		"     Godot Agent",
		"",
		model,
		status,
		project.projectPath,
	];
	const rightLines = [
		"Tips",
		"Ask: create a playable 2D demo",
		"Ask: add movement and camera follow",
		"Run with --model <provider/model>",
		"",
		"Godot detection",
		`${name}`,
		`project.godot: ${project.hasProjectFile ? "yes" : "no"}`,
		`scenes ${project.scenes.length} · scripts ${project.scripts.length} · assets ${project.assets.length}`,
		`config ${project.configFiles.length} · dirs ${project.directories.length}`,
		"",
		"Recent activity",
		"No recent activity",
	];

	if (width < 74) {
		return renderBox(width, [...leftLines.filter((line) => line.length > 0), "", ...rightLines]);
	}

	const gap = 3;
	const leftWidth = Math.max(28, Math.floor(contentWidth * 0.52));
	const rightWidth = contentWidth - leftWidth - gap;
	const rows = Math.max(leftLines.length, rightLines.length);
	const lines: string[] = [];
	for (let index = 0; index < rows; index += 1) {
		const left = pad(truncate(leftLines[index] ?? "", leftWidth), leftWidth);
		const right = pad(truncate(rightLines[index] ?? "", rightWidth), rightWidth);
		lines.push(`${left}${" ".repeat(gap)}${right}`);
	}

	return renderBox(width, lines);
}

export function shouldShowGodexStartupSummary(args: string[], stdinIsTTY = process.stdin.isTTY): boolean {
	if (!stdinIsTTY) return false;
	return !args.some((arg) => {
		return (
			arg === "--print" ||
			arg === "-p" ||
			arg === "--version" ||
			arg === "-v" ||
			arg === "--help" ||
			arg === "-h" ||
			arg === "--list-models" ||
			arg === "--mode=json" ||
			arg === "--mode=rpc"
		);
	});
}

function renderBox(width: number, lines: string[]): string {
	const innerWidth = width - 2;
	const title = " Godex ";
	const titlePad = Math.max(0, innerWidth - title.length);
	const top = `╭───${title}${"─".repeat(Math.max(0, titlePad - 3))}╮`;
	const body = lines.map((line) => `│ ${pad(truncate(line, innerWidth - 2), innerWidth - 2)} │`);
	const bottom = `╰${"─".repeat(innerWidth)}╯`;
	return [top, ...body, bottom].join("\n");
}

function getModelLabel(args: string[]): string {
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index] ?? "";
		if (arg === "--model") {
			return args[index + 1] ? `Model ${args[index + 1]}` : "Default model";
		}
		if (arg.startsWith("--model=")) {
			const model = arg.slice("--model=".length);
			return model ? `Model ${model}` : "Default model";
		}
	}
	return "Default model";
}

function truncate(value: string, width: number): string {
	if (value.length <= width) return value;
	if (width <= 3) return ".".repeat(Math.max(0, width));
	return `${value.slice(0, width - 3)}...`;
}

function pad(value: string, width: number): string {
	return value + " ".repeat(Math.max(0, width - value.length));
}
