import bolt from "@slack/bolt";
import dotenv from "dotenv";
import axios from "axios";

const { App } = bolt;
dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  //   socketMode: true,
});

app.use(async ({ body, ack, next }) => {
  if (body.type === "url_verification") {
    await ack(body.challenge);
    return;
  }
  await next();
});

app.event("app_home_opened", async ({ event, client }) => {
  try {
    await client.views.publish({
      user_id: event.user,
      view: {
        type: "home",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Welcome to Internship Agent!* :wave:\n\nThis is your Home tab.`,
            },
          },
          {
            type: "divider",
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error updating Home tab:", error);
  }
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
        text: "typing...",
        thread_ts: threadId,
      });

      const apiResponse = await axios.post(
        "http://localhost:8000/slackbot/message",
        {
          slack_thread_id: threadId,
          user_id: 50,
          message: event.text || "What all can you do?",
        }
      );
      const message = apiResponse.data.ai_message;

      await app.client.chat.delete({
        token: process.env.SLACK_BOT_TOKEN,
        channel: event.channel,
        ts: tempMsg.ts,
      });

      await say({
        thread_ts: threadId,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message,
            },
          },
          {
            type: "divider",
          },
        ],
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
