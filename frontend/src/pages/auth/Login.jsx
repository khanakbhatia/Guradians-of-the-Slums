import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME_ROUTE, ROUTES } from "@/constants";
import { validateEmail, validateRequired } from "@/lib/validation";

import AuthCard from "@/pages/auth/AuthCard";
import FormField, { GlassInput } from "@/pages/auth/FormField";
import PasswordField from "@/pages/auth/PasswordField";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

function Login() {
  const { login } = useAuth();
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
      const account = await login(form);
      navigate(from || ROLE_HOME_ROUTE[account.role], { replace: true });
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
    </AuthCard>
  );
}

export default Login;
