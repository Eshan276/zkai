"""
zkai init  — guided first-time setup wizard
zkai keygen — wallet keygen (wraps wallet/keygen.mjs)
"""

import re
import secrets
import subprocess
import sys
from pathlib import Path

import typer
from rich.panel import Panel
from rich.prompt import Confirm, Prompt

from zkai_cli.util import (
    console, err_console,
    deploy_dir, compose_dir, env_file, ensure_repo, find_repo_root, seed_path,
)


# ── keygen ────────────────────────────────────────────────────────────────────

def run_keygen(repo_dir: str | None = None) -> str | None:
    """
    Run wallet/keygen.mjs, stream output live to the terminal, and return the seed.
    npm install is run first if node_modules is missing.
    Falls back to Docker if node is not on PATH.
    """
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
    # Ensure npm deps are installed
    if not (wallet_dir / "node_modules").exists():
        console.print("[dim]Running npm install in wallet/...[/dim]")
        r = subprocess.run(["npm", "install", "--silent"], cwd=str(wallet_dir))
        if r.returncode != 0:
            err_console.print("[red]npm install failed.[/red]")
            raise typer.Exit(1)

    # Stream output live AND capture it for seed extraction
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
    """Pull the 64-char hex seed from keygen.mjs output lines."""
    for i, line in enumerate(lines):
        if "seed" in line.lower():
            for j in range(i + 1, len(lines)):
                candidate = lines[j].strip()
                if re.fullmatch(r"[0-9a-fA-F]{64}", candidate):
                    return candidate
    return None


# ── init wizard ───────────────────────────────────────────────────────────────

def run_init(repo_dir: str | None):
    """Full interactive setup wizard. Clones the repo if needed."""
    console.print(Panel.fit(
        "[bold cyan]ZKai Provider Setup[/bold cyan]\n"
        "This wizard will configure your node step by step.",
        border_style="cyan",
    ))

    # Auto-clone if repo not found
    repo = ensure_repo(repo_dir)
    console.print(f"\n[dim]Repo:[/dim] {repo}\n")

    _step_seed(repo)
    _step_api_keys(repo)
    _print_next_steps(repo)


def _step_seed(repo: Path):
    console.rule("[bold]Step 1 — Midnight Wallet[/bold]")
    sp = seed_path(repo)

    if sp.exists():
        seed_preview = sp.read_text().strip()[:10]
        console.print(f"[green]Seed file found[/green] at {sp} (starts with {seed_preview}...)")
        console.print("[dim]Run [bold]zkai keygen[/bold] to generate a new one.[/dim]")
        return

    console.print("You need a Midnight wallet with tNight tokens to pay for on-chain transactions.\n")

    choice = Prompt.ask(
        "Generate a new wallet or use an existing seed?",
        choices=["new", "existing"],
        default="new",
    )

    if choice == "new":
        console.print()
        seed = run_keygen(str(repo))
        if seed:
            _save_seed(sp, seed)
        else:
            err_console.print("[yellow]Could not extract seed from output — copy it manually.[/yellow]")
            seed = Prompt.ask("Paste the seed shown above").strip()
            if re.fullmatch(r"[0-9a-fA-F]{64}", seed):
                _save_seed(sp, seed)
            else:
                err_console.print("[red]Invalid seed — skipping save.[/red]")
    else:
        seed = Prompt.ask("Paste your 64-char hex seed").strip()
        if not re.fullmatch(r"[0-9a-fA-F]{64}", seed):
            err_console.print("[red]Invalid seed — must be exactly 64 hex characters.[/red]")
            raise typer.Exit(1)
        _save_seed(sp, seed)

    console.print()
    console.print("[bold]Fund your wallet:[/bold] https://faucet.preprod.midnight.network/")
    console.print("Request 1000 tNight to the [bold]unshielded address[/bold] shown above.")
    console.print("Wait ~2 minutes for it to arrive, then continue.\n")
    Confirm.ask("Press Enter once your wallet is funded", default=True)


def _save_seed(sp: Path, seed: str):
    sp.parent.mkdir(parents=True, exist_ok=True)
    sp.write_text(seed)
    sp.chmod(0o600)
    console.print(f"\n[green]Seed saved to {sp}[/green]")


def _step_api_keys(repo: Path):
    console.rule("[bold]Step 2 — API Keys for Consumers[/bold]")

    ef = env_file(repo)
    existing_keys = _read_env_keys(ef)

    if existing_keys:
        console.print(f"[green]{len(existing_keys)} API key(s) already configured.[/green]")
        if not Confirm.ask("Generate additional keys?", default=False):
            return

    n = int(Prompt.ask("How many API keys to generate?", default="3"))
    new_keys = [secrets.token_hex(32) for _ in range(n)]
    all_keys = list(existing_keys) + new_keys

    _write_env_keys(ef, all_keys)

    console.print(f"\n[green]{n} new key(s) added[/green] (saved to {ef}):\n")
    for k in new_keys:
        console.print(f"  [bold]{k}[/bold]")
    console.print()
    console.print("Share one key per consumer. Rotate anytime with [bold]zkai keys rotate[/bold].")


def _print_next_steps(repo: Path):
    console.print()
    console.rule("[bold]Setup Complete[/bold]")
    console.print(Panel(
        "[bold]Next steps:[/bold]\n\n"
        "1. [cyan]zkai start[/cyan]                                          Start enclave + bridge\n"
        "2. Wait for [bold]Wallet synced[/bold] in logs (2-5 min)\n"
        "3. [cyan]zkai register --endpoint http://YOUR_IP:8080[/cyan]        Register on-chain (once)\n"
        "4. [cyan]zkai status[/cyan]                                         Confirm everything is healthy\n"
        "5. Share your API keys with consumers\n",
        border_style="green",
    ))


# ── .env helpers ──────────────────────────────────────────────────────────────

def _read_env_keys(ef: Path) -> list[str]:
    if not ef.exists():
        return []
    for line in ef.read_text().splitlines():
        line = line.strip()
        if line.startswith("ZKAI_API_KEYS="):
            val = line[len("ZKAI_API_KEYS="):]
            return [k for k in val.split(",") if k.strip()]
    return []


def _write_env_keys(ef: Path, keys: list[str]):
    ef.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    replaced = False
    if ef.exists():
        for line in ef.read_text().splitlines():
            if line.startswith("ZKAI_API_KEYS="):
                lines.append(f"ZKAI_API_KEYS={','.join(keys)}")
                replaced = True
            else:
                lines.append(line)
    if not replaced:
        lines.append(f"ZKAI_API_KEYS={','.join(keys)}")
    ef.write_text("\n".join(lines) + "\n")
