import { AnswerChoice, Player, Question } from './types';
import { generateQuestionId } from '../tiatobotti/helpers';

const names: string[] = [
  'Jaakko', 'Pekka', 'Teppo', 'Kaaleppi',
  'Jurmo', 'Tauno', 'Olavi', 'Sebastian'
];

const surNames: string[] = [
  'Koskimaa', 'Tuppurainen', 'Repsanperä',
  'Tarvo', 'Killinperä', 'Ibrahimović'
];

const questions: string[] = [
  'Missä on JJ?',
  'Ollakko vaiko eikö olla?',
  'Missä menee hyvän maun raja?',
  'Onko tämä hyvä botti?',
  'Kuka hitto nämä kysymykset on keksinyt?',
  'Tarviiko näitä olla monta?',
  'Mitä jos joku kysyy ihan tasan samaa pariin kertaan?',
  'Rikkikö menee?',
  'Toimiiks tää?',
  'Mistä tätä ajetaan?'
];

const answers: string[] = [
  'Se riippuu', 'Ei välii oikeestaa', 'Tavallaan',
  'Jaa', 'Ei', 'Tyhjiä', 'poissa',
  'Seitsämältä', 'Voi olla', 'Canada', 'Ei millään',
  'Koska vaan', 'Hauki', 'Samovaari'
];

const getRandomItem = (stack: string[], usedItems: string[] = [], index = -1): string => {
  const max = Math.floor(stack.length - 1);
  let rIndex = Math.floor(Math.random() * (max + 1));
  if (index >= 0) {
    rIndex = index;
  }
  let returnString = stack[rIndex];
  if (usedItems.some(value => value === returnString)) {
    rIndex++;
    rIndex = rIndex > stack.length - 1 ? 0 : rIndex;
    returnString = getRandomItem(stack, usedItems, rIndex);
  }
  return returnString;
};

export const generateFakePlayers = (amount: number): Player[] => {
  const players: Player[] = [];
  for (let i = 0; i < amount; i++) {
    players.push({
      id: `debug${i}`,
      name: `${getRandomItem(names)} ${getRandomItem(surNames)}`,
      score: 0,
      isAdmin: false,
      avatar:
        'https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Trollface_non-free.png/220px-Trollface_non-free.png',
      isReady: false,
      lastQuestionSent: new Date()
    });
  }

  return players;
};

export const generateFakeQuestion = (player: Player): Question => {
  const choices: AnswerChoice[] = [];
  for (let i = 0; i < 4; i++) {
    const rndmItem = getRandomItem(answers, choices.map(c => c.text));
    choices.push({
      text: rndmItem,
      isCorrect: i === 0
    });
  }
  const questionText = getRandomItem(questions);
  return {
    id: generateQuestionId(player.id, questionText),
    owner: player,
    question: questionText,
    choices: choices,
    playersAnswered: [],
    playersAnsweredCorrect: []
  };
};
