import { Chain, createPublicClient, http } from 'viem';
import { ENV } from '../constant/env';

export const chainConfig: Chain = {
  name: ENV.CHAIN_NAME,
  id: +ENV.CHAIN_ID,
  rpcUrls: {
    default: {
      http: [ENV.RPC_URL_1, ENV.RPC_URL_2, ENV.RPC_URL_3],
    },
  },
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
};

export const publicClient = createPublicClient({
  chain: chainConfig,
  transport: http(),
});
