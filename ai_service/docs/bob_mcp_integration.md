# IBM Bob MCP Integration

Guardians exposes project capabilities to IBM Bob through Bob's local STDIO MCP
integration. Bob is not used as an inference runtime. The MCP server delegates to
the existing FastAPI service, where deterministic AI modules, local RAG, and IBM
Granite 4 continue to run.

## Phase 1 Scope

Only one tool is exposed:

- `get_risk_score`: calls `POST /risk-score` and returns the existing structured
  `RiskScoringResponse` JSON.

The MCP server intentionally does not call Granite, FAISS, CV, Graph AI, or the
risk engine directly. It preserves the current API boundary used by M2 and M1.

## Runtime Flow

```text
IBM Bob
  -> local STDIO MCP server: guardians-disaster-tools
  -> get_risk_score(request)
  -> POST http://127.0.0.1:8001/risk-score
  -> existing FastAPI risk engine
  -> structured JSON response
  -> IBM Bob
```

## Bob Configuration

Project-level configuration lives at `.bob/mcp.json`.

```json
{
  "mcpServers": {
    "guardians-disaster-tools": {
      "type": "stdio",
      "command": "py",
      "args": ["-3.13", "-m", "app.integrations.bob_mcp_server"],
      "cwd": "C:\\Users\\Arun Kumar\\OneDrive\\Documents\\Guardians of the Slums\\ai_service",
      "env": {
        "GUARDIANS_AI_BASE_URL": "http://127.0.0.1:8001",
        "GUARDIANS_AI_TIMEOUT_SECONDS": "30"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

## Manual Start Command

Run from `ai_service`:

```powershell
py -3.13 -m app.integrations.bob_mcp_server
```

The process uses STDIO and waits for MCP JSON-RPC messages from Bob.

## Failure Behavior

If FastAPI is not running, `get_risk_score` raises a clear MCP tool error:

```text
FastAPI is unavailable at http://127.0.0.1:8001; start the AI service on port 8001.
```

## Next Tools

After `get_risk_score` is verified in Bob, the same wrapper pattern can add:

- `analyze_satellite_area`
- `generate_evacuation_plan`
- `assign_volunteers`
- `generate_grounded_report`
