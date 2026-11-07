import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import styles from "./Stats.module.css";
import {
  API_CLIENT,
  type ScoreboardResponse,
  type SoundPlayResponse,
  type SoundStatsResponse,
} from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import IconButton from "../../components/IconButton/IconButton";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import TabBar from "../../components/TabBar/TabBar";
import BackIcon from "../../assets/back.svg?react";

const scoreboardLimit = 10;
const latestPlaysLimit = 25;

type TimeRange = "all" | "30d" | "7d" | "today";

const timeRangeTabs: { id: TimeRange; element: string }[] = [
  { id: "all", element: "All time" },
  { id: "30d", element: "30 days" },
  { id: "7d", element: "7 days" },
  { id: "today", element: "Today" },
];

// Returns the start of the given time range in the local time zone, or
// undefined for all time.
function timeRangeStart(range: TimeRange): Date | undefined {
  if (range == "all") return undefined;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range == "30d") start.setDate(start.getDate() - 29);
  if (range == "7d") start.setDate(start.getDate() - 6);
  return start;
}

const byteUnits = ["B", "KiB", "MiB", "GiB", "TiB"];

// Formats the given number of bytes as a human readable size using binary
// units, e.g. 1536 -> "1.5 KiB".
function formatBytes(bytes: number): string {
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < byteUnits.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const maximumFractionDigits = unitIndex == 0 ? 0 : 1;
  return `${value.toLocaleString(undefined, { maximumFractionDigits })} ${byteUnits[unitIndex]}`;
}

export default function Stats() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <IconButton title="Back" onClick={() => navigate("/")}>
          <BackIcon />
        </IconButton>
        <h1 className={styles.title}>Statistics</h1>
      </header>

      <SoundStats />
      <Scoreboard />
      <LatestPlays />
    </div>
  );
}

function SoundStats() {
  const [stats, setStats] = useState<SoundStatsResponse | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    API_CLIENT.getSoundStats()
      .then(setStats)
      .catch((e) => setError(errorMessage(e)));
  }, []);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Sound library</h2>

      {!!error && <ErrorTile message={error} />}
      {!stats && !error && <span className={styles.empty}>Loading...</span>}

      {!!stats && (
        <div className={styles.overview}>
          <div className={styles.overviewTile}>
            <span className={styles.totalValue}>
              {stats.count.toLocaleString()}
            </span>
            <span className={styles.totalLabel}>
              {stats.count == 1 ? "sound available" : "sounds available"}
            </span>
          </div>
          <div
            className={styles.overviewTile}
            title={`${stats.total_size.toLocaleString()} bytes`}
          >
            <span className={styles.totalValue}>
              {formatBytes(stats.total_size)}
            </span>
            <span className={styles.totalLabel}>total storage size</span>
          </div>
        </div>
      )}
    </section>
  );
}

function Scoreboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [scoreboard, setScoreboard] = useState<
    { timeRange: TimeRange; data: ScoreboardResponse } | undefined
  >();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    // Responses of previously selected time ranges are discarded so that a
    // slow response can not overwrite the one of the current selection.
    let isCurrent = true;
    API_CLIENT.getScoreboard(scoreboardLimit, timeRangeStart(timeRange))
      .then((data) => {
        if (!isCurrent) return;
        setError(undefined);
        setScoreboard({ timeRange, data });
      })
      .catch((e) => {
        if (isCurrent) setError(errorMessage(e));
      });
    return () => {
      isCurrent = false;
    };
  }, [timeRange]);

  const data = scoreboard?.data;
  const isLoading = scoreboard?.timeRange != timeRange && !error;
  const maxCount = Math.max(1, ...(data?.sounds.map((s) => s.count) ?? []));

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Most played sounds</h2>
        <TabBar
          options={timeRangeTabs}
          onSelect={(id) => setTimeRange(id as TimeRange)}
        />
      </div>

      {!!error && <ErrorTile message={error} />}

      {!!data && (
        <div
          className={`${styles.scoreboard} ${isLoading ? styles.stale : ""}`}
        >
          <div className={styles.total}>
            <span className={styles.totalValue}>
              {data.total_plays.toLocaleString()}
            </span>
            <span className={styles.totalLabel}>
              {data.total_plays == 1 ? "sound played" : "sounds played"}
            </span>
          </div>

          {data.sounds.length > 0 ? (
            <ol className={styles.ranking}>
              {data.sounds.map((s, i) => (
                <li
                  key={s.sound.id}
                  className={styles.rank}
                  title={`${s.sound.handle}: played ${s.count.toLocaleString()} ${s.count == 1 ? "time" : "times"}`}
                >
                  <span className={styles.rankPosition}>{i + 1}</span>
                  <span className={styles.rankHandle}>{s.sound.handle}</span>
                  <div className={styles.rankBarTrack}>
                    <div
                      className={styles.rankBar}
                      style={{ width: `${(s.count / maxCount) * 100}%` }}
                    />
                    <span className={styles.rankCount}>
                      {s.count.toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <span className={styles.empty}>
              No sounds have been played in this time range.
            </span>
          )}
        </div>
      )}

      {!data && !error && <span className={styles.empty}>Loading...</span>}
    </section>
  );
}

function LatestPlays() {
  const [plays, setPlays] = useState<SoundPlayResponse[] | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    API_CLIENT.listSoundPlays(latestPlaysLimit)
      .then(setPlays)
      .catch((e) => setError(errorMessage(e)));
  }, []);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Recently played</h2>

      {!!error && <ErrorTile message={error} />}
      {!plays && !error && <span className={styles.empty}>Loading...</span>}

      {!!plays &&
        (plays.length > 0 ? (
          <ul className={styles.plays}>
            {plays.map((p) => (
              <li key={p.id} className={styles.play}>
                <span
                  className={`${styles.playSound} ${p.sound.deleted ? styles.deleted : ""}`}
                  title={
                    p.sound.deleted ? "This sound has been deleted" : undefined
                  }
                >
                  {p.sound.handle}
                </span>
                <span className={styles.playUser}>
                  <span className={styles.avatar}>
                    {p.user.handle.charAt(0)}
                  </span>
                  {p.user.handle}
                </span>
                <time className={styles.playTime} dateTime={p.played_at}>
                  {new Date(p.played_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <span className={styles.empty}>No sounds have been played yet.</span>
        ))}
    </section>
  );
}
