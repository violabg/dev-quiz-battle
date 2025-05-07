Here's a summary of the game logic and requirements:

I. Game Setup & Lobby Phase:

Access & Initialization:

Users access a game via a unique code in the URL (e.g., /game/ABCDE).
The server (page.tsx) fetches initial game data using this code and authenticates the user.
If the game or user is not found, an error/not-found page is displayed.
Otherwise, the client-side GameClientPage.tsx takes over.
Client-Side State Management (useGameState):

Fetches detailed game information, including the list of players (GameWithPlayers type) and the host's profile.
Determines if the current user is the host.
Subscribes to real-time updates for:
Changes to the games table (e.g., status updates). If the game is deleted, the user is redirected.
Changes to game_players (e.g., new players joining, players leaving). The local player list is updated accordingly.
Lobby (GameLobby.tsx - when game.status === "waiting"):

Displays the game code for sharing (with a copy function).
Shows the current number of players out of max_players.
Lists all joined players with their avatar, name, and turn order. The host is badged.
Provides messages like "Waiting for players..." or "Waiting for host to start...".
Host Actions:
Can start the game if the minimum number of players (e.g., at least 2 and up to max_players) have joined. Starting the game updates game.status to "active".
All Players Actions:
Can leave the game.
If the host leaves, the game status is set to "completed" (effectively ending it).
If a regular player leaves, they are marked as inactive.
II. Active Gameplay Phase (GameRoom.tsx - when game.status === "active" or "completed"):

Turn-Based Structure (useGameTurns):

The game proceeds in turns, indicated by game.current_turn.
The hook useGameTurns determines the currentPlayer, if it's the user's turn (isCurrentPlayersTurn), and if it's the turn of the player who will go next (isNextPlayersTurn).
Question Lifecycle (useCurrentQuestion, useGameAnswers):

Question Selection/Creation (QuestionSelection.tsx):
Displayed when there's no currentQuestion.
Only the currentPlayer (if it's the user's turn) can interact with this.
The player chooses a language and difficulty for the question.
Submitting this form triggers handleCreateQuestion (from useCurrentQuestion), which presumably generates/fetches a question and stores it in the questions table, associating it with the game.id and created_by_player_id.
If the game was "waiting", its status is updated to "active" upon the first question creation.
Question Display (QuestionDisplay.tsx):
Once a currentQuestion is set, it's shown to all players.
Includes the question text, code samples (if any), and multiple-choice options.
A timer runs based on game.time_limit.
Answering Questions:
All players (including the one who created the question, though they might be implicitly excluded from scoring on their own question - this isn't explicitly clear) can submit an answer.
handleSubmitAnswer is called:
It records the selected_option, response_time_ms.
It calls a Supabase function/transaction (submitAnswer) which likely:
Validates the answer against currentQuestion.correct_answer.
Calculates score_earned (possibly using the calculate_score RPC function based on correctness and response_time_ms vs time_limit).
Stores the answer in the answers table.
Updates the player's total score in game_players.
If an answer is correct and it's the first correct answer for that question (was_winning_answer from submitAnswer result), the winner state for the current question is set, and the currentQuestion.ended_at timestamp is immediately updated, effectively ending the question for others.
Real-time Answer Updates (useGameAnswers):
Fetches and displays all answers submitted for the currentQuestion in real-time.
Turn Progression & Results:

End of Question: A question ends either when currentQuestion.ended_at is set (by a winning answer or by a server-side timer if not implemented client-side, though timeIsUp prop suggests client-side awareness).
Winner Determination: Logic runs to determine the winner of the question based on the first correct answer.
Turn Result (TurnResultCard.tsx):
Displayed after a question ends.
Shows the question's winner (if any).
A "Next Turn" button appears (showNextTurn state).
Advancing Turns (handleNextTurn from useGameTurns):
When "Next Turn" is clicked (likely by the current player or host):
The game.current_turn is updated in the database.
Question-related states (currentQuestion, winner, allAnswers, etc.) are reset via resetQuestionState.
The cycle repeats with the new currentPlayer selecting/creating a question.
Scoreboard (Scoreboard.tsx):

Displays the scores of all players, updated throughout the game.
Game Completion:

useEffect in GameRoom.tsx checks for game completion conditions when a question ends (currentQuestion.ended_at is set).
The game is considered "completed" if the number of unique players who have created a question (uniqueCreators) is equal to or greater than the total number of players in the game.
When this condition is met, updateGameStatus is called to set game.status to "completed".
The isRoundComplete flag is true when game.status === "completed".
III. General Requirements & Types:

Database (supabase.ts):
profiles: Stores user data.
games: Core game session data (code, host, status, turn, limits).
game_players: Links users to games, stores their score, turn order, and active status.
questions: Stores question details (text, language, difficulty, options, correct answer, creator).
answers: Records each player's attempt at a question (selection, correctness, time, score earned).
Key Types:
GameWithPlayers: A crucial type combining Game data with an array of Player (and their Profile) and the host's Profile.
QuestionWithAnswers: Combines Question data with its Answers (and the answering player's Profile).
GameLanguage, GameDifficulty: Union types for question parameters.
Real-time: Heavy reliance on Supabase real-time subscriptions for a dynamic experience.
User Experience: Toasts are used for notifications (e.g., copying game code, errors). Loaders indicate background activity.
In essence, the game is a turn-based quiz where:

Players join a lobby.
The host starts the game.
Players take turns; the current player creates/selects a question.
All players attempt to answer the displayed question within a time limit.
The first correct answer "wins" the question round. Points are awarded.
Turns advance until a game completion condition is met (e.g., everyone has asked a question).
Scores are tracked throughout.
