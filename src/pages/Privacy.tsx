import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Privacy = () => {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-display text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground">We respect your privacy. This policy explains how we collect, use, and protect personal data for creators and supporters.</p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Data we collect</h2>
            <p className="text-muted-foreground">We may collect profile info, transaction metadata, and usage metrics to improve services and process payments.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Your choices</h2>
            <p className="text-muted-foreground">You can request data export or deletion via support. We retain data as required for legal and operational purposes.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Privacy;
