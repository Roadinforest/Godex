import { describe, expect, test } from "vitest";

import { parseChatOptions, parseCommand } from "../src/cli-args.ts";

describe("parseCommand", () => {
	test("parses flags and positionals", () => {
		const parsed = parseCommand([
			"run",
			"--project",
			"/tmp/game",
			"--goal=add jump",
			"--agents",
			"2",
			"--run-project",
		]);

		expect(parsed.command).toBe("run");
		expect(parsed.flags.get("project")).toBe("/tmp/game");
		expect(parsed.flags.get("goal")).toBe("add jump");
		expect(parsed.flags.get("agents")).toBe("2");
		expect(parsed.flags.get("run-project")).toBe(true);
	});

	test("defaults to help", () => {
		expect(parseCommand([]).command).toBe("help");
	});

	test("parses chat project and preserves coding-agent arguments", () => {
		const parsed = parseChatOptions([
			"--project",
			"/tmp/game",
			"--model",
			"sonnet:high",
			"--tools",
			"read,bash,edit,write",
			"Add double jump",
		]);

		expect(parsed.projectRoot).toBe("/tmp/game");
		expect(parsed.args).toEqual(["--model", "sonnet:high", "--tools", "read,bash,edit,write", "Add double jump"]);
	});

	test("parses inline chat project flag", () => {
		const parsed = parseChatOptions(["--project=/tmp/game", "--continue"]);

		expect(parsed.projectRoot).toBe("/tmp/game");
		expect(parsed.args).toEqual(["--continue"]);
	});
});
