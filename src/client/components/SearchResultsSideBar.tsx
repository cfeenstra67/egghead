import { useState, useContext, useCallback, useMemo } from "react";
import CloseCircle from "../icons/close-circle.svg";
import DropdownIcon from "../icons/dropdown.svg";
import { AppContext } from "../lib";
import type {
  QuerySessionsRequest,
  QuerySessionFacetsFacetValue,
} from "../../server";
import styles from "../styles/SideBar.module.css";
import SideBar, { SideBarComponent } from "./SideBar";
import Spinner from "./Spinner";
import Word from "./Word";

interface CollapsibleComponentProps {
  title: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  children?: React.ReactNode;
}

function CollapsibleComponent({
  title,
  children,
  clearable,
  onClear,
}: CollapsibleComponentProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SideBarComponent>
      <div
        className={`${styles.collapsibleSideBarTitle} ${
          collapsed ? styles.collapsed : ""
        }`}
      >
        <DropdownIcon
          onClick={() => setCollapsed(!collapsed)}
          className={styles.icon}
        />
        <span>{title}</span>
        {clearable && (
          <CloseCircle
            className={styles.icon}
            onClick={() => onClear && onClear()}
          />
        )}
      </div>
      <div className={styles.collapsibleSideBarContent}>
        {!collapsed && children}
      </div>
    </SideBarComponent>
  );
}

interface HostsComponentProps {
  loading?: boolean;
  hosts: QuerySessionFacetsFacetValue[];
  partialCount?: number;
  selectedHosts: string[];
  setSelectedHosts: (hosts: string[]) => void;
}

function HostsComponent({
  loading,
  hosts,
  selectedHosts,
  setSelectedHosts,
  partialCount,
}: HostsComponentProps) {
  const [partialExpanded, setPartialExpanded] = useState<boolean>(false);
  const selectedHostsSet = new Set(selectedHosts);

  const partial = partialCount ?? 5;
  const head = partialExpanded ? hosts : hosts.slice(0, partial);
  const tail = partialExpanded ? [] : hosts.slice(partial);

  const handleHostClick = useCallback(
    (host: string) => {
      if (selectedHostsSet.has(host)) {
        setSelectedHosts(selectedHosts.filter((host2) => host !== host2));
      } else {
        setSelectedHosts(selectedHosts.concat([host]));
      }
    },
    [selectedHosts, setSelectedHosts]
  );

  return (
    <CollapsibleComponent
      title={<>Websites {loading && <Spinner />}</>}
      clearable={selectedHosts.length > 0}
      onClear={() => setSelectedHosts([])}
    >
      {head.map((obj) => (
        <div key={obj.value}>
          <Word
            {...obj}
            onClick={() => handleHostClick(obj.value)}
            selected={selectedHostsSet.has(obj.value)}
          />
        </div>
      ))}
      <div
        onClick={() => setPartialExpanded(!partialExpanded)}
        className={styles.seeMore}
      >
        {partialExpanded
          ? hosts.length > partial && "See less..."
          : tail.length > 0 && "See more..."}
      </div>
    </CollapsibleComponent>
  );
}

interface TermsComponentProps {
  loading?: boolean;
  terms: QuerySessionFacetsFacetValue[];
  selectedTerms: string[];
  setSelectedTerms: (terms: string[]) => void;
  partialCount?: number;
}

function TermsComponent({
  loading,
  terms,
  selectedTerms,
  setSelectedTerms,
  partialCount,
}: TermsComponentProps) {
  const [partialExpanded, setPartialExpanded] = useState<boolean>(false);
  const selectedTermsSet = new Set(selectedTerms);

  const partial = partialCount ?? 10;

  const head = partialExpanded ? terms : terms.slice(0, partial);
  const tail = partialExpanded ? [] : terms.slice(partial);

  const handleWordClick = useCallback(
    (word: string) => {
      if (selectedTermsSet.has(word)) {
        setSelectedTerms(selectedTerms.filter((term) => term !== word));
      } else {
        setSelectedTerms(selectedTerms.concat([word]));
      }
    },
    [selectedTerms, setSelectedTerms]
  );

  return (
    <CollapsibleComponent
      title={<>Words {loading && <Spinner />}</>}
      clearable={selectedTerms.length > 0}
      onClear={() => setSelectedTerms([])}
    >
      {head.map((obj) => (
        <Word
          {...obj}
          key={obj.value}
          onClick={() => handleWordClick(obj.value)}
          selected={selectedTermsSet.has(obj.value)}
        />
      ))}
      <div
        onClick={() => setPartialExpanded(!partialExpanded)}
        className={styles.seeMore}
      >
        {partialExpanded
          ? terms.length > partial && "See less..."
          : tail.length > 0 && "See more..."}
      </div>
    </CollapsibleComponent>
  );
}

interface SearchSideBarProps {
  request: QuerySessionsRequest;
  selectedHosts: string[];
  ready?: boolean;
  loading?: boolean;
  onLoadComplete?: () => void;
  setSelectedHosts: (hosts: string[]) => void;
  selectedTerms: string[];
  setSelectedTerms: (terms: string[]) => void;
}

export default function SearchSideBar({
  request,
  selectedHosts,
  setSelectedHosts,
  selectedTerms,
  setSelectedTerms,
  ready,
  loading,
  onLoadComplete,
}: SearchSideBarProps) {
  const [hosts, setHosts] = useState<QuerySessionFacetsFacetValue[]>([]);
  const [terms, setTerms] = useState<QuerySessionFacetsFacetValue[]>([]);

  const { serverClientFactory } = useContext(AppContext);

  useMemo(() => {
    if (!ready) {
      return;
    }

    const abortController = new AbortController();

    async function load() {
      try {
        const client = await serverClientFactory();
        const facets = await client.querySessionFacets({
          ...request,
          abort: abortController.signal
        });
        const hostValues = new Set(facets.host.map((host) => host.value));
        selectedHosts.forEach((host) => {
          if (!hostValues.has(host)) {
            facets.host.splice(0, 0, { value: host, count: 0 });
          }
        });
        const termValues = new Set(facets.term.map((term) => term.value));
        selectedTerms.forEach((term) => {
          if (!termValues.has(term)) {
            facets.term.splice(0, 0, { value: term, count: 0 });
          }
        });

        setHosts(facets.host);
        setTerms(facets.term);
      } finally {
        onLoadComplete?.();
      }
    }

    load();
    return () => abortController.abort();
  }, [ready, request]);

  return (
    <SideBar>
      <HostsComponent
        loading={loading}
        hosts={hosts}
        selectedHosts={selectedHosts}
        setSelectedHosts={setSelectedHosts}
      />

      <TermsComponent
        loading={loading}
        terms={terms}
        selectedTerms={selectedTerms}
        setSelectedTerms={setSelectedTerms}
      />
    </SideBar>
  );
}
