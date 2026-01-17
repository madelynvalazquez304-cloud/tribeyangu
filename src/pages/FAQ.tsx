import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const FAQ = () => {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-display text-3xl font-bold">Frequently Asked Questions</h1>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Payments & Payouts</h2>
            <p className="text-muted-foreground">How do I receive funds? We support M-PESA payouts — update your payout number in your dashboard and verify it for transfers.</p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Creator Accounts</h2>
            <p className="text-muted-foreground">Can I edit my username? Usernames are unique; contact support if you need changes after approval.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default FAQ;
