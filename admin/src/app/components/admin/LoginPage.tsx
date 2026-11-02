import { type FormEvent, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import logoImage from '../../../assets/LOGO.png';

interface LoginPageProps {
  onLogin: (loginId: string, password: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onLogin(loginId, password);
  };

  return (
    <div className="admin-app-bg min-h-screen">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <section className="flex w-full items-center justify-center bg-black/10 p-8 lg:w-1/2 lg:p-12">
          <img
            src={logoImage}
            alt="Arghya Trust logo"
            className="h-[42vh] w-auto max-w-[90%] object-contain lg:h-[62vh]"
          />
        </section>

        <section className="flex w-full items-center justify-center bg-transparent p-6 lg:w-1/2 lg:p-10">
          <div className="w-full max-w-md rounded-2xl border border-[#b9d6c2] bg-transparent p-6 shadow-[0_18px_45px_rgba(13,45,20,0.2)] md:p-8">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#205f37]">Admin Portal</p>
              <h2 className="mt-2 text-4xl font-semibold leading-tight text-[#123323]">Welcome Back</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="loginId" className="mb-2 block text-sm text-[#254533]">
                  Email or Username
                </Label>
                <Input
                  id="loginId"
                  type="text"
                  placeholder="contact@arghyatrust.org or arghya_admin"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  autoComplete="username"
                  className="h-12 rounded-xl border-[#9fc4ac] bg-[#f5fbf7] px-4 text-[#163824] placeholder:text-[#6f8f7d] focus:border-[#2f7d46] focus:ring-[#2f7d46]/25"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="mb-2 block text-sm text-[#254533]">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-12 rounded-xl border-[#9fc4ac] bg-[#f5fbf7] px-4 text-[#163824] placeholder:text-[#6f8f7d] focus:border-[#2f7d46] focus:ring-[#2f7d46]/25"
                  required
                />
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-[#2f7d46] text-base font-medium text-white transition hover:bg-[#25663a]"
              >
                Sign In
              </Button>
            </form>

            <p className="mt-6 rounded-xl border border-[#c8dccf] bg-[#eff7f2] px-4 py-3 text-center text-xs text-[#325544]">
              Protected Administrator Portal &bull; Arghya Trust
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
