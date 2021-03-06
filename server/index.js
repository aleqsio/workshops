const {
  ApolloServer,
  gql,
  PubSub,
  AuthenticationError,
} = require("apollo-server");
const { categories } = require("./categories");
const pubsub = new PubSub();
console.log(categories);
const typeDefs = gql`
  type User {
    name: String!
    score: Int!
  }
  type NameInput {
    name: String!
  }
  type Category {
    positiveBound: String!
    negativeBound: String!
    positiveColor: String
    negativeColor: String
  }
  type NewGame {
    category: Category!
    correctPosition: Float!
    psychic: User
    players: [User!]!
  }
  type Guess {
    position: Float!
    player: User!
  }
  type GuessInput {
    position: Float!
  }
  type Score {
    score: Int!
    player: User!
  }

  type FinishedGame {
    category: Category!
    correctPosition: Float!
    scores: [Score!]!
    guesses: [Guess!]!
    players: [User!]!
  }
  type RepresentativeProvided {
    representative: String!
  }
  type RepresentativeInput {
    representative: String!
  }
  type Subscription {
    representativeProvided: RepresentativeProvided!
    gameStarted: NewGame!
    gameEnded: FinishedGame!
  }
  type PlayerStartInfo {
    token: String!
  }
  type Mutation {
    provideGuess(position: Float!): Boolean!
    provideRepresentative(name: String!): Boolean!
    startPlaying(name: String!): PlayerStartInfo!
  }
  type Query {
    scores: [Score!]!
  }
`;

const players = {};
const tokensToNames = {};
const totalScores = {};

function rand(items) {
  if (items.length === 0) return null;
  // "~~" for a closest "int"
  return items[~~(items.length * Math.random())];
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const GAME_DURATION = 60 * 5;

let currentGame = null;

// https://lea.verou.me/2016/12/resolve-promises-externally-with-this-one-weird-trick/
let onRepresentativeSelected = () => null;
const waitForRepresentative = () =>
  new Promise((resolve) => {
    onRepresentativeSelected = resolve;
  });

let onAllGuesses = () => null;
const waitForAllGuesses = () =>
  new Promise((resolve) => {
    onAllGuesses = resolve;
  });

function sleep(percentage) {
  return new Promise((resolve) =>
    setTimeout(resolve, 1000 * GAME_DURATION * percentage)
  );
}

const beginGame = async () => {
  console.log(`🚀 Starting game`);
  const category = rand(categories);
  const psychic = rand(Object.values(players));
  const correctPosition = Math.random();
  currentGame = { category, psychic, guesses: {}, correctPosition };
  pubsub.publish(`game-started-queue`, {
    gameStarted: {
      category,
      psychic,
      correctPosition,
      players: Object.values(players),
    },
  });
  console.log({ category: category });
  if (!psychic) {
    console.log(`No players 😭, ending game`);
    return;
  }
  console.log(`Psychic is ${psychic.name}`);

  await Promise.any([sleep(1 / 3), waitForRepresentative()]);
  console.log({ representative: currentGame.representative });
  pubsub.publish(`representative-provided-queue`, {
    representativeProvided: {
      category,
      representative: currentGame.representative,
    },
  });
  await Promise.any([sleep(1 / 3), waitForAllGuesses()]);
  currentGame = {
    ...currentGame,
    guesses: Object.entries(currentGame.guesses).map(
      ([username, position]) => ({
        position,
        player: players[username],
      })
    ),
    scores: Object.entries(currentGame.guesses).map(([username, position]) => ({
      score: Math.floor(
        Math.pow(20 * (1 - Math.abs(currentGame.correctPosition - position)), 2)
      ),
      player: players[username],
    })),
  };
  currentGame.scores.push({
    player: currentGame.psychic,
    score:
      Object.values(currentGame.scores).reduce(
        (prev, curr) => curr.score + prev,
        0
      ) / Object.values(currentGame.scores).length,
  });
  currentGame.scores.forEach((score) => {
    players[score.player.name].score = score.score;
    if (score.player in totalScores) {
      totalScores[score.player.name] += score.score;
    } else {
      totalScores[score.player.name] = score.score;
    }
  });
  pubsub.publish(`game-ended-queue`, {
    gameEnded: {
      category,
      psychic,
      correctPosition,
      guesses: currentGame.guesses,
      scores: currentGame.scores,
      players: Object.values(players),
    },
  });
  const sortedScores = currentGame.scores.sort((a, b) => a.score - b.score);
  console.table(sortedScores);

  console.log(`Game finished, congrats to ${sortedScores[0].player.name}`);
};

const resolvers = {
  Query: {
    scores: () => players,
  },
  Subscription: {
    gameStarted: {
      // More on pubsub below
      subscribe: () => pubsub.asyncIterator("game-started-queue"),
    },
    gameEnded: {
      // More on pubsub below
      subscribe: () => pubsub.asyncIterator("game-ended-queue"),
    },
    representativeProvided: {
      // More on pubsub below
      subscribe: () => pubsub.asyncIterator("representative-provided-queue"),
    },
  },
  Mutation: {
    provideGuess: (_root, { position }, _context) => {
      if (!_context.username)
        throw new AuthenticationError("you must be playing a game");
      if (currentGame.guesses[_context.username]) {
        return false;
      }
      currentGame.guesses[_context.username] = position;
      if (
        Object.keys(currentGame.guesses).length ===
        Object.keys(players).length - 1
      ) {
        onAllGuesses();
      }
      return true;
    },
    startPlaying: (_root, { name }) => {
      if (players[name]) throw new AuthenticationError("name must be unique");
      players[name] = { name, score: 0 };
      const token = uuidv4();
      tokensToNames[token] = name;
      console.log(`Hello ${name} 👋`);
      return { token };
    },
    provideRepresentative: (_root, { name }, _context) => {
      if (!_context.username)
        throw new AuthenticationError("you must be playing a game");
      if (currentGame.psychic.name !== _context.username)
        throw new AuthenticationError(
          "you must be a psychic to provide representatives"
        );
      if (currentGame.representative) {
        return false;
      }
      currentGame.representative = name;
      onRepresentativeSelected();
      return true;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req, connection }) => {
    const token = req
      ? req.headers.authorization
      : connection.context.authorization;
    return { username: tokensToNames[token] && tokensToNames[token] };
  },
});

server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`🚀 Server ready at ${url}`);
  console.log(`🚀 Subscriptions ready at ${subscriptionsUrl}`);
});

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("line", (input) => {
  if (input === "players") {
    console.table(Object.values(players));
  }else if (input === "start") {
    beginGame();
  } else if (input === "skip") {
    onRepresentativeSelected();
    onAllGuesses();
  } else if (input === "scores") {
    const sortedScores = Object.entries(totalScores)
      .map(([k, v]) => ({ player: k, score: v }))
      .sort((a, b) => a.score - b.score);
    console.table(sortedScores);
  } else if (input.startsWith("remove")) {
    const name = input.split(" ")[1];
    delete players[name];
    console.table(`deleted ${name}`);
  } else {
    console.log("wtf ❓");
  }
});
