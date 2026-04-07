# 架构审查回复 — 同事反馈的 3 个问题

> 内部文档，2026-04-03

---

## 前言

感谢你的深度分析，三个问题的定位都完全正确，说明你对系统理解很到位。

需要先说明一个背景：**你描述的三个问题针对的是 Fargate 路径**，这条路径目前是我们平台正在扩展的 **Always-On 路由选项**（用于支持高流量的共享 Agent，如 HR Bot、Help Desk 等），还在开发中，尚未全面上线，部分设计确实不完整。

**当前主线跑通的是 AgentCore Runtime 的 Serverless 版本**，特别是 IM 渠道扫码绑定、双向回写、以及 Tenant Router → AgentCore 的完整调用链。这条主线上，三个问题都已经有对应的实现和解决方案，下面逐一说明。

---

## 问题 1：回调路径根本性错误（致命 Bug）

### 你的分析

> 容器回调统一走 WebSocket API Gateway，用 `connectionId` 推消息。Portal 的 `connectionId` 是真实的，TG 的是伪造的 `"telegram:chatId"`，API GW 返回 410 Gone，消息丢失。

### 正确——Fargate 路径确实有这个问题

Fargate 路径目前的回调设计没有区分渠道，这是 always-on 扩展中待解决的问题，你的判断完全准确。

### 主线（AgentCore Serverless）的实现方式

主线路径从设计上就规避了这个问题，回调路径与 WebSocket API GW 完全无关：

```
IM 消息（TG / Feishu / Discord）
    ↓
OpenClaw Gateway（端口 18789）
    ↓ webhook 解析 sender_id、channel
H2 Proxy（端口 8091）
    ↓ 拦截 Bedrock 调用；检查 IM 绑定关系
Tenant Router（端口 8090）
    ↓ 解析 emp_id → 推导 session_id → 路由到 AgentCore Runtime
AgentCore Firecracker microVM
    ↓ HTTP 响应返回给 Tenant Router
Tenant Router 返回文本给 OpenClaw Gateway
    ↓
OpenClaw Gateway 按原始 channel 回写：
    ├── web/portal → WebSocket 推回浏览器
    ├── telegram   → Telegram Bot API sendMessage
    ├── feishu     → 飞书 sendMessage API
    └── discord    → Discord REST API
```

关键点：**容器本身不做任何回调**，它只是返回一个 HTTP response body。回写给用户的工作完全由 OpenClaw Gateway 承担，Gateway 天然知道消息来自哪个渠道（因为就是从那个渠道接收进来的），回写也走同一个渠道的官方 API。没有任何 fake connectionId 的问题。

### 建议

如果你要修 Fargate 路径的回调问题，正确设计参考上图：容器返回文本，由 Router 层负责按 `channel` 路由回写，不要让容器直接调 API GW。这样容器是 channel-agnostic 的，测试也更简单。

---

## 问题 2：身份体系混淆——Cognito ≠ 员工

### 你的分析

> `serverless-openclaw-users` Cognito User Pool 开放注册，任何人都能拿到 `cognitoUserId`，生成 OTP，绑定 TG 接入系统，与企业员工库完全没有核对。三层身份只打通了第一层。

### 正确——Fargate 路径 L2/L3 确实缺失

这个问题也完全准确，Fargate 路径的身份设计目前只有 Cognito JWT 这一层，没有员工库核对。

### 主线（AgentCore Serverless）的三层实现

主线的三层身份体系已经全部实现，且不依赖 Cognito：

| 层级 | 问题 | 实现方式 | 状态 |
|------|------|----------|------|
| **L1：登录认证** | 谁在操作 | Admin Console 自签 JWT，密钥存 SSM SecureString；JWT payload 包含 `emp_id`、`role`、`departmentId` | ✅ 已实现 |
| **L2：员工身份** | 是不是公司员工 | DynamoDB `EMP#` 表是员工的唯一 Source of Truth；JWT 只有管理员通过 Admin Console 在 DynamoDB 建了员工记录才能发放，自注册不存在 | ✅ 已实现 |
| **L3：Agent 身份** | 用哪个 Agent、哪个模板 | session 启动时 `workspace_assembler.py` 从 DynamoDB 读取 `EMP#{emp_id}` → `POS#{pos_id}` → 三层 SOUL 合并注入；每个员工加载自己的 workspace，完全隔离 | ✅ 已实现 |

**IM 渠道的绑定验证（你提到的 OTP 绑定路径）：**

主线不用 OTP + Cognito 的方式。员工绑定 IM 渠道的流程是：

```
1. 员工登录 Portal（需要 emp_id + ADMIN_PASSWORD）
2. Portal → Connect IM → 选择渠道 → 生成一次性 TOKEN（存 DynamoDB，15 分钟有效）
3. 员工用手机扫码，打开对应 IM bot
4. Bot 自动发 /start TOKEN 给 H2 Proxy
5. H2 Proxy 调 /pair-pending：验证 TOKEN 有效性 + 查重（防止一个 IM 账号绑多人）
6. 员工在 IM 中确认（回复 BIND）
7. H2 Proxy 调 /pair-complete：写 DynamoDB MAPPING#{channel}__{channelUserId} → emp_id
8. 之后每条 IM 消息，H2 Proxy 都查 DynamoDB，未绑定账号 → 直接拒绝，不响应
```

这个流程里，Cognito 完全不参与，身份的 Source of Truth 是 DynamoDB 员工表，不是 Cognito User Pool。

---

## 问题 3：多渠道并发请求同一容器会冲突

### 你的分析

> 员工同时在 Portal 聊天 + TG 发消息，两个请求路由到同一 Fargate 容器，导致：Session 上下文混乱、回复投递目标不确定、S3/Memory 文件写入竞争。

### 正确——Fargate 路径的并发设计确实有缺陷

这三个并发问题在 Fargate 路径中都是真实存在的，你的分析非常准确。

### 主线（AgentCore Serverless）的解决方式

主线通过以下设计天然规避了这三个问题：

**① Session Context 混乱 → employee-scoped session_id**

所有渠道（Portal、TG、Feishu、Discord）来的消息，Tenant Router 都将其解析为同一个员工的同一个 session：

```python
# tenant_router.py
resolved_emp_id = _resolve_emp_id(user_id, channel)  # MAPPING# 查 DynamoDB
tenant_id = derive_tenant_id("emp", resolved_emp_id)
# → "emp__emp-jiade__abc123456789"  ← 所有渠道同一个值
```

AgentCore 用 `runtimeSessionId` 来维护 session，同一个 `tenant_id` 就是同一个 Firecracker microVM 实例。这个 microVM 内部是**单线程的**，不存在两个请求同时进入同一 session 的情况——第二个请求会排队等第一个完成后才能进入。

**② 回复投递不确定 → reply handle 随 request 上下文传递，不读 session state**

每个请求的回复渠道在进入 Tenant Router 时就已经确定，并跟随整个调用链：

```
TG 消息进入 → channel="telegram", user_id="5094057706"
                ↓ Tenant Router 记录 channel + user_id
AgentCore 返回文本
                ↓ Tenant Router 返回给 Gateway
Gateway 知道这条消息来自 telegram → 调 TG Bot API 回写
```

容器返回的只是纯文本，完全不需要知道要回给谁。"回给谁"的信息从 request 入口就已确定，不依赖 session 里的任何状态，所以不存在"Portal 消息的 reply 被路由到 TG"的问题。

**③ S3/Memory 写入竞争 → AgentCore 单线程 + per-turn S3 checkpoint**

- AgentCore Firecracker 每个 session 单线程处理，物理上不会有两个消息并发写 memory
- OpenClaw Gateway 在每个 turn 结束后立即做 per-turn S3 checkpoint
- workspace_assembler 在 session 冷启动时读取最新 S3 快照
- 跨 session 的 memory 一致性由 S3 版本控制保证（写入幂等，最后写入胜出）

此外，我们还通过 session_id 前缀（`emp__`、`pgnd__`、`twin__`）来区分访问路径（`SESSION_CONTEXT.md`），让 Agent 在启动时就知道自己是"员工正式会话"还是"Playground 测试"还是"Digital Twin 外部访问"。

---

## 关于 Fargate Always-On 路径

你分析的三个问题，针对的都是 Fargate 路径，这很有价值。再说明一下我们的整体规划：

- **主线（AgentCore Serverless）**：目前完整跑通，IM 扫码绑定、回写逻辑、SOUL 注入全部验证通过。这是我们对外演示和部署的主要版本。

- **Fargate Always-On 路径**：是我计划在这几天内更新的扩展选项，专门用于高频共享 Agent（HR Bot、IT Help Desk 等），不需要 AgentCore 冷启动的场景。这条路径目前三个问题都存在，确实需要修复。

---

## 请求：请再跑一遍主线验证

为了确认主线（AgentCore Serverless）的三个问题都已解决，建议你按以下步骤重新验证：

**1. IM 渠道绑定验证（问题 2 的核心路径）**
```
登录 Portal → Connect IM → 选择 Telegram → 扫码
→ 手机 Telegram 打开 bot → 自动发 /start TOKEN
→ Portal 页面变为 "Connected" → 验证通过
```

**2. IM 消息回写验证（问题 1 的核心路径）**
```
在 Telegram 给 bot 发消息 → 等待回复
→ 如果收到 Agent 回复（不是 410 Gone），验证通过
→ 同时在 Portal Chat 发同一个问题，对比两个渠道的回复内容
```

**3. 并发消息验证（问题 3 的核心路径）**
```
Portal 发一条长问题（"帮我分析一下..."）
→ 同时立刻在 Telegram 发另一条消息
→ 检查两条回复是否各自正确回到各自渠道（不交叉）
→ 检查 S3 workspace 的 memory 文件是否正常（无损坏/截断）
```

**验证地址：** https://openclaw.awspsa.com
**测试账号：** 联系 wjiad@aws 获取

---

## 对你的建议

你的架构分析和问题定位完全正确，建议你：

1. **开一个独立分支来修复 Fargate 路径的这四个问题**（3 个你提的 + 回调设计合并为 4 个改造点）。主线不会受影响，两条路径可以独立演进。

2. 修复优先级建议：
   - **优先级 1**：问题 2（身份安全漏洞，关闭 Cognito 开放注册，加员工库 L2 校验）——安全问题，必须先解
   - **优先级 2**：问题 1（Fargate 回调路径，按 channel 路由）——功能性致命 bug
   - **优先级 3**：问题 3（并发序列化，SQS FIFO per employee）——稳定性问题

3. 修完后可以参考主线（`enterprise/gateway/tenant_router.py`、`enterprise/gateway/bedrock_proxy_h2.js`、`enterprise/admin-console/server/main.py`）的实现，几个核心设计是通用的——特别是 employee-scoped session_id 的推导逻辑和 IM 绑定的双重校验，可以直接复用。

期待你的分支，欢迎 PR！
