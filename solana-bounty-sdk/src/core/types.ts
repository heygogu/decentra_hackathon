import { PublicKey } from "@solana/web3.js";

// ==================== WEBHOOK TYPES ====================

export interface WebhookPayload {
  action?: string;
  issue?: {
    number: number;
    title?: string;
    body?: string;
    labels?: Array<{ name: string }>;
    assignees?: Array<{ login: string }>;
    pull_request?: any;
  };
  pull_request?: any;
  label?: {
    name: string;
  };
  comment?: {
    body: string;
    user: {
      login: string;
    };
  };
  sender?: {
    login: string;
  };
  repository?: {
    full_name: string;
  };
  [key: string]: any;
}

// ==================== BOUNTY TYPES ====================

export interface Bounty {
  issueNumber: number;
  amount: number;
  label: string;
  repository: string;
  createdAt?: Date;
  claimedAt?: Date;
  claimedBy?: string;
}

export interface BountyConfig {
  [label: string]: number; // e.g., "bounty-1-sol": 1_000_000_000
}

// ==================== ISSUE TYPES ====================

export interface Issue {
  number: number;
  title?: string;
  body?: string;
  labels: string[];
  assignees: string[];
  state: "open" | "closed";
}

export interface PullRequest {
  number: number;
  title?: string;
  body?: string;
  state: "open" | "closed";
  merged: boolean;
  user: {
    login: string;
  };
}

export interface LinkedIssue {
  number: number;
  bountyAmount: number;
  label: string;
}

// ==================== SECURITY CHECK RESULTS ====================

export interface SecurityCheckResult {
  passed: boolean;
  reason?: string;
}

export interface ClaimValidation {
  isValid: boolean;
  linkedIssue?: LinkedIssue;
  errors: string[];
}

// ==================== TRANSACTION RESULTS ====================

export interface TransactionResult {
  signature: string;
  explorerUrl: string;
}

// ==================== NOTIFICATION TYPES ====================

export interface NotificationData {
  repository: string;
  issueNumber: number;
  prNumber?: number;
  contributor: string;
  amount: number;
  transactionUrl: string;
  eventType: "bounty_created" | "bounty_claimed" | "assignment";
}

// ==================== PROVIDER CONFIG TYPES ====================

export interface IssueProviderConfig {
  token: string;
  webhookSecret?: string;
  [key: string]: any;
}

export interface PaymentProviderConfig {
  keypairJson: string;
  programId: string;
  network?: "mainnet-beta" | "devnet" | "testnet";
  rpcUrl?: string;
  [key: string]: any;
}

export interface NotificationProviderConfig {
  [key: string]: any;
}

// ==================== MANAGER CONFIG ====================

export interface BountyManagerConfig {
  issueProvider: IIssueProvider;
  paymentProvider: IPaymentProvider;
  notificationProviders?: INotificationProvider[];
  bountyConfig?: BountyConfig;
  securityConfig?: SecurityConfig;
}

export interface SecurityConfig {
  skipAssignmentCheck?: boolean;
  requireMergedPR?: boolean;
  requireMaintainerForBountyCreation?: boolean;
}

// ==================== PROVIDER INTERFACES ====================

export interface IIssueProvider {
  verifyWebhook(rawBody: Buffer, signature: string, secret: string): boolean;
  postComment(
    repository: string,
    issueNumber: number,
    comment: string
  ): Promise<void>;
  assignIssue(
    repository: string,
    issueNumber: number,
    username: string
  ): Promise<void>;
  getPullRequest(repository: string, prNumber: number): Promise<PullRequest>;
  findLinkedIssueWithBounty(
    repository: string,
    prNumber: number,
    prData: PullRequest,
    bountyConfig: BountyConfig
  ): Promise<LinkedIssue | null>;
  wasUserEverAssigned(
    repository: string,
    issueNumber: number,
    username: string
  ): Promise<boolean>;
  isBountyAlreadyClaimed(
    repository: string,
    issueNumber: number
  ): Promise<boolean>;
  checkIsMaintainer(repository: string, username: string): Promise<boolean>;
  getIssue(repository: string, issueNumber: number): Promise<Issue>;
}

export interface IPaymentProvider {
  createEscrow(
    issueNumber: number,
    repositoryHash: Buffer,
    amount: number
  ): Promise<TransactionResult>;
  releaseEscrow(
    issueNumber: number,
    repositoryHash: Buffer,
    recipient: PublicKey
  ): Promise<TransactionResult>;
  escrowExists(issueNumber: number, repositoryHash: Buffer): Promise<boolean>;
  getRepositoryHash(repositoryName: string): Buffer;
  parseWalletAddress(address: string): PublicKey;
}

export interface INotificationProvider {
  notify(data: NotificationData): Promise<void>;
  getName(): string;
}
