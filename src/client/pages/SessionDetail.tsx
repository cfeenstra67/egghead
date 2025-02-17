import { useLocation } from "wouter";
import Layout from "../components/Layout";
import SessionDetailComponent, {
  type SessionDetailProps,
} from "../components/SessionDetail";

export default function SessionDetail({ sessionId }: SessionDetailProps) {
  const [_, setLocation] = useLocation();

  return (
    <Layout>
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden min-h-full p-4 max-w-[800px] mx-auto">
          <div className="rounded-xl border shadow p-6 flex flex-col gap-6 mt-4">
            <SessionDetailComponent
              sessionId={sessionId}
              onDelete={() => setLocation("/")}
            />
          </div>
        </main>
      </div>
    </Layout>
  );
}
