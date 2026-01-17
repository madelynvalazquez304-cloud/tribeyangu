import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CommunityGuidelines = () => {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-display text-3xl font-bold">Community Guidelines</h1>
          <p className="text-muted-foreground">Our community thrives when creators and fans treat each other with respect. The following guidelines help keep the space safe and productive.</p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Be respectful</h2>
            <p className="text-muted-foreground">Treat creators and supporters with courtesy. Harassment, hate speech, or threats are not tolerated.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Be honest</h2>
            <p className="text-muted-foreground">Do not impersonate others or misrepresent contributions. Keep posts and descriptions factual.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Report issues</h2>
            <p className="text-muted-foreground">If you see abusive behavior or scams, report them to our support team immediately.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CommunityGuidelines;
