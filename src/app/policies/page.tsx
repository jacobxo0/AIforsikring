'use client'

import useSWR from 'swr';
import Link from 'next/link';

type Policy = {
  id: string;
  policenummer: string;
  udloebsdato: string | null;
  premie: number;
  daekning: number;
  selvrisiko: number;
  type: string | null;
  createdAt: string;
};

export default function PoliciesPage() {
  const { data, error } = useSWR('/api/policies', (url: string) =>
    fetch(url).then((res) => res.json())
  );

  if (error) return <div className="text-red-500">Fejl: {error.message}</div>;
  if (!data) return <div>Loader…</div>;

  const policies: Policy[] = data.policies;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Dine policer</h1>
      <table className="min-w-full table-auto divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            {['Nummer','Type','Udløbsdato','Præmie','Dækning','Selvrisiko','Oprettet'].map((h) => (
              <th key={h} className="px-4 py-2 text-left text-sm font-medium text-gray-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {policies.map((p) => (
            <tr key={p.id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
              <td className="px-4 py-2">
                <Link href={`/policies/${p.id}`} className="text-blue-600 hover:underline">
                  {p.policenummer}
                </Link>
              </td>
              <td className="px-4 py-2">{p.type ?? '-'}</td>
              <td className="px-4 py-2">{p.udloebsdato ?? '-'}</td>
              <td className="px-4 py-2">{p.premie.toLocaleString()}</td>
              <td className="px-4 py-2">{p.daekning.toLocaleString()}</td>
              <td className="px-4 py-2">{p.selvrisiko.toLocaleString()}</td>
              <td className="px-4 py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 