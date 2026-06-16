import type { Member } from "@/lib/members";
import OnboardingReviewCard from "@/components/onboarding-review-card";

type PendingOnboardingReviewsProps = {
  members: Member[];
  canWrite: boolean;
};

export default function PendingOnboardingReviews({
  members,
  canWrite,
}: PendingOnboardingReviewsProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Pending onboarding reviews
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Review member submissions, edit details, and confirm members to add them
            to the roster.
          </p>
        </div>
        <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
          {members.length} pending
        </span>
      </div>

      {members.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
          No pending onboarding submissions. Share the onboarding link when the
          season starts.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {members.map((member) => (
            <OnboardingReviewCard
              key={member.id}
              member={member}
              canWrite={canWrite}
            />
          ))}
        </div>
      )}
    </section>
  );
}
