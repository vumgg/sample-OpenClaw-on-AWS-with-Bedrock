#!/bin/bash
set -ex

# Install dependencies
yum install -y python3.12 python3.12-pip git nodejs npm
pip3.12 install fastapi uvicorn boto3

# Clone repo
cd /home/ec2-user
git clone https://github.com/jiade-dev/sample-openclaw-on-AWS-with-Bedrock.git app
cd app/enterprise/admin-console

# Build frontend
npm install
npx vite build

# Seed data (DynamoDB in us-east-2, S3 is global)
cd server
AWS_REGION=us-east-2 python3.12 seed_dynamodb.py --region us-east-2
AWS_REGION=us-east-2 python3.12 seed_skills.py
AWS_REGION=us-east-2 python3.12 seed_audit_approvals.py --region us-east-2
AWS_REGION=us-east-2 python3.12 seed_settings.py --region us-east-2
AWS_REGION=us-east-2 python3.12 seed_knowledge.py --region us-east-2
AWS_REGION=us-east-2 python3.12 seed_ssm_tenants.py --region us-east-2 --stack openclaw-prod

# Start the server
cat > /etc/systemd/system/openclaw-admin.service << 'SVCEOF'
[Unit]
Description=OpenClaw Admin Console
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/app/enterprise/admin-console/server
Environment=AWS_REGION=us-east-2
Environment=CONSOLE_PORT=8099
ExecStart=/usr/bin/python3.12 main.py
Restart=always

[Install]
WantedBy=multi-user.target
SVCEOF

chown -R ec2-user:ec2-user /home/ec2-user/app
systemctl daemon-reload
systemctl enable openclaw-admin
systemctl start openclaw-admin
