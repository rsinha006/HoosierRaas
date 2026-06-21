export function getNextSeasonLabel(seasonLabel: string) {
  const [startYearText] = seasonLabel.split("-");
  const startYear = Number(startYearText);

  return `${startYear + 1}-${startYear + 2}`;
}
