import { useEffect } from "react";

import { env } from "@/lib/env";

export interface PageMeta {
  title?: string;
  description?: string;
  image?: string;
  twitterCard?: "summary" | "summary_large_image";
  type?: "website" | "profile" | "article";
}

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function removeMeta(attribute: "name" | "property", key: string) {
  document.head
    .querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
    ?.remove();
}

export function usePageMeta({
  title,
  description,
  image,
  twitterCard,
  type = "website",
}: PageMeta) {
  useEffect(() => {
    const pageTitle = title ? `${title} · ${env.appName}` : env.appName;
    const pageDescription = description ?? `Explore ${env.appName}.`;

    document.title = pageTitle;
    upsertMeta("name", "description", pageDescription);
    upsertMeta("property", "og:title", pageTitle);
    upsertMeta("property", "og:description", pageDescription);
    upsertMeta("property", "og:url", window.location.href);
    upsertMeta("property", "og:type", type);
    upsertMeta(
      "name",
      "twitter:card",
      twitterCard ?? (image ? "summary_large_image" : "summary"),
    );
    upsertMeta("name", "twitter:title", pageTitle);
    upsertMeta("name", "twitter:description", pageDescription);

    if (image) {
      upsertMeta("property", "og:image", image);
      upsertMeta("name", "twitter:image", image);
    } else {
      removeMeta("property", "og:image");
      removeMeta("name", "twitter:image");
    }
  }, [description, image, title, twitterCard, type]);
}