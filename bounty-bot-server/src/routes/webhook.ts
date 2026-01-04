import { Router, Request, Response } from "express";
import { BountyManager } from "solana-bounty-sdk";
import { config } from "../config/environment";

const router = Router();

router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-hub-signature-256"] as string;

    if (!req.rawBody) {
      console.error("Error: Raw body not available for signature verification");
      return res.status(400).json({ error: "Bad Request: Raw body missing" });
    }

    if (!signature) {
      console.error("Error: Webhook signature missing");
      return res.status(401).json({ error: "Unauthorized: Signature missing" });
    }

    const bountyManager: BountyManager = res.locals.bountyManager;

    await bountyManager.handleWebhook(
      req.body,
      signature,
      req.rawBody,
      config.GITHUB_WEBHOOK_SECRET
    );

    console.log("✅ Webhook processed successfully");
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error: Webhook processing error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Invalid webhook signature")) {
        return res
          .status(401)
          .json({ error: "Unauthorized: Invalid signature" });
      }

      if (error.message.includes("Missing required fields")) {
        return res.status(400).json({ error: "Bad Request: Invalid payload" });
      }

      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get("/config", (req: Request, res: Response) => {
  res.status(200).json({
    network: config.SOLANA_NETWORK,
    programId: config.PROGRAM_ID,
    hasDiscord: !!config.DISCORD_WEBHOOK_URL,
    hasSlack: !!config.SLACK_WEBHOOK_URL,
    security: {
      skipAssignmentCheck: config.SKIP_ASSIGNMENT_CHECK,
      requireMergedPR: config.REQUIRE_MERGED_PR,
      requireMaintainerForBountyCreation:
        config.REQUIRE_MAINTAINER_FOR_BOUNTY_CREATION,
    },
  });
});

export default router;
