export interface Player {
  name: string;
  id: string;
  score: number;
  isAdmin: boolean;
  avatar: string;
  isReady: boolean;
  lastQuestionSent: Date;
}

export interface AnswerChoice {
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string,
  owner: Player;
  question: string;
  choices: AnswerChoice[];
  playersAnswered: Player[];
  playersAnsweredCorrect: Player[];
}

export enum GamePhase {
  LOBBY,
  ANSWERING,
  END,
}
