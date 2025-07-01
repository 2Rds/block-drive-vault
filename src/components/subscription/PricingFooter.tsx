
import React from 'react';

export const PricingFooter: React.FC = () => {
  return (
    <div className="text-center mt-12">
      <p className="text-gray-400 text-sm">
        All plans include blockchain authentication, end-to-end encryption, and secure file storage.
        <br />
        Cancel anytime. No hidden fees. Enterprise plans include custom SLAs.
      </p>
      <p className="text-gray-500 text-xs mt-2">
        * Free trial requires payment information. You'll be charged automatically after the trial period ends.
      </p>
    </div>
  );
};
