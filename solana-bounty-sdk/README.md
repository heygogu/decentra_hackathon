# 🎯 Solana Bounty SDK

A powerful, extensible TypeScript SDK for managing blockchain-based bounties on GitHub with Solana escrows. Built with Borsh serialization for optimal performance and type safety.

[![npm version](https://img.shields.io/npm/v/solana-bounty-sdk.svg)](https://www.npmjs.com/package/solana-bounty-sdk)
[![npm downloads](https://img.shields.io/npm/dm/solana-bounty-sdk.svg)](https://www.npmjs.com/package/solana-bounty-sdk)

## ✨ Features

- 🔐 **Secure by Default**: 5-layer security validation for all bounty claims
- 🔌 **Pluggable Architecture**: Easily extend with custom providers
- 🌐 **Multi-Platform**: Works with GitHub (GitLab, Bitbucket extensible)
- ⛓️ **Blockchain Powered**: Trustless Solana escrows using PDAs
- 📢 **Flexible Notifications**: Discord, Slack, or custom providers
- 💪 **Type-Safe**: Full TypeScript with comprehensive type definitions
- 🚀 **Production Ready**: Built with Borsh serialization for optimal performance
- 🎨 **Framework Agnostic**: Works with Express, Fastify, or any Node.js framework

## 📦 Installation

```bash
npm install solana-bounty-sdk
```

### Peer Dependencies

```bash
npm install @solana/web3.js axios borsh
```

## 🚀 Quick Start

### Basic Express Server

```typescript
import express from "express";
import {
  BountyManager,
  GitHubProvider,
  SolanaProvider,
  DiscordProvider,
} from "solana-bounty-sdk";

const app = express();

// Capture raw body for webhook verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Initialize the Bounty Manager
const bountyManager = new BountyManager({
  issueProvider: new GitHubProvider({
    token: process.env.GITHUB_TOKEN!,
  }),
  paymentProvider: new SolanaProvider({
    keypairJson: process.env.SOLANA_KEYPAIR!,
    programId: process.env.PROGRAM_ID!,
    network: "devnet",
  }),
  notificationProviders: [
    new DiscordProvider({
      webhookUrl: process.env.DISCORD_WEBHOOK_URL!,
    }),
  ],
  bountyConfig: {
    "bounty-1-sol": 1_000_000_000, // 1 SOL
    "bounty-2-sol": 2_000_000_000, // 2 SOL
    "bounty-3-sol": 3_000_000_000, // 3 SOL
  },
});

// Webhook endpoint
app.post("/webhook/github", async (req, res) => {
  try {
    await bountyManager.handleWebhook(
      req.body,
      req.headers["x-hub-signature-256"] as string,
      req.rawBody,
      process.env.GITHUB_WEBHOOK_SECRET!
    );
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3000, () => {
  console.log("Bounty bot running on port 3000");
});
```

## 📚 Core Concepts

### Provider Pattern

The SDK uses three main provider types:

1. **Issue Provider** - Integrates with issue trackers (GitHub, GitLab, etc.)
2. **Payment Provider** - Handles blockchain transactions (Solana, etc.)
3. **Notification Provider** - Sends notifications (Discord, Slack, etc.)

### Security Validation

Five comprehensive security checks before releasing bounties:

1. ✅ Verify PR is merged
2. ✅ Verify claimer is the PR author
3. ✅ Find linked issue with active bounty
4. ✅ Verify user was assigned to the issue
5. ✅ Verify bounty hasn't been claimed already

### Borsh Serialization

The SDK uses [Borsh](https://borsh.io/) for efficient, deterministic serialization that matches your Rust Solana program exactly.

```typescript
// Automatically serialized with Borsh
const instruction = new CreateEscrowInstruction({
  repo_hash: Array.from(repoHash),
  issue_number: BigInt(issueNumber),
  amount: BigInt(amount),
});
```

## 🔧 Configuration

### BountyManager Options

```typescript
interface BountyManagerConfig {
  issueProvider: IIssueProvider;
  paymentProvider: IPaymentProvider;
  notificationProviders?: INotificationProvider[];
  bountyConfig?: BountyConfig;
  securityConfig?: SecurityConfig;
}
```

### Security Configuration

```typescript
interface SecurityConfig {
  skipAssignmentCheck?: boolean; // Default: false
  requireMergedPR?: boolean; // Default: true
  requireMaintainerForBountyCreation?: boolean; // Default: true
}
```

Example:

```typescript
const bountyManager = new BountyManager({
  // ... providers
  securityConfig: {
    skipAssignmentCheck: false,
    requireMergedPR: true,
    requireMaintainerForBountyCreation: true,
  },
});
```

### Custom Bounty Amounts

```typescript
const bountyManager = new BountyManager({
  // ... providers
  bountyConfig: {
    "bounty-small": 500_000_000, // 0.5 SOL
    "bounty-medium": 1_000_000_000, // 1 SOL
    "bounty-large": 5_000_000_000, // 5 SOL
    "bounty-critical": 10_000_000_000, // 10 SOL
  },
});
```

## 🔌 Creating Custom Providers

### Custom Issue Provider (GitLab Example)

```typescript
import {
  IIssueProvider,
  Issue,
  PullRequest,
  LinkedIssue,
  BountyConfig,
} from "solana-bounty-sdk";

export class GitLabProvider implements IIssueProvider {
  constructor(private config: { token: string; baseUrl: string }) {}

  verifyWebhook(rawBody: Buffer, signature: string, secret: string): boolean {
    // Implement GitLab webhook verification
    return true;
  }

  async postComment(
    repo: string,
    issueNumber: number,
    comment: string
  ): Promise<void> {
    // Implement GitLab API comment posting
  }

  async assignIssue(
    repo: string,
    issueNumber: number,
    username: string
  ): Promise<void> {
    // Implement GitLab API issue assignment
  }

  async getPullRequest(repo: string, prNumber: number): Promise<PullRequest> {
    // Implement GitLab merge request fetching
    return {
      number: prNumber,
      state: "merged",
      merged: true,
      user: { login: "username" },
    };
  }

  // Implement remaining interface methods...
}
```

import { IPaymentProvider, TransactionResult } from "solana-bounty-sdk";
import { PublicKey } from "@solana/web3.js";

async escrowExists(issueNumber: number, repoHash: Buffer): Promise<boolean> {
return false;
}

getRepositoryHash(repoName: string): Buffer {
return Buffer.from(repoName);
}

````

### Custom Notification Provider (Slack Example)

```typescript
import { INotificationProvider, NotificationData } from "solana-bounty-sdk";

export class SlackProvider implements INotificationProvider {
  constructor(private webhookUrl: string) {}

  async notify(data: NotificationData): Promise<void> {
    const message = this.formatMessage(data);

    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
  }

  getName(): string {
    return "Slack";
  }

  private formatMessage(data: NotificationData) {
    return {
      text: `Bounty ${data.eventType} for ${data.repository}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${data.eventType}* in ${data.repository}`,
          },
        },
      ],
    };
  }
}
````

## 📖 Usage Examples

### Example 1: Multiple Notification Providers

```typescript
const manager = new BountyManager({
  issueProvider: new GitHubProvider({ token: process.env.GITHUB_TOKEN! }),
  paymentProvider: new SolanaProvider({
    keypairJson: process.env.SOLANA_KEYPAIR!,
    programId: process.env.PROGRAM_ID!,
    network: "mainnet-beta",
  }),
  notificationProviders: [
    new DiscordProvider({ webhookUrl: process.env.DISCORD_WEBHOOK_URL! }),
    new SlackProvider({ webhookUrl: process.env.SLACK_WEBHOOK_URL! }),
    new EmailProvider({ apiKey: process.env.SENDGRID_API_KEY! }),
  ],
});
```

### Example 2: Custom Security Configuration

```typescript
const manager = new BountyManager({
  // ... providers
  securityConfig: {
    skipAssignmentCheck: true, // Allow anyone to claim
    requireMergedPR: true,
    requireMaintainerForBountyCreation: false, // Anyone can create bounties
  },
});
```

### Example 3: Using Utility Functions

```typescript
import {
  lamportsToSol,
  solToLamports,
  extractIssueNumbers,
} from "solana-bounty-sdk";

// Convert lamports to SOL
const sol = lamportsToSol(1_000_000_000); // 1.0

// Convert SOL to lamports
const lamports = solToLamports(1.5); // 1_500_000_000

// Extract issue numbers from text
const text = "This PR fixes #123 and closes #456";
const issues = extractIssueNumbers(text); // [123, 456]
```

### Example 4: Using with Fastify

```typescript
import Fastify from "fastify";
import {
  BountyManager,
  GitHubProvider,
  SolanaProvider,
} from "solana-bounty-sdk";

const fastify = Fastify();

const bountyManager = new BountyManager({
  issueProvider: new GitHubProvider({ token: process.env.GITHUB_TOKEN! }),
  paymentProvider: new SolanaProvider({
    keypairJson: process.env.SOLANA_KEYPAIR!,
    programId: process.env.PROGRAM_ID!,
    network: "devnet",
  }),
});

fastify.addContentTypeParser(
  "application/json",
  { parseAs: "buffer" },
  (req, body, done) => {
    req.rawBody = body;
    done(null, JSON.parse(body.toString()));
  }
);

fastify.post("/webhook", async (request, reply) => {
  await bountyManager.handleWebhook(
    request.body,
    request.headers["x-hub-signature-256"],
    request.rawBody,
    process.env.GITHUB_WEBHOOK_SECRET!
  );
  reply.send("OK");
});

fastify.listen({ port: 3000 });
```

## 🔒 Security Best Practices

1. **Always verify webhooks**: The SDK does this automatically
2. **Use environment variables**: Never hardcode secrets
3. **Enable all security checks**: Only disable if you understand the implications
4. **Monitor transactions**: Set up alerts for bounty claims
5. **Use separate keypairs**: Don't use your main wallet for bounties
6. **Test on devnet first**: Always test before going to mainnet

## 🎮 Bot Commands

### For Contributors

- `/assign` - Assign yourself to an issue (comment on the issue)
- `/claim <wallet_address>` - Claim a bounty (comment on the merged PR)

### For Maintainers

Add labels to issues to create bounties:

- `bounty-1-sol` - Creates a 1 SOL bounty
- `bounty-2-sol` - Creates a 2 SOL bounty
- Custom labels based on your `bountyConfig`

## 🔍 API Documentation

### BountyManager

```typescript
class BountyManager {
  constructor(config: BountyManagerConfig);

  async handleWebhook(
    payload: WebhookPayload,
    signature: string,
    rawBody: Buffer,
    secret: string
  ): Promise<void>;
}
```

### IIssueProvider

```typescript
interface IIssueProvider {
  verifyWebhook(rawBody: Buffer, signature: string, secret: string): boolean;
  postComment(repository: string, issueNumber: number, comment: string): Promise<void>;
  assignIssue(repository: string, issueNumber: number, username: string): Promise<void>;
  getPullRequest(repository: string, prNumber: number): Promise<PullRequest>;
  findLinkedIssueWithBounty(...): Promise<LinkedIssue | null>;
  wasUserEverAssigned(...): Promise<boolean>;
  isBountyAlreadyClaimed(...): Promise<boolean>;
  checkIsMaintainer(repository: string, username: string): Promise<boolean>;
  getIssue(repository: string, issueNumber: number): Promise<Issue>;
}
```

### IPaymentProvider

```typescript
interface IPaymentProvider {
  createEscrow(
    issueNumber: number,
    repoHash: Buffer,
    amount: number
  ): Promise<TransactionResult>;
  releaseEscrow(
    issueNumber: number,
    repoHash: Buffer,
    recipient: PublicKey
  ): Promise<TransactionResult>;
  escrowExists(issueNumber: number, repoHash: Buffer): Promise<boolean>;
  getRepositoryHash(repoName: string): Buffer;
  parseWalletAddress(address: string): PublicKey;
}
```

### INotificationProvider

```typescript
interface INotificationProvider {
  notify(data: NotificationData): Promise<void>;
  getName(): string;
}
```

## 🐛 Error Handling

```typescript
app.post("/webhook", async (req, res) => {
  try {
    await bountyManager.handleWebhook(
      req.body,
      req.headers["x-hub-signature-256"] as string,
      req.rawBody,
      process.env.GITHUB_WEBHOOK_SECRET!
    );
    res.status(200).send("OK");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Invalid webhook signature")) {
        return res.status(401).send("Unauthorized");
      }
      console.error("Webhook processing error:", error.message);
    }
    res.status(500).send("Internal Server Error");
  }
});
```

## 📝 Environment Variables

Required environment variables:

```bash
# GitHub
GITHUB_TOKEN=ghp_xxx
GITHUB_WEBHOOK_SECRET=your_secret

# Solana
SOLANA_KEYPAIR=[1,2,3,...]  # JSON array of keypair bytes
PROGRAM_ID=YourProgramId

# Discord (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint
npm run lint

# Format
npm run format
```

## 📄 License

MIT © [Your Name]

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- Built with [@solana/web3.js](https://github.com/solana-labs/solana-web3.js)
- Serialization with [Borsh](https://borsh.io/)
- Inspired by the open-source community

## 📞 Support

- 📧 Email: support@yourdomain.com
- 💬 Discord: [Join our server](https://discord.gg/yourserver)
- 🐛 Issues: [GitHub Issues](https://github.com/heygogu/solana-bounty-sdk/issues)

## 🗺️ Roadmap

- [ ] GitLab provider implementation
- [ ] Bitbucket provider implementation
- [ ] Email notification provider
- [ ] Web dashboard for bounty management
- [ ] Advanced analytics and reporting
- [ ] Multi-sig wallet support
- [ ] Automatic bounty amount suggestions

---

Made with ❤️ by the Solana Bounty SDK team
