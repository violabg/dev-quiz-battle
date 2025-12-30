# React Component Patterns

## Form Components with React Hook Form

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

type FormData = {
  gameCode: string;
  nickname: string;
};

export const JoinGameForm = ({ onJoin }: Props) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(gameCodeSchema),
  });

  return (
    <form onSubmit={handleSubmit(onJoin)}>
      <input {...register("gameCode")} placeholder="Enter game code" />
      {errors.gameCode && <span>{errors.gameCode.message}</span>}
      <button type="submit">Join Game</button>
    </form>
  );
};
```

## State Management with Convex

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export const GameRoom = ({ gameId }: Props) => {
  const game = useQuery(api.queries.getGame, { gameId });
  const submitAnswer = useMutation(api.mutations.submitAnswer);

  const handleAnswer = async (answer: string) => {
    await submitAnswer({ gameId, answer });
  };

  if (game === undefined) return <div>Loading...</div>;

  return <div>{/* Game content */}</div>;
};
```

## Error Boundaries

Wrap components that might throw:

```typescript
export const GameComponent = () => {
  try {
    // Component logic
  } catch (error) {
    return <div className="text-red-600">Error loading game</div>;
  }
};
```
