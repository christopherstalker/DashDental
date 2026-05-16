import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: [
        "/",
        "/pricing",
        "/qa",
        "/faq",
        "/demo",
        "/trial",
        "/security",
        "/privacy",
        "/terms",
        "/login",
        "/register",
      ],
      disallow: ["/api/", "/dashboard", "/inbox", "/billing", "/platform"],
      userAgent: "*",
    },
    sitemap: "https://dashdental.space/sitemap.xml",
  };
}
