import Link from "next/link";
import { getTrackGraduates } from "@/lib/tracks/graduates";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Phantom Operatives — Honor Roll · BreachLab",
  description:
    "Every operative who has cleared the Phantom track: Linux privesc, container escape, and Kubernetes pod escape.",
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function PhantomGraduatesPage() {
  const graduates = await getTrackGraduates("phantom", "phantom_master");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <Link
          href="/tracks/phantom"
          className="text-muted text-xs hover:text-amber"
        >
          ← Phantom Track
        </Link>
        <h1 className="text-red text-2xl">Phantom Operatives</h1>
        <p className="text-sm text-muted">
          Every operative who has cleared the full Phantom track — thirty-one
          public levels plus the hidden graduation chain.
        </p>
      </div>

      {graduates.length === 0 ? (
        <section className="border border-red/30 p-6 text-center">
          <p className="text-sm text-muted mb-1">
            No Phantom Operatives yet.
          </p>
          <p className="text-red">Be the first.</p>
        </section>
      ) : (
        <section>
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Operative</th>
                <th className="text-right py-2">Graduated</th>
                <th className="text-right py-2 pl-4">Certificate</th>
              </tr>
            </thead>
            <tbody>
              {graduates.map((g, idx) => (
                <tr
                  key={`${g.username}-${g.awardedAt.toISOString()}`}
                  className="border-b border-border/50"
                >
                  <td className="py-2 text-muted">{idx + 1}</td>
                  <td className="py-2">
                    <Link
                      href={`/u/${g.username}`}
                      className="text-amber hover:underline"
                    >
                      @{g.username}
                    </Link>
                  </td>
                  <td className="py-2 text-right text-muted text-xs">
                    {formatDate(g.awardedAt)}
                  </td>
                  <td className="py-2 pl-4 text-right">
                    <Link
                      href={`/u/${g.username}/certificate/phantom`}
                      className="text-red text-xs hover:underline"
                    >
                      view →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="text-[10px] text-muted italic">
        Honor roll ordering is by graduation date. Phantom does not expose a
        speedrun leaderboard — graduation is the recognition.
      </p>
    </div>
  );
}
