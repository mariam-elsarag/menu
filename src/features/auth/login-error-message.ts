interface SupabaseLoginError {
  code?: string;
  message?: string;
}

export function getLoginErrorMessage(error: SupabaseLoginError) {
  const code = error.code?.toLowerCase();
  const message = error.message?.toLowerCase() ?? "";

  if (
    code === "email_not_confirmed" ||
    message.includes("email not confirmed")
  ) {
    return "يرجى تأكيد بريدك الإلكتروني أولاً";
  }

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password")
  ) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  }

  return "تعذر تسجيل الدخول حالياً. يرجى المحاولة مرة أخرى";
}
