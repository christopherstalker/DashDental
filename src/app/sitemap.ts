import type { MetadataRoute } from "next";

const publicRoutes = [
  "",
  "/pricing",
  "/docs",
  "/support",
  "/about",
  "/integrations-guide",
  "/qa",
  "/faq",
  "/demo",
  "/trial",
  "/security",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://dashdental.space";
  const lastModified = new Date("2026-05-04T00:00:00.000Z");

  return publicRoutes.map((route) => ({
    changeFrequency: route === "" ? "weekly" : "monthly",
    lastModified,
    priority: route === "" ? 1 : 0.7,
    url: `${baseUrl}${route}`,
  }));
}
