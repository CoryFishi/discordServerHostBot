// 
// Developed by Cory Fishburn
// https://github.com/CoryFishi/discordServerHostBot
// 
// Free to use, and modify.
// 
// Proper usage is to run as a node server on the
// same hardware you are running the minecraft server.
// It is possible to run this on a seperate server/hardware
// however you will lose the able to start/stop the server.
// 
// See github page to see installation instrustions.
// 

const {
  Client,
  GatewayIntentBits,
  ActivityType,
  MessageFlags,
} = require("discord.js");
const { Rcon } = require("rcon-client");
const { spawn } = require("child_process");
const fs = require("fs");
require("dotenv").config();

const SERVER_LOG_CHANNEL_ID = process.env.SERVER_LOG_CHANNEL_ID;
const logBuffer = [];
let isSendingLogs = false;
// RCON Configuration
let rcon;

// Setup Discord client w/ intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Connect to RCON function
// This can be used remotely if the server has the RCON port portforwarded.
// More secure to keep this local to the machine as RCON sends in plain text
const connectRCON = async () => {
  // Check if rcon status is connected, if so break.
  // This makes sure the server is not overloaded with RCON requests
  if (rcon && rcon.status === "connected") {
    return;
  }

  // Declare RCON connection
  rcon = new Rcon({
    host: process.env.RCON_HOST,
    port: process.env.RCON_PORT,
    password: process.env.RCON_PASSWORD,
  });

  try {
    // Create RCON connection
    await rcon.connect();
    console.log("✅ Connected to RCON!");
    updateBotStatus("Online");
    // on RCON disconect, update connection status
    rcon.on("end", () => {
      console.warn("⚠️ RCON disconnected.");
      rcon = null;
      updateBotStatus("Offline");
    });
    // on RCON connection fail, update connection status
    rcon.on("error", (err) => {
      console.error(`❌ RCON error: ${err.message}`);
      rcon = null;
      updateBotStatus("Offline");
    });
    // Error handling for RCON connection
  } catch (err) {
    console.error(`❌ Failed to connect to RCON: ${err.message}`);
    rcon = null;
    updateBotStatus("Offline");
  }
};

// Update Bot Status Based on RCON State
function updateBotStatus(status) {
  if (client.user) {
    client.user.setPresence({
      activities: [{ name: `${status}`, type: ActivityType.Playing }],
      status: status === "Connected" ? "online" : "dnd", // 'dnd' if disconnected
    });
    console.log(`🤖 Bot status updated: ${status}`);
  } else {
    console.warn("⚠️ Bot is not ready yet. Cannot set presence.");
  }
}

// Handle Reconnect Command
async function reconnectRCON(interaction) {
  await interaction.reply({
    content: "🔁 Reconnecting to RCON...",
    flags: MessageFlags.Ephemeral,
  });

  try {
    if (rcon) {
      await rcon.end(); // Close existing connection
    }
    await connectRCON();
    if (rcon) {
      await interaction.followUp("✅ RCON reconnected successfully!");
    } else {
      await interaction.followUp(
        "❌ Failed to reconnect RCON. Check server status."
      );
    }
  } catch (err) {
    await interaction.followUp(`❌ Error reconnecting to RCON: ${err.message}`);
  }
}

async function runBatFile(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const logChannel = await client.channels.fetch(SERVER_LOG_CHANNEL_ID);
  console.log(`✅ Channel fetched: ${logChannel.name}`);

  // Use Oracle Java from javapath
  const javaPath =
    "C:\\Program Files\\Common Files\\Oracle\\Java\\javapath\\java.exe";

  // Start the Minecraft server using NeoForge launch structure
  const serverProcess = spawn(
    javaPath,
    [
      "@user_jvm_args.txt",
      "@libraries/net/neoforged/neoforge/21.1.119/win_args.txt",
      "nogui",
    ],
    {
      cwd: "C:\\Users\\corya\\OneDrive\\Desktop\\ATM_10\\ServerFiles-2.36",
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  console.log("✅ Minecraft server is starting...");
  interaction.editReply({
    content:
      "✅ Minecraft server is starting! Check the log channel for server updates.",
    flags: MessageFlags.Ephemeral,
  });

  serverProcess.stdout.on("data", (data) => {
    sendLogToChannel(logChannel, data.toString());
  });

  serverProcess.stderr.on("data", (data) => {
    sendLogToChannel(logChannel, `⚠️ Error: ${data.toString()}`);
  });

  serverProcess.on("close", (code) => {
    logChannel.send(`💥 Server stopped with exit code: ${code}`);
    console.log(`💥 Server stopped with exit code: ${code}`);
  });
}

async function sendLogToChannel(channel, message) {
  if (!channel) return;

  // Add log to buffer
  logBuffer.push(message);

  // If logs are not being sent, start sending
  if (!isSendingLogs) {
    isSendingLogs = true;
    processLogBuffer(channel);
  }
}

// Send logs in batches to prevent rate limiting
async function processLogBuffer(channel) {
  while (logBuffer.length > 0) {
    const messagesToSend = logBuffer.splice(0, 10); // Send 10 lines at a time

    // Combine messages and send them as one block
    const combinedMessage = `\`\`\`\n${messagesToSend.join("\n")}\n\`\`\``;

    try {
      if (combinedMessage.length > 2000) {
        // Split into chunks if message exceeds 2000 character limit
        const chunks = splitMessage(combinedMessage, 2000);
        for (const chunk of chunks) {
          await channel.send(chunk);
        }
      } else {
        await channel.send(combinedMessage);
      }
    } catch (err) {
      console.error(`❌ Error sending log to channel: ${err.message}`);
    }

    // Wait 2-3 seconds before sending the next batch to prevent rate limits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Stop sending once all logs are processed
  isSendingLogs = false;
}

// Split message into chunks to avoid 2000-character limit
function splitMessage(message, maxLength) {
  const chunks = [];
  for (let i = 0; i < message.length; i += maxLength) {
    chunks.push(message.substring(i, i + maxLength));
  }
  return chunks;
}

// Stop the Minecraft server gracefully then kill java.exe
async function stopBatFile(interaction) {
  if (!rcon) {
    await interaction.reply({
      content: "❌ RCON is not connected. Cannot shut down gracefully.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: "🧠 Initiating graceful shutdown: saving world...",
    flags: MessageFlags.Ephemeral,
  });

  try {
    // Step 1: Save the world
    await rcon.send("save-all");
    console.log("💾 World save-all sent.");

    // Step 2: Wait 30 seconds, then send stop
    setTimeout(async () => {
      try {
        await rcon.send("stop");
        console.log("🛑 Stop command sent.");
      } catch (err) {
        console.error(`❌ Failed to send stop: ${err.message}`);
        interaction.followUp({
          content: `❌ Failed to send stop: ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }, 30000);
  } catch (err) {
    console.error(`❌ Failed to send save-all: ${err.message}`);
    await interaction.editReply({
      content: `❌ Failed to send save-all: ${err.message}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Function to Send Response as a File
async function sendResponseAsFile(response, interaction) {
  const fileName = `rcon_output_${Date.now()}.txt`;
  fs.writeFileSync(fileName, response);
  await interaction.reply({
    content: "📄 Output too long, here is the result:",
    files: [fileName],
  });
  fs.unlinkSync(fileName);
}

// Discord Bot Ready
client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  await connectRCON(); // Connect RCON after bot is ready
});

// Auto-retry RCON connection every 30 seconds
setInterval(async () => {
  if (!rcon || rcon.status !== "connected") {
    console.log("🔄 Attempting RCON reconnect...");
    await connectRCON();
  } else {
    console.log("✅ RCON already connected.");
  }
}, 30000); // 30 seconds

// Handle Slash Command Interactions
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === "mc") {
    const command = options.getString("command");

    if (!rcon) {
      await interaction.reply({
        content: "❌ RCON connection is not available. Try `/reconnect`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const response = await rcon.send(command);
      if (response.length > 2000) {
        await sendResponseAsFile(response, interaction);
      } else {
        await interaction.reply({
          content: `✅ Command executed: \`${command}\`\n📝 Response: \`\`\`${response}\`\`\``,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      await interaction.reply({
        content: `❌ Error executing command: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  } // Start the server
  else if (commandName === "startserver") {
    await runBatFile(interaction);
  }

  // Stop the server
  else if (commandName === "stopserver") {
    await stopBatFile(interaction);
  }

  // Reconnect RCON
  else if (commandName === "reconnect") {
    await reconnectRCON(interaction);
  }
});

// Bot Login
client.login(process.env.TOKEN);

process.on("unhandledRejection", (reason) => {
  console.error("🚨 Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  process.exit(1); // Exit to restart the bot if needed
});
