import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Wallet, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Formato de e-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    setIsSubmitting(false);

    if (error) {
      if (error.message === 'Invalid login credentials') {
        toast.error('E-mail ou senha incorretos.');
      } else {
        toast.error('Erro ao fazer login. Tente novamente.');
      }
      return;
    }

    toast.success('Bem-vindo de volta!');
    navigate('/app');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Acessar ExpensesDu
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="relative block w-full appearance-none rounded-t-md border border-slate-300 px-3 py-3 text-slate-900 placeholder-slate-500 focus:z-10 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
                placeholder="E-mail"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Senha</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="relative block w-full appearance-none rounded-b-md border border-slate-300 px-3 py-3 text-slate-900 placeholder-slate-500 focus:z-10 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
                placeholder="Senha"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Entrar'}
            </button>
          </div>
        </form>
        <div className="text-center text-sm">
          <span className="text-slate-600 dark:text-slate-400">Não tem uma conta? </span>
          <Link to="/register" className="font-medium text-primary hover:text-primary/80">
            Cadastre-se grátis
          </Link>
        </div>
      </div>
    </div>
  );
};
