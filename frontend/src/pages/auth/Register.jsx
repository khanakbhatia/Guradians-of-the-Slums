import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { ROLES, ROLE_HOME_ROUTE, ROUTES } from "@/constants";
import {
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/validation";

import AuthCard from "@/pages/auth/AuthCard";
import FormField, { GlassInput } from "@/pages/auth/FormField";
import PasswordField from "@/pages/auth/PasswordField";
import RoleSelect from "@/pages/auth/RoleSelect";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: ROLES.CITIZEN,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirmPassword: validateConfirmPassword(form.password, form.confirmPassword),
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
      const session = await register(form);
      navigate(ROLE_HOME_ROUTE[session.role], { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Join the response network"
      wide
      footer={
        <>
          Already have an account?{" "}
          <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
            Sign in
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

        <FormField label="Full name" htmlFor="name" error={errors.name}>
          <GlassInput
            id="name"
            placeholder="Jordan Rivera"
            autoComplete="name"
            error={errors.name}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onBlur={() => setErrors((p) => ({ ...p, name: validateName(form.name) }))}
          />
        </FormField>

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

        <FormField label="Password" htmlFor="password" error={errors.password}>
          <PasswordField
            id="password"
            autoComplete="new-password"
            showRules
            value={form.password}
            error={errors.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </FormField>

        <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
          <PasswordField
            id="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            error={errors.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
        </FormField>

        <RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} />

        <Button type="submit" className="w-full" loading={submitting}>
          <UserPlus className="size-4" /> Create account
        </Button>
      </form>
    </AuthCard>
  );
}

export default Register;
