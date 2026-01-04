import { PublicKey } from "@solana/web3.js";
import {
  WebhookPayload,
  Issue,
  PullRequest,
  LinkedIssue,
  TransactionResult,
  NotificationData,
  IssueProviderConfig,
  PaymentProviderConfig,
  NotificationProviderConfig,
} from "../core/types";

// ==================== ISSUE PROVIDER INTERFACE ====================

/**
 * Interface for issue tracking systems (GitHub, GitLab, Bitbucket, etc.)
 */
export interface IIssueProvider {
  /**
   * Verify the webhook signature
   */
  verifyWebhook(rawBody: Buffer, signature: string, secret: string): boolean;

  /**
   * Post a comment on an issue or PR
   */
  postComment(
    repository: string,
    issueNumber: number,
    comment: string
  ): Promise<void>;

  /**
   * Assign a user to an issue
   */
  assignIssue(
    repository: string,
    issueNumber: number,
    username: string
  ): Promise<void>;

  /**
   * Get pull request details
   */
  getPullRequest(repository: string, prNumber: number): Promise<PullRequest>;

  /**
   * Find the issue linked to a PR that has a bounty
   */
  findLinkedIssueWithBounty(
    repository: string,
    prNumber: number,
    prData: PullRequest,
    bountyConfig: Record<string, number>
  ): Promise<LinkedIssue | null>;

  /**
   * Check if a user was ever assigned to an issue
   */
  wasUserEverAssigned(
    repository: string,
    issueNumber: number,
    username: string
  ): Promise<boolean>;

  /**
   * Check if a bounty has already been claimed
   */
  isBountyAlreadyClaimed(
    repository: string,
    issueNumber: number
  ): Promise<boolean>;

  /**
   * Check if a user is a maintainer of the repository
   */
  checkIsMaintainer(repository: string, username: string): Promise<boolean>;

  /**
   * Get issue details
   */
  getIssue(repository: string, issueNumber: number): Promise<Issue>;
}

// ==================== PAYMENT PROVIDER INTERFACE ====================

/**
 * Interface for blockchain payment systems (Solana, etc.)
 */
export interface IPaymentProvider {
  /**
   * Create an escrow for a bounty
   */
  createEscrow(
    issueNumber: number,
    repositoryHash: Buffer,
    amount: number
  ): Promise<TransactionResult>;

  /**
   * Release escrow funds to a recipient
   */
  releaseEscrow(
    issueNumber: number,
    repositoryHash: Buffer,
    recipient: PublicKey | string
  ): Promise<TransactionResult>;

  /**
   * Check if escrow exists for an issue
   */
  escrowExists(issueNumber: number, repositoryHash: Buffer): Promise<boolean>;

  /**
   * Get the hash/identifier for a repository
   */
  getRepositoryHash(repositoryName: string): Buffer;

  /**
   * Parse and validate a wallet address
   */
  parseWalletAddress(address: string): PublicKey | string;
}

// ==================== NOTIFICATION PROVIDER INTERFACE ====================

/**
 * Interface for notification systems (Discord, Slack, Email, etc.)
 */
export interface INotificationProvider {
  /**
   * Send a notification about a bounty event
   */
  notify(data: NotificationData): Promise<void>;

  /**
   * Get the provider name (for logging)
   */
  getName(): string;
}
