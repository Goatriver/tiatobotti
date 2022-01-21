import {ChatPostMessageResponse} from '@slack/web-api';
const {SlackEventMiddlewareArgs} = require('@slack/bolt');

import {Game} from '../game/game';
import {getJoinGameBlocks, getLobbyBlocks} from './blocks';
import {app} from '../app';
import {getUser, launchQModal} from './helpers';

// /startquiz command. This initializes new game and makes the "caller" an admin
app.command('/startquiz',async ({payload, say, body, ack, client}: typeof SlackEventMiddlewareArgs): Promise<void> => {
  await ack();
  const gameId = `${payload.channel_id}_${payload.user_id}`;
  const user = await getUser(payload.user_id);
  const player = {
    name: user.profile.display_name_normalized,
    id: user.id,
    score: 0,
    isAdmin: true,
    avatar: user.profile.image_512,
    isReady: false,
    lastQuestionSent: new Date(),
  }

  let debug: number = payload.text.includes("debug") && 5;
  const args = payload.text.split(' ');
  if(args.length > 1) {
    debug = args[1] as number;
  }

  await Game.startGame(gameId, player, debug).then((game) => {
    say({
      blocks: getJoinGameBlocks(
        player.name,
        gameId,
        game.players.length
      ),
      text: `${user?.profile?.display_name_normalized} started new game!`
    }).then((response: ChatPostMessageResponse) => {
      game.ts = response.ts as string;
    });

    launchQModal(body.trigger_id, gameId, client, true);
    app.client.chat.postEphemeral({
      user: payload.user_id,
      channel: game.getChannelId(),
      blocks: getLobbyBlocks(player.isAdmin, game.id),
      text: "You're in the game and your question is saved!",
    });

  }).catch((reason) => {
    console.error("Error starting quiz", reason);
    app.client.chat.postEphemeral({
      user: payload.user_id,
      channel: payload.channel_id,
      text: reason.message,
    });
  });
});