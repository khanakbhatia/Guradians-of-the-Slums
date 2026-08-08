import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MailCheck, Send } from "lucide-react";

import { ROUTES } from "@/constants";
import { validateEmail } from "@/lib/validation";

import AuthCard from "@/pages/auth/AuthCard";
import FormField, { GlassInput } from "@/pages/auth/FormField";

import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";

const RESEND_COOLDOWN = 30;

/**
 * FRONTEND ONLY — no email is actually sent. Submitting simulates a
 * short delay, shows a confirmation state, and offers a cooldown-gated
 * "resend" so the interaction pattern is demoable end to end.
 */
function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    if (err) return;

    setSubmitting(true);
    await new Promise((res) => setTimeout(res, 700));
    setSubmitting(false);
    setSent(true);
    setCooldown(RESEND_COOLDOWN);
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setSubmitting(true);
    await new Promise((res) => setTimeout(res, 700));
    setSubmitting(false);
    setCooldown(RESEND_COOLDOWN);
  }

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        subtitle="This is a frontend-only preview — no email was actually sent"
        footer={
          <Link to={ROUTES.LOGIN} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <ArrowLeft className="size-3.5" /> Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success">
            <MailCheck className="size-6" />
          </div>
          <div>
            <p className="text-sm text-foreground/90">
              If an account exists for <span className="font-medium text-foreground">{email}</span>, a reset link
              would be sent there.
            </p>
            <Muted className="mt-2">Didn&apos;t get anything? Check the spelling or resend below.</Muted>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={cooldown > 0}
            loading={submitting}
            onClick={handleResend}
            className="border-border-strong bg-secondary/40 hover:bg-accent"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link"
      footer={
        <Link to={ROUTES.LOGIN} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <ArrowLeft className="size-3.5" /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField label="Email" htmlFor="email" error={error}>
          <GlassInput
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={error}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>

        <Button type="submit" className="w-full" loading={submitting}>
          <Send className="size-4" /> Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}

export default ForgotPassword;
