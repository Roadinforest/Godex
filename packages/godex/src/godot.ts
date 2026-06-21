import { access, readdir, readFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";
import type { SandboxRunner } from "./sandbox-runner.ts";
import type { GodotProjectInfo, ValidationCheck, ValidationResult } from "./types.ts";

const ignoredDirectories = new Set([".git", ".godex", ".import", ".godot", "addons", "node_modules"]);
const sceneExtensions = new Set([".scn", ".tscn"]);
const scriptExtensions = new Set([".cs", ".gd"]);
const assetExtensions = new Set([".aseprite", ".bmp", ".jpeg", ".jpg", ".ogg", ".png", ".tres", ".wav", ".webp"]);
const configExtensions = new Set([".cfg", ".godot", ".import", ".json", ".toml"]);

export async function inspectGodotProject(projectPath: string): Promise<GodotProjectInfo> {
	const resolvedProjectPath = resolve(projectPath);
	const projectFile = join(resolvedProjectPath, "project.godot");
	const warnings: string[] = [];
	const hasProjectFile = await exists(projectFile);
	if (!hasProjectFile) warnings.push("project.godot was not found");

	const files = await collectFiles(resolvedProjectPath, 2_000);
	const directories = await collectTopLevelDirectories(resolvedProjectPath);
	const projectConfig = hasProjectFile ? await readFile(projectFile, "utf8") : "";

	return {
		projectPath: resolvedProjectPath,
		projectFile,
		name: parseProjectName(projectConfig),
		hasProjectFile,
		scenes: files.filter((file) => sceneExtensions.has(extname(file))),
		scripts: files.filter((file) => scriptExtensions.has(extname(file))),
		assets: files.filter((file) => assetExtensions.has(extname(file))),
		configFiles: files.filter((file) => configExtensions.has(extname(file))),
		directories,
		warnings,
	};
}

export async function validateGodotProject(
	projectPath: string,
	runner: SandboxRunner,
	options: {
		godotBin?: string;
		runProject: boolean;
		timeoutMs: number;
	},
): Promise<ValidationResult> {
	const info = await inspectGodotProject(projectPath);
	const checks: ValidationCheck[] = [
		{
			name: "project-file",
			status: info.hasProjectFile ? "passed" : "failed",
			message: info.hasProjectFile ? "project.godot exists" : "project.godot is missing",
		},
		{
			name: "scene-discovery",
			status: info.scenes.length > 0 ? "passed" : "skipped",
			message: info.scenes.length > 0 ? `${info.scenes.length} scene file(s) found` : "no scene files found",
		},
		{
			name: "script-discovery",
			status: info.scripts.length > 0 ? "passed" : "skipped",
			message: info.scripts.length > 0 ? `${info.scripts.length} script file(s) found` : "no script files found",
		},
	];

	if (!options.runProject) {
		return { status: checks.some((check) => check.status === "failed") ? "failed" : "passed", checks };
	}

	const godotBin = options.godotBin ?? process.env.GODOT_BIN ?? "godot";
	const command = await runner.execute([godotBin, "--headless", "--path", projectPath, "--quit"], {
		workspace: projectPath,
		timeoutMs: options.timeoutMs,
	});
	checks.push({
		name: "godot-headless",
		status: command.exitCode === 0 && !command.timedOut ? "passed" : "failed",
		message: command.exitCode === 0 ? "Godot headless startup completed" : "Godot headless startup failed",
	});

	return {
		status: checks.some((check) => check.status === "failed") ? "failed" : "passed",
		checks,
		command,
	};
}

async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function collectTopLevelDirectories(root: string): Promise<string[]> {
	const entries = await readdir(root, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isDirectory() && !ignoredDirectories.has(entry.name))
		.map((entry) => entry.name)
		.sort();
}

async function collectFiles(root: string, limit: number): Promise<string[]> {
	const results: string[] = [];
	const visit = async (directory: string) => {
		if (results.length >= limit) return;
		const entries = await readdir(directory, { withFileTypes: true });
		for (const entry of entries) {
			if (results.length >= limit) return;
			if (entry.isDirectory()) {
				if (!ignoredDirectories.has(entry.name)) await visit(join(directory, entry.name));
				continue;
			}
			if (entry.isFile()) results.push(relative(root, join(directory, entry.name)));
		}
	};
	await visit(root);
	return results.sort();
}

function parseProjectName(projectConfig: string): string | undefined {
	const match = projectConfig.match(/^\s*config\/name\s*=\s*"([^"]+)"/m);
	if (match?.[1]) return match[1];
	const fallback = projectConfig.match(/^\s*application\/config\/name\s*=\s*"([^"]+)"/m);
	return fallback?.[1] ?? undefined;
}

export function formatProjectInfo(info: GodotProjectInfo): string {
	const name = info.name ?? basename(info.projectPath);
	return [
		`Project: ${name}`,
		`Path: ${info.projectPath}`,
		`project.godot: ${info.hasProjectFile ? "yes" : "no"}`,
		`Scenes: ${info.scenes.length}`,
		`Scripts: ${info.scripts.length}`,
		`Assets: ${info.assets.length}`,
		`Config files: ${info.configFiles.length}`,
		`Top-level dirs: ${info.directories.join(", ") || "(none)"}`,
		...info.warnings.map((warning) => `Warning: ${warning}`),
	].join("\n");
}
