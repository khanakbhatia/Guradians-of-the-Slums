import { useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { passwordRules } from "@/lib/validation";
import { GlassInput } from "@/pages/auth/FormField";

function PasswordField({ value, onChange, showRules = false, error, placeholder = "••••••••", id, autoComplete }) {
  const [visible, setVisible] = useState(false);
  const rules = showRules ? passwordRules(value) : [];

  return (
    <div>
      <div className="relative">
        <GlassInput
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          error={error}
          autoComplete={autoComplete}
          className="pr-9"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {showRules && value.length > 0 && (
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-3">
          {rules.map((r) => (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-1 text-2xs transition-colors",
                r.met ? "text-success" : "text-muted-foreground"
              )}
            >
              {r.met ? <Check className="size-3" /> : <X className="size-3 opacity-50" />}
              {r.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PasswordField;
