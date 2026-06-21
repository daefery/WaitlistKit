# MCP Setup — WaitlistKit

## GitHub MCP (task tracker — REQUIRED before /pickup /define /implement /ship)

The harness uses GitHub Issues as the source of truth for the backlog. The GitHub MCP must be connected
and verified before any `/pickup`, `/define`, `/implement`, or `/ship` command will run.

### 1. Create a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens → **"Fine-grained tokens"** → **"Generate new token"**
2. Settings:
   - **Resource owner:** `daefery`
   - **Repository access:** `daefery/WaitlistKit` (single repo, not all repos)
   - **Permissions:**
     - **Issues:** Read and write
     - **Pull requests:** Read and write
     - **Contents:** Read (for branch/commit info in PRs)
     - **Metadata:** Read (required)
3. Generate and copy the token.

### 2. Export the token into your shell environment

Add to `~/.zshrc` (or `~/.zshenv`):

```sh
export GITHUB_PERSONAL_ACCESS_TOKEN="github_pat_XXXXX"
```

Then reload: `source ~/.zshrc`

Or pass it per-session before launching Claude Code:

```sh
GITHUB_PERSONAL_ACCESS_TOKEN="github_pat_XXXXX" claude
```

### 3. Verify the MCP is connected

In a Claude Code session in this project:

```
! claude mcp list
```

You should see:

```
github: npx -y @modelcontextprotocol/server-github - ✔ Connected
```

If it shows ✗ or is missing, check the token is exported and reload your shell.

### 4. Test a live read

In Claude Code, ask:

> List the open issues in daefery/WaitlistKit

If issues load (even if empty), the gate is passed. Then run:

```
/edbot-harness:harness-init '/Users/feryyp/WaitlistKit/README.md'
```

again — it will detect the MCP is now connected, create the roadmap issue and backlog tickets, and record the IDs in `.claude/project-profile.md §11`.

---

## Playwright MCP (E2E — add when authoring E2E tests)

The Playwright MCP lets the harness drive a real browser for E2E journey tests.

```sh
# Add to .mcp.json when ready:
# "playwright": {
#   "command": "npx",
#   "args": ["-y", "@executeautomation/playwright-mcp-server"]
# }
```

No token needed. Install on demand.

---

## Already connected

| Server | Status | Purpose |
| :----- | :----- | :------ |
| `clickup-docs` | ✔ Connected | Brain / knowledge base (read/write docs only — NOT task tracker) |
| `claude.ai Canva` | ✔ Connected | Design asset management |
| `github` | ✔ Connected (verified 2026-06-21) | Backlog tracker (GitHub Issues — roadmap #1, 15 tickets #2–#16) |
