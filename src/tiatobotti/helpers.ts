import { app } from '../app';
import { WebClient } from '@slack/web-api';
import { ViewsOpenResponse } from '@slack/web-api/dist/response';
import { getEndGameBlocks, getQuestionBlocks, getReadyMessageBlocks, getSetQuestionBlocks } from './blocks';
import { Player, Question } from '../game/types';
import { Game } from '../game/game';

interface MyUser {
  name: string,
  id: string,
  avatar: string
}

// Helper function to fetch user info
export const getUser = async (id: string): Promise<MyUser> => {
  return await app.client.users.info({ user: id }).then(response => {
    const user: MyUser = {
      name: `unknown_${id}`,
      id: id,
      avatar: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Trollface_non-free.png/220px-Trollface_non-free.png'
    };

    if (response.user && response.user.profile) {
      if (response.user.profile.display_name_normalized) {
        user.name = response.user.profile.display_name_normalized;
      } else if (response.user.profile.display_name) {
        user.name = response.user.profile.display_name;
      } else if (response.user.profile.real_name_normalized) {
        user.name = response.user.profile.real_name_normalized;
      } else if (response.user.profile.real_name) {
        user.name = response.user.profile.real_name;
      }

      if (response.user.profile.image_512) {
        user.avatar = response.user.profile.image_512;
      }
    }

    return user;
  }).catch(reason => {
    console.error(reason);
    throw new Error(reason.message);
  });
};

// Helper function to launch question modal
export const launchQModal = async (
  triggerId: string,
  gameId: string,
  client: WebClient,
  isAdmin = false
): Promise<ViewsOpenResponse> => {
  return await client.views.open({
    trigger_id: triggerId,
    view: {
      private_metadata: JSON.stringify({ gameId: gameId, isAdmin: isAdmin }),
      type: 'modal',
      callback_id: 'question_view',
      title: {
        type: 'plain_text',
        text: 'Set up your question!'
      },
      blocks: getSetQuestionBlocks(),
      submit: {
        type: 'plain_text',
        text: 'Submit'
      }
    }
  });
};

const checkIfAnswered = (player: Player, question: Question): boolean => {
  return question.playersAnswered.some(p => p.id === player.id);
};

// helper function to launch a question DM
export const sendQuestion = async (
  player: Player,
  game: Game,
  scoreEarned?: number
): Promise<void> => {
  // COMPUTER DEBUG LOGIC
  if (game.debug) {
    const computerPlayers = game.players.filter(p => p.id.includes('debug'));
    computerPlayers.forEach(cpuPlayer => {
      game.getNextQuestion(cpuPlayer).then(question => {
        if (question) {
          question.playersAnswered.push(cpuPlayer);
          if (Math.random() < 0.65) {
            question.playersAnsweredCorrect.push(cpuPlayer);
            const randomTime = Math.floor(Math.random() * 48);
            cpuPlayer.score += game.countAnswerPoints(randomTime);
          }
        }
      });
    });
  }

  await game.getNextQuestion(player).then(question => {
    if (!question) {
      const questionsKnown = game.questions.filter(
        q => q.playersAnsweredCorrect.some(p => p.id === player.id)
      ).length;
      const total = game.questions.length - 1;

      app.client.chat.postMessage({
        channel: player.id,
        text: "That's it, you are ready!",
        blocks: getReadyMessageBlocks(questionsKnown, total, scoreEarned)
      });
      return;
    }

    player.lastQuestionSent = new Date();

    app.client.chat.postMessage({
      channel: player.id,
      text: 'I sent you a question!',
      value: game.id,
      blocks: getQuestionBlocks(
        question,
        game.id,
        game.getProgress(player),
        scoreEarned
      )
    });

    setTimeout(() => {
      if (!checkIfAnswered(player, question)) {
        console.log(`${player.name} didn't answer in time into question ${question.id}`);
        question.playersAnswered.push(player);
        sendQuestion(player, game).then(() => checkIfGameEnded(game));
      }
    }, 60 * 1000);
  }).catch(reason => {
    console.error('Error sending questions', reason);
    app.client.chat.postEphemeral({
      user: game.players.filter(p => p.isAdmin)[0].id,
      channel: game.getChannelId(),
      text: reason.message
    });
  });
};

// generates questionId
export const generateQuestionId = (playerId: string, question: string): string => {
  const randomInt = Math.floor(Math.random() * 512);
  const shortId = playerId.length > 7 ? playerId.substring(0, 6) : playerId;
  const shortQuestion = question.length > 10 ? question.substring(0, 9) : question;
  return (shortId + shortQuestion + randomInt.toString()).replace(' ', '_');
};

export const checkIfGameEnded = (game: Game) => {
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
};
