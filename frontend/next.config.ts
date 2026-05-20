import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  transpilePackages: [
    '@reown/appkit',
    '@reown/appkit-adapter-wagmi',
    '@reown/appkit-scaffold-ui',
    '@reown/appkit-ui',
    '@reown/appkit-common',
    '@reown/appkit-controllers',
    '@reown/appkit-utils',
    '@reown/appkit-wallet',
    '@reown/appkit-polyfills',
    '@walletconnect/core',
    '@walletconnect/sign-client',
    '@walletconnect/universal-provider',
    '@walletconnect/ethereum-provider',
    '@msgpack/msgpack',
    'lit',
    '@lit',
    '@lit-labs',
    '@selfxyz/qrcode',
    '@selfxyz/core',
    '@selfxyz/agent-sdk',
  ],
  webpack: (config) => {
    const emptyModule = path.resolve(__dirname, 'src/lib/empty-module.js')
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': emptyModule,
      'lokijs': emptyModule,
      'encoding': emptyModule,
      '@react-native-async-storage/async-storage': emptyModule,
    }
    config.module.rules.push({ test: /\.mjs$/, include: /node_modules/, type: 'javascript/auto' })
    return config
  },
};

export default nextConfig;
