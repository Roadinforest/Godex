export function createTaskId(date: Date = new Date()): string {
	const stamp = date
		.toISOString()
		.replaceAll("-", "")
		.replaceAll(":", "")
		.replace(/\.\d{3}Z$/, "Z");
	const random = Math.random().toString(36).slice(2, 8);
	return `task-${stamp}-${random}`;
}

export function createAgentId(index: number): string {
	const alphabet = "abcdefghijklmnopqrstuvwxyz";
	if (index < alphabet.length) return `agent-${alphabet[index]}`;
	return `agent-${index + 1}`;
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function sanitizeName(value: string): string {
	const sanitized = value
		.toLowerCase()
		.replace(/[^a-z0-9._/-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return sanitized.length > 0 ? sanitized : "unnamed";
}
