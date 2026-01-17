import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Contact = () => {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-display text-3xl font-bold">Contact Us</h1>
          <p className="text-muted-foreground">We’re here to help. Reach out for support, partnerships, or media inquiries.</p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Send us a message</h2>
            <p className="text-muted-foreground">Email: <a href="mailto:hello@tribeyangu.com" className="underline">hello@tribeyangu.com</a></p>
            <p className="text-muted-foreground">For creator support use <a href="mailto:support@tribeyangu.online" className="underline">support@tribeyangu.online</a> and include relevant details.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Contact;
