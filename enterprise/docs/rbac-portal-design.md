# RBAC & Employee Self-Service Portal — Design Document

Date: 2026-03-21
Version: v1.0

---

## 1. Overview

Transform the single-role Admin Console into a role-aware platform with three distinct experiences:

| Role | Who | Primary Goal |
|------|-----|-------------|
| **Admin** (IT/Platform) | IT Admin, CTO, CISO | Full platform control — org, agents, security, compliance |
| **Manager** (Dept Head) | Department managers, team leads | Manage their department's agents, employees, usage, approvals |
| **Employee** (End User) | All employees | Chat with their agent, manage preferences, view own usage |

The Employee role gets a dedicated **Self-Service Portal** — a simplified, chat-first interface.
Admin and Manager share the existing Admin Console with scoped visibility.

---

## 2. Authentication & Role Assignment

### 2.1 Login Flow

```
User opens /login
  → Enter employee ID + password (v1.0: simple token auth)
  → Backend checks DynamoDB EMP# record
  → Returns JWT with { employeeId, role, departmentId, positionId }
  → Frontend stores in localStorage, sends as Bearer token
  → Route guard redirects based on role:
      admin    → /dashboard (full Admin Console)
      manager  → /dashboard (scoped Admin Console)
      employee → /portal    (Self-Service Portal)
```

### 2.2 Role Determination

Roles are stored on the Employee record in DynamoDB:

```
EMP#emp-z3: { ..., role: "admin" }      // IT Admin
EMP#emp-lin: { ..., role: "manager" }   // Dept head
EMP#emp-w5: { ..., role: "employee" }   // Regular employee
```

Default: `employee`. Promoted by Admin via Employee Management page.

### 2.3 JWT Token Structure

```json
{
  "sub": "emp-z3",
  "name": "Zhang San",
  "role": "admin",
  "departmentId": "dept-eng",
  "positionId": "pos-sa",
  "exp": 1711036800
}
```

---

## 3. Permission Matrix

### 3.1 Page Access

| Page | Admin | Manager | Employee |
|------|-------|---------|----------|
| Dashboard | ✅ Full org | ✅ Own dept only | ❌ |
| Department Tree | ✅ All | ✅ Own dept subtree | ❌ |
| Positions | ✅ All CRUD | ✅ Own dept (read) | ❌ |
| Employees | ✅ All CRUD | ✅ Own dept (read + provision) | ❌ |
| Agent Factory | ✅ All agents | ✅ Own dept agents | ❌ |
| SOUL Editor | ✅ All layers | ✅ Position layer (own dept) | ❌ |
| Workspace | ✅ All | ✅ Own dept | ❌ |
| Skill Market | ✅ Full (install/remove) | ✅ View + request | ❌ |
| Knowledge Base | ✅ All CRUD | ✅ Own dept (read + upload) | ❌ |
| Bindings & Routing | ✅ Full | ✅ Own dept (read) | ❌ |
| Monitor | ✅ All sessions | ✅ Own dept sessions | ❌ |
| Audit Center | ✅ Full + AI Insights | ✅ Own dept events | ❌ |
| Approvals | ✅ All | ✅ Own dept | ❌ |
| Usage & Cost | ✅ All dimensions | ✅ Own dept | ❌ |
| Playground | ✅ All profiles | ✅ Own dept agents | ❌ |
| Settings | ✅ Full | ❌ | ❌ |
| **Portal (Chat)** | ❌ | ❌ | ✅ |
| **Portal (Preferences)** | ❌ | ❌ | ✅ |
| **Portal (My Usage)** | ❌ | ❌ | ✅ |
| **Portal (Request Access)** | ❌ | ❌ | ✅ |

### 3.2 API Permission Enforcement

Every API endpoint checks the JWT role and scopes data accordingly:

```python
# Backend middleware pattern
@app.get("/api/v1/org/employees")
def get_employees(current_user = Depends(get_current_user)):
    if current_user.role == "admin":
        return db.get_employees()  # all
    elif current_user.role == "manager":
        return db.get_employees_by_dept(current_user.departmentId)  # scoped
    else:
        raise HTTPException(403, "Insufficient permissions")
```

### 3.3 Data Scoping Rules

| Data Type | Admin Sees | Manager Sees | Employee Sees |
|-----------|-----------|-------------|--------------|
| Employees | All 20 | Own department (e.g., 8 in Engineering) | Only self |
| Agents | All 20 | Own department agents | Only own agent |
| Sessions | All active | Own department sessions | Only own sessions |
| Audit logs | All events | Own department events | Own events only |
| Usage | All dimensions | Own department breakdown | Own token usage |
| Approvals | All pending | Own department pending | Own requests |
| SOUL layers | Global + all positions | Global (read) + own position | Personal layer only |

---

## 4. Employee Self-Service Portal

### 4.1 Design Philosophy

The portal is NOT a simplified admin console. It's a **chat-first workspace** where the employee interacts with their AI agent through a browser, manages their preferences, and monitors their own usage.

Think of it as: "Your personal AI assistant, accessible from any browser."

### 4.2 Portal Navigation

```
🦞 OpenClaw Portal
│
├── 💬 Chat                    ← Primary: talk to your agent
├── 👤 My Profile              ← Edit USER.md preferences
├── 📊 My Usage                ← Personal token usage & history
├── 🔧 My Skills              ← View available skills, request new ones
└── 📋 My Requests             ← Track approval requests
```

### 4.3 Portal Pages

#### 4.3.1 Chat (Primary Page)

```
┌─────────────────────────────────────────────────────────┐
│  🦞 OpenClaw Portal          Zhang San · SA Agent    👤 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Agent ──────────────────────────────────────────┐   │
│  │ Good morning Zhang San! I'm your Solutions       │   │
│  │ Architect assistant. I can help with:            │   │
│  │ • Architecture reviews and diagrams              │   │
│  │ • AWS cost estimation                            │   │
│  │ • Technical documentation                        │   │
│  │ • Research and analysis                          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ You ────────────────────────────────────────────┐   │
│  │ Review this architecture for the new payment     │   │
│  │ microservice                                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Agent ──────────────────────────────────────────┐   │
│  │ I'll analyze the architecture. Let me use the    │   │
│  │ deep-research tool...                            │   │
│  │                                                  │   │
│  │ [🔧 deep-research: analyzing... ✅ 2.3s]        │   │
│  │                                                  │   │
│  │ Based on my analysis:                            │   │
│  │ **Strengths:** ...                               │   │
│  │ **Concerns:** ...                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [📎 Attach] [Type your message...              ] [➤]  │
└─────────────────────────────────────────────────────────┘
```

**Technical implementation:**
- POST `/api/v1/portal/chat` → Tenant Router → AgentCore → OpenClaw → Bedrock
- Streaming response via SSE (Server-Sent Events)
- Tool call status shown inline
- Conversation history stored in DynamoDB (SESSION# records)
- File attachments uploaded to S3 employee workspace

#### 4.3.2 My Profile

```
┌─────────────────────────────────────────────────────────┐
│  My Profile                                              │
│                                                         │
│  ┌─ Basic Info ─────────────────────────────────────┐   │
│  │ Name: Zhang San          Employee No: EMP-001    │   │
│  │ Position: Solutions Architect                     │   │
│  │ Department: Engineering                           │   │
│  │ Agent: SA Agent - Zhang San  [Status: Active ●]  │   │
│  │ Channels: Telegram, Slack                         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Preferences (USER.md) ──────────────────────────┐   │
│  │ Communication style: [Concise ▼]                 │   │
│  │ Language: [English ▼]                             │   │
│  │ Code examples: [Always include ▼]                │   │
│  │ Response length: [Medium ▼]                      │   │
│  │                                                  │   │
│  │ Custom instructions:                             │   │
│  │ ┌──────────────────────────────────────────────┐ │   │
│  │ │ I prefer AWS CDK over CloudFormation.        │ │   │
│  │ │ Always consider cost optimization.           │ │   │
│  │ │ Use TypeScript for code examples.            │ │   │
│  │ └──────────────────────────────────────────────┘ │   │
│  │                                          [Save]  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Memory ─────────────────────────────────────────┐   │
│  │ MEMORY.md: 2.4 KB · Last updated: 2h ago        │   │
│  │ Daily memories: 5 files (Mar 16-20)              │   │
│  │                                                  │   │
│  │ [View Memory] [Clear Memory]                     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Technical implementation:**
- GET/PUT `/api/v1/portal/profile` — reads/writes USER.md in S3
- Preferences form maps to structured USER.md content
- Memory view reads from S3 `{emp-id}/workspace/MEMORY.md`
- "Clear Memory" requires confirmation, creates audit entry

#### 4.3.3 My Usage

```
┌─────────────────────────────────────────────────────────┐
│  My Usage                                    This Month │
│                                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │  67    │ │ 79.7k  │ │ $0.24  │ │ 3.2s   │          │
│  │requests│ │ tokens │ │  cost  │ │avg resp│          │
│  └────────┘ └────────┘ └────────┘ └────────┘          │
│                                                         │
│  [Daily usage chart — 7 day trend]                      │
│                                                         │
│  Top tools used:                                        │
│  1. deep-research (28 calls)                            │
│  2. jina-reader (15 calls)                              │
│  3. cost-calculator (12 calls)                          │
│                                                         │
│  Budget: $5.00/mo · Used: $0.24 · Remaining: $4.76     │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 4.8%       │
└─────────────────────────────────────────────────────────┘
```

#### 4.3.4 My Skills

```
┌─────────────────────────────────────────────────────────┐
│  My Skills                                               │
│                                                         │
│  Available (inherited from SA position):                │
│  ✅ web-search    ✅ jina-reader    ✅ deep-research    │
│  ✅ s3-files      ✅ arch-diagram   ✅ cost-calculator  │
│                                                         │
│  Restricted (requires approval):                        │
│  🔒 shell         🔒 code-execution  🔒 email-send     │
│  🔒 github-pr     🔒 excel-gen                          │
│                                                         │
│  [Request Access to a Skill →]                          │
└─────────────────────────────────────────────────────────┘
```

#### 4.3.5 My Requests

```
┌─────────────────────────────────────────────────────────┐
│  My Requests                                             │
│                                                         │
│  Pending (1):                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🕐 Request shell access for debugging            │   │
│  │    Submitted: 2h ago · Reviewer: IT Admin        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Resolved (2):                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ✅ code-execution access — Approved (yesterday)  │   │
│  │ ❌ file_write to /finance — Denied (3 days ago)  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Manager View — Scoped Admin Console

Managers see the same Admin Console layout but with data scoped to their department.

### 5.1 What Changes for Managers

| Component | Admin View | Manager View |
|-----------|-----------|-------------|
| Dashboard KPIs | Org-wide totals | Department totals |
| Dashboard chart | All departments | Own department only |
| Agent Health | All 20 agents | Own dept agents (e.g., 8) |
| Employee list | All 20 employees | Own dept employees |
| Sessions | All 8 active | Own dept sessions |
| Audit log | All events | Own dept events |
| Usage breakdown | All departments | Own dept agents only |
| Approvals | All pending | Own dept pending |
| Quick Actions | Create Position, New Agent | Provision Employee, View Agent |

### 5.2 Manager-Specific Features

1. **Provision employees** — can trigger bulk provision for their department
2. **Approve skill requests** — from their department's employees
3. **View session details** — can observe (not takeover) their dept's sessions
4. **Department usage report** — exportable for budget reviews

### 5.3 What Managers Cannot Do

- Create/edit positions (Admin only)
- Edit Global SOUL layer (Admin only)
- Change LLM model config (Admin only)
- Access Settings page (Admin only)
- Takeover sessions (Admin only)
- View other departments' data

---

## 6. Technical Implementation

### 6.1 Frontend Architecture

```
src/
├── App.tsx                    # Route guard based on role
├── components/
│   ├── Layout.tsx             # Admin/Manager layout (existing)
│   └── PortalLayout.tsx       # Employee portal layout (new)
├── contexts/
│   └── AuthContext.tsx         # JWT auth state, role, permissions
├── pages/
│   ├── Login.tsx              # Shared login page
│   ├── portal/               # Employee portal pages (new)
│   │   ├── Chat.tsx
│   │   ├── Profile.tsx
│   │   ├── MyUsage.tsx
│   │   ├── MySkills.tsx
│   │   └── MyRequests.tsx
│   └── ... (existing admin pages)
└── hooks/
    ├── useAuth.ts             # Auth hook with role check
    └── useApi.ts              # Existing, add auth header
```

### 6.2 Route Guard

```tsx
// App.tsx
function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" />;
  return children;
}

// Routes
<Route path="/login" element={<Login />} />
<Route path="/portal/*" element={
  <ProtectedRoute allowedRoles={["employee"]}>
    <PortalLayout><PortalRoutes /></PortalLayout>
  </ProtectedRoute>
} />
<Route path="/*" element={
  <ProtectedRoute allowedRoles={["admin", "manager"]}>
    <Layout><AdminRoutes /></Layout>
  </ProtectedRoute>
} />
```

### 6.3 Backend Auth Middleware

```python
# auth.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
import jwt

security = HTTPBearer()

def get_current_user(token = Depends(security)):
    payload = jwt.decode(token.credentials, SECRET, algorithms=["HS256"])
    return UserContext(
        employee_id=payload["sub"],
        role=payload["role"],
        department_id=payload.get("departmentId"),
    )

def require_role(*roles):
    def checker(user = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(403, f"Role {user.role} not allowed")
        return user
    return checker

# Usage
@app.get("/api/v1/settings/model")
def get_model_config(user = Depends(require_role("admin"))):
    ...

@app.get("/api/v1/org/employees")
def get_employees(user = Depends(get_current_user)):
    if user.role == "admin":
        return db.get_employees()
    elif user.role == "manager":
        return db.get_employees_by_dept(user.department_id)
    raise HTTPException(403)
```

### 6.4 Portal Chat API

```python
@app.post("/api/v1/portal/chat")
async def portal_chat(body: ChatMessage, user = Depends(require_role("employee"))):
    """Route employee message to their bound agent via Tenant Router."""
    # 1. Find employee's binding
    bindings = db.get_bindings_for_employee(user.employee_id)
    if not bindings:
        raise HTTPException(404, "No agent bound")

    # 2. Route through Tenant Router → AgentCore
    response = requests.post(f"{TENANT_ROUTER_URL}/route", json={
        "channel": "portal",
        "user_id": user.employee_id,
        "message": body.message,
    }, timeout=180)

    # 3. Store in session history
    db.append_session_message(user.employee_id, body.message, response.json())

    # 4. Audit trail
    db.create_audit_entry({...})

    return response.json()
```

### 6.5 Database Changes

Add to Employee record:
```
EMP#emp-z3: {
  ...,
  role: "admin",           // NEW: admin | manager | employee
  passwordHash: "...",     // NEW: bcrypt hash (v1.0 simple auth)
  lastLoginAt: "...",      // NEW
  portalEnabled: true,     // NEW: can access portal
}
```

Add new DynamoDB queries:
```python
def get_employees_by_dept(dept_id: str) -> list:
    """Get employees in a department and all sub-departments."""
    ...

def get_bindings_for_employee(emp_id: str) -> list:
    """Get all bindings for a specific employee."""
    ...

def get_chat_history(emp_id: str, limit: int = 50) -> list:
    """Get portal chat history for an employee."""
    ...
```

---

## 7. Implementation Plan

### Phase 1: Auth + Role Guard (1 day)
- [ ] Add `role` field to Employee seed data
- [ ] Create Login page
- [ ] Create AuthContext with JWT
- [ ] Add route guards to App.tsx
- [ ] Backend: login endpoint, JWT generation
- [ ] Backend: `get_current_user` middleware

### Phase 2: Manager Scoping (1 day)
- [ ] Backend: scope all list endpoints by department for manager role
- [ ] Frontend: pass auth token in API calls
- [ ] Frontend: hide Settings nav for managers
- [ ] Frontend: disable admin-only actions (position CRUD, global SOUL edit)
- [ ] Test: manager sees only own department data

### Phase 3: Employee Portal — Layout + Profile (1 day)
- [ ] Create PortalLayout.tsx (simplified sidebar, chat-first)
- [ ] Create portal/Profile.tsx (USER.md editor, memory viewer)
- [ ] Create portal/MyUsage.tsx (personal usage stats)
- [ ] Create portal/MySkills.tsx (available + restricted skills)
- [ ] Create portal/MyRequests.tsx (approval request tracker)
- [ ] Backend: portal-specific endpoints

### Phase 4: Employee Portal — Chat (1-2 days)
- [ ] Create portal/Chat.tsx (full chat interface)
- [ ] Backend: `/api/v1/portal/chat` → Tenant Router integration
- [ ] SSE streaming for real-time responses
- [ ] Tool call status display
- [ ] Chat history persistence in DynamoDB
- [ ] File attachment support (S3 upload)

### Phase 5: Polish + Testing (1 day)
- [ ] Role switching for demo (admin can "view as" manager/employee)
- [ ] Unauthorized page
- [ ] Session timeout handling
- [ ] Cross-role navigation (manager clicks agent → scoped detail)
- [ ] Seed demo accounts: 1 admin, 2 managers, 3 employees

---

## 8. Demo Accounts

| Account | Role | Department | What They See |
|---------|------|-----------|--------------|
| Zhang San (emp-z3) | admin | Engineering | Full Admin Console |
| Lin Xiaoyu (emp-lin) | manager | Product | Scoped to Product dept |
| Mike Johnson (emp-mike) | manager | Sales | Scoped to Sales dept |
| Wang Wu (emp-w5) | employee | Engineering | Portal: chat with SDE Agent |
| Carol Zhang (emp-carol) | employee | Finance | Portal: chat with Finance Agent |
| Emma Chen (emp-emma) | employee | Customer Success | Portal: chat with CSM Agent |

---

## 9. Security Considerations

1. **JWT secret** — stored in SSM Parameter Store, rotated monthly
2. **Token expiry** — 8 hours for admin/manager, 24 hours for employee portal
3. **Rate limiting** — portal chat: 60 messages/minute per employee
4. **Audit** — every portal chat message logged with employee ID
5. **Data isolation** — employees can NEVER see other employees' data, even via API manipulation
6. **SOUL protection** — employees can only edit personal USER.md, never SOUL.md or AGENTS.md
7. **Memory privacy** — MEMORY.md is employee-private, managers can see aggregated stats but not content
