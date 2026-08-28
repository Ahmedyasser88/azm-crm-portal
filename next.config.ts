import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Server Actions default to a 1 MB body limit, far below the backend's
    // 10 MB per-attachment cap (FileStorageSettings.MaxFileSizeBytes) — without
    // this, any upload over ~1 MB fails with an opaque Next.js 500 before
    // uploadAttachmentAction ever runs, instead of the backend's clean
    // Validation.FileTooLarge 400. 12 MB gives headroom over the 10 MB cap for
    // multipart boundary/header overhead.
    serverActions: {
      bodySizeLimit: "12mb",
    },
    // proxy.ts runs on every non-static route, including the
    // attachment-upload Server Action, and separately caps request bodies at
    // 10 MB by default — independent of serverActions.bodySizeLimit above.
    // Over that cap the body is silently truncated mid-multipart-boundary
    // ("Request body exceeded 10MB ... Only the first 10MB will be
    // available"), which then fails as "Unexpected end of form" instead of
    // ever reaching uploadAttachmentAction. Must match/exceed the limit above.
    proxyClientMaxBodySize: "12mb",
  },
};

export default nextConfig;
