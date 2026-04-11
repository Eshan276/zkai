"""
zkai register   — register provider on Midnight chain
zkai deregister — remove provider from registry
zkai info       — print provider ID, pubkey, endpoint
"""

import hashlib
import json
import time
from pathlib import Path

import requests
import typer
from rich.panel import Panel
from rich.prompt import Prompt, Confirm

from zkai_cli.util import (
    console, err_console,
    compose_dir, deploy_dir, find_repo_root,
    require_docker, stream, read_env_file,
)

_PROVIDER_ID_FILE = ".provider_id"
_ENCLAVE_URL = "http://127.0.0.1:8080"
_BRIDGE_URL = "http://127.0.0.1:7300"

import os as _os
_AUTH_URL = _os.environ.get("ZKAI_AUTH_URL", "").rstrip("/")
_RELAY_URL = _os.environ.get("ZKAI_RELAY_URL", "").rstrip("/")


# ── register ──────────────────────────────────────────────────────────────────

def register(
    repo_dir: str | None,
    endpoint: str | None,
    model: str,
    price: int,
):
    require_docker()
    repo = find_repo_root(repo_dir)

    # Resolve relay URL: CLI env var > provider/.env > prompt
    relay_url = _RELAY_URL
    if not relay_url:
        env = read_env_file(repo)
        relay_url = env.get("ZKAI_RELAY_URL", "").rstrip("/")
    auth_url = _AUTH_URL or read_env_file(repo).get("ZKAI_AUTH_URL", "").rstrip("/")

    # Check bridge is up and synced
    _wait_for_bridge()

    # Get TEE pubkey from local enclave
    console.print("[bold]Fetching TEE pubkey from enclave...[/bold]")
    pubkey = _get_enclave_pubkey()
    console.print(f"  pubkey: {pubkey[:16]}...{pubkey[-8:]}")

    # Generate a unique provider_id per registration = sha256(pubkey + timestamp)
    # This avoids the contract bug where deregistered IDs can't be reused
    provider_id = hashlib.sha256((pubkey + str(int(time.time()))).encode()).hexdigest()
    console.print(f"  provider_id: {provider_id}")

    # Endpoint — auto-fill from relay if configured
    if not endpoint:
        if relay_url:
            endpoint = f"{relay_url}/relay/{provider_id}"
            console.print(f"  [dim]Using relay endpoint: {endpoint}[/dim]")
        else:
            endpoint = Prompt.ask(
                "\nPublic endpoint URL (consumers will connect here)",
                default="http://localhost:8080",
            )

    console.print(f"\n[bold]Registering...[/bold]")
    console.print(f"  endpoint: {endpoint}")
    console.print(f"  model:    {model}")
    console.print(f"  price:    {price} tNIGHT/req")

    # Fetch hardware info from enclave
    hardware = None
    try:
        hw_resp = requests.get(f"{_ENCLAVE_URL}/health", timeout=5)
        if hw_resp.ok:
            hardware = hw_resp.json().get("hardware")
    except Exception:
        pass

    # Register in central DB first — this is what actually routes traffic
    tx_id = "pending"
    if auth_url:
        try:
            r = requests.post(
                f"{auth_url}/api/providers/register",
                json={"provider_id": provider_id, "endpoint": endpoint, "model": model, "price": price, "hardware": hardware},
                timeout=15,
            )
            if r.ok:
                console.print("  [green]Registered in central gateway DB[/green]")
            else:
                console.print(f"  [yellow]Warning: gateway DB registration failed: {r.text[:80]}[/yellow]")
        except Exception as e:
            console.print(f"  [yellow]Warning: could not reach gateway ({e})[/yellow]")

    # Submit on-chain tx in background (non-blocking)
    console.print("  Submitting on-chain tx (background)...")
    pubkey_padded = pubkey.zfill(64)
    try:
        resp = requests.post(
            f"{_BRIDGE_URL}/registry/register-provider",
            json={
                "provider_id": provider_id,
                "pubkey": pubkey_padded,
                "endpoint": endpoint,
                "model": model,
                "price": str(price),
            },
            timeout=300,
        )
        if resp.ok:
            tx_id = resp.json().get("tx_id", "submitted")
            console.print("  [green]On-chain tx submitted[/green]")
        else:
            console.print(f"  [yellow]On-chain tx failed (gateway registration still active): {resp.text[:80]}[/yellow]")
    except Exception as e:
        console.print(f"  [yellow]On-chain tx timed out (gateway registration still active)[/yellow]")

    # Save provider_id locally
    pid_file = compose_dir(repo) / _PROVIDER_ID_FILE
    pid_file.write_text(json.dumps({
        "provider_id": provider_id,
        "pubkey": pubkey,
        "endpoint": endpoint,
        "model": model,
        "price": price,
    }))

    console.print(Panel(
        f"[green bold]Provider registered![/green bold]\n\n"
        f"  TX:          {tx_id}\n"
        f"  Provider ID: {provider_id}\n"
        f"  Endpoint:    {endpoint}\n\n"
        f"Saved to [dim]{pid_file}[/dim]\n"
        f"Your node is now discoverable by consumers on the Midnight registry.",
        border_style="green",
    ))


# ── deregister ────────────────────────────────────────────────────────────────

def deregister(repo_dir: str | None):
    require_docker()
    repo = find_repo_root(repo_dir)

    pid_file = compose_dir(repo) / _PROVIDER_ID_FILE
    provider_id = _load_provider_id(pid_file)

    console.print(f"[bold]Deregistering provider:[/bold] {provider_id}")
    if not Confirm.ask("Are you sure? This removes you from the on-chain registry.", default=False):
        console.print("Aborted.")
        raise typer.Exit(0)

    resp = requests.post(
        f"{_BRIDGE_URL}/registry/deregister-provider",
        json={"provider_id": provider_id},
        timeout=120,
    )

    if not resp.ok:
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        err_console.print(f"[red]Deregistration failed:[/red] {data.get('error', resp.text)}")
        raise typer.Exit(1)

    # Remove from central DB
    env = read_env_file(repo)
    auth_url = _AUTH_URL or env.get("ZKAI_AUTH_URL", "").rstrip("/")
    if auth_url:
        try:
            requests.post(
                f"{auth_url}/api/providers/deregister",
                json={"provider_id": provider_id},
                timeout=10,
            )
        except Exception:
            pass

    console.print("[green]Provider deregistered.[/green]")
    pid_file.unlink(missing_ok=True)


# ── info ──────────────────────────────────────────────────────────────────────

def info(repo_dir: str | None):
    repo = find_repo_root(repo_dir)
    pid_file = compose_dir(repo) / _PROVIDER_ID_FILE

    if not pid_file.exists():
        console.print("[yellow]Provider not registered yet.[/yellow] Run [bold]zkai register[/bold] first.")
        return

    data = json.loads(pid_file.read_text())
    console.print()
    console.print(f"  [bold]Provider ID:[/bold] {data.get('provider_id', '?')}")
    console.print(f"  [bold]Pubkey:[/bold]      {data.get('pubkey', '?')}")
    console.print(f"  [bold]Endpoint:[/bold]    {data.get('endpoint', '?')}")
    console.print(f"  [bold]Model:[/bold]       {data.get('model', '?')}")
    console.print(f"  [bold]Price:[/bold]       {data.get('price', '?')} tNIGHT/req")
    console.print()

    # Live pubkey check
    try:
        live_pk = _get_enclave_pubkey()
        if live_pk == data.get("pubkey"):
            console.print("[green]Enclave pubkey matches registered pubkey.[/green]")
        else:
            console.print("[yellow]Warning: enclave pubkey has changed since registration.[/yellow]")
            console.print("Run [bold]zkai register[/bold] again to update the on-chain entry.")
    except Exception:
        console.print("[dim]Enclave not reachable — can't verify pubkey.[/dim]")


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_enclave_pubkey() -> str:
    try:
        r = requests.get(f"{_ENCLAVE_URL}/pubkey", timeout=10)
        r.raise_for_status()
        return r.json()["pubkey"]
    except Exception as e:
        err_console.print(f"[red]Cannot reach enclave at {_ENCLAVE_URL}/pubkey:[/red] {e}")
        err_console.print("Make sure the enclave is running: [bold]zkai start[/bold]")
        raise typer.Exit(1)


def _wait_for_bridge(timeout: int = 30):
    """Wait for bridge to be up and synced (up to timeout seconds)."""
    console.print("[bold]Checking bridge...[/bold]", end=" ")
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(f"{_BRIDGE_URL}/health", timeout=3)
            data = r.json()
            if data.get("synced"):
                console.print("[green]synced[/green]")
                return
            else:
                console.print("[yellow]wallet not yet synced — waiting...[/yellow]")
                time.sleep(5)
                continue
        except Exception:
            pass
        time.sleep(3)
        console.print(".", end="", flush=True)

    err_console.print(f"\n[red]Bridge not reachable or not synced after {timeout}s.[/red]")
    err_console.print("Run [bold]zkai logs bridge[/bold] to diagnose. Wallet sync can take 2-5 min.")
    raise typer.Exit(1)


def _load_provider_id(pid_file: Path) -> str:
    if not pid_file.exists():
        err_console.print(
            "[red]No provider_id found.[/red] "
            "Run [bold]zkai register[/bold] first, or set --provider-id."
        )
        raise typer.Exit(1)
    return json.loads(pid_file.read_text())["provider_id"]
