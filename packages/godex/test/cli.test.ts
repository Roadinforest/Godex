import { describe, expect, test } from "vitest";

import { parseCommand } from "../src/cli.ts";

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
});
