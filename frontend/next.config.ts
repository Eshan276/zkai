import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // isomorphic-ws uses named WebSocket export that doesn't exist in browser builds.
      // Redirect to our shim that re-exports window.WebSocket.
      'isomorphic-ws': './lib/ws-browser-shim.js',
    },
  },
};

export default nextConfig;
