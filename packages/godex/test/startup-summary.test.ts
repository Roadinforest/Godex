import { describe, expect, test } from "vitest";

import { formatGodexStartupSummary, shouldShowGodexStartupSummary } from "../src/startup-summary.ts";
import type { GodotProjectInfo } from "../src/types.ts";

const project: GodotProjectInfo = {
	projectPath: "/tmp/game",
	projectFile: "/tmp/game/project.godot",
	name: "Demo",
	hasProjectFile: true,
	scenes: ["scenes/main.tscn"],
	scripts: ["scripts/main.gd", "scripts/player.gd"],
	assets: ["assets/player.png"],
	configFiles: ["project.godot"],
	directories: ["assets", "scenes", "scripts"],
	warnings: [],
};

describe("formatGodexStartupSummary", () => {
	test("renders a bordered welcome panel with project detection details", () => {
		const summary = formatGodexStartupSummary(project, {
			args: ["--model", "deepseek/deepseek-v4-pro"],
			initialized: false,
			width: 86,
		});

		expect(summary).toContain("╭─── Godex ");
		expect(summary).toContain("Welcome back!");
		expect(summary).toContain("Model deepseek/deepseek-v4-pro");
		expect(summary).toContain("existing Godot project");
		expect(summary).toContain("/tmp/game");
		expect(summary).toContain("Godot detection");
		expect(summary).toContain("project.godot: yes");
		expect(summary).toContain("scenes 1 · scripts 2 · assets 1");
		expect(summary).toContain("Recent activity");
		for (const line of summary.split("\n")) {
			expect(line.length).toBe(86);
		}
	});

	test("renders initialization status for a newly created project", () => {
		const summary = formatGodexStartupSummary(project, { initialized: true, width: 60 });

		expect(summary).toContain("New Godot project initialized");
		expect(summary).toContain("initialized new Godot project");
		for (const line of summary.split("\n")) {
			expect(line.length).toBe(60);
		}
	});
});

describe("shouldShowGodexStartupSummary", () => {
	test("shows only for interactive startup", () => {
		expect(shouldShowGodexStartupSummary([], true)).toBe(true);
		expect(shouldShowGodexStartupSummary(["Add a player"], true)).toBe(true);
	});

	test("hides when output should remain machine-readable or command-like", () => {
		expect(shouldShowGodexStartupSummary([], false)).toBe(false);
		expect(shouldShowGodexStartupSummary(["--print", "hello"], true)).toBe(false);
		expect(shouldShowGodexStartupSummary(["--version"], true)).toBe(false);
		expect(shouldShowGodexStartupSummary(["--mode=json"], true)).toBe(false);
		expect(shouldShowGodexStartupSummary(["--list-models"], true)).toBe(false);
	});
});
