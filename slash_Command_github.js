const { Client, Intents } = require('discord.js');
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    // 他の必要なIntentsを追加することができます
  ],
});

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // サーバーごとにSlashコマンドを削除する
  for (const guild of client.guilds.cache.values()) {
    try {
      const commands = await guild.commands.fetch();
      await Promise.all(commands.map((command) => command.delete()));
      console.log(`All Slash commands removed in ${guild.name}`);
    } catch (error) {
      console.error(`Error removing Slash commands in ${guild.name}: ${error}`);
    }
  }

  // グローバルSlashコマンドを削除する
  try {
    const globalCommands = await client.application?.commands.fetch();
    await Promise.all(globalCommands.map((command) => command.delete()));
    console.log('All Global Slash commands removed');
  } catch (error) {
    console.error(`Error removing Global Slash commands: ${error}`);
  }

  // ログアウトして終了
  client.destroy();
});

client.login('Yor_Bot_Token');
