# Score Calculation

[← Back to Convex Docs](./convex.md)

## Purpose

Calculates a player's score for a question based on how quickly they answered, rewarding faster responses.

## How it works

- Score calculation is implemented in the `submitAnswer` mutation in `convex/mutations/answers.ts`.
- Returns a score: base score (1.0) plus a time bonus (ranging from 0.0 to 9.0).
- The total score can range from 1.0 to 10.0 depending on response time.

## Implementation

The scoring logic is embedded in the answer submission:

```typescript
function calculateScore(responseTimeMs: number, timeLimitMs: number): number {
  const baseScore = 1.0;
  let timeBonus = 0.0;

  const t1 = timeLimitMs * 0.05; // 5%
  const t2 = timeLimitMs * 0.1; // 10%
  const t3 = timeLimitMs * 0.15; // 15%
  const t4 = timeLimitMs * 0.2; // 20%
  const t5 = timeLimitMs * 0.3; // 30%
  const t6 = timeLimitMs * 0.4; // 40%
  const t7 = timeLimitMs * 0.55; // 55%
  const t8 = timeLimitMs * 0.7; // 70%
  const t9 = timeLimitMs * 0.85; // 85%

  if (responseTimeMs < t1) {
    timeBonus = 9.0;
  } else if (responseTimeMs < t2) {
    timeBonus = 8.0;
  } else if (responseTimeMs < t3) {
    timeBonus = 7.0;
  } else if (responseTimeMs < t4) {
    timeBonus = 6.0;
  } else if (responseTimeMs < t5) {
    timeBonus = 5.0;
  } else if (responseTimeMs < t6) {
    timeBonus = 4.0;
  } else if (responseTimeMs < t7) {
    timeBonus = 3.0;
  } else if (responseTimeMs < t8) {
    timeBonus = 2.0;
  } else if (responseTimeMs < t9) {
    timeBonus = 1.0;
  } else if (responseTimeMs < timeLimitMs) {
    timeBonus = 0.5;
  }

  return baseScore + timeBonus;
}
```

This function is called within the `submitAnswer` mutation:

```typescript
export const submitAnswer = mutation({
  args: {
    question_id: v.id("questions"),
    selected_option: v.number(),
    response_time_ms: v.number(),
  },
  handler: async (ctx, args) => {
    // ... get question, game, player, etc.

    const isCorrect = args.selected_option === question.correct_answer;
    const scoreEarned = isCorrect
      ? calculateScore(args.response_time_ms, game.time_limit * 1000)
      : 0;

    // ... insert answer and update scores
  },
});
```

- The function divides the time limit into intervals.
- The faster the answer, the higher the bonus (up to 9.0).
- If response time equals or exceeds time limit, bonus is 0.0, resulting in score of 1.0.

## Usage

Score is automatically calculated when submitting an answer:

```typescript
const submitAnswer = useMutation(api.mutations.answers.submitAnswer);
await submitAnswer({
  question_id: questionId,
  selected_option: 2,
  response_time_ms: 3500,
});
```
