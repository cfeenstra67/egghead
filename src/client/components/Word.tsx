import Bubble from './Bubble';

interface WordProps {
  value: string;
  count: number;
  selected?: boolean;
  onClick?: () => void;
}

export default function Word({ value, count, onClick, selected }: WordProps) {
  return (
    <Bubble
      selected={selected}
      onClick={onClick}
    >
      <div>
        <span title={value}>{value}</span>
        <span>{count}</span>
      </div>
    </Bubble>
  );
}
