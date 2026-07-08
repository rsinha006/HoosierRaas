/** Mirrors the exact calculation archive_season uses in SQL (add 1 year to the
 *  real start/end dates, then take the years) so the preview can never disagree
 *  with what actually gets created — string-parsing the label text instead would
 *  only coincidentally match as long as every season happens to run Aug 1-Jul 31. */
export function getNextSeasonLabel(startsOn: string, endsOn: string) {
  const nextStarts = new Date(`${startsOn}T00:00:00Z`);
  nextStarts.setUTCFullYear(nextStarts.getUTCFullYear() + 1);

  const nextEnds = new Date(`${endsOn}T00:00:00Z`);
  nextEnds.setUTCFullYear(nextEnds.getUTCFullYear() + 1);

  return `${nextStarts.getUTCFullYear()}-${nextEnds.getUTCFullYear()}`;
}
