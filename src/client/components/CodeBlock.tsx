import hljs from 'highlight.js/lib/core';
import { useMemo, useCallback, useState, useEffect } from 'react';
import CopyIcon from '../icons/copy.svg';
import styles from '../styles/CodeBlock.module.css';

export interface CodeBlockProps {
  language: string;
  code: string;
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
  const highlightedCode = useMemo(() => (
    hljs.highlight(code, { language }).value
  ), [code, language]);

  const [iconAnimating, setIconAnimating] = useState(false);
  const [iconClassNames, setIconClassNames] = useState([styles.copyIcon]);

  useEffect(() => {
    if (!iconAnimating) {
      setIconClassNames([styles.copyIcon]);
      return;
    }
    setIconClassNames([styles.copyIcon, styles.copyIconActive]);
    const timeout = setTimeout(() => {
      setIconClassNames([styles.copyIcon]);
      setIconAnimating(false);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [iconAnimating]);

  const onClick = useCallback(() => {
    setIconAnimating(true);
    navigator.clipboard.writeText(code);
  }, [code]);

  return (
    <div className={styles.codeBlock} onClick={onClick}>
      <div className={iconClassNames.join(' ')}><div/></div>
      <pre dangerouslySetInnerHTML={{ __html: highlightedCode }} />
    </div>
  );
}
