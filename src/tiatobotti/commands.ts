import { ChatPostMessageResponse } from '@slack/web-api';
import { Game } from '../game/game';
import { getJoinGameBlocks, getLobbyBlocks } from './blocks';
import { app } from '../app';
import { getUser, launchQModal } from './helpers';

const isDev = process.env.ENVIRONMENT ? process.env.ENVIRONMENT : "production";

// /startquiz command. This initializes new game and makes the "caller" an admin
app.command(
  isDev === 'production' ? '/startquiz' : '/startquiz-dev'
  ,async ({ payload, say, body, ack, client }
  ): Promise<void> => {
  await ack();
  const gameId = `${payload.channel_id}_${payload.user_id}`;
  const user = await getUser(payload.user_id);
  const player = {
    name: user.name,
    id: user.id,
    score: 0,
    isAdmin: true,
    avatar: user.avatar,
    isReady: false,
    lastQuestionSent: new Date()
  };

  let debug: number = payload.text.includes('debug') ? 5 : 0;
  const args = payload.text.split(' ');
  if (args.length > 1) {
    debug = parseInt(args[1]);
  }

  await Game.startGame(gameId, player, debug).then((game) => {
    say({
      blocks: getJoinGameBlocks(
        player.name,
        gameId,
        game.players.length
      ),
      text: `${player.name} started new game!`
    }).then((response: ChatPostMessageResponse) => {
      game.ts = response.ts as string;
    });

    launchQModal(body.trigger_id, gameId, client, true);
    app.client.chat.postEphemeral({
      user: payload.user_id,
      channel: game.getChannelId(),
      blocks: getLobbyBlocks(player.isAdmin, game.id),
      text: "You're in the game and your question is saved!"
    });
  }).catch((reason) => {
    console.error('Error starting quiz', reason);
    app.client.chat.postEphemeral({
      user: payload.user_id,
      channel: payload.channel_id,
      text: reason.message
    });
  });
});
