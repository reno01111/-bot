const { Client, Intents, MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const token = 'Yor_Bot_Token'; // botのトークン
const channelId = 'You_Logchannel_ID'; // 認証ログを送るチャネルのID
const roleName = 'You_Raul_ID'; // botが付与するロールのID
const guildId = 'You_Guild_ID'; // コマンドを実装するギルドのID

client.once('ready', () => {
    console.log('Bot is ready!');

    // コマンドをギルドに登録
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
        guild.commands.create({
            name: 'ping',
            description: 'Pong! を返します',
        }).then(command => {
            console.log(`[/${command.name}]コマンドを[${guild.name}]で同期しました`);
        }).catch(console.error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        // コマンドを回数制限なく使用可能にし、ephemeral プロパティを false に設定
        await interaction.reply({ content: 'Pong!', ephemeral: false });

        // コマンドメニューを再表示する
        const guild = interaction.guild;
        if (guild) {
            guild.commands.create({
                name: 'ping',
                description: 'Pong! を返します',
            }).then(command => {
                console.log(`[/${command.name}]コマンドを[${guild.name}]で同期しました`);
            }).catch(console.error);
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.content === '!create') {
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('start_auth')
                    .setLabel('認証を開始する')
                    .setStyle('PRIMARY')
            );

        const embed = new MessageEmbed()
            .setTitle('認証を開始しますか？')
            .setDescription('ボタンをクリックして認証を開始してください。')
            .setColor('#ffffff');

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'start_auth') {
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (member) {
            const existingRole = member.roles.cache.has(roleID);
            if (existingRole) {
                await interaction.followUp({
                    content: 'あなたはすでに認証済みです！',
                    ephemeral: true
                });
                return;
            }
        }

        const questions = [
            {
                question: '質問1:利用規約を読みましたか？',
                answers: [
                    { label: 'はい', isCorrect: true },
                    { label: 'いいえ', isCorrect: false },
                    { label: '何それ', isCorrect: false }
                ],
            },
            {
                question: '質問2:質問や機能の要望はどこでしますか？',
                answers: [
                    { label: '雑談', isCorrect: false },
                    { label: '機能要望_質問', isCorrect: true },
                    { label: '企画提案場所', isCorrect: false }
                ],
            },
            {
                question: '質問3:@everyoneは誰でも使っていいですか？',
                answers: [
                    { label: '誰でもいつでも使ってok', isCorrect: false },
                    { label: '時間によってはいい', isCorrect: false },
                    { label: '許可なく使っちゃダメ', isCorrect: true }
                ],
            },
        ];

        const answeredQuestions = new Set();
        const wrongAnswers = [];

        for (const questionData of questions) {
            const row = new MessageActionRow();
            for (let i = 0; i < questionData.answers.length; i++) {
                row.addComponents(
                    new MessageButton()
                        .setCustomId(`answer_${i}`)
                        .setLabel(questionData.answers[i].label)
                        .setStyle('PRIMARY')
                        .setDisabled(answeredQuestions.has(questionData.question))
                );
            }

            const questionEmbed = new MessageEmbed()
                .setTitle('認証')
                .setDescription(questionData.question)
                .setColor('#000000')
                .setFooter({ text: '次の問題が出た後に「インタラクションに失敗しました」と表示されても回答はできています' });

            const filter = (i) => i.customId.startsWith('answer_') && i.user.id === interaction.user.id;

            const questionMessage = await interaction.followUp({ embeds: [questionEmbed], components: [row], ephemeral: true });

            if (!answeredQuestions.has(questionData.question)) {
                try {
                    const collected = await questionMessage.awaitMessageComponent({ filter, time: 15000 });

                    answeredQuestions.add(questionData.question);

                    const selectedAnswerIndex = parseInt(collected.customId.split('_')[1]);
                    const isCorrect = questionData.answers[selectedAnswerIndex].isCorrect;

                    if (!isCorrect) {
                        wrongAnswers.push({
                            question: questionData.question,
                            correctAnswer: questionData.answers.find(answer => answer.isCorrect).label,
                            user: interaction.user.id,
                            wrongAnswer: questionData.answers[selectedAnswerIndex].label,
                        });
                    }
                } catch (error) {
                    return;
                }
            }
        }

        if (answeredQuestions.size === questions.length && wrongAnswers.length > 0) {
            // 全ての質問に回答済みかつ一問でも間違えている場合、認証失敗のメッセージを送信
            const failEmbed = new MessageEmbed()
                .setTitle('認証失敗')
                .setDescription(`${interaction.user}さんの認証に失敗しました。`)
                .setColor('#ff0000');

            await interaction.followUp({ embeds: [failEmbed], ephemeral: true });

            const channelToSend = interaction.guild.channels.cache.get(channelId);
            if (channelToSend) {
                const embed = new MessageEmbed()
                    .setTitle('間違えた問題と回答者')
                    .setDescription(`以下は${interaction.user}さんが間違えた問題と回答です：`)
                    .setColor('#ff0000')
                    .addFields(
                        wrongAnswers.map((answer) => {
                            return {
                                name: answer.question,
                                value: `回答者: <@${answer.user}>\n間違えた回答: ${answer.wrongAnswer}\n正しい回答: ${answer.correctAnswer}`,
                            };
                        })
                    );

                await channelToSend.send({ embeds: [embed] });
            }
        } else if (answeredQuestions.size === questions.length && wrongAnswers.length === 0) {
            // 全ての質問に回答済みかつ全て正解している場合、認証成功のメッセージを送信
            const successEmbed = new MessageEmbed()
                .setTitle('認証成功')
                .setDescription(`${interaction.user}さんの認証に成功しました！`)
                .setColor('#00ff00');

            await interaction.followUp({ embeds: [successEmbed], ephemeral: true });

            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member) {
                const role = interaction.guild.roles.cache.get(roleID);
                if (role) {
                    await member.roles.add(role);
                }

                const unverifiedRole = interaction.guild.roles.cache.get(unverifiedRoleID); // 未認証のロールのID
                if (unverifiedRole) {
                    await member.roles.remove(unverifiedRole); // 未認証のロールを削除
                }
            }

            // 認証成功メッセージを指定したチャンネルに送信
            const channelToSend = interaction.guild.channels.cache.get(channelId);
            if (channelToSend) {
                const successMessageEmbed = new MessageEmbed()
                    .setTitle('認証成功')
                    .setDescription(`${interaction.user}さんが認証に成功しました！`)
                    .setColor('#00ff00');
                await channelToSend.send({ embeds: [successMessageEmbed] });
            }
        } else {
            // まだ全ての質問に回答していない場合、次の質問を送信
            const nextQuestion = questions.find((q) => !answeredQuestions.has(q.question));
            if (nextQuestion) {
                const row = new MessageActionRow();
                for (let i = 0; i < nextQuestion.answers.length; i++) {
                    row.addComponents(
                        new MessageButton()
                            .setCustomId(`answer_${i}`)
                            .setLabel(nextQuestion.answers[i].label)
                            .setStyle('PRIMARY')
                            .setDisabled(answeredQuestions.has(nextQuestion.question))
                    );
                }

                const questionEmbed = new MessageEmbed()
                    .setTitle('認証')
                    .setDescription(nextQuestion.question)
                    .setColor('#000000')
                    .setFooter({ text: '「インタラクションに失敗しました」と表示されても回答はできています' });

                await interaction.followUp({ embeds: [questionEmbed], components: [row], ephemeral: true });
            }
        }
    }
});

client.login(token);
