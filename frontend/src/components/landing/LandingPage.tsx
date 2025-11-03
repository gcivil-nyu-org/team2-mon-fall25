import { useAuth0 } from '@auth0/auth0-react';

export const LandingPage = () => {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
      <div className="max-w-md w-full px-8 text-center">
        {/* Logo/Branding */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
            CollabDesk
          </h1>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            Your collaborative workspace for teams
          </p>
        </div>

        {/* Description */}
        <p className="mb-8 text-zinc-700 dark:text-zinc-300">
          Manage tasks, events, notes, and collaborate with your team all in one place.
        </p>

        {/* Login Button */}
        <button
          onClick={() => loginWithRedirect()}
          className="w-full rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors shadow-lg"
        >
          Get Started
        </button>

        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
          Sign in or create an account to continue
        </p>
      </div>
    </div>
  );
};
