import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Herval Flow" },
      { name: "description", content: "Acesso restrito à operação comercial da Herval Marketing." },
      { property: "og:title", content: "Entrar — Herval Flow" },
      {
        property: "og:description",
        content: "Acesso restrito à operação comercial da Herval Marketing.",
      },
    ],
  }),
  component: AuthPage,
});

function translateAuthError(message: string) {
  if (message.includes("Invalid login credentials")) return "E-mail ou senha inválidos.";
  if (message.includes("User already registered")) return "Este e-mail já possui cadastro.";
  if (message.includes("Password should be")) return "A senha deve ter no mínimo 6 caracteres.";
  if (message.includes("Email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (message.includes("same as the old password"))
    return "A nova senha deve ser diferente da atual.";
  if (message.includes("rate limit") || message.includes("security purposes"))
    return "Muitas tentativas. Aguarde alguns instantes.";
  return "Não foi possível concluir a operação. Tente novamente.";
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [signUp, setSignUp] = useState({ name: "", email: "", password: "" });
  const [checkEmail, setCheckEmail] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState({ password: "", confirm: "" });
  const recoveryRef = useRef(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryRef.current = true;
        setRecoveryMode(true);
        return;
      }
      if (session && !recoveryRef.current) void navigate({ to: "/painel", replace: true });
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && !recoveryRef.current) void navigate({ to: "/painel", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!signIn.email.trim() || !signIn.password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: signIn.email.trim(),
      password: signIn.password,
    });
    setLoading(false);
    if (error) {
      toast.error(translateAuthError(error.message));
      return;
    }
    toast.success("Bem-vindo de volta.");
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (signUp.name.trim().length < 2) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if (signUp.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: signUp.email.trim(),
      password: signUp.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: signUp.name.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(translateAuthError(error.message));
      return;
    }
    if (!data.session) {
      setCheckEmail(true);
      toast.success("Cadastro criado. Confirme seu e-mail para acessar.");
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = forgotEmail.trim();
    if (!email) {
      toast.error("Informe seu e-mail.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);
    if (error) {
      toast.error(translateAuthError(error.message));
      return;
    }
    toast.success("Enviamos um e-mail com o link para redefinir sua senha.");
    setShowForgot(false);
  };

  const handleSetNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (newPassword.password !== newPassword.confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword.password });
    setLoading(false);
    if (error) {
      toast.error(translateAuthError(error.message));
      return;
    }
    toast.success("Senha atualizada com sucesso.");
    recoveryRef.current = false;
    void navigate({ to: "/painel", replace: true });
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-border bg-sidebar p-10 lg:flex">
        <Logo size={34} />
        <div className="max-w-md space-y-4">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            A central de comando comercial da Herval Marketing.
          </h2>
          <p className="text-lg font-medium text-primary">Elas movimentam. Você converte.</p>
          <p className="text-sm text-muted-foreground">
            Leads, agenda, follow-ups e intervenção do gestor em um único fluxo operacional.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Uso interno · Herval Marketing</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-center lg:hidden">
            <Logo size={32} />
          </div>

          {checkEmail ? (
            <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-sm">
              Enviamos um e-mail de confirmação. Confirme o cadastro e faça login para acessar o
              sistema.
            </div>
          ) : null}

          {recoveryMode ? (
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div>
                <h1 className="text-lg font-semibold">Definir nova senha</h1>
                <p className="text-sm text-muted-foreground">
                  Escolha uma nova senha para acessar sua conta.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword.password}
                  onChange={(e) =>
                    setNewPassword((s) => ({ ...s, password: e.target.value }))
                  }
                  minLength={8}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword.confirm}
                  onChange={(e) =>
                    setNewPassword((s) => ({ ...s, confirm: e.target.value }))
                  }
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          ) : showForgot ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <h1 className="text-lg font-semibold">Esqueci minha senha</h1>
                <p className="text-sm text-muted-foreground">
                  Informe seu e-mail para receber o link de redefinição de senha.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="forgot-email">E-mail</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="voce@hervalmarketing.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setShowForgot(false)}
              >
                Voltar para o login
              </button>
            </form>
          ) : (
          <Tabs defaultValue="entrar">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="criar">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={signIn.email}
                    onChange={(e) => setSignIn((s) => ({ ...s, email: e.target.value }))}
                    placeholder="voce@hervalmarketing.com"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={signIn.password}
                    onChange={(e) => setSignIn((s) => ({ ...s, password: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setForgotEmail(signIn.email);
                    setShowForgot(true);
                  }}
                >
                  Esqueci minha senha
                </button>
              </form>
            </TabsContent>

            <TabsContent value="criar">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={signUp.name}
                    onChange={(e) => setSignUp((s) => ({ ...s, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={signUp.email}
                    onChange={(e) => setSignUp((s) => ({ ...s, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    value={signUp.password}
                    onChange={(e) => setSignUp((s) => ({ ...s, password: e.target.value }))}
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    O primeiro cadastro do sistema recebe o papel de Gestor Comercial. Os demais
                    entram como CRC.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
