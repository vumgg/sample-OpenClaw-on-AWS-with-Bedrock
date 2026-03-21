# Admin Console — Frontend & Backend

React 19 + Tailwind CSS + ApexCharts frontend with FastAPI backend. Part of the OpenClaw Enterprise platform.

See [enterprise/README.md](../README.md) for full deployment guide.

## Development

```bash
# Frontend (hot reload on port 3000, proxies /api to 8099)
npm install && npm run dev

# Backend (port 8099)
cd server
pip install -r requirements.txt
export ADMIN_PASSWORD="your-password"
export JWT_SECRET=$(openssl rand -hex 32)
export AWS_REGION=us-east-2
python3 main.py
```

## Build

```bash
npm run build   # outputs to dist/
```

## Structure

```
src/
├── App.tsx                    # Route guards (Admin/Manager → Console, Employee → Portal)
├── contexts/AuthContext.tsx    # JWT auth state
├── api/client.ts              # API client with auth header
├── components/
│   ├── Layout.tsx             # Admin Console sidebar + topbar
│   ├── PortalLayout.tsx       # Employee Portal sidebar
│   └── ui.tsx                 # Reusable UI components
├── hooks/useApi.ts            # React Query hooks for all endpoints
├── pages/                     # 19 admin pages + 5 portal pages
│   ├── portal/                # Employee Self-Service Portal
│   └── ...
└── types/index.ts             # TypeScript type definitions

server/
├── main.py                    # FastAPI app (35+ endpoints)
├── auth.py                    # JWT authentication
├── db.py                      # DynamoDB data access layer
├── s3ops.py                   # S3 operations
├── seed_*.py                  # Data seed scripts
└── requirements.txt
```
