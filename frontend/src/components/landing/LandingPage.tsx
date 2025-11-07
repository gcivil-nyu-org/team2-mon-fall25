import { useAuth0 } from '@auth0/auth0-react';

export const LandingPage = () => {
  const { loginWithRedirect } = useAuth0();

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: "Calendar",
      description: "Schedule meetings and track team availability in real-time"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      title: "Tasks",
      description: "Organize and prioritize work with intuitive task boards"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      title: "Messages",
      description: "Communicate seamlessly with team discussions and threads"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      title: "Resources",
      description: "Store and share files with your team in one place"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute top-0 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-40 left-20 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

      {/* Animated grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px] animate-grid-flow" />

      {/* Floating geometric shapes */}
      <div className="absolute top-20 left-10 w-4 h-4 border-2 border-blue-400/30 animate-float-slow" />
      <div className="absolute top-40 right-20 w-6 h-6 border-2 border-purple-400/30 rounded-full animate-float-slower" />
      <div className="absolute bottom-32 left-1/4 w-3 h-3 border-2 border-blue-300/30 rotate-45 animate-float-slow" />
      <div className="absolute top-1/3 right-1/3 w-5 h-5 border-2 border-purple-300/30 animate-float-slower" />

      {/* Particle dots */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-blue-400/40 rounded-full animate-pulse-slow" />
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-purple-400/40 rounded-full animate-pulse-slow animation-delay-1000" />
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-blue-300/40 rounded-full animate-pulse-slow animation-delay-2000" />
        <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-purple-300/40 rounded-full animate-pulse-slow animation-delay-3000" />
      </div>

      <div className="relative">
        {/* Hero Section */}
        <div className="flex items-center justify-center min-h-screen px-8">
          <div className="max-w-4xl w-full text-center animate-fade-in">
            {/* Logo/Branding */}
            <div className="mb-12">
              <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white mb-6 animate-slide-up">
                <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent animate-gradient-x">
                  CollabDesk
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-zinc-300 animate-slide-up animation-delay-100">
                Your collaborative workspace for teams
              </p>
            </div>

            {/* Description */}
            <p className="mb-10 text-lg text-zinc-400 max-w-2xl mx-auto animate-slide-up animation-delay-200">
              Manage tasks, events, notes, and collaborate with your team all in one place.
            </p>

            {/* Login Button */}
            <div className="animate-slide-up animation-delay-300">
              <button
                onClick={() => loginWithRedirect()}
                className="group relative inline-block rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-4 text-base font-semibold text-white transition-all shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 hover:scale-105 animate-float"
              >
                <span className="relative z-10">Get Started</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              </button>
              <p className="mt-6 text-sm text-zinc-500">
                Sign in or create an account to continue
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto px-8 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-6 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${400 + index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="text-blue-400 mb-4 group-hover:text-blue-300 transition-colors">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100 mb-2 group-hover:text-white transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }

        @keyframes float-slower {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-30px) scale(1.1);
          }
        }

        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes grid-flow {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(48px);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
        }

        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out both;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }

        .animate-float-slower {
          animation: float-slower 12s ease-in-out infinite;
        }

        .animate-blob {
          animation: blob 20s infinite;
        }

        .animate-grid-flow {
          animation: grid-flow 20s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 8s ease infinite;
        }

        .animation-delay-100 {
          animation-delay: 100ms;
        }

        .animation-delay-200 {
          animation-delay: 200ms;
        }

        .animation-delay-300 {
          animation-delay: 300ms;
        }

        .animation-delay-1000 {
          animation-delay: 1000ms;
        }

        .animation-delay-2000 {
          animation-delay: 2000ms;
        }

        .animation-delay-3000 {
          animation-delay: 3000ms;
        }

        .animation-delay-4000 {
          animation-delay: 4000ms;
        }
      `}</style>
    </div>
  );
};
