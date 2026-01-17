import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Support = () => {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-display text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground">
            Need help? Our support team helps creators with account setup, payments, and technical issues. Browse articles or contact us directly.
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Reset your password or manage your account settings</li>
              <li>Verify payout details and M-PESA setup</li>
              <li>Report a bug or request new features</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Contact Support</h2>
            <p className="text-muted-foreground">Email: <a href="mailto:support@tribeyangu.online" className="underline">support@tribeyangu.online</a></p>
            <p className="text-muted-foreground">For urgent issues with payments, include your transaction ID and a short description.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Support;
