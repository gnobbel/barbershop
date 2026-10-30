import { ActionForm, Submit } from "@/components/ActionForm";
import { getSettings } from "@/lib/data";
import { initials } from "@/lib/format";
import { loginAction } from "../actions";

export const metadata = { title: "Sign in" };

export default async function Login() {
  const s = await getSettings();
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="fade-in w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-[16px] font-bold text-white">
            {initials(s.businessName)}
          </span>
          <p className="title text-[17px]">{s.businessName}</p>
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="headline text-[30px]">Welcome back</h1>
          <p className="mt-1.5 text-muted">Sign in to manage your appointments.</p>
          <ActionForm action={loginAction} className="mt-7 space-y-4">
            <label className="block">
              <span className="label mb-1.5">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                autoFocus
                className="input"
              />
            </label>
            <Submit pendingLabel="Signing in…" className="btn btn-primary btn-lg w-full">
              Sign in
            </Submit>
          </ActionForm>
        </div>
      </div>
    </main>
  );
}
