"""
zkai init  — guided first-time setup wizard
zkai keygen — wallet keygen (wraps wallet/keygen.mjs)
"""

import os
import secrets
import subprocess
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt

from zkai_cli.util import (
    console, err_console,
    deploy_dir, compose_dir, env_file, find_repo_root, seed_path,
    require_node, run,
)


# ── keygen ────────────────────────────────────────────────────────────────────

def run_keygen(repo_dir: str | None = None):
    """
    Run wallet/keygen.mjs and print seed + addresses.
    If repo is found, offer to save the seed to deploy/.seed automatically.
    """
    repo: Path | None = None
    try:
        repo = find_repo_root(repo_dir)
    except SystemExit:
        pass  # keygen works without a repo

    # Try to use node from PATH; fall back to docker if not available
    node_ok = subprocess.run(["node", "--version"], capture_output=True).returncode == 0

    if node_ok and repo and (repo / "wallet" / "keygen.mjs").exists():
        result = subprocess.run(
            ["node", "keygen.mjs"],
            cwd=str(repo / "wallet"),
            capture_output=True,
            text=True,
        )
        output = result.stdout
        console.print(output)
        seed = _extract_seed_from_output(output)
    elif node_ok is False or (repo and not (repo / "wallet" / "keygen.mjs").exists()):
        # Run via Docker (node:22-alpine image)
        console.print("[dim]node not found locally — running keygen inside Docker...[/dim]")
        if not repo:
            err_console.print("[red]Cannot run keygen: node not available and repo not found.[/red]")
            raise typer.Exit(1)
        result = subprocess.run(
            [
                "docker", "run", "--rm",
                "-v", f"{repo}/wallet:/app",
                "-w", "/app",
                "node:22-alpine",
                "sh", "-c", "npm install --silent && node keygen.mjs",
            ],
            capture_output=True,
            text=True,
        )
        output = result.stdout
        console.print(output)
        seed = _extract_seed_from_output(output)
    else:
        err_console.print("[red]Cannot run keygen: node not available.[/red]")
        raise typer.Exit(1)

    if seed and repo:
        sp = seed_path(repo)
        if sp.exists():
            console.print(f"\n[yellow]A seed already exists at {sp}[/yellow]")
            overwrite = Confirm.ask("Overwrite it with this new seed?", default=False)
            if not overwrite:
                console.print("Seed not saved. Copy it manually if needed.")
                return
        if Confirm.ask(f"\nSave this seed to [bold]{sp}[/bold]?", default=True):
            sp.parent.mkdir(parents=True, exist_ok=True)
            sp.write_text(seed)
            sp.chmod(0o600)
            console.print(f"[green]Seed saved to {sp}[/green]")
            console.print("[bold]Fund the unshielded address at:[/bold] https://faucet.preprod.midnight.network/")


def _extract_seed_from_output(output: str) -> str | None:
    """Pull the 64-char hex seed from keygen.mjs output."""
    import re
    lines = output.splitlines()
    for i, line in enumerate(lines):
        if "seed" in line.lower():
            # next non-empty line is the seed
            for j in range(i + 1, len(lines)):
                candidate = lines[j].strip()
                if re.fullmatch(r"[0-9a-fA-F]{64}", candidate):
                    return candidate
    return None


# ── init wizard ───────────────────────────────────────────────────────────────

def run_init(repo_dir: str | None):
    """Full interactive setup wizard."""
    console.print(Panel.fit(
        "[bold cyan]ZKai Provider Setup[/bold cyan]\n"
        "This wizard will configure your node step by step.",
        border_style="cyan",
    ))

    repo = find_repo_root(repo_dir)
    console.print(f"\n[dim]Repo:[/dim] {repo}\n")

    # Step 1 — Wallet seed
    _step_seed(repo)

    # Step 2 — API keys
    _step_api_keys(repo)

    # Step 3 — Summary
    _print_next_steps(repo)


def _step_seed(repo: Path):
    console.rule("[bold]Step 1 — Midnight Wallet[/bold]")
    sp = seed_path(repo)

    if sp.exists():
        seed_preview = sp.read_text().strip()[:10]
        console.print(f"[green]Seed file found[/green] at {sp} (starts with {seed_preview}...)")
        console.print("Your wallet is already configured. [dim]Run [bold]zkai keygen[/bold] to generate a new one.[/dim]")
        return

    console.print("You need a Midnight wallet with tNight tokens to pay for on-chain transactions.")
    console.print()

    choice = Prompt.ask(
        "Do you have an existing seed, or generate a new wallet?",
        choices=["new", "existing"],
        default="new",
    )

    if choice == "new":
        console.print()
        run_keygen(str(repo))
        # run_keygen saves the seed — done
    else:
        seed = Prompt.ask("Paste your 64-char hex seed").strip()
        import re
        if not re.fullmatch(r"[0-9a-fA-F]{64}", seed):
            err_console.print("[red]Invalid seed — must be exactly 64 hex characters.[/red]")
            raise typer.Exit(1)
        sp.parent.mkdir(parents=True, exist_ok=True)
        sp.write_text(seed)
        sp.chmod(0o600)
        console.print(f"[green]Seed saved to {sp}[/green]")

    console.print()
    console.print("[bold]Fund your wallet:[/bold] https://faucet.preprod.midnight.network/")
    console.print("Request 1000 tNight to the [bold]unshielded address[/bold] shown above.")
    console.print("Wait ~2 minutes for it to arrive, then continue.\n")
    Confirm.ask("Press Enter once your wallet is funded", default=True)


def _step_api_keys(repo: Path):
    console.rule("[bold]Step 2 — API Keys for Consumers[/bold]")

    ef = env_file(repo)
    existing_keys = _read_env_keys(ef)

    if existing_keys:
        console.print(f"[green]{len(existing_keys)} API key(s) already configured.[/green]")
        regen = Confirm.ask("Generate additional keys?", default=False)
        if not regen:
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
        "1. [cyan]zkai start[/cyan]            Start enclave + bridge\n"
        "2. Wait for [bold]Wallet synced[/bold] in logs (2-5 min)\n"
        "3. [cyan]zkai register --endpoint http://YOUR_IP:8080[/cyan]   Register on-chain (once)\n"
        "4. [cyan]zkai status[/cyan]           Confirm everything is healthy\n"
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
