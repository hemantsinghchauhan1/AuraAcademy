import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://auraacademy.vercel.app"; // Fallback URL or get from environment

  // Static routes
  const staticRoutes = [
    "",
    "/courses",
    "/leaderboard",
    "/login",
    "/register"
  ];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8
  }));
}
