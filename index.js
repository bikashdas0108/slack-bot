import bolt from "@slack/bolt";
import dotenv from "dotenv";

const { App } = bolt;
dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  //   socketMode: true,
});

app.use(async ({ body, ack, next }) => {
  console.log("Incoming request:", body);
  if (body.type === "url_verification") {
    await ack(body.challenge);
    return;
  }
  await next();
});

app.event("app_mention", async ({ event, say }) => {
  await say(`Hey <@${event.user}>! I heard you mention me.`);
});

app.event("message", async ({ event, say }) => {
  if (event.channel_type === "im" && !event.subtype && !event.bot_id) {
    const threadId = event.thread_ts || event.ts;

    try {
      const tempMsg = await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: event.channel,
        text: "_Processing your request..._",
        thread_ts: threadId,
      });

      let apiResponse;
      await fetch("https://dummyjson.com/products")
        .then((res) => res.json())
        .then((res) => (apiResponse = res));
      const apiData = apiResponse.products;
      const total = apiResponse.total;

      const productBlocks = apiData.slice(0, 5).map((product, idx) => ({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${idx + 1}. ${product.title}*\nPrice: $${product.price}\n${
            product.description
          }`,
        },
      }));

      await say({
        thread_ts: threadId,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*API Response for:* \"${event.text}\"\n\n*Title:* Products List`,
            },
          },
          {
            type: "divider",
          },
          ...productBlocks,
          {
            type: "divider",
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Total count: ${total}`,
              },
            ],
          },
          {
            type: "divider",
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `:clock1: Response at ${new Date().toLocaleTimeString()}`,
              },
            ],
          },
        ],
      });

      await app.client.chat.delete({
        token: process.env.SLACK_BOT_TOKEN,
        channel: event.channel,
        ts: tempMsg.ts, // Timestamp of the message to delete
      });
    } catch (error) {
      console.error("API Error:", error);
      await say(`:x: Failed to process your request. Error: ${error.message}`);
    }
  }
});

// Start the app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡ Bot is running!");
})();
