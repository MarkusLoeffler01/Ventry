// addressCountry is a freeform text field (RegisterWizard/CompleteProfileWizard
// have no country picker), but Stripe requires a strict ISO 3166-1 alpha-2
// code for account.country and individual.address.country — an unmapped
// value throws country_invalid, the same class of hard failure business_profile.url
// had. Resolve what we can; callers must omit the field entirely on a miss
// rather than guess, and let Stripe's hosted onboarding collect it instead.

const COMMON_COUNTRY_NAMES: Record<string, string> = {
    germany: "DE",
    deutschland: "DE",
    austria: "AT",
    österreich: "AT",
    oesterreich: "AT",
    switzerland: "CH",
    schweiz: "CH",
    "united states": "US",
    "united states of america": "US",
    usa: "US",
    "united kingdom": "GB",
    uk: "GB",
    "great britain": "GB",
    france: "FR",
    italy: "IT",
    spain: "ES",
    netherlands: "NL",
    belgium: "BE",
    luxembourg: "LU",
    poland: "PL",
    "czech republic": "CZ",
    czechia: "CZ",
    denmark: "DK",
    sweden: "SE",
    norway: "NO",
    finland: "FI",
    ireland: "IE",
    portugal: "PT",
    canada: "CA",
    australia: "AU",
    "new zealand": "NZ",
};

function isValidIsoRegionCode(code: string): boolean {
    if (!/^[A-Z]{2}$/.test(code)) return false;
    try {
        const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
        return !!name && name !== code && name !== "Unknown Region";
    } catch {
        return false;
    }
}

export function resolveIsoCountryCode(input: string | null | undefined): string | null {
    if (!input) return null;
    const trimmed = input.trim();
    if (!trimmed) return null;

    const asCode = trimmed.toUpperCase();
    if (isValidIsoRegionCode(asCode)) return asCode;

    const byName = COMMON_COUNTRY_NAMES[trimmed.toLowerCase()];
    return byName ?? null;
}
