import { useEffect } from "react";

interface SeoOptions {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
}

const siteName = "Yono Todolist";
const defaultSiteUrl = "http://localhost:5173";

const upsertMeta = (attr: "name" | "property", value: string, content: string) => {
  let tag = document.head.querySelector(`meta[${attr}="${value}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, value);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

export const useSeo = ({ title, description, path, noIndex = false }: SeoOptions) => {
  useEffect(() => {
    const siteUrl = (import.meta.env.VITE_SITE_URL || defaultSiteUrl).replace(/\/$/, "");
    const safePath = path || window.location.pathname || "/";
    const canonicalUrl = `${siteUrl}${safePath.startsWith("/") ? safePath : `/${safePath}`}`;
    const pageTitle = `${title} | ${siteName}`;

    document.title = pageTitle;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", pageTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", pageTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
    upsertCanonical(canonicalUrl);
  }, [description, noIndex, path, title]);
};
