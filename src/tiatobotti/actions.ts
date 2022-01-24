import {
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs
} from '@slack/bolt';

import { app } from '../app';
import { Game } from '../game/game';
import { launchQModal, sendQuestion } from './helpers';
import { GameAlreadyStartedError, NotEnoughPlayersError } from '../game/errors';
import { ChoiceValue, getEndGameBlocks } from './blocks';
import { GamePhase } from '../game/types';
import { RadioButtonsAction } from '@slack/bolt/dist/types/actions/block-action';

// When users are clickin' "join game" button
app.action('join_game_click', async ({ body, payload, ack }) => {
  await ack();
  body = <BlockAction>body;
  payload = <ButtonAction>payload;
  const triggerId = body.trigger_id;
  await Game.get(payload.value).then(game => {
    if (game.questions.some(q => q.owner.id === body.user.id)) {
      app.client.chat.postEphemeral({
        user: body.user.id,
        channel: game.getChannelId(),
        text: 'You have already set your question, sillypants! :facepalm:'
      });
      return;
    }

    launchQModal(triggerId, game.id, app.client);
  }).catch(reason => {
    console.error('Error joining game', reason);
    if (body.channel && body.channel.id) {
      app.client.chat.postEphemeral({
        user: body.user.id,
        channel: body.channel.id,
        text: reason.message
      });
    }
  });
});

// When admin clicks start game!
app.action('start_game', async ({ ack, payload, body }: SlackActionMiddlewareArgs) => {
  await ack();
  payload = <ButtonAction>payload;
  await Game.get(payload.value).then(game => {
    if (game.players.length < 2) {
      throw new NotEnoughPlayersError();
    }
    if (game.phase !== GamePhase.LOBBY) {
      throw new GameAlreadyStartedError();
    }
    game.phase = GamePhase.ANSWERING;
    game.players.forEach(player => {
      // sendQuestions for live player only..
      if (player.id.includes('debug') && game.debug) {
        return;
      }
      sendQuestion(player, game);
    });
  }).catch((reason) => {
    console.error('Error starting game', reason);
    if (body.channel && body.channel.id) {
      app.client.chat.postEphemeral({
        user: body.user.id,
        channel: body.channel.id,
        text: reason.message
      });
    }
  });
});

// When admin cancels game
app.action('cancel_game', async ({ ack, payload, body }) => {
  await ack();
  payload = <ButtonAction>payload;
  await Game.get(payload.value).then(game => {
    Game.games = Game.games.filter(g => g !== game);
    console.log(`Game ${game.id} ended!`);
    app.client.chat.delete({
      ts: game.ts,
      channel: game.getChannelId()
    });
  }).catch(reason => {
    console.error('Error canceling game', reason);
    if (body.channel && body.channel.id) {
      app.client.chat.postEphemeral({
        user: body.user.id,
        channel: body.channel.id,
        text: reason.message
      });
    }
  });
});

// When user answers the question
app.action('answer', async ({ ack, action, body }) => {
  await ack();
  action = <RadioButtonsAction>action;
  let answer: ChoiceValue;
  if (action.selected_option && action.selected_option.value) {
    answer = JSON.parse(action.selected_option.value);
  } else {
    throw new Error('Invalid choice');
  }

  await Game.get(answer.gameId).then(game => {
    const player = game.players.filter(p => p.id === body.user.id)[0];
    const question = game.questions.filter(
      q => q.id === answer.qId
    )[0];
    const timeDiff = new Date().getTime() - player.lastQuestionSent.getTime();
    question.playersAnswered.push(player);

    if (answer.isCorrect) {
      const multiplier = game.countTimeMultiplier(timeDiff / 1000);
      player.score += (10 * multiplier);
      question.playersAnsweredCorrect.push(player);
    }

    sendQuestion(player, game).then(() => {
      const readyPlayers = game.players.filter(p => p.isReady);
      if (readyPlayers.length === game.players.length) {
        game.endGame().then(playerList => {
          app.client.chat.delete({
            channel: game.getChannelId(),
            ts: game.ts
          });
          app.client.chat.postMessage({
            channel: game.getChannelId(),
            text: 'Game over!',
            blocks: getEndGameBlocks(playerList, game.questions)
          });
        });
      }
    });
  }).catch(reason => {
    console.error('Error while handling answer', reason);
    app.client.chat.postMessage({
      channel: body.user.id,
      text: reason.message
    });
  });
});
