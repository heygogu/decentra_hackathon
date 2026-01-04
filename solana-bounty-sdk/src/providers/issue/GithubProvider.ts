import axios from "axios";
import {
  IIssueProvider,
  Issue,
  PullRequest,
  LinkedIssue,
  BountyConfig,
  IssueProviderConfig,
} from "../../core/types";
import { verifyGitHubSignature } from "../../utils/crypto";
import { extractIssueNumbers } from "../../utils/helpers";

export class GitHubProvider implements IIssueProvider {
  private token: string;
  private userAgent: string;

  constructor(config: IssueProviderConfig) {
    this.token = config.token;
    this.userAgent = config.userAgent || "solana-bounty-sdk";
  }

  verifyWebhook(rawBody: Buffer, signature: string, secret: string): boolean {
    return verifyGitHubSignature(rawBody, signature, secret);
  }

  async postComment(
    repository: string,
    issueNumber: number,
    comment: string
  ): Promise<void> {
    try {
      await axios.post(
        `https://api.github.com/repos/${repository}/issues/${issueNumber}/comments`,
        { body: comment },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "User-Agent": this.userAgent,
          },
        }
      );
      console.log("GitHub comment posted");
    } catch (error: any) {
      throw new Error(
        `Failed to post comment: ${error.response?.data?.message || error.message}`
      );
    }
  }

  async assignIssue(
    repository: string,
    issueNumber: number,
    username: string
  ): Promise<void> {
    try {
      await axios.post(
        `https://api.github.com/repos/${repository}/issues/${issueNumber}/assignees`,
        { assignees: [username] },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "User-Agent": this.userAgent,
          },
        }
      );
    } catch (error: any) {
      throw new Error(
        `Failed to assign issue: ${error.response?.data?.message || error.message}`
      );
    }
  }

  async getPullRequest(
    repository: string,
    prNumber: number
  ): Promise<PullRequest> {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repository}/pulls/${prNumber}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "User-Agent": this.userAgent,
          },
        }
      );

      return {
        number: response.data.number,
        title: response.data.title,
        body: response.data.body,
        state: response.data.state,
        merged: response.data.merged,
        user: {
          login: response.data.user.login,
        },
      };
    } catch (error: any) {
      throw new Error(
        `Failed to get PR: ${error.response?.data?.message || error.message}`
      );
    }
  }

  async findLinkedIssueWithBounty(
    repository: string,
    prNumber: number,
    prData: PullRequest,
    bountyConfig: BountyConfig
  ): Promise<LinkedIssue | null> {
    const issueNumbers = extractIssueNumbers(prData.body || "");
    console.log(
      `  Found issue references: ${issueNumbers.join(", ") || "none"}`
    );

    // Get timeline events
    try {
      const timelineResponse = await axios.get(
        `https://api.github.com/repos/${repository}/issues/${prNumber}/timeline`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "User-Agent": this.userAgent,
            Accept: "application/vnd.github.mockingbird-preview+json",
          },
        }
      );

      const crossReferences = timelineResponse.data
        .filter(
          (event: any) =>
            event.event === "cross-referenced" && event.source?.issue
        )
        .map((event: any) => event.source.issue.number);

      issueNumbers.push(...crossReferences);
    } catch (error) {
      console.error("Timeline fetch failed:", error);
    }

    // Search for closed issues
    try {
      const searchQuery = `repo:${repository} is:issue is:closed linked:pr:${prNumber}`;
      const searchResponse = await axios.get(
        `https://api.github.com/search/issues`,
        {
          params: { q: searchQuery, per_page: 10 },
          headers: {
            Authorization: `Bearer ${this.token}`,
            "User-Agent": this.userAgent,
          },
        }
      );

      const searchedIssues = searchResponse.data.items.map(
        (issue: any) => issue.number
      );
      issueNumbers.push(...searchedIssues);
    } catch (error) {
      console.error("Search API failed:", error);
    }

    // Check each issue for bounty
    const uniqueIssues = [...new Set(issueNumbers)];

    for (const issueNum of uniqueIssues) {
      try {
        const issue = await this.getIssue(repository, issueNum);

        for (const label of issue.labels) {
          const bountyAmount = bountyConfig[label];
          if (bountyAmount) {
            console.log(
              `  Issue #${issueNum} has bounty: ${bountyAmount / 1_000_000_000} SOL`
            );
            return { number: issueNum, bountyAmount, label };
          }
        }
      } catch (error) {
        console.error(`Failed to check issue #${issueNum}:`, error);
      }
    }

    return null;
  }

  async wasUserEverAssigned(
    repository: string,
    issueNumber: number,
    username: string
  ): Promise<boolean> {
    // Check current assignees
    const issue = await this.getIssue(repository, issueNumber);
    if (issue.assignees.includes(username)) {
      return true;
    }

    // Check timeline for past assignments
    try {
      const timelineResponse = await axios.get(
        `https://api.github.com/repos/${repository}/issues/${issueNumber}/timeline`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "User-Agent": this.userAgent,
            Accept: "application/vnd.github.mockingbird-preview+json",
          },
        }
      );

      const assignedEvents = timelineResponse.data.filter(
        (event: any) =>
          event.event === "assigned" && event.assignee?.login === username
      );

      return assignedEvents.length > 0;
    } catch (error) {
      console.error("Timeline check failed:", error);
      return false;
    }
  }

  async isBountyAlreadyClaimed(
    repository: string,
    issueNumber: number
  ): Promise<boolean> {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repository}/issues/${issueNumber}/comments`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "User-Agent": this.userAgent,
          },
        }
      );

      const claimPattern = /\*\*Bounty (released|claimed)\*\*/i;
      return response.data.some(
        (comment: any) =>
          comment.user.type === "Bot" && claimPattern.test(comment.body)
      );
    } catch (error: any) {
      throw new Error(
        `Failed to check claim status: ${error.response?.data?.message || error.message}`
      );
    }
  }

  async checkIsMaintainer(
    repository: string,
    username: string
  ): Promise<boolean> {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repository}/collaborators/${username}/permission`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "User-Agent": this.userAgent,
          },
        }
      );

      const permission = response.data.permission;
      return permission === "admin" || permission === "maintain";
    } catch (error) {
      console.error("Failed to check maintainer status:", error);
      return false;
    }
  }

  async getIssue(repository: string, issueNumber: number): Promise<Issue> {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repository}/issues/${issueNumber}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "User-Agent": this.userAgent,
          },
        }
      );

      return {
        number: response.data.number,
        title: response.data.title,
        body: response.data.body,
        labels: response.data.labels.map((l: any) => l.name),
        assignees: response.data.assignees.map((a: any) => a.login),
        state: response.data.state,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to get issue: ${error.response?.data?.message || error.message}`
      );
    }
  }
}
