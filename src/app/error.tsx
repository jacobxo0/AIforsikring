'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Der opstod en fejl
        </h2>
        <p className="text-gray-600 mb-6">
          Beklager, der skete en uventet fejl. Prøv at genindlæse siden.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Prøv igen
        </button>
      </div>
    </div>
  )
}