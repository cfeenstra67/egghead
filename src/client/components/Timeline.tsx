import "chart.js/auto";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useContext, useState } from "react";
import { Chart } from "react-chartjs-2";
import type {
  QuerySessionTimelineRequest,
  QuerySessionsRequest,
} from "../../server";
import { Theme } from "../../server/types";
import { Badge } from "./ui/badge";
import { AppContext } from "../lib";
import { useTheme } from "../lib/theme";

export interface TimelineProps {
  request: QuerySessionsRequest;
  dateRange: [Date, Date] | null;
  setDateRange: (range: [Date, Date] | null) => void;
}

function dateStringToDateRange(
  granularity: QuerySessionTimelineRequest["granularity"] & string,
  dateString: string,
): [Date, Date] {
  const parseIntOnly = (input: string) => Number.parseInt(input);

  switch (granularity) {
    case "hour":
      const [hourDateString, hourString] = dateString.split("T");
      const hour = Number.parseInt(hourString);
      const [hourYear, hourMonth, hourDay] = hourDateString
        .split("-")
        .map(parseIntOnly);
      const hourStart = new Date(hourYear, hourMonth - 1, hourDay, hour);
      const hourEnd = new Date(hourYear, hourMonth - 1, hourDay, hour + 1);
      return [hourStart, hourEnd];
    case "day":
      const [dayYear, dayMonth, dayDay] = dateString
        .split("-")
        .map(parseIntOnly);
      const dayStart = new Date(dayYear, dayMonth - 1, dayDay);
      const dayEnd = new Date(dayYear, dayMonth - 1, dayDay + 1);
      return [dayStart, dayEnd];
    case "week":
      const [yearNo, weekNo] = dateString.split("-").map(parseIntOnly);
      const weekStart = new Date(yearNo, 0, (weekNo - 1) * 7);
      const weekEnd = new Date(yearNo, 0, weekNo * 7);
      return [weekStart, weekEnd];
    case "month":
      const [monthYearNo, monthNo] = dateString.split("-").map(parseIntOnly);
      const monthStart = new Date(monthYearNo, monthNo - 1, 1);
      const monthEnd = new Date(monthYearNo, monthNo, 1);
      return [monthStart, monthEnd];
  }
}

function dateStringToLabel(
  granularity: QuerySessionTimelineRequest["granularity"] & string,
  dateString: string,
): string {
  const [start, end] = dateStringToDateRange(granularity, dateString);
  const localeName = "en-US";
  switch (granularity) {
    case "hour":
      return start.toLocaleString(localeName, {
        day: "numeric",
        month: "short",
        hour: "numeric",
      });
    case "day":
      return start.toLocaleString(localeName, {
        day: "numeric",
        month: "short",
      });
    case "week":
      const weekStart = start.toLocaleString(localeName, {
        day: "numeric",
        month: "short",
      });
      const offset = 24 * 3600 * 1000 - 1;
      const weekEnd = new Date(end.getTime() - offset).toLocaleString(
        localeName,
        {
          day: "numeric",
          month: "short",
        },
      );
      return `${weekStart} - ${weekEnd}`;
    case "month":
      return start.toLocaleString(localeName, { month: "short" });
  }
}

function dateRangeToLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => {
    return d.toLocaleString("en-US", {
      day: "numeric",
      hour: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  const endWithBump = new Date(end.getTime() + 1000);
  return `${fmt(start)} - ${fmt(endWithBump)}`;
}

export default function Timeline({
  request,
  dateRange,
  setDateRange,
}: TimelineProps) {
  const { serverClientFactory } = useContext(AppContext);
  const [dateRangeStack, setDateRangeStack] = useState<[Date, Date][]>([]);

  const pushDateStack = useCallback(
    (start: Date, end: Date) => {
      setDateRange([start, end]);
      setDateRangeStack(dateRangeStack.concat([[start, end]]));
    },
    [dateRangeStack, setDateRangeStack],
  );

  const popDateStack = useCallback(() => {
    dateRangeStack.pop();
    setDateRangeStack(dateRangeStack);
    if (dateRangeStack.length > 0) {
      setDateRange(dateRangeStack[dateRangeStack.length - 1]);
    } else {
      setDateRange(null);
    }
  }, [dateRangeStack, setDateRangeStack]);

  const response = useQuery({
    queryKey: ["history", request, "timeline"],
    queryFn: async () => {
      const client = await serverClientFactory();
      return await client.querySessionTimeline({
        ...request,
        granularity: 24,
      });
    },
  });

  const theme = useTheme();

  const backgroundColor =
    theme === Theme.Light ? "hsl(215.4 16.3% 46.9%)" : "hsl(215.4 16.3% 56.9%)";

  return (
    <>
      {dateRange !== null && (
        <Badge onClick={() => popDateStack()} className="cursor-pointer">
          {dateRangeToLabel(...dateRange)}
        </Badge>
      )}
      <div className="relative w-full h-36 mt-1">
        {response.status === "success" && response.data.timeline.length > 0 ? (
          <Chart
            type="bar"
            data={{
              labels: response.data.timeline.map((x) =>
                dateStringToLabel(response.data.granularity, x.dateString),
              ),
              datasets: [
                {
                  label: "Count",
                  data: response.data.timeline.map((x) => x.count),
                  backgroundColor,
                  borderRadius: 8,
                },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              onHover: (event, chartElement) => {
                if (event.native === null || event.native.target === null) {
                  return;
                }
                (event.native.target as any).style.cursor = chartElement[0]
                  ? "pointer"
                  : "default";
              },
              onClick: (event, elements) => {
                if (elements.length === 0) {
                  return;
                }
                const selectedLabel =
                  response.data.timeline[elements[0].index].dateString;
                const range = dateStringToDateRange(
                  response.data.granularity,
                  selectedLabel,
                );
                const currentRange = dateRangeStack[dateRangeStack.length - 1];
                if (
                  currentRange === undefined ||
                  currentRange[0].getTime() !== range[0].getTime() ||
                  currentRange[1].getTime() !== range[1].getTime()
                ) {
                  pushDateStack(...range);
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    display: false,
                  },
                  grid: {
                    display: false,
                  },
                },
                x: {
                  ticks: {
                    autoSkipPadding: 6,
                    maxRotation: 0,
                  },
                  grid: {
                    display: false,
                  },
                },
              },
              plugins: {
                legend: {
                  display: false,
                },
              },
            }}
          />
        ) : null}
      </div>
    </>
  );
}
