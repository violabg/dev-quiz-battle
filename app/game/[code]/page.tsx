import { GameClientPage } from "./GameClientPage";

export default async function GamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = await params;

  // We'll let the client page handle authentication and game loading
  return <GameClientPage code={resolvedParams.code} />;
}
