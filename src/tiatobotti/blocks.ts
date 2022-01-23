import { Block, HeaderBlock, InputBlock, SectionBlock, ActionsBlock } from '@slack/bolt';
import { Player, Question } from '../game/types';

export interface ChoiceValue {
  isCorrect: boolean;
  gameId: string;
  qId: string;
}

export const getJoinGameBlocks = (
  adminName: string,
  gameId: string,
  playerCount: number
): (SectionBlock | ActionsBlock | HeaderBlock)[] => {
  return ([
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${adminName} started new game!`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_${playerCount}_ player${playerCount !== 1 ? 's' : ''} waiting!`
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Join game'
          },
          value: gameId,
          action_id: 'join_game_click'
        }
      ]
    }
  ]);
};

export const getSetQuestionBlocks = (): Array<SectionBlock | InputBlock> => {
  return (
    [
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: 'Set your question and answers (1 right, 3 wrongs) here!'
        }
      },
      {
        type: 'input',
        block_id: 'question',
        label: {
          type: 'plain_text',
          text: 'Your question'
        },
        element: {
          type: 'plain_text_input',
          multiline: true,
          action_id: 'question'
        }
      },
      {
        type: 'input',
        block_id: 'answer_right',
        label: {
          type: 'plain_text',
          text: 'Right answer'
        },
        element: {
          type: 'plain_text_input',
          action_id: 'answer_right'
        }
      },
      {
        type: 'input',
        block_id: 'wrong_answer_1',
        label: {
          type: 'plain_text',
          text: 'Wrong answer'
        },
        element: {
          type: 'plain_text_input',
          action_id: 'wrong_answer_1'
        }
      },
      {
        type: 'input',
        block_id: 'wrong_answer_2',
        label: {
          type: 'plain_text',
          text: 'Wrong answer'
        },
        element: {
          type: 'plain_text_input',
          action_id: 'wrong_answer_2'
        }
      },
      {
        type: 'input',
        block_id: 'wrong_answer_3',
        label: {
          type: 'plain_text',
          text: 'Wrong answer'
        },
        element: {
          type: 'plain_text_input',
          action_id: 'wrong_answer_3'
        }
      }
    ]
  );
};

export const getLobbyBlocks = (
  isAdmin: boolean,
  gameId: string
): (SectionBlock | ActionsBlock)[] => {
  if (!isAdmin) {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
          'Waiting for the admin to start the game. ' +
          'When the game starts, I will send you a pm where you can answer ' +
          'to all the questions. Remember to be _fast_, it\'ll give you bonus points! :thumbsup:'
        }
      }];
  }

  return [
    {
      type: 'section',
      text: {
        type: 'plain_text',
        text:
          'I\'ll send the questions for you and the other players as pm:s when ' +
          'you click "Start Game" -button below. :thumbsup:'
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Start Game!'
          },
          action_id: 'start_game',
          value: gameId
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Cancel Game!'
          },
          style: 'danger',
          action_id: 'cancel_game',
          value: gameId
        }
      ]
    }
  ];
};

export const getQuestionBlocks = (q: Question, gameId: string, progress: string): (Block | SectionBlock)[] => {
  return [
    {
      type: 'section',
      text: {
        text: `${progress}: ${q.question}`,
        type: 'plain_text'
      },
      accessory: {
        type: 'radio_buttons',
        action_id: 'answer',
        options: q.choices.map((c, index) => ({
          text: {
            type: 'plain_text',
            text: c.text
          },
          value: JSON.stringify(
            <ChoiceValue>{
              number: index,
              isCorrect: c.isCorrect,
              gameId: gameId,
              qId: q.id
            }
          )
        }))
      }
    }
  ];
};

export const getEndGameBlocks = (players: Player[]): (Block | SectionBlock | HeaderBlock)[] => {
  const getPosition = (index: number): string => {
    switch (index) {
      case 0: return ':first_place_medal:';
      case 1: return ':second_place_medal:';
      case 2: return ':third_place_medal:';
      default: return `*${(index + 1).toString()}*`;
    }
  };

  return [
    {
      type: 'header',
      text: {
        text: `Game over! Congrats to winner ${players[0].name}`,
        type: 'plain_text'
      }
    },
    {
      type: 'divider'
    },
    ...players.map((p, index) => (
      {
        type: 'section',
        text: {
          text: `${getPosition(index)}: ${p.name}, ${p.score} pts!`,
          type: 'mrkdwn'
        },
        accessory: {
          type: 'image',
          image_url: p.avatar,
          alt_text: 'avatar'
        }
      }
    ))
  ];
};

export const getReadyMessageBlocks = (
  questionsKnown: number,
  total: number,
  playerQuestionRightAnswers: number): (SectionBlock | Block)[] => {
  return [
    {
      type: 'section',
      text: {
        type: 'plain_text',
        text: 'Thanks for playing. ' +
          'Winners & results are announced as soon as last player is ready!'
      }
    },
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `You got *${questionsKnown}/${total}* of the questions right! \n` +
          `*${playerQuestionRightAnswers}* player${playerQuestionRightAnswers !== 1 ? 's' : ''} ` +
          'got your question right!'
      }
    }
  ];
};
