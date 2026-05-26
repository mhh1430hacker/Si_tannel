import { supabase, isSupabaseConfigured } from "./supabase";

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResult {
  success: boolean;
  error?: AuthError;
  userId?: string;
  email?: string;
}

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "البريد أو كلمة المرور غير صحيحة";
  if (msg.includes("User already registered")) return "هذا البريد مسجّل بالفعل — جرّب تسجيل الدخول";
  if (msg.includes("Email not confirmed")) return "يرجى تأكيد بريدك الإلكتروني أولاً";
  if (msg.includes("Password should be at least")) return "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
  if (msg.includes("Email rate limit exceeded")) return "محاولات كثيرة — حاول بعد دقائق";
  if (msg.includes("Signup is disabled")) return "التسجيل معطّل حالياً";
  if (msg.includes("Unable to validate email")) return "البريد الإلكتروني غير صالح";
  return msg;
}

export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<AuthResult> {
  if (!supabase || !isSupabaseConfigured()) {
    return { success: false, error: { message: "قاعدة البيانات غير مربوطة" } };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) {
    return { success: false, error: { message: translateError(error.message), code: error.message } };
  }

  if (!data.user) {
    return { success: false, error: { message: "حدث خطأ غير متوقع" } };
  }

  return { success: true, userId: data.user.id, email: data.user.email ?? email };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase || !isSupabaseConfigured()) {
    return { success: false, error: { message: "قاعدة البيانات غير مربوطة" } };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: { message: translateError(error.message), code: error.message } };
  }

  if (!data.user) {
    return { success: false, error: { message: "حدث خطأ غير متوقع" } };
  }

  return { success: true, userId: data.user.id, email: data.user.email ?? email };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function resetPassword(email: string): Promise<AuthResult> {
  if (!supabase || !isSupabaseConfigured()) {
    return { success: false, error: { message: "قاعدة البيانات غير مربوطة" } };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
  });

  if (error) {
    return { success: false, error: { message: translateError(error.message), code: error.message } };
  }

  return { success: true };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: (session.user.user_metadata?.name as string) ?? "",
  };
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void): (() => void) | null {
  if (!supabase) return null;

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email ?? "",
        name: (session.user.user_metadata?.name as string) ?? "",
      });
    } else {
      callback(null);
    }
  });

  return () => subscription.unsubscribe();
}

export async function updateUserName(name: string): Promise<AuthResult> {
  if (!supabase) return { success: false, error: { message: "قاعدة البيانات غير مربوطة" } };

  const { error } = await supabase.auth.updateUser({
    data: { name },
  });

  if (error) {
    return { success: false, error: { message: translateError(error.message) } };
  }
  return { success: true };
}
