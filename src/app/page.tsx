import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center">
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center mb-24">
          <h1 className="text-5xl sm:text-6xl font-display font-bold mb-8 tracking-tight">
            Welcome to MetaMarket
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Create and manage your own marketplace, or join existing ones.
            Connect communities and commerce in a space crafted for creators.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/create-marketplace"
              className="btn btn-primary text-lg"
            >
              Create a Marketplace
            </Link>
            <Link href="/marketplaces" className="btn btn-secondary text-lg">
              Browse Marketplaces
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-24">
          <div className="card hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-center">
              Quick Setup
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed text-center">
              Build your marketplace swiftly with an intuitive interface
              designed for ease.
            </p>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <svg
                className="w-8 h-8 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-center">
              Community First
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed text-center">
              Foster connections with tools designed to build and support
              thriving communities.
            </p>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <svg
                className="w-8 h-8 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-center">
              Secure Payments
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed text-center">
              Integrated Stripe payments ensure every transaction is secure and
              smooth.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="card bg-muted border-none">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight">
              Ready to start your marketplace journey?
            </h2>
            <p className="text-xl mb-10 text-muted-foreground leading-relaxed">
              Join a community of creators who value quality, craftsmanship, and
              authentic experiences.
            </p>
            <Link
              href="/create-marketplace"
              className="btn btn-primary inline-block text-lg px-8 py-4"
            >
              Create Your Marketplace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
