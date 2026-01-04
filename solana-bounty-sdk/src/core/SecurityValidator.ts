import { IIssueProvider } from "./types";
import { ClaimValidation, SecurityConfig, BountyConfig } from "./types";

/**
 * Handles all security validation for bounty claims
 */
export class SecurityValidator {
  constructor(
    private issueProvider: IIssueProvider,
    private config: SecurityConfig
  ) {}

  /**
   * Validate a bounty claim with comprehensive security checks
   */
  async validateClaim(
    repo: string,
    prNumber: number,
    commenter: string,
    bountyConfig: BountyConfig
  ): Promise<ClaimValidation> {
    const errors: string[] = [];

    // Check 1: Verify PR is merged
    console.log("Security Check 1: Verifying PR is merged...");
    let prData;
    try {
      prData = await this.issueProvider.getPullRequest(repo, prNumber);
      console.log(`  PR state: ${prData.state}, merged: ${prData.merged}`);

      if (this.config.requireMergedPR !== false && !prData.merged) {
        errors.push(
          "**Cannot claim bounty**\n\nThis pull request must be merged before claiming the bounty."
        );
        return { isValid: false, errors };
      }
      console.log("  PR is merged");
    } catch (error: any) {
      errors.push(`Failed to verify pull request: ${error.message}`);
      return { isValid: false, errors };
    }

    // Check 2: Verify commenter is the PR author
    console.log("Security Check 2: Verifying PR authorship...");
    if (prData.user.login !== commenter) {
      console.log(
        `  PR author (${prData.user.login}) does not match claimer (${commenter})`
      );
      errors.push(
        `**Unauthorized claim**\n\n@${commenter} is not the author of this pull request.\n\n` +
          `Only the PR author (@${prData.user.login}) can claim the bounty.`
      );
      return { isValid: false, errors };
    }
    console.log("  PR authorship verified");

    // Check 3: Find linked issue with bounty
    console.log("Security Check 3: Finding linked issue with bounty...");
    let linkedIssue;
    try {
      linkedIssue = await this.issueProvider.findLinkedIssueWithBounty(
        repo,
        prNumber,
        prData,
        bountyConfig
      );

      if (!linkedIssue) {
        console.log("  No linked issue with bounty found");
        errors.push(
          "**No bounty found**\n\nThis pull request is not linked to any issue with an active bounty.\n\n" +
            'Make sure your PR description includes "Fixes #<issue_number>" and that the issue has a bounty label.'
        );
        return { isValid: false, errors };
      }
      console.log(`  Found linked issue #${linkedIssue.number} with bounty`);
    } catch (error: any) {
      errors.push(`Failed to verify linked issue: ${error.message}`);
      return { isValid: false, errors };
    }

    // Check 4: Verify user was assigned to the issue
    if (!this.config.skipAssignmentCheck) {
      console.log("Security Check 4: Verifying assignment to issue...");
      try {
        const wasAssigned = await this.issueProvider.wasUserEverAssigned(
          repo,
          linkedIssue.number,
          commenter
        );
        console.log(`  Was assigned: ${wasAssigned}`);

        if (!wasAssigned) {
          console.log("  User was never assigned to the issue");
          errors.push(
            `**Unauthorized claim**\n\n@${commenter} was not assigned to issue #${linkedIssue.number}.\n\n` +
              `Please use \`/assign\` on the issue before starting work to be eligible for the bounty.`
          );
          return { isValid: false, errors };
        }
        console.log("  Assignment verified");
      } catch (error: any) {
        errors.push(`Failed to verify assignment: ${error.message}`);
        return { isValid: false, errors };
      }
    } else {
      console.log("Security Check 4: SKIPPED (skipAssignmentCheck=true)");
    }

    // Check 5: Verify bounty hasn't been claimed already
    console.log("Security Check 5: Checking if bounty already claimed...");
    try {
      const alreadyClaimed = await this.issueProvider.isBountyAlreadyClaimed(
        repo,
        linkedIssue.number
      );
      if (alreadyClaimed) {
        console.log("  Bounty already claimed");
        errors.push(
          `**Bounty already claimed**\n\nThe bounty for issue #${linkedIssue.number} has already been claimed by another contributor.`
        );
        return { isValid: false, errors };
      }
      console.log("  Bounty not yet claimed");
    } catch (error: any) {
      console.error("  Failed to check claim status:", error);
      // Continue anyway - the blockchain will reject if already claimed
    }

    return {
      isValid: true,
      linkedIssue,
      errors: [],
    };
  }
}
