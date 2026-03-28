"""Docker Compose operations: start, stop, restart, logs, status."""

import subprocess
import time
from pathlib import Path

import requests
import typer
from rich.console import Console
from rich.table import Table
from rich import box

from zkai_cli.util import (
    compose_dir, console, err_console, find_repo_root,
    require_docker, run, stream,
)

SERVICES = ("enclave", "bridge")


def _compose(repo: Path, *args: str, stream_output: bool = True) -> subprocess.CompletedProcess:
    cmd = ["docker", "compose", *args]
    cwd = compose_dir(repo)
    if stream_output:
        stream(cmd, cwd=cwd)
        return None  # type: ignore
    return run(cmd, cwd=cwd, capture=True, check=False)


# ── start ─────────────────────────────────────────────────────────────────────

def start(repo_dir: str | None, build: bool = False, follow: bool = False):
    require_docker()
    repo = find_repo_root(repo_dir)
    cwd = compose_dir(repo)

    if build:
        console.print("[bold]Building enclave image...[/bold]")
        stream(["docker", "compose", "build", "enclave"], cwd=cwd)

    console.print("[bold]Starting ZKai containers...[/bold]")
    stream(["docker", "compose", "up", "-d"], cwd=cwd)
    console.print()
    console.print("[green]Containers started.[/green] Bridge wallet sync takes 2-5 minutes on first boot.")
    console.print("Run [bold]zkai status[/bold] to check progress.")
    console.print("Run [bold]zkai logs[/bold] to watch logs.")

    if follow:
        logs(repo_dir, service=None, lines=30, follow=True)


# ── stop ──────────────────────────────────────────────────────────────────────

def stop(repo_dir: str | None):
    require_docker()
    repo = find_repo_root(repo_dir)
    console.print("[bold]Stopping ZKai containers...[/bold]")
    _compose(repo, "down")
    console.print("[green]Stopped.[/green]")


# ── restart ───────────────────────────────────────────────────────────────────

def restart(repo_dir: str | None, service: str | None):
    require_docker()
    repo = find_repo_root(repo_dir)
    targets = _resolve_service(service)
    console.print(f"[bold]Restarting {', '.join(targets)}...[/bold]")
    _compose(repo, "restart", *targets)
    console.print("[green]Done.[/green]")


# ── logs ──────────────────────────────────────────────────────────────────────

def logs(repo_dir: str | None, service: str | None, lines: int = 50, follow: bool = False):
    require_docker()
    repo = find_repo_root(repo_dir)
    targets = _resolve_service(service)
    cmd = ["docker", "compose", "logs", f"--tail={lines}"]
    if follow:
        cmd.append("-f")
    cmd.extend(targets)
    stream(cmd, cwd=compose_dir(repo))


# ── status ────────────────────────────────────────────────────────────────────

def status(repo_dir: str | None):
    require_docker()
    repo = find_repo_root(repo_dir)

    # Container states
    r = _compose(repo, "ps", "--format", "json", stream_output=False)
    containers = _parse_ps(r.stdout if r else "")

    table = Table(title="ZKai Node Status", box=box.ROUNDED, show_lines=True)
    table.add_column("Container", style="bold")
    table.add_column("State")
    table.add_column("Health")
    table.add_column("Ports")

    for c in containers:
        state_color = "green" if c["state"] == "running" else "red"
        health_color = {
            "healthy": "green",
            "starting": "yellow",
            "unhealthy": "red",
        }.get(c["health"], "dim")
        table.add_row(
            c["name"],
            f"[{state_color}]{c['state']}[/{state_color}]",
            f"[{health_color}]{c['health'] or '—'}[/{health_color}]",
            c["ports"] or "—",
        )

    console.print(table)

    # Bridge health
    _print_bridge_health()

    # Enclave health
    _print_enclave_health()


def _print_bridge_health():
    try:
        r = requests.get("http://127.0.0.1:7300/health", timeout=3)
        data = r.json()
        synced = data.get("synced", False)
        addr = data.get("address", "unknown")
        if synced:
            console.print(f"[green]Bridge:[/green] synced  |  address: {addr}")
        else:
            console.print("[yellow]Bridge:[/yellow] syncing (wallet not yet synced — wait 2-5 min)")
    except Exception:
        console.print("[dim]Bridge:[/dim] not reachable on port 7300 (container may still be starting)")


def _print_enclave_health():
    try:
        r = requests.get("http://127.0.0.1:8080/health", timeout=3)
        data = r.json()
        mode = data.get("enclave_mode", "unknown")
        console.print(f"[green]Enclave:[/green] ok  |  mode: {mode}")
    except Exception:
        console.print("[dim]Enclave:[/dim] not reachable on port 8080 (container may still be starting)")


def _parse_ps(raw: str) -> list[dict]:
    """Parse `docker compose ps --format json` output (one JSON object per line)."""
    import json
    results = []
    for line in raw.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
            results.append({
                "name": obj.get("Name", obj.get("Service", "?")),
                "state": obj.get("State", "?").lower(),
                "health": obj.get("Health", "").lower() or None,
                "ports": _fmt_ports(obj.get("Publishers") or obj.get("Ports") or []),
            })
        except Exception:
            continue
    return results


def _fmt_ports(ports) -> str:
    if isinstance(ports, str):
        return ports
    if isinstance(ports, list):
        out = []
        for p in ports:
            if isinstance(p, dict):
                pub = p.get("PublishedPort", "")
                tgt = p.get("TargetPort", "")
                if pub and tgt:
                    out.append(f"{pub}→{tgt}")
        return ", ".join(out) if out else ""
    return ""


def _resolve_service(service: str | None) -> list[str]:
    if service is None:
        return list(SERVICES)
    s = service.lower()
    if s not in SERVICES:
        err_console.print(f"[red]Unknown service '{service}'.[/red] Choose: {', '.join(SERVICES)}")
        raise typer.Exit(1)
    return [s]
