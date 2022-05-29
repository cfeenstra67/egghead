import styles from "../styles/SearchResults.module.css";

export default function Highlighted({ title }: { title: string }) {
  const findPattern = /(\{~\{~\{.+?\}~\}~\})/g;
  const components: React.ReactNode[] = [];
  let match = findPattern.exec(title);
  let lastIndex = 0;
  while (match !== null) {
    if (match.index > lastIndex) {
      components.push(title.slice(lastIndex, match.index));
    }
    const inner = match[0].slice(
      "{~{~{".length,
      match[0].length - "}~}~}".length
    );
    components.push(<span className={styles.highlighted}>{inner}</span>);
    lastIndex = match.index + match[0].length;
    match = findPattern.exec(title);
  }
  if (lastIndex < title.length - 1) {
    components.push(title.slice(lastIndex));
  }
  return <>{components}</>;
}
