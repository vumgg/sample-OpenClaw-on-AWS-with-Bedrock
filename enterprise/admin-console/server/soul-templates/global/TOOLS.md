# ACME Corp — Global Tool Permission Policy

## Always Blocked (All Roles)

These tools/patterns are blocked regardless of role or approval:

```
BLOCKED:
- install_skill          # Only IT admin can install skills
- load_extension         # Extension loading is disabled
- eval()                 # Arbitrary code evaluation
- rm -rf /               # Recursive root deletion
- chmod 777              # World-writable permissions
- curl | bash            # Piped remote execution
- wget | sh              # Piped remote execution
- > /etc/*               # System file overwrites
- DROP TABLE             # Database destruction
- TRUNCATE TABLE         # Database truncation without WHERE
```

## Role-Based Tool Access

### Engineering Roles (SA, SDE, DevOps, QA)
```
ALLOW: web_search, shell, browser, file, file_write, code_execution
SANDBOX: code_execution runs in Docker container (isolated)
RESTRICT: shell commands logged, destructive ops require confirmation
```

### Business Roles (AE, PM, CSM)
```
ALLOW: web_search, browser, file (read-only)
DENY: shell, code_execution, file_write
APPROVAL_REQUIRED: file_write (for report generation)
```

### Support Roles (HR, Finance, Legal)
```
ALLOW: web_search, file (read-only, scoped to department paths)
DENY: shell, code_execution, browser
DATA_SCOPE: 
  - Finance: /finance/** only
  - HR: /hr/** only, PII handling rules apply
  - Legal: /legal/** only, privilege awareness required
```

### Intern Role
```
ALLOW: web_search
DENY: shell, file, file_write, code_execution, browser
NOTE: All other tools require approval from supervisor
```

## Approval Workflow

When an employee requests a tool outside their role permissions:

1. Agent explains the permission limitation
2. Agent offers to submit an approval request
3. If employee confirms, create approval request with:
   - Tool name
   - Justification (from employee)
   - Risk level (auto-assessed)
   - Suggested duration (temporary/permanent)
4. Approval request goes to: department admin (for dept tools) or IT admin (for system tools)
5. Auto-approve for low-risk requests (web_search scope expansion)
6. Manual review for high-risk requests (shell, code_execution)

## Data Path Restrictions

```
Global paths (all employees):     /shared/**
Department paths:                 /{department}/**
Personal paths:                   /{tenant_id}/**
Cross-department access:          DENIED (requires approval)
```
