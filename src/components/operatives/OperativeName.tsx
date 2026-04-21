import Link from "next/link";

type Props = {
  username: string | null;
  isHallOfFame?: boolean | null;
  href?: string | null;
  className?: string;
  anonymousLabel?: string;
};

// Universal nickname renderer. Applies the Hall of Fame "golden" styling
// when the underlying user account has been admin-confirmed for at least
// one security credit (users.is_hall_of_fame = true). Used everywhere a
// username appears so the visual treatment is consistent — leaderboard,
// submissions feed, profile, graduates list, certificate header.
export function OperativeName({
  username,
  isHallOfFame,
  href,
  className = "",
  anonymousLabel = "Anonymous",
}: Props) {
  if (!username) {
    return <span className="text-muted italic">{anonymousLabel}</span>;
  }

  const baseClasses = isHallOfFame
    ? "text-[#facc15] font-medium drop-shadow-[0_0_6px_rgba(250,204,21,0.45)] transition-all hover:text-[#fde047] hover:drop-shadow-[0_0_10px_rgba(250,204,21,0.75)]"
    : "text-amber hover:underline";

  const inner = (
    <span className={`${baseClasses} ${className}`.trim()}>{username}</span>
  );

  if (href === null) return inner;
  return <Link href={href ?? `/u/${username}`}>{inner}</Link>;
}
