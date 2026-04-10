# CLAUDE.md

## Project Overview

**sample-OpenClaw-on-AWS-with-Bedrock** deploys [OpenClaw](https://www.npmjs.com/package/openclaw), an open-source personal AI assistant, on AWS with Amazon Bedrock. This branch (`feat/eks-infra`) provides the **EKS deployment infrastructure**:

- **EKS (Kubernetes)** — Operator-managed pods via OpenClawInstance CRD, Terraform modules, China region support

Other deployment runtimes (EC2/AgentCore, ECS/Fargate) and the Enterprise Admin Console are on separate branches.

## Repository Structure

```
.
├── clawdbot-bedrock.yaml              # CloudFormation (Linux/Graviton)
├── clawdbot-bedrock-mac.yaml          # CloudFormation (macOS)
├── eks/                               # EKS deployment
│   ├── terraform/                     # Terraform modules
│   │   ├── main.tf                    # Providers, locals
│   │   ├── root.tf                    # Module composition (VPC, EKS, storage, operator, ...)
│   │   ├── modules/
│   │   │   ├── vpc/                   # VPC, subnets, NAT, ALB tags
│   │   │   ├── eks-cluster/           # EKS cluster, node groups, addons
│   │   │   ├── storage/               # EFS/EBS CSI drivers, StorageClass
│   │   │   ├── bedrock-iam/           # Bedrock IRSA role
│   │   │   ├── operator/              # OpenClaw Operator Helm release
│   │   │   ├── networking/            # ALB Controller (optional)
│   │   │   ├── monitoring/            # Prometheus + Grafana (optional)
│   │   │   ├── litellm/               # LiteLLM AI proxy (optional)
│   │   │   ├── kata/                  # Kata Containers + Karpenter (optional)
│   │   │   └── agent-sandbox/         # Agent sandbox CRDs (optional)
│   │   └── variables.tf / outputs.tf
│   ├── manifests/examples/            # OpenClawInstance CRD examples
│   └── scripts/                       # install, cleanup, validate, integration-test, china-image-mirror
├── docs/
│   ├── DEPLOYMENT_EKS.md             # EKS deployment guide (English)
│   └── DEPLOYMENT_EKS_CN.md          # EKS deployment guide (Chinese)
└── skills/                            # OpenClaw skills (kiro-cli, s3-files)
```

## Key Concepts

### OpenClawInstance CRD
```yaml
apiVersion: openclaw.rocks/v1alpha1
kind: OpenClawInstance
spec:
  image: {repository, tag}        # Container image (pin to 2026.4.2)
  registry: "ecr-uri"             # Global registry override (China)
  config.raw: {openclaw.json}     # Full config (models, gateway, tools)
  env: [{name, value}]            # Environment variables
  workspace.initialFiles: {}      # Files seeded to workspace
  skills: []                      # ClawHub skill identifiers
  resources: {requests, limits}   # CPU/memory
  gateway: {enabled, port}        # Gateway UI on port 18789
  chromium: {enabled}             # Headless browser sidecar
  storage:
    persistence: {size, class}    # PVC configuration
  security.rbac: {}               # ServiceAccount annotations (IRSA)
```

### Image Version Pinning

Pin `spec.image.tag` to a known stable version. The `latest` tag may have regressions.

```yaml
spec:
  image:
    tag: "2026.4.2"  # Known stable
```

The `china-image-mirror.sh` script defaults to `OPENCLAW_VERSION=2026.4.2` (configurable via env var).

## Development Workflow

### Terraform
```bash
cd eks/terraform
terraform workspace select default   # Global (us-west-2)
terraform workspace select china     # China (cn-northwest-1)
terraform apply
```

### China Deployment
```bash
# 1. Mirror images (from a machine with internet access)
bash eks/scripts/china-image-mirror.sh --region cn-northwest-1 --name openclaw-cn --profile zhy

# 2. Deploy
cd eks/terraform && terraform workspace select china
AWS_PROFILE=zhy terraform apply -var="name=openclaw-cn" -var="region=cn-northwest-1" -var="architecture=arm64" -var="enable_efs=true"

# 3. Deploy instance
kubectl apply -f eks/manifests/examples/openclaw-bedrock-instance.yaml
```

## Active Deployments

| Region | Cluster | Account | Nodes |
|--------|---------|---------|-------|
| us-west-2 | openclaw-test | 600413481647 | amd64 |
| cn-northwest-1 | openclaw-cn | 834204282212 | arm64 (Graviton m6g) |

## China Region Specifics

- **ghcr.io / quay.io / Docker Hub inaccessible** — mirror via `eks/scripts/china-image-mirror.sh`
- **Global Registry override** (`spec.registry` in CRD) rewrites ALL container image registries
- **No Bedrock** — use LiteLLM proxy (`enable_litellm = true`) or third-party model providers
- **Helm charts from ghcr.io also blocked** — mirror script pushes charts to ECR as OCI artifacts
- **Must run mirror script BEFORE terraform apply** — otherwise Helm chart install fails
- **AWS CLI profile**: `zhy` for China credentials (`AWS_PROFILE=zhy`)

## Supported Models

| Model | ID |
|-------|----|
| Nova 2 Lite (default) | `global.amazon.nova-2-lite-v1:0` |
| Claude Sonnet 4.5 | `global.anthropic.claude-sonnet-4-5-20250929-v1:0` |
| Claude Opus 4.6 | `global.anthropic.claude-opus-4-6-v1` |
| Claude Haiku 4.5 | `global.anthropic.claude-haiku-4-5-20251001-v1:0` |
| Nova Pro | `us.amazon.nova-pro-v1:0` |
| DeepSeek R1 | `us.deepseek.r1-v1:0` |
| Llama 3.3 70B | `us.meta.llama3-3-70b-instruct-v1:0` |
| Kimi K2.5 | `moonshotai.kimi-k2.5` |

## Commit Conventions

Use clear, descriptive messages. Always include `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` when Claude generates the commit.

## Security Notes

- IAM: least-privilege (Bedrock invoke only for agent IRSA role)
- EKS Pod Identity (not IRSA) via `aws_eks_pod_identity_association`
- Gateway tokens generated per-instance, read from pod config, never exposed to browser
- Docker sandbox enabled by default for session isolation

## License

MIT No Attribution (MIT-0)
