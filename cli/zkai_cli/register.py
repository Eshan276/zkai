"""
zkai register   — register provider on 0G chain
zkai deregister — remove provider from registry
zkai info       — print provider ID, endpoint
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
    compose_dir, find_repo_root,
    require_docker, read_env_file,
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

    relay_url = _RELAY_URL
    if not relay_url:
        env = read_env_file(repo)
        relay_url = env.get("ZKAI_RELAY_URL", "").rstrip("/")
    auth_url = _AUTH_URL or read_env_file(repo).get("ZKAI_AUTH_URL", "").rstrip("/")

    # Check bridge is up
    _wait_for_bridge()

    # Get bridge's EVM address (this IS the provider ID on 0G chain)
    console.print("[bold]Fetching provider address from bridge...[/bold]")
    provider_id = _get_bridge_address()
    console.print(f"  provider address (0G): {provider_id}")

    # Get TEE pubkey from enclave (for info purposes)
    pubkey = ""
    try:
        pubkey = _get_enclave_pubkey()
        console.print(f"  TEE pubkey: {pubkey[:16]}...{pubkey[-8:]}")
    except Exception:
        console.print("  [dim]Enclave not reachable — skipping pubkey check[/dim]")

    # Endpoint
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
    console.print(f"  price:    {price} A0GI/req")

    # Fetch hardware info
    hardware = None
    try:
        hw_resp = requests.get(f"{_ENCLAVE_URL}/health", timeout=5)
        if hw_resp.ok:
            hardware = hw_resp.json().get("hardware")
    except Exception:
        pass

    # Register in central gateway DB
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

    # Submit on-chain tx via bridge
    console.print("  Submitting on-chain tx...")
    try:
        resp = requests.post(
            f"{_BRIDGE_URL}/registry/register-provider",
            json={
                "endpoint": endpoint,
                "model": model,
                "price": str(price),
            },
            timeout=120,
        )
        if resp.ok:
            result = resp.json()
            tx_id = result.get("tx_id", "submitted")
            provider_id = result.get("provider_id", provider_id)
            console.print(f"  [green]On-chain tx: {tx_id[:20]}...[/green]")
        else:
            console.print(f"  [yellow]On-chain tx failed (gateway registration still active): {resp.text[:80]}[/yellow]")
    except Exception as e:
        console.print(f"  [yellow]On-chain tx error: {e}[/yellow]")

    # Save provider info locally
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
        f"Your node is now discoverable by consumers on the 0G registry.",
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
        timeout=60,
    )

    if not resp.ok:
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        err_console.print(f"[red]Deregistration failed:[/red] {data.get('error', resp.text)}")
        raise typer.Exit(1)

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
    console.print(f"  [bold]Provider ID (0G):[/bold] {data.get('provider_id', '?')}")
    console.print(f"  [bold]TEE Pubkey:[/bold]      {data.get('pubkey', '?')}")
    console.print(f"  [bold]Endpoint:[/bold]        {data.get('endpoint', '?')}")
    console.print(f"  [bold]Model:[/bold]           {data.get('model', '?')}")
    console.print(f"  [bold]Price:[/bold]           {data.get('price', '?')} A0GI/req")
    console.print()


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_bridge_address() -> str:
    try:
        r = requests.get(f"{_BRIDGE_URL}/health", timeout=10)
        r.raise_for_status()
        addr = r.json().get("address")
        if not addr:
            raise ValueError("No address in bridge health response")
        return addr
    except Exception as e:
        err_console.print(f"[red]Cannot reach bridge at {_BRIDGE_URL}/health:[/red] {e}")
        err_console.print("Make sure the bridge is running: [bold]zkai start[/bold]")
        raise typer.Exit(1)


def _get_enclave_pubkey() -> str:
    r = requests.get(f"{_ENCLAVE_URL}/pubkey", timeout=10)
    r.raise_for_status()
    return r.json()["pubkey"]


def _wait_for_bridge(timeout: int = 30):
    console.print("[bold]Checking bridge...[/bold]", end=" ")
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(f"{_BRIDGE_URL}/health", timeout=3)
            data = r.json()
            if data.get("synced"):
                console.print("[green]ready[/green]")
                return
        except Exception:
            pass
        time.sleep(2)
        console.print(".", end="", flush=True)

    err_console.print(f"\n[red]Bridge not reachable after {timeout}s.[/red]")
    err_console.print("Run [bold]zkai logs bridge[/bold] to diagnose.")
    raise typer.Exit(1)


def _load_provider_id(pid_file: Path) -> str:
    if not pid_file.exists():
        err_console.print(
            "[red]No provider_id found.[/red] "
            "Run [bold]zkai register[/bold] first."
        )
        raise typer.Exit(1)
    return json.loads(pid_file.read_text())["provider_id"]
