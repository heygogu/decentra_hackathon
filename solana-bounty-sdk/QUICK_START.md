# 🚀 Quick Start Guide

Get your Solana Bounty SDK up and running in 5 minutes!

## 📦 Installation

```bash
# Create new project
mkdir my-bounty-bot
cd my-bounty-bot
npm init -y

# Install SDK and dependencies
npm install solana-bounty-sdk @solana/web3.js axios borsh dotenv

# Install dev dependencies
npm install -D typescript @types/node @types/express
npx tsc --init
```

## 📝 Create `.env` File

```env
GITHUB_TOKEN=ghp_your_github_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret
SOLANA_KEYPAIR=[1,2,3,...your_keypair_array]
PROGRAM_ID=YourDeployedProgramId
PORT=3000
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Get Your Keypair Array

```bash
cat ~/.config/solana/id.json
# Copy the array and paste into SOLANA_KEYPAIR
```

## 💻 Create `index.ts`

```typescript
import express from "express";
import dotenv from "dotenv";
import {
  BountyManager,
  GitHubProvider,
  SolanaProvider,
  DiscordProvider,
} from "solana-bounty-sdk";

dotenv.config();

const app = express();

// IMPORTANT: Store raw body for webhook verification
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Initialize Bounty Manager
const bountyManager = new BountyManager({
  issueProvider: new GitHubProvider({
    token: process.env.GITHUB_TOKEN!,
  }),
  paymentProvider: new SolanaProvider({
    keypairJson: process.env.SOLANA_KEYPAIR!,
    programId: process.env.PROGRAM_ID!,
    network: "devnet", // or 'mainnet-beta'
  }),
  notificationProviders: [
    new DiscordProvider({
      webhookUrl: process.env.DISCORD_WEBHOOK_URL!,
    }),
  ],
  bountyConfig: {
    "bounty-1-sol": 1_000_000_000,
    "bounty-2-sol": 2_000_000_000,
    "bounty-3-sol": 3_000_000_000,
  },
});

// Webhook endpoint
app.post("/webhook/github", async (req: any, res) => {
  try {
    await bountyManager.handleWebhook(
      req.body,
      req.headers["x-hub-signature-256"],
      req.rawBody,
      process.env.GITHUB_WEBHOOK_SECRET!
    );
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Error");
  }
});

app.listen(3000, () => {
  console.log("Bounty bot running on http://localhost:3000");
});
```

## 🚀 Run Your Bot

```bash
npx ts-node index.ts
```

You should see:

```
Bounty bot running on http://localhost:3000
```

## 🌐 Expose with ngrok (for GitHub webhooks)

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

## ⚙️ Configure GitHub Webhook

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Webhooks** → **Add webhook**
3. Configure:
   - **Payload URL**: `https://abc123.ngrok.io/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: Your `GITHUB_WEBHOOK_SECRET`
   - **Events**: Select "Issues" and "Issue comments"
4. Click **Add webhook**

## ✅ Test Your Setup

### Test 1: Create a Bounty

1. Open any issue in your repository
2. Add label `bounty-1-sol`
3. Check:
   - ✅ Bot comments on the issue
   - ✅ Solana transaction link appears
   - ✅ Discord notification (if configured)
   - ✅ Console shows escrow creation

### Test 2: Assign to Issue

1. Comment `/assign` on the issue
2. Check:
   - ✅ You're assigned to the issue
   - ✅ Bot confirms assignment

### Test 3: Claim Bounty

1. Create a PR that fixes the issue
   - Include "Fixes #123" in PR description
2. Get PR merged
3. Comment `/claim <your_solana_wallet>` on the **merged PR**
4. Check:
   - ✅ SOL arrives in your wallet
   - ✅ Transaction appears on Solana Explorer
   - ✅ Bot comments on PR and issue
   - ✅ Discord notification

## 🎨 Customize Bounty Amounts

Edit `bountyConfig` in your code:

```typescript
bountyConfig: {
  'bounty-small': 500_000_000,      // 0.5 SOL
  'bounty-medium': 1_000_000_000,   // 1 SOL
  'bounty-large': 5_000_000_000,    // 5 SOL
  'bounty-critical': 10_000_000_000, // 10 SOL
}
```

Then create GitHub labels with these names!

## 🔐 Security Settings

Adjust security checks:

```typescript
securityConfig: {
  skipAssignmentCheck: false,              // Require /assign
  requireMergedPR: true,                   // Require merged PR
  requireMaintainerForBountyCreation: true, // Only maintainers create bounties
}
```

## 📊 Add More Providers

### Add Slack Notifications

```typescript
import { SlackProvider } from "./custom-slack-provider";

const bountyManager = new BountyManager({
  // ... other config
  notificationProviders: [
    new DiscordProvider({ webhookUrl: process.env.DISCORD_WEBHOOK_URL! }),
    new SlackProvider({ webhookUrl: process.env.SLACK_WEBHOOK_URL! }),
  ],
});
```

## 🐛 Troubleshooting

### Issue: "Invalid webhook signature"

- ✅ Check `GITHUB_WEBHOOK_SECRET` matches GitHub
- ✅ Ensure raw body is captured (see `express.json` verify)

### Issue: "Escrow already exists"

- ✅ Bounty already created for this issue
- ✅ Check Solana Explorer for existing escrow

### Issue: "Invalid Solana wallet address"

- ✅ Wallet address must be valid Base58 Solana address
- ✅ Example: `7xP...abc`

### Issue: "No bounty found"

- ✅ PR must include "Fixes #123" in description
- ✅ Issue must have a bounty label
- ✅ Check bountyConfig has the label

### Issue: Bot not responding

- ✅ Check ngrok is running
- ✅ Check GitHub webhook is configured correctly
- ✅ Check console for errors
- ✅ Verify GitHub webhook deliveries in Settings

## 📚 Next Steps

- ✅ Read the [full README](./README.md)
- ✅ Check [setup guide](./SETUP_GUIDE.md) for publishing
- ✅ Explore [examples](./examples/) directory
- ✅ Create custom providers
- ✅ Deploy to production (Heroku, Railway, etc.)

## 🎉 You're Ready!

Your bounty bot is now live and ready to incentivize contributors!

**Commands:**

- Maintainers: Add `bounty-X-sol` labels to issues
- Contributors: Comment `/assign` to claim issues
- Contributors: Comment `/claim <wallet>` on merged PRs to get paid

Happy bounty hunting! 🚀
