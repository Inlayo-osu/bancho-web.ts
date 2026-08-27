import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

for (const envFile of [".env"]) {
  try {
    const contents = readFileSync(path.join(root, envFile), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
      }
    }
  } catch {}
}

const appName = process.env.VITE_APP_NAME || "Inlayo";
const siteUrl = (process.env.META_SITE_URL || "https://osu.inlayo.com").replace(/\/$/, "");
const apiTarget = (process.env.META_API_TARGET || "https://api.inlayo.com").replace(/\/$/, "");
const apiHost = process.env.META_API_HOST || "api.inlayo.com";
const port = Number(process.env.META_PORT || 4173);

const botPattern = /discordbot|twitterbot|facebookexternalhit|slackbot|whatsapp|telegrambot|googlebot/i;
const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function metaTag(attribute, key, content) {
  return `<meta ${attribute}="${attribute === "property" ? key : key}" content="${escapeHtml(content)}" />`;
}

function modeName(modeId) {
  const modeNames = {
    0: "osu!standard",
    1: "osu!taiko",
    2: "osu!catch",
    3: "osu!mania",
    4: "rx!standard",
    5: "rx!taiko",
    6: "rx!catch",
    8: "ap!standard",
  };
  return modeNames[modeId] || "osu!standard";
}

const countryDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(countryCode) {
  if (!countryCode || countryCode.toLowerCase() === "xx") return "Unknown";
  return countryDisplayNames.of(countryCode.toUpperCase()) || countryCode.toUpperCase();
}

function mapLength(seconds) {
  const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function injectMeta(html, { title, description, image, url, type = "website" }) {
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    metaTag("name", "description", description),
    metaTag("property", "og:title", title),
    metaTag("property", "og:description", description),
    metaTag("property", "og:url", url),
    metaTag("property", "og:type", type),
    metaTag("name", "twitter:card", image ? "summary_large_image" : "summary"),
    metaTag("name", "twitter:title", title),
    metaTag("name", "twitter:description", description),
    ...(image ? [metaTag("property", "og:image", image), metaTag("name", "twitter:image", image)] : []),
  ].join("\n    ");
  return html.replace(/<title>.*?<\/title>/s, "").replace("</head>", `    ${tags}\n  </head>`);
}

async function fetchJson(pathname) {
  const requestUrl = `${apiTarget}${pathname}`;
  const response = await fetch(requestUrl, {
    headers: { Accept: "application/json", ...(apiHost ? { Host: apiHost } : {}) },
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`API returned ${response.status} for ${requestUrl} with Host ${apiHost || "default"}: ${responseText.slice(0, 200)}`);
  }
  const body = JSON.parse(responseText);
  if (body.status !== "success" || body.data === undefined) throw new Error("Invalid API response");
  return body.data;
}

async function getMetadata(pathname, searchParams = new URLSearchParams()) {
  const playerMatch = pathname.match(/^\/u\/([^/]+)$/);
  if (playerMatch) {
    const playerId = decodeURIComponent(playerMatch[1]);
    let player;
    try {
      player = await fetchJson(`/v2/players/${encodeURIComponent(playerId)}`);
    } catch (error) {
      console.error(`Could not load player metadata for ${pathname}:`, error);
      return {
        title: `Player ${playerId} | ${appName}`,
        description: `View player ${playerId}'s profile on ${appName}.`,
        image: `${process.env.VITE_AVATARS_BASE_URL || "https://a.inlayo.com"}/${encodeURIComponent(playerId)}`,
        type: "profile",
      };
    }
    let stats;
    try {
      stats = (await fetchJson(`/v2/players/${player.id}/stats`)).find((entry) => entry.mode === 0);
    } catch {}
    return {
      title: `${player.name}'s profile | ${appName}`,
      description: `${player.name} | ${countryName(player.country)} (${player.country.toUpperCase()}) | Global rank ${stats?.rank != null ? `#${stats.rank}` : "unranked"} | Country rank ${stats?.country_rank != null ? `#${stats.country_rank}` : "unranked"} | ${stats?.pp != null ? `${Math.round(stats.pp)}pp` : "No PP yet"} | ${stats?.acc != null ? `${Number(stats.acc).toFixed(2)}% accuracy` : ""} | ${stats?.plays != null ? `${stats.plays} plays` : ""}${player.clan_id ? ` | Clan #${player.clan_id}` : ""}`,
      image: `${process.env.VITE_AVATARS_BASE_URL || "https://a.inlayo.com"}/${player.id}`,
      type: "profile",
    };
  }

  const mapMatch = pathname.match(/^\/b\/(\d+)$/);
  if (mapMatch) {
    let map;
    try {
      map = await fetchJson(`/v2/maps/${mapMatch[1]}`);
    } catch (error) {
      console.error(`Could not load beatmap metadata for ${pathname}:`, error);
      return {
        title: `Beatmap #${mapMatch[1]} | ${appName}`,
        description: `View beatmap #${mapMatch[1]} on ${appName}.`,
      };
    }
    return {
      title: `${map.artist} - ${map.title} [${map.version}] | ${appName}`,
      description: `${map.artist} - ${map.title} [${map.version}] | ${Number(map.diff).toFixed(2)}★ | ${Math.round(map.bpm)} BPM | ${mapLength(map.total_length)} | CS ${Number(map.cs).toFixed(1)} | AR ${Number(map.ar).toFixed(1)} | OD ${Number(map.od).toFixed(1)} | HP ${Number(map.hp).toFixed(1)} | mapped by ${map.creator}`,
      image: `https://assets.ppy.sh/beatmaps/${map.set_id}/covers/cover.jpg`,
    };
  }

  const scoreMatch = pathname.match(/^\/s\/(\d+)$/);
  if (scoreMatch) {
    let score;
    try {
      score = await fetchJson(`/v2/scores/${scoreMatch[1]}`);
    } catch (error) {
      console.error(`Could not load score metadata for ${pathname}:`, error);
      return {
        title: `Score #${scoreMatch[1]} | ${appName}`,
        description: `View score #${scoreMatch[1]} on ${appName}.`,
      };
    }
    return {
      title: `${score.player.name} on ${score.beatmap.artist} - ${score.beatmap.title} | ${appName}`,
      description: `${score.beatmap.artist} - ${score.beatmap.title} [${score.beatmap.version}] | ${Math.round(score.score)} score | ${Number(score.acc).toFixed(2)}% accuracy | ${modeName(score.mode)} | ${Math.round(score.pp)}pp | Grade ${score.grade} | ${score.max_combo}x combo | ${score.nmiss} misses | ${score.player.name}`,
      image: `https://assets.ppy.sh/beatmaps/${score.beatmap.set_id}/covers/cover.jpg`,
    };
  }

  if (pathname === "/leaderboard") {
    const modeId = Number(searchParams.get("mode") || 0);
    const sort = searchParams.get("sort") || "pp";
    const country = searchParams.get("country");
    const mode = modeName(modeId);
    let description = `${mode} leaderboard on ${appName} | sorted by ${sort}`;
    if (country) description += ` | country ${country.toUpperCase()}`;
    try {
      const entries = await fetchJson(`/v2/leaderboards/${modeId}?sort=${encodeURIComponent(sort)}&page=1&page_size=1${country ? `&country=${encodeURIComponent(country)}` : ""}`);
      const top = entries[0];
      if (top) description += ` | #1 ${top.name} with ${Math.round(top.pp)}pp`;
    } catch (error) {
      console.error(`Could not load leaderboard metadata for ${pathname}:`, error);
    }
    return {
      title: `${mode} leaderboard | ${appName}`,
      description,
      type: "website",
    };
  }

  if (pathname === "/clans") {
    return {
      title: `Clans | ${appName}`,
      description: `Browse player-run clans on ${appName}.`,
      type: "website",
    };
  }

  const clanMatch = pathname.match(/^\/clan\/(\d+)$/);
  if (clanMatch) {
    let clan;
    try {
      clan = await fetchJson(`/v2/clans/${clanMatch[1]}`);
    } catch (error) {
      console.error(`Could not load clan metadata for ${pathname}:`, error);
      return {
        title: `Clan #${clanMatch[1]} | ${appName}`,
        description: `View clan #${clanMatch[1]} on ${appName}.`,
        type: "profile",
      };
    }
    return {
      title: `[${clan.tag}] ${clan.name} | ${appName}`,
      description: `[${clan.tag}] ${clan.name} clan on ${appName}.`,
      type: "profile",
    };
  }

  const pageMetadata = {
    "/": {
      title: appName,
      description: `${appName} osu! server with player profiles, leaderboards, beatmaps, and scores.`,
      type: "website",
    },
    "/login": {
      title: `Sign in | ${appName}`,
      description: `Sign in to your ${appName} account.`,
      type: "website",
    },
    "/register": {
      title: `Register | ${appName}`,
      description: `Create an account on ${appName}.`,
      type: "website",
    },
    "/forgot-password": {
      title: `Reset password | ${appName}`,
      description: `Reset your ${appName} account password.`,
      type: "website",
    },
    "/verify-email": {
      title: `Verify email | ${appName}`,
      description: `Verify your email address for ${appName}.`,
      type: "website",
    },
    "/friends": {
      title: `Friends | ${appName}`,
      description: `View your friends on ${appName}.`,
      type: "website",
    },
    "/settings": {
      title: `Settings | ${appName}`,
      description: `Manage your ${appName} account and profile.`,
      type: "website",
    },
  };
  if (pageMetadata[pathname]) return pageMetadata[pathname];

  return {
    title: `Page not found | ${appName}`,
    description: `The requested page could not be found on ${appName}.`,
  };
}

async function serve(request, response) {
  const requestUrl = new URL(request.url, siteUrl);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const template = await readFile(path.join(dist, "index.html"), "utf8");
  const userAgent = request.headers["user-agent"] || "";

  if (botPattern.test(userAgent) || !path.extname(pathname)) {
    try {
      const metadata = await getMetadata(pathname, requestUrl.searchParams);
      const html = injectMeta(template, { ...metadata, url: `${siteUrl}${pathname}` });
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(html);
      return;
    } catch (error) {
      console.error(`Could not create metadata for ${pathname}:`, error);
    }
  }

  const requestedFile = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(dist, requestedFile);
  if (!filePath.startsWith(`${dist}${path.sep}`)) {
    response.writeHead(400); response.end("Bad request"); return;
  }
  try {
    const fileStats = await stat(filePath);
    const isFile = fileStats.isFile();
    const servedPath = isFile ? filePath : path.join(dist, "index.html");
    const body = await readFile(servedPath);
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(servedPath)] || "application/octet-stream" });
    response.end(body);
  } catch {
    try {
      const body = await readFile(path.join(dist, "index.html"));
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(body);
    } catch {
      response.writeHead(404); response.end("Not found");
    }
  }
}

createServer((request, response) => serve(request, response).catch(() => {
  response.writeHead(500); response.end("Internal server error");
})).listen(port, () => console.log(`Inlayo preview server listening on ${siteUrl}`));