import { notFound } from "next/navigation";
import PacketReviewPageClient from "@/components/packet-review-page-client";
import { createClient } from "@/lib/supabase/server";
import type { Competition } from "@/lib/competitions";

type ReviewPacketPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewPacketPage({ params }: ReviewPacketPageProps) {
  const { id } = await params;
  const supabase = await createClient();

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
