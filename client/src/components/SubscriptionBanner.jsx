import React from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';

const SubscriptionBanner = ({ subscription, onDismiss }) => {
  if (!subscription || !subscription.hasSubscription) return null;
  if (subscription.status === 'cancelled') return null;

  const daysLeft = subscription.trialDaysRemaining;
  const isExpired = subscription.status === 'expired' || !subscription.isValid;
  const isWarning = daysLeft <= 2 && daysLeft > 0 && subscription.plan === 'trial';

  if (!isExpired && !isWarning) return null;

  return (
    <div className={`flex items-center gap-4 px-6 py-3 rounded-full text-sm font-bold transition-all ${
      isExpired 
        ? 'bg-rose-50 text-rose-600 border border-rose-100' 
        : 'bg-amber-50 text-amber-600 border border-amber-100'
    }`}>
      {isExpired ? (
        <>
          <AlertTriangle size={18} />
          <span>Your subscription has expired. Renew to continue using Annapurna.</span>
        </>
      ) : (
        <>
          <Clock size={18} />
          <span>Trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. Upgrade to Pro to continue.</span>
        </>
      )}
      {onDismiss && (
        <button onClick={onDismiss} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default SubscriptionBanner;
