"""
zkai keys — API key management.

API keys are now managed centrally via the ZKai dashboard.
Consumers connect their Midnight wallet and generate keys there.
Enclaves verify keys against the central auth server (ZKAI_AUTH_URL).
"""

import typer
from rich.panel import Panel

from zkai_cli.util import console


def run(action: str, key_value: str | None, repo_dir: str | None, count: int):
    console.print(Panel(
        "[bold]API keys are managed via the ZKai dashboard.[/bold]\n\n"
        "Consumers connect their Midnight Lace wallet at the dashboard URL\n"
        "and generate API keys from there.\n\n"
        "Your enclave verifies keys automatically via [cyan]ZKAI_AUTH_URL[/cyan].\n\n"
        "To update the auth server URL: [bold cyan]zkai init[/bold cyan]",
        title="[yellow]zkai keys[/yellow]",
        border_style="yellow",
    ))
    raise typer.Exit(0)
