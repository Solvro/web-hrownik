import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Recruitment imports upload the XLSX through a server action. Files
      // are capped at 5 MB in the app; the extra headroom covers multipart
      // overhead and the column-mapping payload sent along with the file.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
