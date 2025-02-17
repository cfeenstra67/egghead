import debounce from "lodash/debounce";
import { useMemo, useState } from "react";

export function useDebounced<T>(value: T, interval: number): T {
  const [currentValue, setCurrentValue] = useState(value);

  const setCurrentValueDebounced = useMemo(
    () =>
      debounce((value: T) => {
        setCurrentValue(value);
      }, interval),
    [interval],
  );

  if (value !== currentValue) {
    setCurrentValueDebounced(value);
  }

  return currentValue;
}
