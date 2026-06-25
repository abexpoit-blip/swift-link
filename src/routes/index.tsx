import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-4xl font-bold">Swift Link</h1>
        <p className="text-muted-foreground">
          Advanced URL shortener — design coming next.
        </p>
      </div>
    </main>
  );
}
