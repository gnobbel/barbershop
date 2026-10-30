import { ActionForm, Submit } from "@/components/ActionForm";
import { getSettings } from "@/lib/data";
import { loginAction } from "../actions";

export const metadata = { title: "Sign in" };

export default async function Login() {
  const s = await getSettings();
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="fade-in w-full max-w-[380px]">
        <p className="display mb-12 text-center text-2xl">{s.businessName}</p>
        <div className="card px-7 py-9">
          <p className="eyebrow mb-3">Admin</p>
          <h1 className="display mb-8 text-4xl">Sign in</h1>
          <ActionForm action={loginAction} className="space-y-5">
            <label className="field">
              <span className="eyebrow">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                autoFocus
                className="input"
              />
            </label>
            <Submit pendingLabel="Signing in…" className="btn btn-primary w-full">
              Continue
            </Submit>
          </ActionForm>
        </div>
      </div>
    </main>
  );
}
