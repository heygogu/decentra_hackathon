import axios from "axios";
import {
  INotificationProvider,
  NotificationData,
  NotificationProviderConfig,
} from "../../core/types";
import { lamportsToSol } from "../../utils/helpers";

export interface DiscordProviderConfig extends NotificationProviderConfig {
  webhookUrl: string;
}

export class DiscordProvider implements INotificationProvider {
  private webhookUrl: string;

  constructor(config: DiscordProviderConfig) {
    this.webhookUrl = config.webhookUrl;
  }

  async notify(data: NotificationData): Promise<void> {
    let payload;

    switch (data.eventType) {
      case "bounty_created":
        payload = this.createBountyCreatedPayload(data);
        break;
      case "bounty_claimed":
        payload = this.createBountyClaimedPayload(data);
        break;
      case "assignment":
        payload = this.createAssignmentPayload(data);
        break;
      default:
        return;
    }

    try {
      const response = await axios.post(this.webhookUrl, payload);
      if (response.status === 204) {
        console.log("Discord notification sent successfully");
      }
    } catch (error: any) {
      throw new Error(
        `Discord webhook failed: ${error.response?.data || error.message}`
      );
    }
  }

  getName(): string {
    return "Discord";
  }

  private createBountyCreatedPayload(data: NotificationData) {
    return {
      content: "**New Bounty Created**",
      embeds: [
        {
          title: "💰 Bounty Available",
          description: `A new bounty has been created in ${data.repository}`,
          color: 3447003, // Blue
          fields: [
            { name: "Repository", value: data.repository, inline: true },
            { name: "Issue", value: `#${data.issueNumber}`, inline: true },
            {
              name: "Amount",
              value: `${lamportsToSol(data.amount)} SOL`,
              inline: true,
            },
            { name: "Created by", value: `@${data.contributor}`, inline: true },
            {
              name: "Transaction",
              value: `[View on Solana Explorer](${data.transactionUrl})`,
              inline: false,
            },
          ],
          footer: { text: "Solana Bounty Bot" },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  private createBountyClaimedPayload(data: NotificationData) {
    return {
      content: "**Bounty Claimed**",
      embeds: [
        {
          title: "✅ Bounty Released",
          description: `Issue #${data.issueNumber} has been resolved and the bounty has been paid.`,
          color: 5814783, // Green
          fields: [
            { name: "Repository", value: data.repository, inline: true },
            { name: "Issue", value: `#${data.issueNumber}`, inline: true },
            { name: "Pull Request", value: `#${data.prNumber}`, inline: true },
            {
              name: "Contributor",
              value: `@${data.contributor}`,
              inline: true,
            },
            {
              name: "Amount",
              value: `${lamportsToSol(data.amount)} SOL`,
              inline: true,
            },
            {
              name: "Transaction",
              value: `[View on Solana Explorer](${data.transactionUrl})`,
              inline: false,
            },
          ],
          footer: { text: "Solana Bounty Bot" },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  private createAssignmentPayload(data: NotificationData) {
    return {
      embeds: [
        {
          title: "👤 Issue Assigned",
          description: `@${data.contributor} has been assigned to issue #${data.issueNumber}`,
          color: 16776960, // Yellow
          fields: [
            { name: "Repository", value: data.repository, inline: true },
            { name: "Issue", value: `#${data.issueNumber}`, inline: true },
          ],
          footer: { text: "Solana Bounty Bot" },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
