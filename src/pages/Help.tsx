import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Help = () => {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-display text-3xl font-bold">Help Center</h1>
          <p className="text-muted-foreground">Find step-by-step guides for common tasks: getting started, setting up payments, creating campaigns, and managing your page.</p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Popular Articles</h2>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>How to claim your creator username</li>
              <li>Setting up M-PESA payouts</li>
              <li>Tips for growing your audience</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Help;
