import React from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const AboutCreators: React.FC = () => {
  return (
    <DashboardLayout type="creator">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="font-display text-4xl font-bold">For Creators — Build a sustainable creative business</h1>
          <p className="text-muted-foreground">TribeYangu gives creators simple, reliable tools to monetize their work and grow a community — built specifically for African markets.</p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Why TribeYangu?</h2>
            <p className="text-muted-foreground">
              We focus on ease of use and local payment methods. With M-PESA integration, low fees, and creator-first features, you can start accepting support in minutes and scale with confidence.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Fast donation flows (M-PESA STK) so fans can support you instantly</li>
              <li>Customizable creator pages to showcase your work and sell merchandise</li>
              <li>Transparent fees and payout options tailored for African banking and mobile money</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Getting started</h2>
            <p className="text-muted-foreground">Sign up, claim your username, customize your page, and share the link with fans. You can request a creator account from your dashboard and we'll review it quickly.</p>
            <div className="flex gap-3">
              <Button asChild>
                <Link to="/signup">Create an account</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Creator dashboard</Link>
              </Button>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Tips for success</h2>
            <p className="text-muted-foreground">Consistency and community matter. Share behind-the-scenes content, run limited-time campaigns, and reward your top supporters.</p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
              <li>Personalize your page with photos and a clear bio.</li>
              <li>Create simple donation tiers and thank supporters publicly (if they opt in).</li>
              <li>Use the link in your social profiles and run occasional share campaigns.</li>
            </ol>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AboutCreators;
