import { AnswerChoice, GamePhase, Player, Question } from './types';
import {
  GameAlreadyEndedError,
  GameAlreadyExistsError,
  GameAlreadyStartedError,
  GameNotFoundError,
  PlayerAlreadySetQuestionError
} from './errors';
import { generateFakePlayers, generateFakeQuestion } from './fakers';

export class Game {
  static games: Game[] = [];
  players: Player[];
  questions: Question[];
  phase: GamePhase;
  id: string;
  ts: string;
  debug: number;

  constructor (id: string, debug = 0) {
    this.players = [];
    this.id = id;
    this.questions = [];
    this.phase = GamePhase.LOBBY;
    this.ts = '';
    this.debug = debug;
  }

  static async startGame (id: string, player: Player, debug = 0): Promise<Game> {
    if (this.games.some(g => g.id === id)) {
      await Promise.reject(new GameAlreadyExistsError(id));
    }
    const game = new Game(id, debug);
    game.addOrGetPlayer(player).then();
    if (debug) {
      game.addFakes(debug);
    }
    this.games.push(game);
    return game;
  }

  countTimeMultiplier (timeDiffSeconds: number): number {
    let x = timeDiffSeconds;
    const inMin = 0;
    const inMax = 45;
    const outMin = 2.0;
    const outMax = 1.0;
    x = x > inMax ? inMax : x;
    const multiplier = (x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    return Math.round((multiplier + Number.EPSILON) * 100) / 100;
  }

  addFakes (amount: number): void {
    generateFakePlayers(amount).forEach(
      (player) => {
        this.addOrGetPlayer(player).then(player => {
          this.addQuestion(generateFakeQuestion(player)).then();
        });
      }
    );
  }

  static async get (id: string): Promise<Game> {
    const game = Game.games.filter(g => g.id === id)[0];
    if (!game) {
      await Promise.reject(new GameNotFoundError(id));
    }
    return game;
  }

  getAdmin (): Player {
    return this.players.filter(p => p.isAdmin)[0];
  }

  async addOrGetPlayer (player: Player): Promise<Player> {
    if (this.phase !== GamePhase.LOBBY) {
      await Promise.reject(new GameAlreadyStartedError());
    }

    if (this.players.some(p => p.id === player.id)) {
      return this.players.filter(p => p.id === player.id)[0];
    }

    this.players.push(player);
    return player;
  }

  mixChoices (choices: AnswerChoice[]): AnswerChoice[] {
    const getRandomInt = (min: number, max: number): number => {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1) + min);
    };

    const temp: AnswerChoice[] = [];
    const originalLength = choices.length;
    for (let i = 0; i < originalLength; i++) {
      const random = getRandomInt(0, choices.length - 1);
      temp.push(choices[random]);
      choices.splice(random, 1);
    }
    return temp;
  }

  async addQuestion (q: Question): Promise<void> {
    if (this.questions.some(question => q.owner === question.owner)) {
      throw new PlayerAlreadySetQuestionError(q.owner.name);
    }

    q.choices = this.mixChoices(q.choices);
    this.questions.push(q);
  }

  async getNextQuestion (player: Player): Promise<Question | null> {
    const questions = this.questions.filter(
      q => q.owner !== player)
      .filter(q => !q.playersAnswered.some(p => p === player));
    if (!questions[0]) {
      player.isReady = true;
      return null;
    }

    return questions[0];
  }

  getChannelId (): string {
    return this.id.split('_')[0];
  }

  countExtraPoints (): void {
    this.questions.forEach(question => {
      const correctAnswers = question.playersAnsweredCorrect.length;
      const playersAnswered = question.playersAnswered.length;
      if (correctAnswers === playersAnswered || correctAnswers === 0) {
        return;
      }
      const multiplier = 1 + (correctAnswers / playersAnswered);
      const additionalScore = playersAnswered * multiplier;
      question.owner.score += additionalScore;
    });
  }

  async endGame (): Promise<Player[]> {
    if (this.phase === GamePhase.END) {
      throw new GameAlreadyEndedError(this.id);
    }

    this.phase = GamePhase.END;
    this.countExtraPoints();
    this.players.forEach(p => {
      p.score = Math.round(p.score * 100) / 100;
    });
    this.players.sort((pf, ps) => {
      return ps.score - pf.score;
    });
    Game.games = Game.games.filter(g => g !== this);
    return this.players;
  }

  getProgress (player: Player): string {
    const answered = this.questions.filter(
      q => q.playersAnswered.some(
        p => p.id === player.id
      )
    ).length + 1;
    return `${answered}/${this.questions.length - 1}`;
  }
}
