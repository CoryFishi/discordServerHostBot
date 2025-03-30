require("dotenv").config();
const { REST, Routes } = require("discord.js");

const commands = [
  {
    name: "mc",
    description: "Send a command to the Minecraft server.",
    options: [
      {
        name: "command",
        description: "The command to send to the Minecraft server",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "reconnect",
    description: "Reconnect the bot to the Minecraft server.",
  },
  {
    name: "startserver",
    description: "Start the Minecraft server using start.bat",
  },
  {
    name: "stopserver",
    description: "Force stop the Minecraft server. Make sure to save.",
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// Deploy commands
async function deployCommands() {
  try {
    console.log("🔄 Refreshing application (/) commands...");

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("✅ Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(`❌ Error deploying commands: ${error}`);
  }
}

deployCommands();
