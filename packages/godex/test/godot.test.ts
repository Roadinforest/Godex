import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";

import { ensureGodotProject, inspectGodotProject } from "../src/godot.ts";

const tempRoots: string[] = [];

afterEach(async () => {
	await Promise.all(tempRoots.map((root) => rm(root, { force: true, recursive: true })));
	tempRoots.length = 0;
});

test("inspectGodotProject discovers Godot project assets", async () => {
	const root = await mkdtemp(join(tmpdir(), "godex-test-"));
	tempRoots.push(root);
	await mkdir(join(root, "scenes"), { recursive: true });
	await mkdir(join(root, "scripts"), { recursive: true });
	await writeFile(join(root, "project.godot"), '[application]\nconfig/name="Demo"\n', "utf8");
	await writeFile(join(root, "scenes", "main.tscn"), "[gd_scene]\n", "utf8");
	await writeFile(join(root, "scripts", "player.gd"), "extends Node\n", "utf8");

	const info = await inspectGodotProject(root);

	expect(info.name).toBe("Demo");
	expect(info.hasProjectFile).toBe(true);
	expect(info.scenes).toEqual(["scenes/main.tscn"]);
	expect(info.scripts).toEqual(["scripts/player.gd"]);
});

test("ensureGodotProject creates a minimal project.godot in an empty directory", async () => {
	const root = await mkdtemp(join(tmpdir(), "godex-test-"));
	tempRoots.push(root);

	const info = await ensureGodotProject(join(root, "new-game"));
	const projectConfig = await readFile(join(root, "new-game", "project.godot"), "utf8");

	expect(info.name).toBe("new-game");
	expect(info.hasProjectFile).toBe(true);
	expect(projectConfig).toBe('[application]\nconfig/name="new-game"\n');
});

test("ensureGodotProject preserves an existing project.godot", async () => {
	const root = await mkdtemp(join(tmpdir(), "godex-test-"));
	tempRoots.push(root);
	await writeFile(join(root, "project.godot"), '[application]\nconfig/name="Existing"\n', "utf8");

	const info = await ensureGodotProject(root);
	const projectConfig = await readFile(join(root, "project.godot"), "utf8");

	expect(info.name).toBe("Existing");
	expect(projectConfig).toBe('[application]\nconfig/name="Existing"\n');
});
