"""
zkai CLI — provider node management tool.

Commands:
  zkai init          Guided first-time setup (EVM key, .env, relay config)
  zkai start         Start enclave + bridge (docker compose up -d)
  zkai stop          Stop all containers
  zkai restart       Restart containers
  zkai logs          Tail logs (enclave, bridge, or both)
  zkai status        Show container + wallet health
  zkai register      Register provider on-chain (one-time)
  zkai deregister    Remove provider from on-chain registry
  zkai keys          Show how API keys work (managed via dashboard)
  zkai info          Print provider ID, endpoint, address
"""

import typer
from rich.console import Console

from zkai_cli import setup as _setup
from zkai_cli import docker as _docker
from zkai_cli import register as _register
from zkai_cli import keys as _keys

app = typer.Typer(
    name="zkai",
    help="ZKai provider node — setup, manage, and register your AI inference node.",
    no_args_is_help=True,
    add_completion=False,
)
console = Console()


# ── Init / setup ──────────────────────────────────────────────────────────────

@app.command()
def init(
    repo_dir: str = typer.Option(
        None, "--dir", "-d",
        help="Path to the zkai repo root (auto-detected if omitted)",
    ),
):
    """Guided first-time setup: EVM private key, relay config, provider/.env."""
    _setup.run_init(repo_dir)


# ── Lifecycle ─────────────────────────────────────────────────────────────────

@app.command()
def start(
    repo_dir: str = typer.Option(None, "--dir", "-d", help="zkai repo root"),
    build: bool = typer.Option(False, "--build", help="Rebuild enclave image before starting"),
    follow: bool = typer.Option(False, "--logs", "-l", help="Tail logs after starting"),
):
    """Start enclave + bridge containers."""
    _docker.start(repo_dir, build=build, follow=follow)


@app.command()
def stop(
    repo_dir: str = typer.Option(None, "--dir", "-d", help="zkai repo root"),
):
    """Stop all ZKai containers."""
    _docker.stop(repo_dir)


@app.command()
def restart(
    repo_dir: str = typer.Option(None, "--dir", "-d", help="zkai repo root"),
    service: str = typer.Argument(None, help="Service to restart: enclave, bridge, or both (default)"),
):
    """Restart containers (or a specific service)."""
    _docker.restart(repo_dir, service)


@app.command()
def logs(
    repo_dir: str = typer.Option(None, "--dir", "-d", help="zkai repo root"),
    service: str = typer.Argument(None, help="Service: enclave, bridge (default: both)"),
    lines: int = typer.Option(50, "--lines", "-n", help="Number of recent lines to show"),
    follow: bool = typer.Option(False, "--follow", "-f", help="Follow (tail -f) mode"),
):
    """Show or tail container logs."""
    _docker.logs(repo_dir, service, lines=lines, follow=follow)


@app.command()
def status(
    repo_dir: str = typer.Option(None, "--dir", "-d", help="zkai repo root"),
):
    """Show container status, wallet sync state, and enclave health."""
    _docker.status(repo_dir)


# ── On-chain registration ──────────────────────────────────────────────────────

@app.command()
def register(
    repo_dir: str = typer.Option(None, "--dir", "-d", help="zkai repo root"),
    endpoint: str = typer.Option(None, "--endpoint", "-e", help="Public endpoint URL (e.g. http://1.2.3.4:8080)"),
    model: str = typer.Option("qwen2.5-1.5b", "--model", "-m", help="Model name to advertise"),
    price: int = typer.Option(100, "--price", "-p", help="Price per request in tNIGHT units"),
):
    """Register this provider on the 0G chain (run once after first start)."""
    _register.register(repo_dir, endpoint=endpoint, model=model, price=price)


@app.command()
def deregister(
    repo_dir: str = typer.Option(None, "--dir", "-d", help="zkai repo root"),
):
    """Remove this provider from the on-chain registry."""
    _register.deregister(repo_dir)


@app.command()
def info(
    repo_dir: str = typer.Option(None, "--dir", "-d", help="zkai repo root"),
):
    """Print provider ID, TEE pubkey, and endpoint."""
    _register.info(repo_dir)


# ── API key management ────────────────────────────────────────────────────────

@app.command()
def keys(
    action: str = typer.Argument(..., help="add | list | remove | rotate"),
    key_value: str = typer.Argument(None, help="Key to remove (for 'remove' action)"),
    repo_dir: str = typer.Option(None, "--dir", "-d", help="zkai repo root"),
    count: int = typer.Option(1, "--count", "-n", help="Number of keys to add/rotate"),
):
    """Show how API key management works (now centralized via dashboard)."""
    _keys.run(action, key_value, repo_dir=repo_dir, count=count)


if __name__ == "__main__":
    app()
