import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { getCollection } from "@/lib/content/collections";

export const metadata = {
  title: "Field Notes",
  description: "Short technical reflections about operational systems.",
};

export default async function NotesPage() {
  const notes = await getCollection("notes");

  return (
    <PageShell
      title="Field Notes"
      description="Working notes on structural design decisions, operational complexity, and systems evolution."
    >
      {notes.length === 0 ? (
        <p className="text-slate-600">No field notes published yet.</p>
      ) : (
        <ul className="space-y-4">
          {notes.map((note) => (
            <li key={note.slug} className="border border-slate-200 p-5">
              <h2 className="text-xl font-semibold text-slate-900">
                <Link href={`/notes/${note.slug}`} className="hover:underline">
                  {note.frontmatter.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{note.frontmatter.description ?? "Field note"}</p>
              <Link href={`/notes/${note.slug}`} className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">
                Open note
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
