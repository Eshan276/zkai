// Browser shim for isomorphic-ws
// isomorphic-ws is used by @midnight-ntwrk/midnight-js-indexer-public-data-provider
// In the browser, use native window.WebSocket
const WS = typeof window !== 'undefined' ? window.WebSocket : undefined;
export default WS;
export { WS as WebSocket };
