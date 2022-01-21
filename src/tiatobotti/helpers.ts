import {app} from '../app';
import {WebClient} from '@slack/web-api';
import {ViewsOpenResponse} from '@slack/web-api/dist/response';
import {getQuestionBlocks, getReadyMessageBlocks, getSetQuestionBlocks} from './blocks';
import {Player} from '../game/types';
import {Game} from '../game/game';

// Helper function to fetch user info
export const getUser = async (id: string): Promise<any> => {
  return (await app.client.users.info({user: id})).user;
};

// Helper function to launch question modal
export const launchQModal = async (
  triggerId: string,
  gameId: string,
  client: WebClient,
  isAdmin=false
): Promise<ViewsOpenResponse> => {
  return await client.views.open({
    trigger_id: triggerId,
    view: {
      private_metadata: JSON.stringify({gameId: gameId, isAdmin: isAdmin}),
      type: 'modal',
      callback_id: 'question_view',
      title: {
        type: 'plain_text',
        text: 'Set up your question!'
      },
      blocks: getSetQuestionBlocks(),
      submit: {
        type: 'plain_text',
        text: 'Submit',
      },
    }
  });
}

// helper function to launch a question DM
export const sendQuestion = async (player: Player, game: Game): Promise<void> => {
  // COMPUTER DEBUG LOGIC
  if(game.debug) {
    const computerPlayers = game.players.filter(p => p.id.includes("debug"));
    computerPlayers.forEach(cpuPlayer => {
      game.getNextQuestion(cpuPlayer).then(question => {
        if(question) {
          question.playersAnswered.push(cpuPlayer);
          if(Math.random() < 0.5) {
            question.playersAnsweredCorrect.push(cpuPlayer);
            const randomTime = Math.floor(Math.random() * 45);
            const multiplier = game.countTimeMultiplier(randomTime);
            cpuPlayer.score += (10 * multiplier);
          }
        }
      });
    });
  }

  await game.getNextQuestion(player).then(question => {
    if(!question) {
      const questionsKnown = game.questions.filter(
        q => q.playersAnsweredCorrect.some(p => p.id ==player.id)
      ).length;
      const total = game.questions.length - 1;
      const playerQuestionRightAnswers = game.questions.filter(
        q => q.owner.id === player.id
      )[0].playersAnsweredCorrect.length;

      app.client.chat.postMessage({
        channel: player.id,
        text: "That's it, you are ready!",
        blocks: getReadyMessageBlocks(questionsKnown, total, playerQuestionRightAnswers),
      });
      return;
    }

    player.lastQuestionSent = new Date();
    app.client.chat.postMessage({
      channel: player.id,
      text: "I sent you a question!",
      value: game.id,
      blocks: getQuestionBlocks(question, game.id, game.getProgress(player)),
    });
  }).catch(reason => {
    console.error("Error sending questions", reason);
    app.client.chat.postEphemeral({
      user: game.players.filter(p => p.isAdmin)[0].id,
      channel: game.getChannelId(),
      text: reason.message,
    });
  });
};

// generates questionId
export const generateQuestionId = (playerId: string, question: string): string => {
  const randomInt = Math.floor(Math.random() * 512);
  const shortId = playerId.length > 7 ? playerId.substring(0, 6) : playerId;
  const shortQuestion = question.length > 10 ? question.substring(0, 9) : question;
  return (shortId + shortQuestion + randomInt.toString()).replace(' ', '_');
}