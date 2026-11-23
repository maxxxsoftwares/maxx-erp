/** @type {import('next').NextConfig} */
module.exports = {
  // Keep these as plain Node packages on the server. Bundling them breaks SignalR's WebSocket transport in production builds.
  experimental: { serverComponentsExternalPackages: ['@microsoft/signalr', 'ws', 'nodemailer'] },
};
