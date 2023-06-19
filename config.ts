const debug = process.env.DEBUG

const config = {
  debug,
  explorer (txHash: string): string {
    return (process.env.EXPLORER_URL ?? 'https://explorer.harmony.one/#/tx/{{txId}}').replace('{{txId}}', txHash)
  },
  walletConnectId: process.env.WALLET_CONNECT_ID ?? '',
  defaultRpc: process.env.DEFAULT_RPC ?? 'https://api.harmony.one',
  tld: process.env.TLD ?? 'country',
  chainParameters: process.env.CHAIN_PARAMETERS
    ? JSON.parse(process.env.CHAIN_PARAMETERS)
    : {
        chainId: '0x63564C40', // A 0x-prefixed hexadecimal string
        chainName: 'Harmony Mainnet Shard 0',
        nativeCurrency: {
          name: 'ONE',
          symbol: 'ONE',
          decimals: 18
        },
        rpcUrls: ['https://api.harmony.one'],
        blockExplorerUrls: ['https://explorer.harmony.one/']
      }
}

export default config
