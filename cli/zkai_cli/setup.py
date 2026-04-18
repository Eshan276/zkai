"""
zkai init  — guided first-time setup wizard
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
    deploy_dir, compose_dir, env_file, ensure_repo,
)

GATEWAY_URL = "https://zkai.vercel.app"


# ── init wizard ───────────────────────────────────────────────────────────────

def run_init(repo_dir: str | None):
    console.print(Panel.fit(
        "[bold violet]ZKai Provider Setup[/bold violet]\n"
        "Gets your node configured and ready to earn A0GI.",
        border_style="violet",
    ))

    repo = ensure_repo(repo_dir)

    # 1. Fetch relay config from gateway
    relay_config = _fetch_relay_config()

    # 2. EVM private key
    private_key = _step_private_key(repo)

    # 3. Write all config files
    _write_all_config(repo, relay_config, private_key)

    # 4. Print next steps
    _print_next_steps(repo, private_key)


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


def _step_private_key(repo: Path) -> str:
    console.rule("[bold]EVM Wallet (0G Chain)[/bold]")
    ef = env_file(repo)

    # Check if key already exists in .env
    if ef.exists():
        existing_env = {}
        for line in ef.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                existing_env[k.strip()] = v.strip()
        existing_key = existing_env.get("ZKAI_PRIVATE_KEY", "")
        if existing_key:
            console.print(f"[green]Private key already configured[/green] ({existing_key[:6]}...)")
            if not Confirm.ask("Replace with a new key?", default=False):
                return existing_key

    console.print(
        "\nYou need an EVM private key to pay gas on the 0G Galileo testnet.\n"
        "[dim]Generate one in MetaMask: Account → Export Private Key[/dim]\n"
        "[dim]Or use: cast wallet new (from Foundry)[/dim]\n"
    )
    key = Prompt.ask("Paste your EVM private key (hex, with or without 0x prefix)").strip()
    key = key if key.startswith("0x") else "0x" + key

    if not re.fullmatch(r"0x[0-9a-fA-F]{64}", key):
        err_console.print("[red]Invalid private key — must be 64 hex chars.[/red]")
        raise typer.Exit(1)

    return key


def _write_all_config(repo: Path, relay_config: dict, private_key: str):
    console.rule("[bold]Writing config files[/bold]")

    ef = env_file(repo)
    ef.parent.mkdir(parents=True, exist_ok=True)
    env_content = (
        f"ZKAI_PRIVATE_KEY={private_key}\n"
        f"OG_RPC_URL={relay_config.get('og_rpc_url', 'https://evmrpc-testnet.0g.ai')}\n"
        f"ZKAI_AUTH_URL={relay_config.get('auth_url', GATEWAY_URL)}\n"
        f"ZKAI_RELAY_URL={relay_config.get('relay_url', 'https://zkai-relay.fly.dev')}\n"
        f"ZKAI_RELAY_SECRET={relay_config.get('relay_secret', '')}\n"
        f"ZKAI_PRICE_PER_REQUEST={relay_config.get('price_per_request', 100)}\n"
        f"OLLAMA_MODEL=qwen2.5:1.5b\n"
        f"MAX_TOKENS=512\n"
    )
    ef.write_text(env_content)
    ef.chmod(0o600)
    console.print(f"  [green]✓[/green] {ef}")


def _print_next_steps(repo: Path, private_key: str):
    console.print()
    console.print(Panel(
        "[bold yellow]Fund your wallet before starting[/bold yellow]\n\n"
        "Your wallet pays gas for on-chain transactions on 0G Galileo testnet.\n\n"
        "[bold]1.[/bold] Get your wallet address:\n"
        "   [cyan]zkai start[/cyan]\n"
        "   [cyan]zkai logs bridge[/cyan]  (look for '0G address: 0x...')\n\n"
        "[bold]2.[/bold] Get testnet A0GI from the faucet:\n"
        "   [link=https://faucet.0g.ai]https://faucet.0g.ai[/link]\n\n"
        "[bold]3.[/bold] Once funded, register and go live:\n"
        "   [cyan]zkai register --model qwen2.5:1.5b --price 100[/cyan]\n\n"
        "[bold]4.[/bold] Check status:\n"
        "   [cyan]zkai status[/cyan]",
        border_style="yellow",
        title="Next steps",
    ))
