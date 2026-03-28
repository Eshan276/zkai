"""Docker Compose operations: start, stop, restart, logs, status."""

import subprocess
import tarfile
import time
import urllib.request
from pathlib import Path

import requests
import typer
from rich.console import Console
from rich.table import Table
from rich import box

from zkai_cli.util import (
    compose_dir, deploy_dir, console, err_console, find_repo_root, ensure_repo,
    require_docker, run, stream,
)

SERVICES = ("enclave", "bridge")

GITHUB_REPO = "Eshan276/zkai"
COMPILED_ASSET = "compiled.tar.gz"


def _compose(repo: Path, *args: str, stream_output: bool = True) -> subprocess.CompletedProcess:
    cmd = ["docker", "compose", *args]
    cwd = compose_dir(repo)
    if stream_output:
        stream(cmd, cwd=cwd)
        return None  # type: ignore
    return run(cmd, cwd=cwd, capture=True, check=False)


# ── start ─────────────────────────────────────────────────────────────────────

def start(repo_dir: str | None, build: bool = False, follow: bool = False, tunnel: bool = False):
    require_docker()
    repo = ensure_repo(repo_dir)
    cwd = compose_dir(repo)

    _ensure_compiled_artifacts(repo)

    if build:
        console.print("[bold]Building enclave image...[/bold]")
        stream(["docker", "compose", "build", "enclave"], cwd=cwd)

    console.print("[bold]Starting ZKai containers...[/bold]")
    cmd = ["docker", "compose"]
    if tunnel:
        cmd += ["--profile", "tunnel"]
    cmd += ["up", "-d"]
    stream(cmd, cwd=cwd)
    console.print()
    console.print("[green]Containers started.[/green] Bridge wallet sync takes 2-5 minutes on first boot.")
    if tunnel:
        console.print("Tunnel starting... run [bold]zkai tunnel-url[/bold] in ~5 seconds to get your public URL.")
    console.print("Run [bold]zkai status[/bold] to check progress.")
    console.print("Run [bold]zkai logs[/bold] to watch logs.")

    if follow:
        logs(repo_dir, service=None, lines=30, follow=True)


def print_tunnel_url():
    """Extract and print the trycloudflare.com URL from tunnel logs."""
    import re
    result = subprocess.run(
        ["docker", "logs", "zkai-tunnel", "--tail=50"],
        capture_output=True, text=True,
    )
    output = result.stdout + result.stderr
    # cloudflared prints the URL to stderr
    match = re.search(r'https://[a-z0-9\-]+\.trycloudflare\.com', output)
    if match:
        url = match.group(0)
        console.print(f"\n[green]Tunnel URL:[/green] [bold]{url}[/bold]\n")
        console.print(f"Use this as your endpoint:")
        console.print(f"  [cyan]zkai register --endpoint {url}[/cyan]")
    else:
        # Check if container exists at all
        exists = subprocess.run(["docker", "inspect", "zkai-tunnel"], capture_output=True)
        if exists.returncode != 0:
            err_console.print("[yellow]Tunnel not running.[/yellow] Start with: [bold]zkai start --tunnel[/bold]")
        else:
            console.print("[yellow]URL not found yet — tunnel may still be starting.[/yellow] Wait a few seconds and retry.")
            console.print("[dim]Raw logs:[/dim]")
            console.print(output[-500:] if len(output) > 500 else output)


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


# ── compiled artifact bootstrap ───────────────────────────────────────────────

def _ensure_compiled_artifacts(repo: Path):
    """Download and extract compiled.tar.gz from the latest release if deploy/compiled/ is missing."""
    compiled = deploy_dir(repo) / "compiled"
    marker = compiled / "ProviderRegistry" / "contract" / "index.js"
    if marker.exists():
        return  # already present

    console.print("[bold]Compiled contract artifacts not found — downloading from release...[/bold]")

    url = _get_compiled_download_url()
    if not url:
        err_console.print(
            "[red]Could not find compiled.tar.gz in the latest release.[/red]\n"
            "Check https://github.com/Eshan276/zkai/releases or run the deploy script manually."
        )
        raise typer.Exit(1)

    console.print(f"  Downloading {url} ...")
    tmp = repo / ".build-tmp" / COMPILED_ASSET
    tmp.parent.mkdir(parents=True, exist_ok=True)

    try:
        urllib.request.urlretrieve(url, tmp)
    except Exception as e:
        err_console.print(f"[red]Download failed:[/red] {e}")
        raise typer.Exit(1)

    console.print("  Extracting...")
    compiled.mkdir(parents=True, exist_ok=True)
    with tarfile.open(tmp, "r:gz") as tf:
        # Archive is: compiled/<contract>/... — extract one level into deploy/
        tf.extractall(deploy_dir(repo))

    tmp.unlink(missing_ok=True)
    console.print("[green]Compiled artifacts ready.[/green]")


def _get_compiled_download_url() -> str | None:
    """Fetch the compiled.tar.gz download URL from the latest GitHub release."""
    import json
    api_url = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
    try:
        with urllib.request.urlopen(api_url, timeout=10) as resp:
            data = json.loads(resp.read())
        for asset in data.get("assets", []):
            if asset["name"] == COMPILED_ASSET:
                return asset["browser_download_url"]
    except Exception:
        pass
    return None
