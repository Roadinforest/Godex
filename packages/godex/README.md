# Godex

Godex is a Godot-focused agent runtime prototype. It provides a CLI, Git worktree orchestration, a lightweight sandbox runner, Godot project inspection, validation, JSONL traces, and result aggregation.

```bash
godex chat --project /path/to/godot-project
godex chat --project /path/to/godot-project --model sonnet:high "Add double jump"
godex inspect --project /path/to/godot-project
godex run --project /path/to/godot-project --goal "Add double jump" --agents 2
godex result task-000001 --project /path/to/godot-project
godex worktrees list --project /path/to/godot-project --task task-000001
godex cleanup task-000001 --project /path/to/godot-project
```

`godex chat` creates the project directory and a minimal `project.godot` file when the target path is not already a Godot project.

The MVP keeps isolation lightweight: commands run with a fixed cwd, restricted environment, timeout, output limits, denylisted risky commands, and a task-specific temp directory. Strong filesystem and network isolation can be added behind the same runner interface later.
