export type CaptchaProvider = "recaptcha" | "hcaptcha" | "turnstile";

function readCaptchaProvider(): CaptchaProvider | null {
  const provider = import.meta.env.VITE_CAPTCHA_PROVIDER;
  if (provider === "recaptcha" || provider === "hcaptcha" || provider === "turnstile") {
    return provider;
  }
  return null;
}

/** Build-time configuration with sensible defaults for local dev. */
export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? "Inlayo",
  homeVideoUrl: import.meta.env.VITE_HOME_VIDEO_URL ?? "/home-bg.mp4",
  banchoDomain: import.meta.env.VITE_BANCHO_DOMAIN ?? "cmyui.xyz",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api",
  avatarsBaseUrl:
    import.meta.env.VITE_AVATARS_BASE_URL ??
    `https://a.${import.meta.env.VITE_BANCHO_DOMAIN ?? "cmyui.xyz"}`,
  // must match the server's CAPTCHA_PROVIDER; empty = captcha disabled
  captchaProvider: readCaptchaProvider(),
  captchaSiteKey: import.meta.env.VITE_CAPTCHA_SITE_KEY ?? "",
  // shown in the footer when set; keep in sync with bancho.py's
  // DISCORD_INVITE setting
  discordInviteUrl: import.meta.env.VITE_DISCORD_INVITE ?? "",
} as const;
