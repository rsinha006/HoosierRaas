import Link from "next/link";

type MemberDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link
          href="/members"
          className="text-sm font-medium text-[#990000] transition hover:text-[#7a0000]"
        >
          ← Back to members
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Member Details</h1>
        <p className="mt-2 text-zinc-600">
          Member profile page coming soon.
        </p>
        <p className="mt-4 text-sm text-zinc-500">Member ID: {id}</p>
      </div>
    </div>
  );
}
