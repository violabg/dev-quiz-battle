after more testing i still have problems of answers sync beween players, the player that answering have disabled answers but no visual feedback of right or wrong answer, no feedback for other players as well. it is not always working

5. **Question Presentation and Answer Submission**

- Players are presented with a question and four possible answers.
- A timer starts as soon as the question is displayed.
- All players can submit their answers at any time during the timer.
- Ensure there are no race conditions in the Supabase database when multiple players submit answers simultaneously.

**Answer Validation:**

- Upon answer submission, immediately check if the answer is correct or incorrect.
- Once a player submits an answer, disable further submissions for that player for the current question.
- Display the answer status (correct/incorrect) to all players in real time.

**Incorrect Answer Handling:**

- If a player submits an incorrect answer, they cannot answer the same question again.
- Other players may continue submitting answers until someone answers correctly or the timer expires.

**turn Completion:**

- When a player submits the correct answer, or if the timer runs out with no correct answers, mark the question as completed.
- Pass the turn to the next player.

after all players had a turn, the game ends, by been marked as completed and the player with the most points wins.

make sure states ara handled correctly,across all players, avoid local states as much as possible, use the supabase realtime to sync the game state across all players.
