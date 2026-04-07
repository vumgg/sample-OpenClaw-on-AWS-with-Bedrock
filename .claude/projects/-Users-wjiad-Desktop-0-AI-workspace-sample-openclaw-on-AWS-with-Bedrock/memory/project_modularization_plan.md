---
name: Modularization Plan
description: Completed extraction of enterprise/admin-console/server/main.py into 16 routers + production deployment
type: project
---

admin-console/server/main.py modularization — COMPLETED and deployed to production.

**Why:** main.py was 6427 lines / ~130 endpoints. Now 168 lines (bootstrap only).
**How to apply:** all endpoint logic lives in routers/*.py, shared deps in shared.py.

## Completed (2026-04-07)

1. **Modularization** — 16 routers extracted, all 127 API routes verified, 25/25 endpoint tests passed
2. **Production deploy** — EC2 i-0aa07bd9a04fa2255, openclaw.awspsa.com
3. **Bugfixes deployed:**
   - Agent records missing `channels`/`skills`/`soulVersions` fields → setdefault
   - Usage `agent["name"]` KeyError → `.get("name")`
   - Gateway proxy timeout → reduced to (3s connect, 10s read)
4. **Frontend updates:**
   - Removed ChatGPT comparison from Usage page
   - Added "Avg Cost/Request" metric + dual Y-axis cost/request trend
   - Added "My Portal" sidebar entry for admin/manager
5. **Always-on Gateway Console infra:**
   - ECS task definition: added port 18789 mapping
   - Security group: opened 18789 for VPC
   - openclaw.json: bind=lan, auth=token, controlUi.allowedOrigins
   - entrypoint.sh: auto-generate gateway token → SSM, curl-based readiness check
   - nginx 8098: WebSocket reverse proxy to container 18789

## TODO: Gateway Console for Always-on Agents

**Status:** Partially working. Blocked by Gateway Control UI pairing requirement.

**Problem chain:**
1. ✅ Container port 18789 reachable from EC2 (SG + task def fixed)
2. ✅ Gateway starts with `bind: lan` + `auth: token` + `controlUi.allowedOrigins`
3. ✅ nginx 8098 on EC2 proxies to container 18789 with WebSocket support
4. ✅ Token auth works (gateway-token stored in SSM)
5. ❌ Gateway Control UI requires "pairing" (`openclaw dashboard` generates a one-time #token)
   - `openclaw dashboard` must run INSIDE the container (same process as gateway)
   - ECS exec doesn't connect (SSM agent connectivity issue)
   - Entrypoint auto-pairing: `openclaw dashboard --no-open` runs but token extraction from output needs debugging

**Possible solutions (in order of preference):**
1. Fix entrypoint dashboard token extraction — debug why `openclaw dashboard` in container doesn't produce expected output (maybe gateway not yet accepting connections when dashboard runs)
2. Add delay between Gateway ready and dashboard command
3. Investigate if Gateway has a REST API to create pairing tokens programmatically
4. Build custom channel management UI in admin console that calls Gateway HTTP APIs directly (bypass Control UI entirely)
