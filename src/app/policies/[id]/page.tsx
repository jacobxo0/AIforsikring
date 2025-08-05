'use client';

import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import PolicyChat from '@/components/PolicyChat';

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

export default function PolicyDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { data, error } = useSWR(`/api/policies/${id}`, (url: string) =>
    fetch(url).then((res) => res.json())
  );

  if (error) return <div className="text-red-500">Fejl: {error.message}</div>;
  if (!data) return <div>Loader…</div>;
  if (!data.policy) return <div>Policy ikke fundet</div>;

  const p: Policy = data.policy;

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => router.back()} className="text-blue-600 hover:underline">
        ← Tilbage til liste
      </button>
      <h1 className="text-2xl font-bold">Policenummer {p.policenummer}</h1>
      <dl className="grid grid-cols-2 gap-4">
        <dt className="font-medium">Udløbsdato</dt><dd>{p.udloebsdato ?? '-'}</dd>
        <dt className="font-medium">Præmie (kr/år)</dt><dd>{p.premie.toLocaleString()}</dd>
        <dt className="font-medium">Dækning (kr)</dt><dd>{p.daekning.toLocaleString()}</dd>
        <dt className="font-medium">Selvrisiko (kr)</dt><dd>{p.selvrisiko.toLocaleString()}</dd>
        <dt className="font-medium">Type</dt><dd>{p.type ?? '-'}</dd>
        <dt className="font-medium">Oprettet</dt><dd>{new Date(p.createdAt).toLocaleString()}</dd>
      </dl>
      <PolicyChat />
      {/* Placeholder til fremtidige AI-knapper */}
      <div className="pt-4">
        <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Kør AI-anbefaling
        </button>
      </div>
    </div>
  );
} 