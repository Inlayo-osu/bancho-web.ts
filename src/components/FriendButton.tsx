import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";

/**
 * Add/remove-friend toggle shown on other players' profiles.
 * Renders nothing for anonymous visitors or on your own profile.
 */
export function FriendButton({ playerId }: { playerId: number }) {
  const { player: me } = useAuth();
  const queryClient = useQueryClient();

  const enabled = me !== null && me.id !== playerId;
  const friendsQuery = useQuery({
    queryKey: ["friends", me?.id],
    queryFn: () => api.fetchFriends(me!.id),
    enabled,
    select: (envelope) => envelope.data,
  });

  const isFriend =
    friendsQuery.data?.some((friend) => friend.id === playerId) ?? false;

  const mutation = useMutation({
    mutationFn: () =>
      isFriend
        ? api.removeFriend(me!.id, playerId)
        : api.addFriend(me!.id, playerId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["friends", me?.id] }),
  });

  if (!enabled) {
    return null;
  }

  // fixed footprint: the loading placeholder and both toggle states are
  // the same size, so neighbouring header content never shifts
  if (!friendsQuery.isSuccess) {
    return <span aria-hidden className="h-[34px] w-32 rounded-lg bg-surface-2" />;
  }

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className={
        isFriend
          ? "rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-3 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          : "rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {isFriend ? "Remove" : "Add friend"}
    </button>
  );
}
