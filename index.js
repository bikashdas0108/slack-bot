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
            type: "header",
            text: {
              type: "plain_text",
              text: "🎯 VI Agent - Virtual Internships AI Assistant",
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Welcome to your AI-powered internship candidate management assistant!* :wave:\n\nI'm here to help you streamline your internship candidate search and management process through natural language conversations.",
            },
          },
          {
            type: "divider",
          },
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🚀 What I Can Do",
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*• Candidate Search & Filtering*\nFind interns based on career field, preferred month, availability and projects\n\n*• Shortlist Management*\nAdd promising candidates to your shortlist with simple commands\n\n*• Career Field Exploration*\nBrowse available career fields and their requirements\n\n*• Internship Opportunities*\nDiscover different internship types and their specifications",
            },
          },
          {
            type: "divider",
          },
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "💬 Quick Start Examples",
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: '*Try asking me:*\n• "Show me candidates for computer science and IT"\n• "Find all the available candidates"\n• "List all available career fields"\n• "Shortlist candidate ID 12345"\n• "What internship opportunities are available?"',
            },
          },
          {
            type: "divider",
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "💡 *Pro Tip:* I maintain conversation context, so you can ask follow-up questions and I'll remember our previous discussion!",
              },
            ],
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*🔗 Platform Integration*\nI'm directly connected to the Virtual Internships platform, providing you with real-time access to candidate data and platform features.",
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "🛡️ *Secure & Private:* All conversations are isolated and secure, with direct integration to VI's internal systems via MCP protocol.",
              },
            ],
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
      console.log({ apiResponse });
      const message =
        apiResponse.data.ai_message || "I'm sorry, I don't understand.";

      await app.client.chat.delete({
        token: process.env.SLACK_BOT_TOKEN,
        channel: event.channel,
        ts: tempMsg.ts,
      });

      await say({
        thread_ts: threadId,
        text: message,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message.slice(0, 2999),
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
  await app.start(process.env.PORT || 3005);
  console.log("⚡ Bot is running!");
})();
