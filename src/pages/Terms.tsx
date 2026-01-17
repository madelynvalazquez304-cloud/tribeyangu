import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Terms = () => {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-display text-3xl font-bold">Terms of Service</h1>
          <p className="text-muted-foreground">These Terms govern your use of TribeYangu. By using our services you agree to our rules around acceptable behavior, payments, and content.</p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">User responsibilities</h2>
            <p className="text-muted-foreground">Keep your account secure, follow community guidelines, and comply with local laws when accepting payments.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Payments</h2>
            <p className="text-muted-foreground">Fees and payout schedules are described on your dashboard. We may update fees with notice to creators.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Terms;
