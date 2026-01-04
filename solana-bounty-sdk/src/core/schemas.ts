/**
 * Borsh serialization schemas for Solana program instructions
 * These must match the Rust program's instruction structs exactly
 */

export class CreateEscrowInstruction {
  repo_hash: number[];
  issue_number: bigint;
  amount: bigint;

  constructor(fields: {
    repo_hash: number[];
    issue_number: bigint;
    amount: bigint;
  }) {
    this.repo_hash = fields.repo_hash;
    this.issue_number = fields.issue_number;
    this.amount = fields.amount;
  }
}

export const CreateEscrowSchema = new Map([
  [
    CreateEscrowInstruction,
    {
      kind: "struct" as const,
      fields: [
        ["repo_hash", [32]],
        ["issue_number", "u64"],
        ["amount", "u64"],
      ],
    },
  ],
]);

export class ReleaseEscrowInstruction {
  repo_hash: number[];
  issue_number: bigint;

  constructor(fields: { repo_hash: number[]; issue_number: bigint }) {
    this.repo_hash = fields.repo_hash;
    this.issue_number = fields.issue_number;
  }
}

export const ReleaseEscrowSchema = new Map([
  [
    ReleaseEscrowInstruction,
    {
      kind: "struct" as const,
      fields: [
        ["repo_hash", [32]],
        ["issue_number", "u64"],
      ],
    },
  ],
]);

/**
 * Instruction discriminators
 * Must match the order in your Rust program's match statement
 */
export enum InstructionDiscriminator {
  CreateEscrow = 0,
  ReleaseEscrow = 1,
}
