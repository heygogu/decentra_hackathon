import express, { Request, Response, NextFunction } from "express";
import {
  BountyManager,
  GitHubProvider,
  SolanaProvider,
  DiscordProvider,
} from "solana-bounty-sdk";
import { config } from "./config/environment";
import webhookRoutes from "./routes/webhook";
import { SlackProvider } from "./custom-providers/slack";

const app = express();

app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

console.log("Initializing Bounty Manager...");

const githubProvider = new GitHubProvider({
  token: config.GITHUB_TOKEN,
});

const solanaProvider = new SolanaProvider({
  keypairJson: config.SOLANA_KEYPAIR,
  programId: config.PROGRAM_ID,
  network: config.SOLANA_NETWORK,
});

const notificationProviders = [];

if (config.DISCORD_WEBHOOK_URL) {
  notificationProviders.push(
    new DiscordProvider({
      webhookUrl: config.DISCORD_WEBHOOK_URL,
    }),
    new SlackProvider(config.SLACK_WEBHOOK_URL!)
  );
  console.log("Discord notifications enabled");
}

if (config.SLACK_WEBHOOK_URL) {
  console.log("Slack notifications configured (provider needed)");
}

const bountyManager = new BountyManager({
  issueProvider: githubProvider,
  paymentProvider: solanaProvider,
  notificationProviders,
  bountyConfig: {
    bounty5SOL: 5_000_000_000,
    bounty1SOL: 1_000_000_000,
    bounty2SOL: 2_000_000_000,
    bounty3SOL: 3_000_000_000,
    bounty4SOL: 4_000_000_000,
  },
  securityConfig: {
    skipAssignmentCheck: config.SKIP_ASSIGNMENT_CHECK,
    requireMergedPR: config.REQUIRE_MERGED_PR,
    requireMaintainerForBountyCreation:
      config.REQUIRE_MAINTAINER_FOR_BOUNTY_CREATION,
  },
});

console.log("Bounty Manager initialized");

app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.bountyManager = bountyManager;
  next();
});

app.use("/github", webhookRoutes);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    name: "Solana Bounty Bot",
    version: "1.0.0",
    status: "running",
    endpoints: {
      webhook: "/github/webhook",
      health: "/github/health",
      config: "/github/config",
    },
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error: Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: config.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.listen(config.PORT, () => {
  console.log("\n Bounty Bot Server Started!");
  console.log(`Port: ${config.PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(` Network: ${config.SOLANA_NETWORK}`);
  console.log(` Program ID: ${config.PROGRAM_ID}`);
  console.log(
    `\nWebhook endpoint: http://localhost:${config.PORT}/webhook/github`
  );
  console.log(` Health check: http://localhost:${config.PORT}/webhook/health`);
  console.log(`\n✨ Ready to process bounties!\n`);
});

process.on("SIGTERM", () => {
  console.log(" SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received, shutting down gracefully...");
  process.exit(0);
});

export default app;
