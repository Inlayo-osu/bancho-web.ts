import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api/client";
import { setUnauthorizedHandler } from "@/lib/api/http";
import type { Player } from "@/lib/api/types";

// The session cookie is http-only, so js can't inspect it — this local
// hint (set at login, cleared at logout) lets anonymous visitors skip
// the who-am-i request entirely. It's never trusted for authentication;
// it only decides whether asking the server is worthwhile.
const HAS_SESSION_KEY = "bancho-web.has-session";

function hasSessionHint(): boolean {
  return localStorage.getItem(HAS_SESSION_KEY) === "1";
}

function setSessionHint(active: boolean): void {
  if (active) {
    localStorage.setItem(HAS_SESSION_KEY, "1");
  } else {
    localStorage.removeItem(HAS_SESSION_KEY);
  }
}

interface AuthContextValue {
  /** the signed-in player, or null when logged out */
  player: Player | null;
  /** true while the persisted session is being restored on page load */
  isLoading: boolean;
  /**
   * bumped when the signed-in player uploads a new avatar, so cached
   * copies of their old one get busted across the app
   */
  avatarVersion: number;
  refreshAvatar: () => void;
  /** replace the cached signed-in player after a profile update */
  updatePlayer: (player: Player) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (args: {
    username: string;
    email: string;
    password: string;
    captchaToken: string | null;
    emailVerificationToken: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(() => hasSessionHint());
  const [avatarVersion, setAvatarVersion] = useState(0);

  const refreshAvatar = useCallback(() => {
    setAvatarVersion((current) => current + 1);
  }, []);

  const updatePlayer = useCallback((updated: Player) => {
    setPlayer(updated);
  }, []);

  // a 401 from any endpoint means the session is gone (it can be
  // revoked server-side at any time, and another request may discover
  // that before /sessions/current does) — drop the signed-in state
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSessionHint(false);
      setPlayer(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // restore the session on page load, but only when a previous login
  // suggests there's one to restore
  useEffect(() => {
    if (!hasSessionHint()) return;

    api
      .fetchCurrentSession()
      .then((envelope) => setPlayer(envelope.data))
      .catch(() => setPlayer(null)) // a 401 also clears the hint above
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const session = await api.createSession({ username, password });
    setSessionHint(true);
    setPlayer(session.data);
  }, []);

  const register = useCallback(
    async (args: {
      username: string;
      email: string;
      password: string;
      captchaToken: string | null;
      emailVerificationToken: string;
    }) => {
      await api.registerAccount(args);
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.deleteCurrentSession().catch(() => undefined);
    setSessionHint(false);
    setPlayer(null);
  }, []);

  const value = useMemo(
    () => ({
      player,
      isLoading,
      avatarVersion,
      refreshAvatar,
      updatePlayer,
      login,
      register,
      logout,
    }),
    [
      player,
      isLoading,
      avatarVersion,
      refreshAvatar,
      updatePlayer,
      login,
      register,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
