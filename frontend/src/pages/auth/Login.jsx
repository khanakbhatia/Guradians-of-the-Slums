import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { ROLES, ROLE_HOME_ROUTE, ROLE_LABELS, ROUTES } from "@/constants";
import { validateEmail, validateRequired } from "@/lib/validation";

import AuthCard from "@/pages/auth/AuthCard";
import FormField, { GlassInput } from "@/pages/auth/FormField";
import PasswordField from "@/pages/auth/PasswordField";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Muted } from "@/components/ui/typography";

function Login() {
  const { login, loginAs } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = {
      email: validateEmail(form.email),
      password: validateRequired(form.password, "Password"),
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const session = await login(form);
      navigate(from || ROLE_HOME_ROUTE[session.role], { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickLogin(role) {
    setFormError("");
    setSubmitting(true);
    try {
      const session = await loginAs(role);
      navigate(ROLE_HOME_ROUTE[session.role], { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your operational dashboard"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to={ROUTES.REGISTER} className="font-medium text-primary hover:underline">
            Register
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <FormField label="Email" htmlFor="email" error={errors.email}>
          <GlassInput
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onBlur={() => setErrors((p) => ({ ...p, email: validateEmail(form.email) }))}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          error={errors.password}
          labelRight={
            <Link to={ROUTES.FORGOT_PASSWORD} className="text-2xs font-medium text-primary hover:underline" tabIndex={-1}>
              Forgot password?
            </Link>
          }
        >
          <PasswordField
            id="password"
            autoComplete="current-password"
            value={form.password}
            error={errors.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </FormField>

        <Button type="submit" className="w-full" loading={submitting}>
          <LogIn className="size-4" /> Sign in
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <Muted className="text-2xs uppercase tracking-wide">Demo quick access</Muted>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Object.values(ROLES).map((role) => (
          <Button
            key={role}
            variant="outline"
            size="sm"
            type="button"
            disabled={submitting}
            onClick={() => handleQuickLogin(role)}
            className="border-border-strong bg-secondary/40 hover:bg-accent"
          >
            {ROLE_LABELS[role]}
          </Button>
        ))}
      </div>
    </AuthCard>
  );
}

export default Login;
