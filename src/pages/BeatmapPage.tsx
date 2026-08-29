import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { FavouriteButton } from "@/components/FavouriteButton";
import { Flag } from "@/components/Flag";
import { GradeBadge } from "@/components/GradeBadge";
import { ModBadges } from "@/components/ModBadges";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/http";
import { beatmapCoverUrl } from "@/lib/assets";
import { env } from "@/lib/env";
import {
  formatAccuracy,
  formatMapLength,
  formatNumber,
  formatPerformance,
} from "@/lib/format";
import {
  isValidModeId,
  splitModeId,
  toModeId,
  type Submode,
} from "@/lib/gamemodes";
import { rankedStatusDisplay } from "@/lib/rankedStatus";
import { usePageTitle } from "@/lib/usePageTitle";

export function BeatmapPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapId = Number(params.mapId);

  const modeParam = Number(searchParams.get("mode") ?? "0");
  const rxParam = Number(searchParams.get("rx") ?? "0");
  const baseMode =
    Number.isInteger(modeParam) && modeParam >= 0 && modeParam <= 3
      ? modeParam
      : 0;
  const submode: Submode =
    rxParam === 1 ? "relax" : rxParam === 2 ? "autopilot" : "vanilla";
  const requestedModeId = toModeId(baseMode, submode) ?? baseMode;
  const modeIdFromQuery = isValidModeId(requestedModeId)
    ? requestedModeId
    : 0;

  const beatmapQuery = useQuery({
    queryKey: ["beatmap", mapId],
    queryFn: () => api.fetchBeatmap(mapId),
    enabled: Number.isInteger(mapId) && mapId > 0,
    select: (envelope) => envelope.data,
  });

  const beatmap = beatmapQuery.data;

  const ratingQuery = useQuery({
    queryKey: ["beatmap-rating", mapId],
    queryFn: () => api.fetchBeatmapRating(mapId),
    enabled: beatmapQuery.isSuccess,
    select: (envelope) => envelope.data,
  });
  const rating = ratingQuery.data;

  // std maps are playable in every mode; mode-specific maps are not
  const [modeId, setModeId] = useState(modeIdFromQuery);

  useEffect(() => {
    if (beatmap && beatmap.mode !== 0 && !searchParams.has("mode")) {
      const defaultMode = beatmap.mode;
      const { baseMode: defaultBaseMode, submode: defaultSubmode } =
        splitModeId(defaultMode);
      const defaultRx =
        defaultSubmode === "relax"
          ? 1
          : defaultSubmode === "autopilot"
            ? 2
            : 0;

      setModeId(defaultMode);
      setSearchParams(
        (current) => {
          current.set("mode", String(defaultBaseMode));
          current.set("rx", String(defaultRx));
          return current;
        },
        { replace: true },
      );
      return;
    }

    const { baseMode: canonicalMode, submode: canonicalSubmode } =
      splitModeId(modeId);
    const canonicalRx =
      canonicalSubmode === "relax"
        ? 1
        : canonicalSubmode === "autopilot"
          ? 2
          : 0;

    if (
      searchParams.get("mode") === String(canonicalMode) &&
      searchParams.get("rx") === String(canonicalRx)
    ) {
      return;
    }

    setSearchParams(
      (current) => {
        current.set("mode", String(canonicalMode));
        current.set("rx", String(canonicalRx));
        return current;
      },
      { replace: true },
    );
  }, [beatmap, modeId, searchParams, setSearchParams]);

  function updateMode(nextModeId: number) {
    const { baseMode, submode } = splitModeId(nextModeId);
    const rx = submode === "relax" ? 1 : submode === "autopilot" ? 2 : 0;
    setModeId(nextModeId);
    setSearchParams((current) => {
      current.set("mode", String(baseMode));
      current.set("rx", String(rx));
      return current;
    });
  }

  usePageTitle(
    beatmap
      ? `${beatmap.artist} - ${beatmap.title} [${beatmap.version}]`
      : undefined,
    {
      description: beatmap
        ? `${beatmap.artist} - ${beatmap.title} [${beatmap.version}] | ${beatmap.diff.toFixed(2)}★ | ${Math.round(beatmap.bpm)} BPM | ${beatmap.total_length}s | mapped by ${beatmap.creator}`
        : undefined,
      image: beatmap ? beatmapCoverUrl(beatmap.set_id) : undefined,
    },
  );

  if (!Number.isInteger(mapId) || mapId <= 0) {
    return <ErrorState error={new ApiError("Invalid beatmap id.", 400)} />;
  }
  if (beatmapQuery.isPending) {
    return <LoadingState label="Loading beatmap..." />;
  }
  if (beatmapQuery.error) {
    return <ErrorState error={beatmapQuery.error} />;
  }

  const statusDisplay = rankedStatusDisplay(beatmap!.status);

  return (
    <div className="space-y-6">
      {/* map header */}
      <Card padded={false}>
        <div className="relative h-44">
          <img
            src={beatmapCoverUrl(beatmap!.set_id)}
            alt=""
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
          <span
            className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${statusDisplay.colorClass}`}
          >
            {statusDisplay.label}
          </span>
        </div>

        <div className="space-y-4 px-5 pb-5 sm:px-6">
          <div className="-mt-10 relative">
            <h1 className="text-xl font-semibold drop-shadow">
              {beatmap!.artist} - {beatmap!.title}
            </h1>
            <p className="mt-1 text-sm text-muted">
              <span className="font-medium text-slate-200">
                [{beatmap!.version}]
              </span>{" "}
              mapped by{" "}
              <span className="font-medium text-slate-200">
                {beatmap!.creator}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <MapStat label="★" value={beatmap!.diff.toFixed(2)} highlight />
            <MapStat
              label="Length"
              value={formatMapLength(beatmap!.total_length)}
            />
            <MapStat label="BPM" value={String(Math.round(beatmap!.bpm))} />
            <MapStat label="CS" value={beatmap!.cs.toFixed(1)} />
            <MapStat label="AR" value={beatmap!.ar.toFixed(1)} />
            <MapStat label="OD" value={beatmap!.od.toFixed(1)} />
            <MapStat label="HP" value={beatmap!.hp.toFixed(1)} />
            <span className="ml-auto text-muted">
              {rating && rating.count > 0 && (
                <span title={`${formatNumber(rating.count)} player ratings`}>
                  rated {rating.average!.toFixed(2)} / 10 ·{" "}
                </span>
              )}
              {formatNumber(beatmap!.plays)} plays ·{" "}
              {formatNumber(beatmap!.passes)} passes
            </span>
          </div>

          <div className="flex gap-2">
            <FavouriteButton setId={beatmap!.set_id} />
            <a
              href={`osu://b/${beatmap!.id}`}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              osu!direct
            </a>
            <a
              href={`https://osu.ppy.sh/beatmapsets/${beatmap!.set_id}#osu/${beatmap!.id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-line bg-surface-2 px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-surface-3"
            >
              View on osu!
            </a>
          </div>
        </div>
      </Card>

      <ModeSwitcher modeId={modeId} onChange={updateMode} />

      <MapLeaderboard mapId={mapId} modeId={modeId} />
    </div>
  );
}

function MapStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={`rounded-lg px-2.5 py-1 font-medium ${
        highlight ? "bg-accent-soft text-accent" : "bg-surface-2 text-slate-200"
      }`}
    >
      {label} {value}
    </span>
  );
}

function MapLeaderboard({ mapId, modeId }: { mapId: number; modeId: number }) {
  const navigate = useNavigate();
  const { data, isPending, error } = useQuery({
    queryKey: ["beatmap-scores", mapId, modeId],
    queryFn: () => api.fetchBeatmapScores(mapId, { mode: modeId, limit: 50 }),
    select: (envelope) => envelope.data,
  });

  if (isPending) return <LoadingState label="Loading scores..." />;
  if (error) return <ErrorState error={error} />;
  if (data.length === 0) {
    return <EmptyState label="No scores on this map for this mode yet." />;
  }

  // relax & autopilot leaderboards are ordered by pp, vanilla by score
  const showsPerformanceFirst = modeId >= 4;

  return (
    <Card padded={false} className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5 text-right">Rank</th>
            <th className="px-4 py-2.5">Grade</th>
            <th className="px-4 py-2.5">Player</th>
            <th className="px-4 py-2.5 text-right">
              {showsPerformanceFirst ? "Performance" : "Score"}
            </th>
            <th className="px-4 py-2.5 text-right">Accuracy</th>
            <th className="px-4 py-2.5 text-right">Combo</th>
            <th className="px-4 py-2.5">Mods</th>
            <th className="px-4 py-2.5 text-right">
              {showsPerformanceFirst ? "Score" : "Performance"}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((score, index) => (
            <tr
              key={score.id}
              onClick={() => navigate(`/s/${score.id}`)}
              title="View score details"
              className="cursor-pointer border-b border-line/50 last:border-b-0 hover:bg-surface-2"
            >
              <td className="px-4 py-2 text-right font-semibold text-muted">
                #{index + 1}
              </td>
              <td className="px-4 py-2">
                <GradeBadge grade={score.grade} />
              </td>
              <td className="px-4 py-2">
                {score.player ? (
                  <div className="flex items-center gap-2.5">
                    <Flag countryCode={score.player.country} />
                    {score.player.clan_tag && (
                      <span className="text-xs font-semibold text-accent">
                        [{score.player.clan_tag}]
                      </span>
                    )}
                    <Link
                      to={`/u/${score.player.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="font-medium hover:text-accent"
                    >
                      {score.player.name}
                    </Link>
                  </div>
                ) : (
                  <span className="text-muted">Unknown player</span>
                )}
              </td>
              <td className="px-4 py-2 text-right font-semibold text-accent">
                {showsPerformanceFirst
                  ? formatPerformance(score.pp)
                  : formatNumber(score.score)}
              </td>
              <td className="px-4 py-2 text-right text-muted">
                {formatAccuracy(score.acc)}
              </td>
              <td className="px-4 py-2 text-right text-muted">
                {formatNumber(score.max_combo)}x
                {score.perfect && (
                  <span className="ml-1 text-accent" title="Full combo">
                    FC
                  </span>
                )}
              </td>
              <td className="px-4 py-2">
                <ModBadges mods={score.mods} />
              </td>
              <td className="px-4 py-2 text-right text-muted">
                {showsPerformanceFirst
                  ? formatNumber(score.score)
                  : formatPerformance(score.pp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
