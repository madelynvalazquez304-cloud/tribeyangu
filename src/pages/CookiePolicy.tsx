import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CookiePolicy = () => {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-display text-3xl font-bold">Cookie Policy</h1>
          <p className="text-muted-foreground">We use cookies and similar technologies to provide core functionality, analytics, and personalized experiences.</p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Types of cookies</h2>
            <p className="text-muted-foreground">Essential cookies power the site, analytics cookies help us improve, and optional cookies enable personalization.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CookiePolicy;
