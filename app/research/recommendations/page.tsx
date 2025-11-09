import Link from "next/link";

export default function RecommendationsPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-normal">Recommendations</h1>
      <p className="text-muted-foreground">
        This section is being refreshed. In the meantime, explore Research or
        your Portfolio.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/research"
          className="px-4 py-2 rounded bg-primary-500/30 hover:bg-primary-500/50 transition-colors"
        >
          Go to Research
        </Link>
        <Link
          href="/portfolio"
          className="px-4 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors"
        >
          Go to Portfolio
        </Link>
      </div>
    </div>
  );
}
