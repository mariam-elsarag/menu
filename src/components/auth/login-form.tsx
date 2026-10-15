"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { getLoginErrorMessage } from "@/features/auth/login-error-message";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/login-schema";

export function LoginForm() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const submissionLock = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    let active = true;

    void supabase.auth
      .getClaims()
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data?.claims) {
          router.replace("/dashboard/categories");
          router.refresh();
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function onSubmit(values: LoginFormValues) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast.error(getLoginErrorMessage(error));
        return;
      }

      if (!data.session) {
        toast.error("تعذر تسجيل الدخول حالياً. يرجى المحاولة مرة أخرى");
        return;
      }

      toast.success("تم تسجيل الدخول بنجاح");
      router.replace("/dashboard/categories");
      router.refresh();
    } catch {
      toast.error("تعذر تسجيل الدخول حالياً. يرجى المحاولة مرة أخرى");
    } finally {
      submissionLock.current = false;
    }
  }

  function onFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (submissionLock.current) {
      event.preventDefault();
      return;
    }

    submissionLock.current = true;
    void handleSubmit(onSubmit, () => {
      submissionLock.current = false;
    })(event).catch(() => {
      submissionLock.current = false;
      toast.error("تعذر تسجيل الدخول حالياً. يرجى المحاولة مرة أخرى");
    });
  }

  if (checkingSession) {
    return (
      <section
        className="ui-card grid min-h-80 w-full place-items-center rounded-xl p-8"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" aria-hidden="true" size={19} />
          جارٍ التحقق من الجلسة...
        </span>
      </section>
    );
  }

  return (
    <section className="ui-card w-full rounded-xl p-6 sm:p-8">
      <header className="mb-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-secondary text-primary">
          <Utensils aria-hidden="true" size={23} strokeWidth={1.8} />
        </span>
        <p className="mt-5 text-xs font-semibold text-primary">إدارة المطعم</p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal">
          تسجيل الدخول
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          سجّل الدخول للوصول إلى لوحة مطعمك وإدارة طلباتك.
        </p>
      </header>

      <form
        className="grid gap-5"
        noValidate
        onSubmit={onFormSubmit}
        aria-busy={isSubmitting}
      >
        <div>
          <label
            htmlFor="login-email"
            className="mb-2 block text-sm font-semibold"
          >
            البريد الإلكتروني
          </label>
          <input
            {...register("email")}
            id="login-email"
            type="email"
            dir="ltr"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            className="ui-input h-12 px-4 text-left"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "login-email-error" : undefined}
          />
          {errors.email?.message && (
            <p
              id="login-email-error"
              className="ui-field-error mt-1.5"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-2 block text-sm font-semibold"
          >
            كلمة المرور
          </label>
          <div className="relative">
            <input
              {...register("password")}
              id="login-password"
              type={passwordVisible ? "text" : "password"}
              dir="ltr"
              autoComplete="current-password"
              className="ui-input h-12 pe-4 ps-12 text-left"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
            />
            <button
              type="button"
              className="absolute cursor-pointer inset-y-1 end-1 grid w-10 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={
                passwordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
              }
              aria-pressed={passwordVisible}
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              {passwordVisible ? (
                <EyeOff aria-hidden="true" size={18} />
              ) : (
                <Eye aria-hidden="true" size={18} />
              )}
            </button>
          </div>
          {errors.password?.message && (
            <p
              id="login-password-error"
              className="ui-field-error mt-1.5"
              role="alert"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="ui-button ui-button-primary mt-2 min-h-12 w-full text-base font-bold"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle
                className="animate-spin"
                aria-hidden="true"
                size={18}
              />
              جارٍ تسجيل الدخول...
            </>
          ) : (
            "تسجيل الدخول"
          )}
        </button>
      </form>
    </section>
  );
}
