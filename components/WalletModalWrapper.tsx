
import React, { useContext } from 'react';
import { WalletContext } from '../contexts/WalletContext';
import { WalletModal } from './WalletModal';

export const WalletModalWrapper: React.FC = () => {
  const { showWalletModal, closeWalletModal } = useContext(WalletContext);
  return <WalletModal isOpen={showWalletModal} onClose={closeWalletModal} />;
};
