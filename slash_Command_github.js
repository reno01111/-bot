const { Client, IntentsBitField } = require('discord.js');
const client = new Client({
  intents: [
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.Guilds
  ]
});

const token = "MTE1NzY4NjgwMTAyNTIyNDczNQ.Gzfp6q.ewi1tJUHYhGfm1dJGQk7OHmHOST2k01eFl4rzg"; // botのトークン

client.once('ready', async () => {
  console.log(`${client.user.tag}の起動完了！`);

  // サーバーごとにスラッシュコマンドを削除
  for (const [_, guild] of client.guilds.cache) {
    try {
      const commands = await guild.commands.fetch();
      await Promise.all(commands.map((command) => command.delete()));
      console.log(`${guild.name}で全ての(/)コマンドを削除`);
    } catch (error) {
      console.error(`${guild.name}でスラッシュコマンドの削除エラー: ${error}`);
    }
  }

  // グローバルスラッシュコマンドを削除
  try {
    const globalCommands = await client.application.commands.fetch();
    await Promise.all(globalCommands.map((command) => command.delete()));
    console.log('すべてのグローバル(/)コマンドを削除');
  } catch (error) {
    console.error(`グローバル(/)コマンドの削除エラー: ${error}`);
  }

  // ログアウトして終了
  client.destroy();
});

client.login(token);
