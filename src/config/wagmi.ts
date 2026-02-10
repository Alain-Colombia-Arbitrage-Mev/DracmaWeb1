import { http, createConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = '147f1ced0fc70fd33bc82189d73ebb43';

export const wagmiConfig = createConfig({
  chains: [bsc],
  connectors: [
    injected(),
    walletConnect({ projectId, showQrModal: true }),
  ],
  transports: {
    [bsc.id]: http(),
  },
});
