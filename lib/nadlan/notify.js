// Wires alerts to real email sending. Kept apart from the importer and the
// listing code so those stay testable without a mail provider.
import { formatPrice } from '../../components/matzpen/format.js';
import { notifyNewListing, notifyScoreChanges } from './alerts.js';
import { mailConfigured, newListingEmail, scoreChangeEmail, sendMail, siteUrl } from './mail.js';

export function scoreChangeNotifier(db) {
    if (!mailConfigured()) return undefined;
    return (changes) => notifyScoreChanges(db, changes, { send: sendMail, base: siteUrl(), buildEmail: scoreChangeEmail });
}

export async function announceListing(db, listing) {
    if (!mailConfigured()) return 0;
    return notifyNewListing(db, listing, {
        send: sendMail,
        base: siteUrl(),
        buildEmail: (args) => newListingEmail({ ...args, priceText: formatPrice(listing.price) })
    });
}
