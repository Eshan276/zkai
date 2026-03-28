"""Shared utilities: repo detection, console, subprocess."""

import os
import subprocess
import sys
from pathlib import Path

import typer
from rich.console import Console

console = Console()
err_console = Console(stderr=True)


# ── Repo detection ────────────────────────────────────────────────────────────

def find_repo_root(hint: str | None = None) -> Path:
    """
    Locate the zkai repo root. Search order:
    1. --dir flag passed by user
    2. Walk up from cwd looking for provider/docker-compose.yml
    3. ~/zkai (default clone location)
    """
    if hint:
        p = Path(hint).expanduser().resolve()
        _assert_repo(p)
        return p

    # Walk up from cwd
    cur = Path.cwd()
    for candidate in [cur, *cur.parents]:
        if (candidate / "provider" / "docker-compose.yml").exists():
            return candidate

    # Fallback
    default = Path.home() / "zkai"
    if (default / "provider" / "docker-compose.yml").exists():
        return default

    err_console.print(
        "[red]Could not find zkai repo.[/red] "
        "Run from inside the repo, or pass [bold]--dir /path/to/zkai[/bold]."
    )
    raise typer.Exit(1)


def _assert_repo(p: Path):
    if not (p / "provider" / "docker-compose.yml").exists():
        err_console.print(f"[red]{p}[/red] does not look like a zkai repo (missing provider/docker-compose.yml).")
        raise typer.Exit(1)


def compose_dir(repo: Path) -> Path:
    return repo / "provider"


def deploy_dir(repo: Path) -> Path:
    return repo / "deploy"


def seed_path(repo: Path) -> Path:
    return deploy_dir(repo) / ".seed"


def env_file(repo: Path) -> Path:
    return compose_dir(repo) / ".env"


# ── Shell helpers ─────────────────────────────────────────────────────────────

def run(cmd: list[str], cwd: Path | None = None, check: bool = True, capture: bool = False) -> subprocess.CompletedProcess:
    """Run a command, streaming output unless capture=True."""
    kwargs: dict = dict(cwd=str(cwd) if cwd else None)
    if capture:
        kwargs["capture_output"] = True
        kwargs["text"] = True
    return subprocess.run(cmd, check=check, **kwargs)


def stream(cmd: list[str], cwd: Path | None = None):
    """Run a command with live output. Raises on non-zero exit."""
    result = subprocess.run(cmd, cwd=str(cwd) if cwd else None)
    if result.returncode != 0:
        raise typer.Exit(result.returncode)


def require_docker():
    """Abort if docker is not on PATH."""
    r = subprocess.run(["docker", "compose", "version"], capture_output=True)
    if r.returncode != 0:
        err_console.print("[red]docker compose not found.[/red] Install Docker Desktop or Docker Engine with Compose plugin.")
        raise typer.Exit(1)


def require_node(repo: Path):
    """Abort if node is not available (needed for keygen outside Docker)."""
    r = subprocess.run(["node", "--version"], capture_output=True)
    if r.returncode != 0:
        err_console.print("[red]node not found.[/red] Install Node.js 20+ or use the Docker-based keygen.")
        raise typer.Exit(1)
