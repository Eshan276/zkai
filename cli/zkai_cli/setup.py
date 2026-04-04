"""
zkai init  — guided first-time setup wizard
zkai keygen — wallet keygen (wraps wallet/keygen.mjs)
"""

import re
import subprocess
import sys
from pathlib import Path

import requests
import typer
from rich.panel import Panel
from rich.prompt import Confirm, Prompt

from zkai_cli.util import (
    console, err_console,
    deploy_dir, compose_dir, env_file, ensure_repo, find_repo_root, seed_path,
)

GATEWAY_URL = "https://zkai.vercel.app"


# ── keygen ────────────────────────────────────────────────────────────────────

def run_keygen(repo_dir: str | None = None) -> str | None:
    repo: Path | None = None
    try:
        repo = find_repo_root(repo_dir)
    except SystemExit:
        pass

    node_ok = subprocess.run(["node", "--version"], capture_output=True).returncode == 0
    use_docker = not node_ok

    if repo and (repo / "wallet" / "keygen.mjs").exists():
        wallet_dir = repo / "wallet"
    else:
        use_docker = True
        wallet_dir = None

    if use_docker:
        return _keygen_docker(repo)
    else:
        return _keygen_local(wallet_dir)


def _keygen_local(wallet_dir: Path) -> str | None:
    if not (wallet_dir / "node_modules").exists():
        console.print("[dim]Running npm install in wallet/...[/dim]")
        r = subprocess.run(["npm", "install", "--silent"], cwd=str(wallet_dir))
        if r.returncode != 0:
            err_console.print("[red]npm install failed.[/red]")
            raise typer.Exit(1)

    console.print()
    lines = []
    proc = subprocess.Popen(
        ["node", "keygen.mjs"],
        cwd=str(wallet_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    for line in proc.stdout:
        sys.stdout.write(line)
        sys.stdout.flush()
        lines.append(line.rstrip())
    proc.wait()

    return _extract_seed(lines)


def _keygen_docker(repo: Path | None) -> str | None:
    if repo is None:
        err_console.print("[red]Cannot run keygen: node not available and repo not found.[/red]")
        raise typer.Exit(1)

    console.print("[dim]node not found locally — running keygen inside Docker (node:22-alpine)...[/dim]")
    console.print()

    wallet_dir = repo / "wallet"
    lines = []
    proc = subprocess.Popen(
        [
            "docker", "run", "--rm",
            "-v", f"{wallet_dir}:/app",
            "-w", "/app",
            "node:22-alpine",
            "sh", "-c", "npm install --silent 2>/dev/null && node keygen.mjs",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    for line in proc.stdout:
        sys.stdout.write(line)
        sys.stdout.flush()
        lines.append(line.rstrip())
    proc.wait()

    return _extract_seed(lines)


def _extract_seed(lines: list[str]) -> str | None:
    for i, line in enumerate(lines):
        if "seed" in line.lower():
            for j in range(i + 1, len(lines)):
                candidate = lines[j].strip()
                if re.fullmatch(r"[0-9a-fA-F]{64}", candidate):
                    return candidate
    return None


# ── init wizard ───────────────────────────────────────────────────────────────

def run_init(repo_dir: str | None):
    console.print(Panel.fit(
        "[bold violet]ZKai Provider Setup[/bold violet]\n"
        "Gets your node configured and ready to earn tNIGHT.",
        border_style="violet",
    ))

    repo = ensure_repo(repo_dir)

    # 1. Fetch relay config from gateway
    relay_config = _fetch_relay_config()

    # 2. Wallet seed
    seed = _step_seed(repo)

    # 3. Write all config files
    _write_all_config(repo, relay_config, seed)

    # 4. Print next steps
    _print_next_steps(repo, seed)


def _fetch_relay_config() -> dict:
    console.print("[dim]Fetching relay config from gateway...[/dim]", end=" ")
    try:
        r = requests.get(f"{GATEWAY_URL}/api/relay-config", timeout=10)
        r.raise_for_status()
        data = r.json()
        console.print("[green]ok[/green]")
        return data
    except Exception as e:
        console.print("[red]failed[/red]")
        err_console.print(f"[red]Could not reach {GATEWAY_URL}/api/relay-config: {e}[/red]")
        err_console.print("Check your internet connection and try again.")
        raise typer.Exit(1)


def _step_seed(repo: Path) -> str:
    console.rule("[bold]Midnight Wallet[/bold]")
    sp = seed_path(repo)

    if sp.exists():
        existing = sp.read_text().strip()
        console.print(f"[green]Seed file already exists[/green] at {sp} ({existing[:10]}...)")
        if not Confirm.ask("Generate a new wallet instead?", default=False):
            return existing

    console.print("Generating a new Midnight wallet...\n")
    seed = run_keygen(str(repo))

    if not seed:
        err_console.print("[yellow]Could not auto-extract seed — paste it manually.[/yellow]")
        seed = Prompt.ask("Paste the 64-char hex seed shown above").strip()

    if not re.fullmatch(r"[0-9a-fA-F]{64}", seed):
        err_console.print("[red]Invalid seed — must be exactly 64 hex characters.[/red]")
        raise typer.Exit(1)

    return seed


def _write_all_config(repo: Path, relay_config: dict, seed: str):
    console.rule("[bold]Writing config files[/bold]")

    # deploy/.seed
    sp = seed_path(repo)
    sp.parent.mkdir(parents=True, exist_ok=True)
    sp.write_text(seed)
    sp.chmod(0o600)
    console.print(f"  [green]✓[/green] {sp}")

    # deploy/.bridge-seed (same seed — bridge uses same wallet)
    bridge_sp = deploy_dir(repo) / ".bridge-seed"
    bridge_sp.write_text(seed)
    bridge_sp.chmod(0o600)
    console.print(f"  [green]✓[/green] {bridge_sp}")

    # provider/.env
    ef = env_file(repo)
    ef.parent.mkdir(parents=True, exist_ok=True)
    env_content = (
        f"ZKAI_AUTH_URL={relay_config.get('auth_url', GATEWAY_URL)}\n"
        f"ZKAI_RELAY_URL={relay_config.get('relay_url', 'https://zkai-relay.fly.dev')}\n"
        f"ZKAI_RELAY_SECRET={relay_config.get('relay_secret', '')}\n"
        f"ZKAI_PRICE_PER_REQUEST={relay_config.get('price_per_request', 100)}\n"
        f"OLLAMA_MODEL=qwen2.5:1.5b\n"
        f"MAX_TOKENS=512\n"
    )
    ef.write_text(env_content)
    console.print(f"  [green]✓[/green] {ef}")


def _print_next_steps(repo: Path, seed: str):
    console.print()

    # Derive wallet address hint (just show seed prefix — bridge logs the full address)
    console.print(Panel(
        "[bold yellow]Fund your wallet before starting[/bold yellow]\n\n"
        "Your bridge wallet pays gas for on-chain transactions.\n\n"
        "[bold]1.[/bold] Start the node briefly to get your wallet address:\n"
        "   [cyan]zkai start[/cyan]\n"
        "   [cyan]zkai logs bridge | grep Address[/cyan]\n\n"
        "[bold]2.[/bold] Request tNIGHT from the faucet:\n"
        "   [link=https://faucet.midnight.network]https://faucet.midnight.network[/link]\n\n"
        "[bold]3.[/bold] Once funded, register and you're live:\n"
        "   [cyan]zkai register --model qwen2.5:1.5b --price 100[/cyan]\n\n"
        "[bold]4.[/bold] Check status (includes your dashboard URL):\n"
        "   [cyan]zkai status[/cyan]",
        border_style="yellow",
        title="Next steps",
    ))
