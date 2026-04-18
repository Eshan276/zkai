"""Shared utilities: repo detection, console, subprocess."""

import os
import subprocess
import sys
from pathlib import Path

import typer
from rich.console import Console

console = Console()
err_console = Console(stderr=True)

GITHUB_REPO = "https://github.com/Eshan276/zkai.git"
DEFAULT_CLONE_DIR = Path.home() / "zkai"


# ── Repo detection ────────────────────────────────────────────────────────────

def find_repo_root(hint: str | None = None, auto_clone: bool = False) -> Path:
    """
    Locate the zkai repo root. Search order:
    1. --dir flag passed by user
    2. Walk up from cwd looking for provider/docker-compose.yml
    3. ~/zkai
    4. If auto_clone=True, clone to ~/zkai automatically
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

    # ~/zkai fallback
    if DEFAULT_CLONE_DIR.exists() and (DEFAULT_CLONE_DIR / "provider" / "docker-compose.yml").exists():
        return DEFAULT_CLONE_DIR

    if auto_clone:
        return _clone_repo()

    err_console.print(
        "[red]ZKai repo not found.[/red] "
        "Run [bold]zkai init[/bold] to set up, or pass [bold]--dir /path/to/zkai[/bold]."
    )
    raise typer.Exit(1)


def ensure_repo(repo_dir: str | None) -> Path:
    """Like find_repo_root but always auto-clones if missing. Used by init."""
    if repo_dir:
        p = Path(repo_dir).expanduser().resolve()
        _assert_repo(p)
        return p

    # Walk up from cwd
    cur = Path.cwd()
    for candidate in [cur, *cur.parents]:
        if (candidate / "provider" / "docker-compose.yml").exists():
            return candidate

    # ~/zkai fallback
    if DEFAULT_CLONE_DIR.exists() and (DEFAULT_CLONE_DIR / "provider" / "docker-compose.yml").exists():
        return DEFAULT_CLONE_DIR

    return _clone_repo()


def _clone_repo() -> Path:
    dest = DEFAULT_CLONE_DIR
    console.print(f"[bold]Cloning ZKai repo to {dest}...[/bold]")
    if not _check_git():
        err_console.print("[red]git not found.[/red] Install git and retry.")
        raise typer.Exit(1)
    result = subprocess.run(
        ["git", "clone", "--depth=1", GITHUB_REPO, str(dest)],
        check=False,
    )
    if result.returncode != 0:
        err_console.print("[red]Failed to clone repo.[/red]")
        raise typer.Exit(1)
    console.print(f"[green]Cloned to {dest}[/green]")
    return dest


def _assert_repo(p: Path):
    if not (p / "provider" / "docker-compose.yml").exists():
        err_console.print(f"[red]{p}[/red] does not look like a zkai repo (missing provider/docker-compose.yml).")
        raise typer.Exit(1)


def _check_git() -> bool:
    return subprocess.run(["git", "--version"], capture_output=True).returncode == 0


def compose_dir(repo: Path) -> Path:
    return repo / "provider"


def deploy_dir(repo: Path) -> Path:
    return repo / "deploy"


def env_file(repo: Path) -> Path:
    return compose_dir(repo) / ".env"


def read_env_file(repo: Path) -> dict[str, str]:
    """Parse provider/.env into a dict. Returns empty dict if file missing."""
    ef = env_file(repo)
    result: dict[str, str] = {}
    if not ef.exists():
        return result
    for line in ef.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        result[k.strip()] = v.strip()
    return result


# ── Shell helpers ─────────────────────────────────────────────────────────────

def run(cmd: list[str], cwd: Path | None = None, check: bool = True, capture: bool = False) -> subprocess.CompletedProcess:
    kwargs: dict = dict(cwd=str(cwd) if cwd else None)
    if capture:
        kwargs["capture_output"] = True
        kwargs["text"] = True
    return subprocess.run(cmd, check=check, **kwargs)


def stream(cmd: list[str], cwd: Path | None = None):
    result = subprocess.run(cmd, cwd=str(cwd) if cwd else None)
    if result.returncode != 0:
        raise typer.Exit(result.returncode)


def require_docker():
    r = subprocess.run(["docker", "compose", "version"], capture_output=True)
    if r.returncode != 0:
        err_console.print("[red]docker compose not found.[/red] Install Docker Engine with the Compose plugin.")
        raise typer.Exit(1)


def require_node(repo: Path):
    r = subprocess.run(["node", "--version"], capture_output=True)
    if r.returncode != 0:
        err_console.print("[red]node not found.[/red] Install Node.js 20+.")
        raise typer.Exit(1)
