import { router, type Href } from 'expo-router';

/** Back when there is somewhere to go back to; otherwise (a deep link, a
 * refreshed web page) to a sensible screen instead of doing nothing. */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
