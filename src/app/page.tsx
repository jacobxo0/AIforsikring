export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Welcome to Your
              <span className="text-indigo-600"> Next.js App</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              A clean, modern Next.js 13+ application using App Router. 
              Built with TypeScript, Tailwind CSS, and ready for production deployment on Vercel.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="#"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Get Started
              </a>
              <a
                href="#"
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                Learn more <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-indigo-600">
              Built for Modern Web
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to build amazing apps
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <span className="text-white font-bold">⚡</span>
                  </div>
                  Fast Development
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Hot reload, TypeScript support, and modern tooling for rapid development.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <span className="text-white font-bold">🚀</span>
                  </div>
                  Production Ready
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Optimized builds, automatic code splitting, and Vercel deployment ready.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <span className="text-white font-bold">🎨</span>
                  </div>
                  Beautiful UI
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Tailwind CSS integration with responsive design and modern components.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <span className="text-white font-bold">📱</span>
                  </div>
                  Mobile First
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Responsive design that works perfectly on all devices and screen sizes.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}