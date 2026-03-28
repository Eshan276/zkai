"""
zkai keys — manage API keys for consumers.

Actions: add | list | remove | rotate
Keys are stored in provider/.env as ZKAI_API_KEYS=key1,key2,...
"""

import secrets

import typer
from rich.table import Table
from rich import box
from rich.prompt import Confirm

from zkai_cli.util import console, err_console, find_repo_root
from zkai_cli.setup import _read_env_keys, _write_env_keys, env_file


def run(action: str, key_value: str | None, repo_dir: str | None, count: int):
    repo = find_repo_root(repo_dir)
    ef = env_file(repo)

    match action:
        case "list":
            _list(ef)
        case "add":
            _add(ef, count)
        case "remove":
            _remove(ef, key_value)
        case "rotate":
            _rotate(ef, count)
        case _:
            err_console.print(f"[red]Unknown action '{action}'.[/red] Use: add | list | remove | rotate")
            raise typer.Exit(1)


def _list(ef):
    keys = _read_env_keys(ef)
    if not keys:
        console.print("[yellow]No API keys configured.[/yellow] Run [bold]zkai keys add[/bold].")
        return
    t = Table(title=f"API Keys ({len(keys)})", box=box.ROUNDED)
    t.add_column("#", style="dim", width=4)
    t.add_column("Key")
    for i, k in enumerate(keys, 1):
        # Show first 8 chars + mask the rest
        masked = k[:8] + "..." + k[-4:]
        t.add_row(str(i), masked)
    console.print(t)
    console.print(f"\n[dim]Full keys stored in {ef}[/dim]")


def _add(ef, count: int):
    new_keys = [secrets.token_hex(32) for _ in range(count)]
    existing = _read_env_keys(ef)
    _write_env_keys(ef, existing + new_keys)

    console.print(f"[green]{count} new key(s) added:[/green]\n")
    for k in new_keys:
        console.print(f"  [bold]{k}[/bold]")
    console.print(f"\n[dim]Saved to {ef}[/dim]")
    console.print("[yellow]Restart enclave to pick up new keys:[/yellow] [bold]zkai restart enclave[/bold]")


def _remove(ef, key_value: str | None):
    if not key_value:
        err_console.print("[red]Specify a key to remove:[/red] zkai keys remove <key>")
        raise typer.Exit(1)
    existing = _read_env_keys(ef)
    if key_value not in existing:
        err_console.print(f"[red]Key not found.[/red]")
        raise typer.Exit(1)
    updated = [k for k in existing if k != key_value]
    _write_env_keys(ef, updated)
    console.print(f"[green]Key removed.[/green] {len(updated)} key(s) remaining.")
    console.print("[yellow]Restart enclave:[/yellow] [bold]zkai restart enclave[/bold]")


def _rotate(ef, count: int):
    existing = _read_env_keys(ef)
    if existing:
        console.print(f"[yellow]This will replace all {len(existing)} existing key(s).[/yellow]")
        if not Confirm.ask("Continue?", default=False):
            console.print("Aborted.")
            raise typer.Exit(0)
    new_keys = [secrets.token_hex(32) for _ in range(count)]
    _write_env_keys(ef, new_keys)
    console.print(f"[green]{count} new key(s) generated (old keys revoked):[/green]\n")
    for k in new_keys:
        console.print(f"  [bold]{k}[/bold]")
    console.print(f"\n[dim]Saved to {ef}[/dim]")
    console.print("[yellow]Restart enclave to apply:[/yellow] [bold]zkai restart enclave[/bold]")
