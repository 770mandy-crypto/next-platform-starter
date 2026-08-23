// Display names for the data providers.
//
// Shared rather than duplicated per component: the market map previously
// carried its own ternary that mapped anything not Stooq to "Yahoo Finance",
// so once Twelve Data was added the page credited the wrong source. A claim
// about where the numbers came from has to be right, so there is one table.

export const PROVIDER_NAMES = {
    twelvedata: 'Twelve Data',
    yahoo: 'Yahoo Finance',
    stooq: 'Stooq',
    finnhub: 'Finnhub'
};

export function providerName(provider) {
    return PROVIDER_NAMES[provider] || provider || 'לא ידוע';
}
