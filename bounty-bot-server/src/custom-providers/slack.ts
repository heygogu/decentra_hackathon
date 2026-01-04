import { INotificationProvider, NotificationData } from "solana-bounty-sdk";

export class SlackProvider implements INotificationProvider {
  constructor(private webhookUrl: string) {}

  async notify(data: NotificationData): Promise<void> {
    const message = this.formatMessage(data);

    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
  }

  getName(): string {
    return "Slack";
  }

  private formatMessage(data: NotificationData) {
    return {
      text: `Bounty ${data.eventType} for ${data.repository}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${data.eventType}* in ${data.repository}`,
          },
        },
      ],
    };
  }
}
