import { Link } from 'wouter';
import Layout from '../components/Layout';

export interface SessionDetailProps {
  sessionId: string;
}

export default function SessionDetail({ sessionId }: SessionDetailProps) {
  return (
    <Layout>
      <Link to="/">Back</Link>
      <h1>Session {sessionId}</h1>
    </Layout>
  );
}
