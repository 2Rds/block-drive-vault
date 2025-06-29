import React from 'react';
interface WalletConnectionTabsProps {
  selectedMethod: 'dynamic' | 'traditional';
  onMethodChange: (method: 'dynamic' | 'traditional') => void;
}
export const WalletConnectionTabs = ({
  selectedMethod,
  onMethodChange
}: WalletConnectionTabsProps) => {
  return;
};