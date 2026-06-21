import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";

import { inspectGodotProject } from "../src/godot.ts";

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
