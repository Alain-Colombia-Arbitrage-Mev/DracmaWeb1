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
        name: 'DRACMA Presale',
        description: 'Compra tokens $DRACMA en la preventa de DRACMA',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://dracma.org',
        icons: ['https://dracma.org/favicon.ico'],
      },
    }),
  ],
  transports: {
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
  },
});
