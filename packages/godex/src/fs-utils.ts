import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

export async function ensureDir(path: string): Promise<void> {
	await mkdir(path, { recursive: true });
}

export async function writeJson(path: string, value: unknown): Promise<void> {
	await ensureDir(resolve(path, ".."));
	await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readJson<T>(path: string): Promise<T> {
	return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function removePath(path: string): Promise<void> {
	await rm(path, { force: true, recursive: true });
}

export function assertInside(root: string, candidate: string): string {
	const resolvedRoot = resolve(root);
	const resolvedCandidate = resolve(isAbsolute(candidate) ? candidate : resolve(resolvedRoot, candidate));
	const pathFromRoot = relative(resolvedRoot, resolvedCandidate);
	if (pathFromRoot === "" || (!pathFromRoot.startsWith("..") && !isAbsolute(pathFromRoot))) return resolvedCandidate;
	throw new Error(`Path is outside workspace: ${candidate}`);
}

export async function listDirectoryNames(root: string): Promise<string[]> {
	const entries = await readdir(root, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
}
