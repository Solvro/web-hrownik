export interface NumericForms {
  singular: string;
  paucal: string;
  plural: string;
}

export const polishNouns = {
  członek: {
    singular: "członek",
    paucal: "członków",
    plural: "członków",
  },
  projekt: {
    singular: "projekt",
    paucal: "projekty",
    plural: "projektów",
  },
  repozytorium: {
    singular: "repozytorium",
    paucal: "repozytoria",
    plural: "repozytoriów",
  },
  zdarzenie: {
    singular: "zdarzenie",
    paucal: "zdarzenia",
    plural: "zdarzeń",
  },
  kontrybucja: {
    singular: "kontrybucja",
    paucal: "kontrybucje",
    plural: "kontrybucji",
  },
  issue: {
    singular: "issue",
    paucal: "issue",
    plural: "issues",
  },
  "pull request": {
    singular: "pull request",
    paucal: "pull requesty",
    plural: "pull requestów",
  },
  wynik: {
    singular: "wynik",
    paucal: "wyniki",
    plural: "wyników",
  },
  element: {
    singular: "element",
    paucal: "elementy",
    plural: "elementów",
  },
} satisfies Record<string, NumericForms>;

export type PolishNoun = keyof typeof polishNouns;

export function getNumericForm(count: number, forms: NumericForms): string {
  const absoluteCount = Math.abs(count);
  const lastTwoDigits = absoluteCount % 100;
  if (absoluteCount === 1) {
    return forms.singular;
  }
  if (lastTwoDigits >= 12 && lastTwoDigits <= 14) {
    return forms.plural;
  }

  const lastDigit = absoluteCount % 10;
  const isMany = lastDigit <= 1 || lastDigit >= 5;
  return isMany ? forms.plural : forms.paucal;
}

export function declineNumeric(
  count: number,
  nounOrForms: PolishNoun | NumericForms,
): string {
  const forms =
    typeof nounOrForms === "string" ? polishNouns[nounOrForms] : nounOrForms;
  return `${count} ${getNumericForm(count, forms)}`;
}
