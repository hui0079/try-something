import type { CcPerson } from "@/lib/types";

export function CcList({ people }: { people: CcPerson[] }) {
  if (people.length === 0) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-medium">抄送</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {people.map((person) => (
          <li key={person.userId} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
            {person.displayName}
            <span className="ml-1 text-slate-500">{person.read ? "已读" : "未读"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
