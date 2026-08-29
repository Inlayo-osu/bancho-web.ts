import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Avatar } from "@/components/Avatar";
import { Flag } from "@/components/Flag";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api/client";
import type { Player } from "@/lib/api/types";
import { formatTimeAgo } from "@/lib/format";
import { usePageTitle } from "@/lib/usePageTitle";

export function UsersPage() {
  usePageTitle("Users");

  const usersQuery = useQuery({
    queryKey: ["all-players"],
    queryFn: async () => {
      const allPlayers: Player[] = [];
      let page = 1;

      while (true) {
        const response = await api.fetchPlayers({ page, pageSize: 100 });
        const chunk = response.data;
        allPlayers.push(...chunk);

        if (chunk.length < 100) {
          return allPlayers;
        }

        page += 1;
      }
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Users"
        description="Browse all registered players, starting from the beginning of the roster."
      />

      {usersQuery.isPending && <LoadingState label="Loading players..." />}
      {usersQuery.error && <ErrorState error={usersQuery.error} />}
      {usersQuery.isSuccess &&
        (usersQuery.data.length === 0 ? (
          <EmptyState label="No players found." />
        ) : (
          <ul className="space-y-1.5">
            {usersQuery.data.map((player) => (
              <UserRow key={player.id} player={player} />
            ))}
          </ul>
        ))}
    </div>
  );
}

function UserRow({ player }: { player: Player }) {
  return (
    <li>
      <Card className="flex items-center gap-3.5">
        <Avatar
          playerId={player.id}
          className="h-10 w-10 rounded-lg bg-surface-2 object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Flag countryCode={player.country} />
            <Link
              to={`/u/${player.id}`}
              className="truncate font-medium hover:text-accent"
            >
              {player.name}
            </Link>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Last seen {formatTimeAgo(player.latest_activity)}
          </p>
        </div>
        <span className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs font-medium text-muted">
          #{player.id}
        </span>
      </Card>
    </li>
  );
}
