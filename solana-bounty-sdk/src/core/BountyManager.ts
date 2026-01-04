import {
  BountyManagerConfig,
  WebhookPayload,
  BountyConfig,
  SecurityConfig,
  IIssueProvider,
  IPaymentProvider,
  INotificationProvider,
  NotificationData,
} from "./types";
import { SecurityValidator } from "./SecurityValidator";
import { lamportsToSol } from "../utils/helpers";

/**
 * Core bounty management class that orchestrates all providers
 */
export class BountyManager {
  private issueProvider: IIssueProvider;
  private paymentProvider: IPaymentProvider;
  private notificationProviders: INotificationProvider[];
  private bountyConfig: BountyConfig;
  private securityValidator: SecurityValidator;
  private securityConfig: SecurityConfig;

  constructor(config: BountyManagerConfig) {
    this.issueProvider = config.issueProvider;
    this.paymentProvider = config.paymentProvider;
    this.notificationProviders = config.notificationProviders || [];
    this.bountyConfig = config.bountyConfig || this.getDefaultBountyConfig();
    this.securityConfig = config.securityConfig || {};
    this.securityValidator = new SecurityValidator(
      this.issueProvider,
      this.securityConfig
    );
  }

  /**
   * Handle incoming webhook from issue tracker
   */
  async handleWebhook(
    payload: WebhookPayload,
    signature: string,
    rawBody: Buffer,
    secret: string
  ): Promise<void> {
    // Verify webhook signature
    const isValid = this.issueProvider.verifyWebhook(
      rawBody,
      signature,
      secret
    );
    if (!isValid) {
      throw new Error("Invalid webhook signature");
    }

    const action = payload.action;

    if (action === "labeled") {
      await this.handleLabeled(payload);
    } else if (action === "created" && payload.comment) {
      await this.handleComment(payload);
    }
  }

  /**
   * Handle label added to issue (bounty creation)
   */
  private async handleLabeled(payload: WebhookPayload): Promise<void> {
    const issueNumber = payload.issue?.number;
    const repo = payload.repository?.full_name;
    const label = payload.label?.name;
    const sender = payload.sender?.login;

    if (!issueNumber || !repo || !label || !sender) {
      throw new Error("Missing required fields in labeled event");
    }

    console.log(`Label "${label}" added to issue #${issueNumber} by ${sender}`);

    // Check if sender is maintainer
    if (this.securityConfig.requireMaintainerForBountyCreation !== false) {
      const isMaintainer = await this.issueProvider.checkIsMaintainer(
        repo,
        sender
      );
      if (!isMaintainer) {
        await this.issueProvider.postComment(
          repo,
          issueNumber,
          "Only repository maintainers can create bounties."
        );
        return;
      }
    }

    // Get bounty amount from label
    const amount = this.getBountyAmount(label);
    if (!amount) {
      console.log(`Label "${label}" is not a bounty label, ignoring`);
      return;
    }

    console.log(
      `Creating ${lamportsToSol(amount)} SOL bounty for issue #${issueNumber}`
    );

    // Create escrow
    try {
      const repoHash = this.paymentProvider.getRepositoryHash(repo);
      const tx = await this.paymentProvider.createEscrow(
        issueNumber,
        repoHash,
        amount
      );

      await this.issueProvider.postComment(
        repo,
        issueNumber,
        `**Bounty escrow created**\n\n` +
          `Amount: ${lamportsToSol(amount)} SOL\n` +
          `Transaction: ${tx.explorerUrl}\n\n` +
          `To claim this bounty:\n` +
          `1. Get assigned to this issue with \`/assign\`\n` +
          `2. Create a PR that fixes this issue (include "Fixes #${issueNumber}" in the PR description)\n` +
          `3. Get your PR merged\n` +
          `4. Comment \`/claim <your_wallet_address>\` on your merged PR`
      );

      // Notify about bounty creation
      await this.notifyAll({
        repository: repo,
        issueNumber,
        contributor: sender,
        amount,
        transactionUrl: tx.explorerUrl,
        eventType: "bounty_created",
      });
    } catch (error: any) {
      console.error("Failed to create escrow:", error);
      await this.issueProvider.postComment(
        repo,
        issueNumber,
        `Failed to create bounty escrow: ${error.message}`
      );
    }
  }

  /**
   * Handle comment on issue or PR
   */
  private async handleComment(payload: WebhookPayload): Promise<void> {
    const commentBody = payload.comment?.body?.trim();
    const commenter = payload.comment?.user?.login;
    const repo = payload.repository?.full_name;
    const issueNumber = payload.issue?.number;
    const isPullRequest = payload.issue?.pull_request !== undefined;

    if (!commentBody || !commenter || !issueNumber || !repo) {
      throw new Error("Missing required fields in comment event");
    }

    console.log(
      `Comment by ${commenter} on ${isPullRequest ? "PR" : "issue"} #${issueNumber}: "${commentBody}"`
    );

    // Handle /assign
    if (commentBody === "/assign") {
      if (isPullRequest) {
        await this.issueProvider.postComment(
          repo,
          issueNumber,
          "The `/assign` command can only be used on issues, not pull requests."
        );
        return;
      }
      await this.handleAssign(repo, issueNumber, commenter);
      return;
    }

    // Handle /claim
    if (commentBody.startsWith("/claim")) {
      if (!isPullRequest) {
        await this.issueProvider.postComment(
          repo,
          issueNumber,
          "The `/claim` command must be used on the merged pull request, not on the issue."
        );
        return;
      }
      await this.handleClaim(repo, issueNumber, commenter, commentBody);
      return;
    }
  }

  /**
   * Handle /assign command
   */
  private async handleAssign(
    repo: string,
    issueNumber: number,
    username: string
  ): Promise<void> {
    console.log(`Assigning ${username} to issue #${issueNumber}`);

    try {
      await this.issueProvider.assignIssue(repo, issueNumber, username);
      await this.issueProvider.postComment(
        repo,
        issueNumber,
        `@${username} has been assigned to this issue.`
      );

      await this.notifyAll({
        repository: repo,
        issueNumber,
        contributor: username,
        amount: 0,
        transactionUrl: "",
        eventType: "assignment",
      });

      console.log(`Assignment successful`);
    } catch (error: any) {
      console.error("Failed to assign:", error);
      await this.issueProvider.postComment(
        repo,
        issueNumber,
        `Failed to assign issue: ${error.message}`
      );
    }
  }

  /**
   * Handle /claim command
   */
  private async handleClaim(
    repo: string,
    prNumber: number,
    commenter: string,
    commentBody: string
  ): Promise<void> {
    console.log(`Processing /claim from ${commenter} for PR #${prNumber}`);

    // Parse wallet address
    const parts = commentBody.split(/\s+/);
    const walletStr = parts[1];

    if (!walletStr) {
      await this.issueProvider.postComment(
        repo,
        prNumber,
        "**Invalid claim command**\n\nUsage: `/claim <wallet_address>`"
      );
      return;
    }

    // Validate wallet address
    let wallet;
    try {
      wallet = this.paymentProvider.parseWalletAddress(walletStr);
      console.log(`Valid wallet: ${wallet.toBase58()}`);
    } catch (error) {
      await this.issueProvider.postComment(
        repo,
        prNumber,
        "**Invalid wallet address**\n\nPlease provide a valid wallet address."
      );
      return;
    }

    // Perform security validation
    const validation = await this.securityValidator.validateClaim(
      repo,
      prNumber,
      commenter,
      this.bountyConfig
    );

    if (!validation.isValid) {
      for (const error of validation.errors) {
        await this.issueProvider.postComment(repo, prNumber, error);
      }
      return;
    }

    const linkedIssue = validation.linkedIssue!;

    // Release escrow
    console.log("Releasing escrow...");
    try {
      const repoHash = this.paymentProvider.getRepositoryHash(repo);
      const tx = await this.paymentProvider.releaseEscrow(
        linkedIssue.number,
        repoHash,
        wallet
      );

      // Post success comments
      await this.issueProvider.postComment(
        repo,
        prNumber,
        `**Bounty released to @${commenter}**\n\n` +
          `Issue: #${linkedIssue.number}\n` +
          `Amount: ${lamportsToSol(linkedIssue.bountyAmount)} SOL\n` +
          `Recipient wallet: \`${wallet.toBase58()}\`\n` +
          `Transaction: ${tx.explorerUrl}`
      );

      await this.issueProvider.postComment(
        repo,
        linkedIssue.number,
        `**Bounty claimed**\n\n` +
          `This bounty has been claimed by @${commenter} via PR #${prNumber}.\n` +
          `Transaction: ${tx.explorerUrl}`
      );

      // Notify all providers
      await this.notifyAll({
        repository: repo,
        issueNumber: linkedIssue.number,
        prNumber,
        contributor: commenter,
        amount: linkedIssue.bountyAmount,
        transactionUrl: tx.explorerUrl,
        eventType: "bounty_claimed",
      });

      console.log("Claim process completed successfully");
    } catch (error: any) {
      console.error("Failed to release escrow:", error);
      await this.issueProvider.postComment(
        repo,
        prNumber,
        `Failed to release bounty: ${error.message}`
      );
    }
  }

  /**
   * Notify all notification providers
   */
  private async notifyAll(data: NotificationData): Promise<void> {
    for (const provider of this.notificationProviders) {
      try {
        await provider.notify(data);
      } catch (error) {
        console.error(`Notification failed for ${provider.getName()}:`, error);
      }
    }
  }

  /**
   * Get bounty amount from label
   */
  private getBountyAmount(label: string): number | null {
    return this.bountyConfig[label] || null;
  }

  /**
   * Default bounty configuration
   */
  private getDefaultBountyConfig(): BountyConfig {
    return {
      "bounty-1-sol": 1_000_000_000,
      "bounty-2-sol": 2_000_000_000,
      "bounty-3-sol": 3_000_000_000,
      "bounty-4-sol": 4_000_000_000,
      "bounty-5-sol": 5_000_000_000,
    };
  }
}
