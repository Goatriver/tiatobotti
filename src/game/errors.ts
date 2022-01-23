export class GameAlreadyExistsError extends Error {
  constructor (id: string) {
    const message = `Game with id "${id}" already exists!`;
    super(message);
    Object.setPrototypeOf(this, GameAlreadyExistsError.prototype);
  }
}

export class GameNotFoundError extends Error {
  constructor (id: string) {
    const message = `Game with id "${id}" not found!`;
    super(message);
    Object.setPrototypeOf(this, GameNotFoundError.prototype);
  }
}

export class PlayerAlreadySetQuestionError extends Error {
  constructor (name: string) {
    const message = `Player "${name}" has already set question!`;
    super(message);
    Object.setPrototypeOf(this, PlayerAlreadySetQuestionError.prototype);
  }
}

export class GameAlreadyStartedError extends Error {
  constructor () {
    const message = 'Too late. Game has already started. :sadpanda:';
    super(message);
    Object.setPrototypeOf(this, GameAlreadyStartedError.prototype);
  }
}

export class GameAlreadyEndedError extends Error {
  constructor (id: string) {
    const message = `Game ${id} has already ended!`;
    super(message);
    Object.setPrototypeOf(this, GameAlreadyEndedError.prototype);
  }
}

export class NotEnoughPlayersError extends Error {
  constructor () {
    const message = 'While playing with yourself is very ok, ' +
      'this game takes at least two to tango!';
    super(message);
    Object.setPrototypeOf(this, NotEnoughPlayersError.prototype);
  }
}
