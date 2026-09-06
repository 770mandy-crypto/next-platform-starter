import 'styles/store.css';
import { CartProvider } from 'components/store/cart-context';
import { StoreHeader } from 'components/store/header';
import { CartDrawer } from 'components/store/cart-drawer';
import { StoreFooter } from 'components/store/footer';
import { BasketBar } from 'components/store/basket-bar';
import { getCurrentUser } from 'lib/store/current-user';

export const metadata = {
  // `absolute` stops the root layout's "%s | Netlify" template (meant for the
  // unrelated starter/demo pages) from also wrapping this store's titles.
  title: { template: '%s | AM Clothing', default: 'AM Clothing', absolute: 'AM Clothing' },
  description: 'קולקציית הפתיחה של AM Clothing — כותנה כבדה, רקמת זהב, סדרה מוגבלת.'
};

// This is a NESTED layout, not the app's root layout — app/layout.jsx still owns
// <html>/<body> and switches lang/dir/body class for the /store subtree based on
// the request path (see middleware.js + app/layout.jsx).
export default async function StoreLayout({ children }) {
  const { user } = await getCurrentUser();

  return (
    <div className="store-app">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap"
      />
      <CartProvider>
        <StoreHeader user={user} />
        <main id="top">{children}</main>
        <StoreFooter />
        <CartDrawer />
        <BasketBar />
      </CartProvider>
    </div>
  );
}
