import { SlackViewMiddlewareArgs } from '@slack/bolt';
import { ChatUpdateResponse } from '@slack/web-api';

import { Game } from '../game/game';
import { Player, Question } from '../game/types';
import { getJoinGameBlocks, getLobbyBlocks } from './blocks';
import { app } from '../app';
import { generateQuestionId, getUser } from './helpers';

// When user submits question modal
app.view('question_view', async ({ body, ack, view }: SlackViewMiddlewareArgs) => {
  await ack();
  const user = await getUser(body.user.id);
  const viewData = JSON.parse(view.private_metadata);
  const player: Player = {
    name: user.name,
    id: user.id,
    score: 0,
    isAdmin: viewData.isAdmin,
    avatar: user.avatar,
    isReady: false,
    lastQuestionSent: new Date()
  };

  await Game.get(viewData.gameId).then(game => {
    game.addOrGetPlayer(player).then(p => {
      // If adding player goes smoothly
      const values = view.state.values;
      const q: Question = {
        id: generateQuestionId(
          p.id,
          values.question.question.value as string
        ),
        owner: p,
        question: values.question.question.value as string,
        playersAnswered: [],
        playersAnsweredCorrect: [],
        choices: [
          {
            text: values.answer_right.answer_right.value as string,
            isCorrect: true
          },
          {
            text: values.wrong_answer_1.wrong_answer_1.value as string,
            isCorrect: false
          },
          {
            text: values.wrong_answer_2.wrong_answer_2.value as string,
            isCorrect: false
          },
          {
            text: values.wrong_answer_3.wrong_answer_3.value as string,
            isCorrect: false
          }
        ]
      };
      game.addQuestion(q).then(() => {
        if (!p.isAdmin) {
          app.client.chat.postEphemeral({
            user: body.user.id,
            channel: game.getChannelId(),
            blocks: getLobbyBlocks(p.isAdmin, game.id),
            text: "You're in the game and your question is saved!"
          });
        }

        // Update original message to show amount of players correctly
        app.client.chat.update({
          channel: game.getChannelId(),
          ts: game.ts,
          text: `${game.getAdmin().name} started new game!`,
          blocks: getJoinGameBlocks(game.getAdmin().name, game.id, game.players.length)
        }).then((response: ChatUpdateResponse) => {
          game.ts = response.ts as string;
        });
      });
    }).catch((reason) => {
      console.error('Error submitting question modal', reason);
      app.client.chat.postEphemeral({
        user: body.user.id,
        channel: game.getChannelId(),
        text: reason.message
      });
    });
  });
});
