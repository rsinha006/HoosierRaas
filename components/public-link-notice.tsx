/** Says what these links are, wherever one is handed out. "Generate Onboarding Link"
 *  implied a private address that could be taken back later; none of the public form
 *  links are that, and someone sharing one should know before they send it. */
export default function PublicLinkNotice({
  path,
  className = "",
}: {
  path: string;
  className?: string;
}) {
  return (
    <p className={`text-xs text-zinc-500 ${className}`}>
      Permanent public link to{" "}
      <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700">{path}</code> — it
      can&apos;t be expired or revoked, and anyone who has it can submit.
    </p>
  );
}
