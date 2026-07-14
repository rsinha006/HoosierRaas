import {
  formatDurationRange,
  formatRosterRange,
  type Competition,
} from "@/lib/competitions";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatFeeAmount(amount: number, isPerPerson: boolean) {
  return `${currencyFormatter.format(amount)}${isPerPerson ? " / person" : ""}`;
}

export type FeeRow = {
  id: string;
  name: string;
  amount: number;
  is_per_person: boolean;
  is_refundable: boolean;
  due_date: string | null;
};

export type ContactRow = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
};

type RegistrationDetailsProps = {
  competition: Pick<
    Competition,
    | "roster_min"
    | "roster_max"
    | "min_performance_duration"
    | "max_performance_duration"
    | "mix_format"
    | "per_person_registration_cost"
    | "tech_rehearsal_required"
  >;
  fees: FeeRow[];
  contacts: ContactRow[];
};

export default function RegistrationDetails({
  competition,
  fees,
  contacts,
}: RegistrationDetailsProps) {
  const rosterRange = formatRosterRange(competition.roster_min, competition.roster_max);
  const durationRange = formatDurationRange(
    competition.min_performance_duration,
    competition.max_performance_duration,
  );

  const hasSummary =
    rosterRange !== null ||
    durationRange !== null ||
    competition.mix_format !== null ||
    competition.per_person_registration_cost !== null ||
    competition.tech_rehearsal_required !== null;

  if (!hasSummary && fees.length === 0 && contacts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-semibold text-zinc-900">Registration Details</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Pulled from the registration packet — check against the packet PDF if anything
        looks off.
      </p>

      {hasSummary ? (
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rosterRange !== null ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Roster size
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{rosterRange}</dd>
            </div>
          ) : null}
          {durationRange !== null ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Performance duration
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{durationRange}</dd>
            </div>
          ) : null}
          {competition.mix_format ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Mix format
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{competition.mix_format}</dd>
            </div>
          ) : null}
          {competition.per_person_registration_cost !== null ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Per-person registration cost
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {currencyFormatter.format(competition.per_person_registration_cost)}
              </dd>
            </div>
          ) : null}
          {competition.tech_rehearsal_required !== null ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Tech rehearsal
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {competition.tech_rehearsal_required ? "Required" : "Not required"}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {fees.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-900">Fees</h3>
          <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {fees.map((fee) => (
              <li key={fee.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="text-zinc-900">
                  {fee.name}
                  {fee.is_refundable ? (
                    <span className="ml-2 text-xs text-zinc-500">(refundable)</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3 text-zinc-600">
                  {fee.due_date ? <span className="text-xs">Due {fee.due_date}</span> : null}
                  <span className="font-medium text-zinc-900">
                    {formatFeeAmount(fee.amount, fee.is_per_person)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {contacts.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-900">Contacts</h3>
          <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {contacts.map((contact) => (
              <li key={contact.id} className="px-4 py-2.5 text-sm">
                <p className="font-medium text-zinc-900">
                  {contact.name}
                  {contact.role ? (
                    <span className="ml-2 text-xs font-normal text-zinc-500">
                      {contact.role}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  {[contact.email, contact.phone].filter(Boolean).join(" · ") || "—"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
