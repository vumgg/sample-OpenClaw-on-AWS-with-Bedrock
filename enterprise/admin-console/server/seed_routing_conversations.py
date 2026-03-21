"""Seed routing rules and session conversations into DynamoDB."""
import argparse
import boto3

ORG = "ORG#acme"

def seed(table_name: str, region: str):
    ddb = boto3.resource("dynamodb", region_name=region)
    table = ddb.Table(table_name)
    items = []

    # Routing rules
    rules = [
        {"id": "rule-01", "priority": 1, "name": "Engineering Telegram", "condition": {"channel": "telegram", "department": "Engineering"}, "action": "route_to_personal_agent", "description": "Engineering employees on Telegram → their personal 1:1 agent"},
        {"id": "rule-02", "priority": 2, "name": "Help Desk Discord", "condition": {"channel": "discord", "messagePrefix": "/helpdesk"}, "action": "route_to_shared_agent", "agentId": "agent-helpdesk", "description": "Anyone on Discord with /helpdesk → IT Help Desk shared agent"},
        {"id": "rule-03", "priority": 3, "name": "Finance Slack", "condition": {"channel": "slack", "role": "finance"}, "action": "route_to_personal_agent", "description": "Finance employees on Slack → their personal Finance agent"},
        {"id": "rule-04", "priority": 4, "name": "Sales WhatsApp", "condition": {"channel": "whatsapp", "department": "Sales"}, "action": "route_to_personal_agent", "description": "Sales employees on WhatsApp → their personal Sales agent"},
        {"id": "rule-05", "priority": 5, "name": "New Hire Onboarding", "condition": {"role": "intern"}, "action": "route_to_shared_agent", "agentId": "agent-onboarding", "description": "All interns → Onboarding Assistant shared agent"},
        {"id": "rule-06", "priority": 10, "name": "Default", "condition": {}, "action": "route_to_personal_agent", "description": "Default: route to employee's personal 1:1 agent"},
    ]
    for r in rules:
        items.append({"PK": ORG, "SK": f"RULE#{r['id']}", "GSI1PK": "TYPE#rule", "GSI1SK": f"RULE#{r['id']}", **r})

    # Session conversations (keyed by session ID)
    conversations = {
        "sess-001": [  # SA Agent - Zhang San
            {"role": "user", "content": "Review this architecture diagram for the new microservice", "ts": "10:18:23"},
            {"role": "assistant", "content": "I'll analyze the architecture diagram. Let me use Jina Reader to extract the details.", "ts": "10:18:25"},
            {"role": "tool", "content": "jina-reader: Extracted 3 components, 5 connections, 2 data stores", "ts": "10:18:28", "toolName": "jina-reader", "toolStatus": "success", "toolDuration": "2.3s"},
            {"role": "assistant", "content": "Based on the diagram:\n\n**Strengths:**\n- Good separation with API Gateway \u2192 Lambda \u2192 DynamoDB\n- Event-driven pattern with SQS\n\n**Concerns:**\n1. No failover on API Gateway\n2. Missing WAF\n3. Consider DynamoDB reserved capacity\n\nWant a cost estimate?", "ts": "10:18:35"},
            {"role": "user", "content": "Yes, estimate for 1000 req/s", "ts": "10:19:12"},
            {"role": "tool", "content": "cost-calculator: $847/mo (API GW $350, Lambda $210, DDB $180, SQS $45, Transfer $62)", "ts": "10:19:15", "toolName": "cost-calculator", "toolStatus": "success", "toolDuration": "1.8s"},
            {"role": "assistant", "content": "Cost breakdown for 1000 req/s:\n\n| Service | Monthly |\n|---------|--------|\n| API Gateway | $350 |\n| Lambda | $210 |\n| DynamoDB | $180 |\n| SQS | $45 |\n| Transfer | $62 |\n| **Total** | **$847** |\n\nOptimized: ~$506/mo (40% savings) with reserved capacity + Graviton + HTTP API.", "ts": "10:19:22"},
        ],
        "sess-002": [  # SDE Agent - Wang Wu
            {"role": "user", "content": "Help me debug this race condition in the connection pool", "ts": "10:05:10"},
            {"role": "assistant", "content": "Let me look at the connection pool code. Can you share the file path?", "ts": "10:05:12"},
            {"role": "user", "content": "src/db/pool.py \u2014 connections leak under high concurrency", "ts": "10:05:30"},
            {"role": "tool", "content": "file_read: src/db/pool.py (142 lines)", "ts": "10:05:32", "toolName": "file", "toolStatus": "success", "toolDuration": "0.5s"},
            {"role": "assistant", "content": "Found the issue on line 87. The acquire() method doesn't use a lock:\n\n```python\n# Bug: race condition\nif len(self._pool) < self._max_size:\n    conn = await self._create()\n```\n\nFix: wrap in `async with self._lock:` and add `finally` in `release()`.", "ts": "10:05:45"},
            {"role": "user", "content": "Good catch. Write a test for this?", "ts": "10:06:20"},
            {"role": "tool", "content": "code_execution: pytest test_pool_concurrency.py \u2014 5 passed", "ts": "10:06:35", "toolName": "code_execution", "toolStatus": "success", "toolDuration": "3.2s"},
            {"role": "assistant", "content": "Created tests/test_pool_concurrency.py with 5 tests covering concurrent acquire, pool exhaustion, release on error, leak detection, and timeout. All passing.", "ts": "10:06:42"},
            {"role": "tool", "content": "github-pr: Created PR #247 'Fix connection pool race condition'", "ts": "10:07:08", "toolName": "github-pr", "toolStatus": "success", "toolDuration": "2.1s"},
        ],
        "sess-003": [  # DevOps Agent - Sun Hao
            {"role": "user", "content": "Check the Terraform plan for the new VPC peering setup", "ts": "09:50:05"},
            {"role": "tool", "content": "shell: terraform plan -out=vpc-peering.tfplan (12 to add, 0 to change)", "ts": "09:50:18", "toolName": "shell", "toolStatus": "success", "toolDuration": "12.5s"},
            {"role": "assistant", "content": "Plan: 12 resources to add (2 peering connections, 4 routes, 4 SG rules, 2 accepters).\n\n**Issue:** CIDR overlap \u2014 prod (10.0.0.0/16) and dev (10.0.0.0/16) will fail. Change dev to 10.1.0.0/16.", "ts": "09:50:25"},
            {"role": "user", "content": "Update dev to 10.1.0.0/16 and re-plan", "ts": "09:51:00"},
            {"role": "tool", "content": "shell: terraform plan \u2014 14 to add, 2 to change, 0 to destroy", "ts": "09:51:20", "toolName": "shell", "toolStatus": "success", "toolDuration": "15.2s"},
            {"role": "assistant", "content": "Updated. New plan: 14 add, 2 change (dev VPC CIDR + route table). No conflicts. Ready to apply?", "ts": "09:51:25"},
        ],
        "sess-004": [  # PM Agent - Lin Xiaoyu
            {"role": "user", "content": "Help me synthesize last weeks user interview findings", "ts": "10:25:00"},
            {"role": "tool", "content": "deep-research: Analyzed 5 interview transcripts from S3", "ts": "10:25:08", "toolName": "deep-research", "toolStatus": "success", "toolDuration": "6.2s"},
            {"role": "assistant", "content": "Key themes from 5 interviews:\n\n1. **Onboarding friction** (4/5 mentioned) \u2014 new users struggle with first 10 minutes\n2. **Search quality** (3/5) \u2014 results not relevant for technical queries\n3. **Mobile experience** (3/5) \u2014 dashboard unusable on phone\n4. **Positive: speed** (5/5) \u2014 all praised response time\n\nRecommend prioritizing onboarding wizard for next sprint.", "ts": "10:25:18"},
        ],
        "sess-006": [  # Finance Agent - Carol
            {"role": "user", "content": "Generate the Q2 budget variance report for Engineering", "ts": "10:10:00"},
            {"role": "tool", "content": "excel-gen: Generated Q2_Engineering_Variance.xlsx (12 sheets)", "ts": "10:10:15", "toolName": "excel-gen", "toolStatus": "success", "toolDuration": "4.8s"},
            {"role": "assistant", "content": "Q2 Engineering Budget Variance:\n\n| Category | Budget | Actual | Variance |\n|----------|--------|--------|----------|\n| Compute | $45K | $52K | +15.6% |\n| Storage | $12K | $10K | -16.7% |\n| Network | $8K | $7.5K | -6.3% |\n| Licenses | $20K | $22K | +10.0% |\n| **Total** | **$85K** | **$91.5K** | **+7.6%** |\n\nCompute overspend driven by GPU instances for ML training.", "ts": "10:10:22"},
            {"role": "user", "content": "Break down the compute overspend by team", "ts": "10:11:00"},
            {"role": "assistant", "content": "Compute by team:\n- Platform: $18K (on budget)\n- Backend: $15K (+$3K \u2014 new staging env)\n- ML/AI: $12K (+$5K \u2014 training jobs)\n- Frontend: $7K (on budget)\n\nML team is the main driver. They ran 3 unscheduled training jobs last month.", "ts": "10:11:10"},
        ],
    }

    for session_id, msgs in conversations.items():
        for i, msg in enumerate(msgs):
            item = {"PK": ORG, "SK": f"CONV#{session_id}#{i:04d}", "sessionId": session_id, "seq": i, **msg}
            items.append(item)

    print(f"Writing {len(items)} items...")
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)
    print(f"Done! {len(rules)} routing rules + {sum(len(v) for v in conversations.values())} conversation messages seeded.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--table", default="openclaw-enterprise")
    parser.add_argument("--region", default="us-east-2")
    args = parser.parse_args()
    seed(args.table, args.region)
