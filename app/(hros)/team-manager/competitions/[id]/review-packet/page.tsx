import { notFound, redirect } from "next/navigation";
import PacketReviewPageClient from "@/components/packet-review-page-client";
import { getUserMember } from "@/lib/get-user-member";
import { hasWriteAccess } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Competition } from "@/lib/competitions";

type ReviewPacketPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewPacketPage({ params }: ReviewPacketPageProps) {
  const { id } = await params;
  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  if (!hasWriteAccess(userMember?.exec_title ?? null, "team-manager")) {
    redirect(`/team-manager/competitions/${id}`);
  }

  const { data, error } = await supabase
    .from("competitions")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  const competition = data as Pick<Competition, "id" | "name"> | null;

  if (error || !competition) {
    notFound();
  }

  return (
    <PacketReviewPageClient
      competitionId={competition.id}
      competitionName={competition.name}
    />
  );
}
