# Game Balance and Tuning

## Scoring Parameters

```typescript
const SCORE_CONFIGURATION = {
  baseScore: {
    easy: 10,
    medium: 20,
    hard: 30,
  },
  timeBonus: {
    maxSeconds: 30,
    pointsPerSecond: 1,
  },
  penalties: {
    incorrect: 0,
    timeout: 0,
  },
};
```

## Game Settings

- **Default rounds**: 5 rounds per game
- **Questions per round**: 1 per player
- **Time limit per question**: 30 seconds
- **Min/Max players**: 2-8 players
- **Difficulty distribution**: 50% medium, 30% easy, 20% hard

## Difficulty Tuning

Adjust if games are too easy/hard:

- **Easy difficulty**: Basic syntax, simple logic
- **Medium difficulty**: Algorithm concepts, edge cases
- **Hard difficulty**: Advanced patterns, optimization

## Win Conditions

- Most points after all rounds wins
- Ties: Player with faster average answer time wins
- Can't rejoin game once started
- Must have answered at least 50% of questions to qualify

