import { TruckIcon, ReturnIcon, LockIcon } from './icons';

export function TrustBar() {
  return (
    <div className="trust-bar">
      <span className="trust-item">
        <TruckIcon width={17} height={17} />
        משלוח חינם, 3–5 ימי עסקים
      </span>
      <span className="trust-item">
        <ReturnIcon width={17} height={17} />
        החזרה תוך 14 יום
      </span>
      <span className="trust-item">
        <LockIcon width={17} height={17} />
        תשלום מאובטח דרך Stripe
      </span>
    </div>
  );
}
