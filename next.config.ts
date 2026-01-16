// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 傳統的 domains 配置（向後兼容）
    domains: [
      'testoss-img-pon.oss-cn-hongkong.aliyuncs.com',
      'testoss-img-pan.oss-cn-hongkong.aliyuncs.com',
      'your-other-oss-domain.aliyuncs.com',
    ],
    // 新的 remotePatterns 配置（推薦）
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'testoss-img-pan.oss-cn-hongkong.aliyuncs.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'testoss-img-pon.oss-cn-hongkong.aliyuncs.com',
        pathname: '/**',
      },
      // 添加其他可能的 OSS 域名
      {
        protocol: 'https',
        hostname: '**.oss-cn-hongkong.aliyuncs.com',
        pathname: '/**',
      },
    ],
    // 可選：圖片優化設置
    formats: ['image/webp', 'image/avif'],
    // 可選：禁用圖片優化（如果不需要）
    // unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  // 可選：增加靜態資源緩存
  async headers() {
    return [
      {
        source: '/:path*.{jpg,jpeg,png,gif,webp,avif}',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;