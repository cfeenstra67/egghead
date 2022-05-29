import "chart.js/auto";
import { useEffect, useState, useContext, useCallback } from "react";
import { Chart } from "react-chartjs-2";
import Bubble from "./Bubble";
import { AppContext } from "../lib";
import {
  QuerySessionsRequest,
  QuerySessionTimelineRequest,
  QuerySessionTimelineResponse,
} from "../../server";
import styles from "../styles/Timeline.module.css";

export interface TimelineProps {
  request: QuerySessionsRequest;
  dateRange: [Date, Date] | null;
  setDateRange: (range: [Date, Date] | null) => void;
}

function dateStringToDateRange(
  granularity: QuerySessionTimelineRequest["granularity"] & string,
  dateString: string
): [Date, Date] {
  const parseIntOnly = (input: string) => parseInt(input);

  switch (granularity) {
    case "hour":
      const [hourDateString, hourString] = dateString.split("T");
      const hour = parseInt(hourString);
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
  dateString: string
): string {
  const [start] = dateStringToDateRange(granularity, dateString);
  const localeName = "en-US";
  switch (granularity) {
    case "hour":
      return start.toLocaleString(localeName, {
        day: "numeric",
        month: "short",
        hour: "numeric",
      });
    case "day":
    case "week":
      return start.toLocaleString(localeName, {
        day: "numeric",
        month: "short",
      });
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

function fillMissingLabels(
  granularity: QuerySessionTimelineRequest["granularity"] & string,
  timeline: QuerySessionTimelineResponse["timeline"]
): QuerySessionTimelineResponse["timeline"] {
  if (timeline.length === 0) {
    return [];
  }
  const start = dateStringToDateRange(granularity, timeline[0].dateString)[0];
  const end = dateStringToDateRange(
    granularity,
    timeline[timeline.length - 1].dateString
  )[1];

  function twoDigit(num: number): string {
    return ("00" + num).slice(-2);
  }

  let getNext: (d: Date) => Date;
  let getLabel: (d: Date) => string;
  switch (granularity) {
    case "hour":
      getNext = (d) =>
        new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
          d.getHours() + 1,
          d.getMinutes()
        );
      getLabel = (d) =>
        `${d.getFullYear()}-` +
        `${twoDigit(d.getMonth() + 1)}-` +
        `${twoDigit(d.getDate())}T` +
        `${twoDigit(d.getHours())}`;
      break;
    case "day":
      getNext = (d) =>
        new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate() + 1,
          d.getHours(),
          d.getMinutes()
        );
      getLabel = (d) =>
        `${d.getFullYear()}-` +
        `${twoDigit(d.getMonth() + 1)}-` +
        `${twoDigit(d.getDate())}`;
      break;
    case "week":
      getNext = (d) =>
        new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate() + 7,
          d.getHours(),
          d.getMinutes()
        );
      getLabel = (d) => {
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const days = Math.floor(
          (d.getTime() - yearStart.getTime()) / (24 * 3600 * 1000)
        );
        const weekNumber = Math.ceil((d.getDay() + 1 + days) / 7);
        return `${d.getFullYear()}-${weekNumber}`;
      };
      break;
    case "month":
      getNext = (d) =>
        new Date(
          d.getFullYear(),
          d.getMonth() + 1,
          d.getDate(),
          d.getHours(),
          d.getMinutes()
        );
      getLabel = (d) => `${d.getFullYear()}-${twoDigit(d.getMonth() + 1)}`;
      break;
  }

  const stepsByKey = Object.fromEntries(
    timeline.map((step) => {
      return [step.dateString, step];
    })
  );
  let current = start;
  const out: QuerySessionTimelineResponse["timeline"] = [];

  while (current.getTime() < end.getTime()) {
    const label = getLabel(current);
    if (stepsByKey.hasOwnProperty(label)) {
      out.push(stepsByKey[label]);
    } else {
      out.push({
        dateString: label,
        count: 0,
      });
    }
    current = getNext(current);
  }

  return out;
}

export default function Timeline({
  request,
  dateRange,
  setDateRange,
}: TimelineProps) {
  const { serverClientFactory } = useContext(AppContext);
  const [timeline, setTimeline] = useState<QuerySessionTimelineResponse>({
    granularity: "day",
    timeline: [],
  });
  const [dateRangeStack, setDateRangeStack] = useState<[Date, Date][]>([]);

  const pushDateStack = useCallback(
    (start: Date, end: Date) => {
      setDateRange([start, end]);
      setDateRangeStack(dateRangeStack.concat([[start, end]]));
    },
    [dateRangeStack, setDateRangeStack]
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

  useEffect(() => {
    let active = true;

    async function load() {
      const client = await serverClientFactory();
      const timelineResp = await client.querySessionTimeline({
        ...request,
        granularity: 24,
      });
      if (!active) {
        return;
      }
      setTimeline({
        granularity: timelineResp.granularity,
        timeline: fillMissingLabels(
          timelineResp.granularity,
          timelineResp.timeline
        ),
      });
    }

    load();
    return () => {
      active = false;
    };
  }, [request, setTimeline]);

  const labels = timeline.timeline.map((x) => {
    return dateStringToLabel(timeline.granularity, x.dateString);
  });
  const dataPoints = timeline.timeline.map((x) => x.count);

  return (
    <>
      {dateRange !== null && (
        <Bubble selected onClick={() => popDateStack()}>
          {dateRangeToLabel(...dateRange)}
        </Bubble>
      )}
      {timeline.timeline.length > 0 && (
        <div className={styles.chartContainer}>
          <Chart
            type="bar"
            data={{
              labels,
              datasets: [
                {
                  label: "Count",
                  data: dataPoints,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
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
                  timeline.timeline[elements[0].index].dateString;
                const range = dateStringToDateRange(
                  timeline.granularity,
                  selectedLabel
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
        </div>
      )}
    </>
  );
}
