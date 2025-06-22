import { Link } from "wouter";
import Layout from "../components/Layout.js";

export default function NotFound() {
  return (
    <Layout>
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden min-h-full p-4 max-w-[800px] mx-auto">
          <div className="rounded-xl border shadow p-6 flex flex-col gap-4 gap-y-6 mt-4">
            <h1 className="text-2xl font-semibold">Not Found</h1>
            <p>The requested page was not found.</p>
            <p>
              <Link href="/" className="underline">
                Back to search
              </Link>
            </p>
          </div>
        </main>
      </div>
    </Layout>
  );
}
