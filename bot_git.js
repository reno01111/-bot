const { Client, GatewayIntentBits } = require('discord.js')
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,

const token = 'botのトークン';
const channelId = '認証ログを送るチャネルのID';
const roleName = 'botが付与するロールのID';

client.once('ready', () => {
    console.log('botの準備完了！');
    // ステータスを設定する
    client.user.setActivity('認証' +
        '', { type: 'WATCHING' });
});

// 特定の文字列が送信されたらメッセージを返信する
client.on('messageCreate', async (message) => {
    if (message.content === '/cc_hello') {
        message.reply('`起動できています！`'); // '/cc_hello'に対して'起動できています！'と返信
    } else if (message.content === '/cc_help') {
        const embed = new MessageEmbed()
            .setTitle('ヘルプ') // '/cc_help'に対して改行を含むメッセージを返信
            .setDescription('認証ログを送るチャンネル：#💬｜認証ログ\n付与するロール：member_s \nボタン作成されているチャンネル：✅｜コンプライアンスチェック\n全てのコマンドに最初に`/cc`を書いてから');
        message.reply({ embeds: [embed] });
    }
});

client.on('messageCreate', async (message) => {
    if (message.content === '/cc_create') {
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('start_auth')
                    .setLabel('認証を開始する')
                    .setStyle('PRIMARY')
            );

        const embed = {
            title: '認証を開始しますか？',
            description: 'ボタンをクリックして認証を開始してください。',
            color: '#ffffff',
        };

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'start_auth') {
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (member) {
            const existingRole = member.roles.cache.find((r) => r.id === roleName);
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
                question: '質問1: 1+1は？',
                answers: [
                    { label: '1', isCorrect: false },
                    { label: '2', isCorrect: true },
                    { label: '3', isCorrect: false }
                ],
            },
            {
                question: '質問2: 2+2は？',
                answers: [
                    { label: '3', isCorrect: false },
                    { label: '4', isCorrect: true },
                    { label: '5', isCorrect: false }
                ],
            },
            {
                question: '質問3: 3+3は？',
                answers: [
                    { label: '5', isCorrect: false },
                    { label: '6', isCorrect: true },
                    { label: '7', isCorrect: false }
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

            const questionEmbed = {
                title: '認証',
                description: questionData.question,
                color: '#000000',
                footer: { text: '「インタラクションに失敗しました」と表示されても回答はできています' } // 小さなテキストを追加
            };

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
            const failEmbed = {
                title: '認証失敗',
                description: `${interaction.user}さんの認証に失敗しました。`,
                color: '#ff0000',
            };
            await interaction.followUp({ embeds: [failEmbed], ephemeral: true });

            const channelToSend = interaction.guild.channels.cache.get(channelId);
            if (channelToSend) {
                const embed = {
                    title: '間違えた問題と回答者',
                    description: `以下は${interaction.user}さんが間違えた問題と回答です：`,
                    color: '#ff0000',
                    fields: wrongAnswers.map((answer) => {
                        return {
                            name: answer.question,
                            value: `回答者: <@${answer.user}>\n間違えた回答: ${answer.wrongAnswer}\n正しい回答: ${answer.correctAnswer}`,
                        };
                    }),
                };
                await channelToSend.send({ embeds: [embed] });
            }
        } else if (answeredQuestions.size === questions.length && wrongAnswers.length === 0) {
            // 全ての質問に回答済みかつ全て正解している場合、認証成功のメッセージを送信
            const successEmbed = {
                title: '認証成功',
                description: `${interaction.user}さんの認証に成功しました！`,
                color: '#00ff00',
            };
            await interaction.followUp({ embeds: [successEmbed], ephemeral: true });

            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member) {
                const role = member.roles.cache.find((r) => r.id === roleName);
                if (!role) {
                    await member.roles.add(roleName);
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

                const questionEmbed = {
                    title: '認証',
                    description: nextQuestion.question,
                    color: '#000000',
                    footer: { text: '「インタラクションに失敗しました」と表示されても回答はできています' } // 小さなテキストを追加
                };

                await interaction.followUp({ embeds: [questionEmbed], components: [row], ephemeral: true });
            }
        }
    }
});

client.login(token);
