import Layout from "../components/Layout";
import SessionDetailComponent, {
  type SessionDetailProps,
} from "../components/SessionDetail";

export default function SessionDetail({ sessionId }: SessionDetailProps) {
  return (
    <Layout>
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden min-h-full p-4 max-w-[800px] mx-auto">
          <SessionDetailComponent sessionId={sessionId} />
        </main>
      </div>
    </Layout>
  );
}
