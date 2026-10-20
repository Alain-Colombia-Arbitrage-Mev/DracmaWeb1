import { http, createConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = '147f1ced0fc70fd33bc82189d73ebb43';

export const wagmiConfig = createConfig({
  chains: [bsc],
  connectors: [
    injected(),
    walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: 'DRACMA',
        description: 'Conecta tu wallet para recibir DRACMA en BNB Smart Chain',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://dracma.club',
        icons: [typeof window !== 'undefined' ? `${window.location.origin}/apple-touch-icon.png` : 'https://dracma.club/apple-touch-icon.png'],
      },
    }),
  ],
  transports: {
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
  },
});
