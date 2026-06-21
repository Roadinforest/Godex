import { resolve } from "node:path";

export interface ParsedCommand {
	command: string;
	positionals: string[];
	flags: Map<string, string | boolean>;
}

export interface ParsedChatOptions {
	projectRoot: string;
	args: string[];
}

export function parseChatOptions(args: string[]): ParsedChatOptions {
	let projectRoot = process.cwd();
	const passthrough: string[] = [];

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index] ?? "";
		if (arg === "--project") {
			const value = args[index + 1];
			if (!value || value.startsWith("--")) throw new Error("Missing --project value");
			projectRoot = value;
			index += 1;
			continue;
		}
		if (arg.startsWith("--project=")) {
			projectRoot = arg.slice("--project=".length);
			if (!projectRoot) throw new Error("Missing --project value");
			continue;
		}
		passthrough.push(arg);
	}

	return {
		projectRoot: resolve(projectRoot),
		args: passthrough,
	};
}

export function parseCommand(argv: string[]): ParsedCommand {
	const [command = "help", ...rest] = argv;
	const flags = new Map<string, string | boolean>();
	const positionals: string[] = [];

	for (let index = 0; index < rest.length; index += 1) {
		const arg = rest[index] ?? "";
		if (!arg.startsWith("--")) {
			positionals.push(arg);
			continue;
		}
		const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
		if (!rawKey) throw new Error(`Invalid flag: ${arg}`);
		if (inlineValue !== undefined) {
			flags.set(rawKey, inlineValue);
			continue;
		}
		const next = rest[index + 1];
		if (next && !next.startsWith("--")) {
			flags.set(rawKey, next);
			index += 1;
			continue;
		}
		flags.set(rawKey, true);
	}

	return { command, flags, positionals };
}
