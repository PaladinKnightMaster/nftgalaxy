const dedicatedEndPoint = 'https://nftgalaxy.infura-ipfs.io';
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [dedicatedEndPoint, 'nftgalaxy.infura-ipfs.io'],
  },
  env: {
    BASE_URL: process.env.BASE_URL,
  },
};
module.exports = nextConfig;
// /https://nftgalaxy.infura-ipfs.io
