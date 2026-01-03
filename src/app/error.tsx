"use client";

import { useEffect, useState } from "react";

import Link from "next/link";



import "../app/globals.css";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Use client-side rendering to avoid hydration issues
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // This is a valid pattern for Next.js hydration - we need to set state once on mount
    // to prevent hydration mismatches between server and client
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // Set document title on the client side
    document.title = "Error - FluidCalendar";
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  // Only render the full content after mounting on the client
  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="mb-4 text-4xl font-bold">Something went wrong!</h1>
      <p className="mb-6">An unexpected error has occurred.</p>
      <div className="flex space-x-4">
        <button
          onClick={reset}
          className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-600"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
