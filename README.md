
# **Discord Server Host Bot**

A Discord bot that automates hosting, managing, and interacting with a Minecraft server directly through Discord.

---

## **Installation**


1. **Install Node.js:**  
   Make sure you have Node.js installed. Download it from [Node.js Official Site](https://nodejs.org/).  
   Recommended version: **Node.js 18+**

2. Clone the repository:
```bash
git clone https://github.com/your-repo-name/DiscordServerHostBot.git
```

3. Navigate to the project directory:
```bash
cd discorderserverhostbot
```

4. Install required dependencies:
```bash
npm install
```

---

## **Usage**

### **Starting the Bot**

To start the Discord bot, run:
```bash
node ./index
```

Once the bot is running, it will automatically listen for commands on your Discord server.

### **Bot Commands**

### `/mc <command>`

**Description:**  
This command sends a raw command to the Minecraft server using RCON.  
Any command that is available in the Minecraft console can be executed directly using this.

**Example:**
```bash
/mc time set day
```
**Response:**
```
Command executed: time set day
Response: Set the time to 1000
```

### `/startserver`

**Description:**  
This command starts the Minecraft server by running the `java` process with the required JVM arguments and server files.

**How It Works:**
- Sends all server logs to the specified Discord channel.
- Runs the server using NeoForge’s `win_args.txt` and custom JVM arguments.

**Usage:**
```bash
/startserver
```
**Response:**
```
Minecraft server is starting! Check the log channel for server updates.
```

### `/stopserver`

**Description:**  
This command safely stops the Minecraft server by:
1. Saving all world data (`save-all`).
2. Sending the `stop` command to gracefully shut down the server.
3. Killing any remaining `java.exe` processes after 30 seconds.

**Usage:**
```bash
/stopserver
```
**Response:**
```
Initiating graceful shutdown: saving world...
World saved. Stopping the server...
Server stopped with exit code: 0
```


### `/reconnect`

**Description:**  
This command attempts to reconnect the bot’s RCON connection to the Minecraft server.

**When to Use:**
- Use this command if the bot loses connection to the Minecraft server.
- Reconnection is automatic every 30 seconds, but you can force a manual reconnect with this command.

**Usage:**
```bash
/reconnect
```
**Response:**
```
Reconnecting to RCON...
RCON reconnected successfully!
```

---

## **Configuration**

1. **Environment Variables:**  
   Create a `.env` file in the root directory and add the following:
```
TOKEN=your_discord_bot_token
RCON_HOST=your_rcon_host
RCON_PORT=your_rcon_port
RCON_PASSWORD=your_rcon_password
SERVER_LOG_CHANNEL_ID=your_desired_log_channel
```

---

## **Advanced Settings**

### **Modify JVM Arguments**
To customize JVM arguments, edit:
```
user_jvm_args.txt
```

### **Modify Launch Arguments**
To modify the launch options, edit:
```
libraries/net/neoforged/neoforge/21.1.119/win_args.txt
```

---

## **Troubleshooting**

### Common Issues:
- **`Error: Unsupported major.minor version 65.0`**  
   Make sure you’re using **Java 21+**.
- **Bot logs delayed or not showing?**  
   Update the log throttling settings or decrease the interval between sending logs.

---

## **Contributing**

Pull requests are welcome! Feel free to open issues or suggestions for improvements.

---

## **License**
This project is licensed under the MIT License.  
See the `LICENSE` file for more details.
