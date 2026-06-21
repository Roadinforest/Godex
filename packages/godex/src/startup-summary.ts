import { stripVTControlCharacters } from "node:util";
import { Chalk } from "chalk";
import figlet, { type FontName } from "figlet";

import type { GodotProjectInfo } from "./types.ts";

const logoChalk = new Chalk({ level: 3 });
const GODEX_LOGO_LINES = createGodexLogoLines();

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
		...GODEX_LOGO_LINES,
		"",
		"Godot Agent",
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
		const left = padVisible(truncateVisible(leftLines[index] ?? "", leftWidth), leftWidth);
		const right = padVisible(truncateVisible(rightLines[index] ?? "", rightWidth), rightWidth);
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
	const body = lines.map((line) => `│ ${padVisible(truncateVisible(line, innerWidth - 2), innerWidth - 2)} │`);
	const bottom = `╰${"─".repeat(innerWidth)}╯`;
	return [top, ...body, bottom].join("\n");
}

function createGodexLogoLines(): string[] {
	const logo = figlet.textSync("Godex", {
		font: "ANSI Shadow" as FontName,
		horizontalLayout: "fitted",
	});
	const lines = logo.split("\n");
	while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
		lines.pop();
	}
	const maxWidth = Math.max(...lines.map((line) => line.length));
	return lines.map((line) => colorizeLogoLine(line, maxWidth));
}

function colorizeLogoLine(line: string, width: number): string {
	return [...line]
		.map((char, index) => {
			if (char === " ") return char;
			const [red, green, blue] = interpolatePurple(index, Math.max(1, width - 1));
			return logoChalk.rgb(red, green, blue)(char);
		})
		.join("");
}

function interpolatePurple(index: number, maxIndex: number): [number, number, number] {
	const start = [124, 58, 237] as const;
	const middle = [168, 85, 247] as const;
	const end = [217, 70, 239] as const;
	const ratio = index / maxIndex;
	const from = ratio < 0.5 ? start : middle;
	const to = ratio < 0.5 ? middle : end;
	const localRatio = ratio < 0.5 ? ratio * 2 : (ratio - 0.5) * 2;
	return [
		Math.round(from[0] + (to[0] - from[0]) * localRatio),
		Math.round(from[1] + (to[1] - from[1]) * localRatio),
		Math.round(from[2] + (to[2] - from[2]) * localRatio),
	];
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

function truncateVisible(value: string, width: number): string {
	if (visibleLength(value) <= width) return value;
	const plain = stripVTControlCharacters(value);
	if (plain.length <= width) return plain;
	if (width <= 3) return ".".repeat(Math.max(0, width));
	return `${plain.slice(0, width - 3)}...`;
}

function padVisible(value: string, width: number): string {
	return value + " ".repeat(Math.max(0, width - visibleLength(value)));
}

function visibleLength(value: string): number {
	return stripVTControlCharacters(value).length;
}
