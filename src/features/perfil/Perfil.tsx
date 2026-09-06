import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, LogOut, AlertTriangle, User, Trash2 } from 'lucide-react';

// Regex para validação de E.164 (pode ter até 15 dígitos com + no início)
const e164Regex = /^\+[1-9]\d{1,14}$/;

const profileSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres'),
  whatsapp: z.string().optional().refine((val) => !val || e164Regex.test(val), {
    message: 'Formato inválido. Use +5511999999999',
  }),
  timezone: z.string().min(1, 'Timezone é obrigatório'),
});

type ProfileForm = z.infer<typeof profileSchema>;

export const Perfil: React.FC = () => {
  const { user } = useAuth();
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      timezone: 'America/Sao_Paulo',
    }
  });

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          reset({
            nome: data.nome || '',
            whatsapp: data.whatsapp || '',
            timezone: data.timezone || 'America/Sao_Paulo',
          });
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        toast.error('Não foi possível carregar os dados do perfil.');
      } finally {
        setIsLoadingProfile(false);
      }
    }
    loadProfile();
  }, [user, reset]);

  const onSubmit = async (data: ProfileForm) => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        nome: data.nome,
        whatsapp: data.whatsapp || null,
        timezone: data.timezone,
      });

      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar o perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.toggle('dark');
    const isNowDark = root.classList.contains('dark');
    setIsDark(isNowDark);
    localStorage.setItem('theme', isNowDark ? 'dark' : 'light');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Chama a RPC que criamos na migration para deletar o próprio usuário
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      toast.success('Conta excluída para sempre. Sentiremos sua falta.');
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro ao deletar conta:', err);
      toast.error('Não foi possível excluir a conta. Tente novamente.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 p-3 rounded-full">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Seu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações e preferências</p>
        </div>
      </div>

      <div className="bg-background rounded-xl shadow-sm border border-border overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-foreground">
                Nome de exibição
              </label>
              <input
                id="nome"
                type="text"
                {...register('nome')}
                className="mt-1 block w-full rounded-md border border-border px-3 py-2 bg-background text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              />
              {errors.nome && <p className="mt-1 text-sm text-red-500">{errors.nome.message}</p>}
            </div>

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-foreground">
                WhatsApp (Opcional, com DDI e DDD)
              </label>
              <input
                id="whatsapp"
                type="text"
                placeholder="+5511999999999"
                {...register('whatsapp')}
                className="mt-1 block w-full rounded-md border border-border px-3 py-2 bg-background text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              />
              {errors.whatsapp && <p className="mt-1 text-sm text-red-500">{errors.whatsapp.message}</p>}
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-foreground">
                Fuso Horário
              </label>
              <select
                id="timezone"
                {...register('timezone')}
                className="mt-1 block w-full rounded-md border border-border px-3 py-2 bg-background text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              >
                <option value="America/Sao_Paulo">Horário de Brasília (America/Sao_Paulo)</option>
                <option value="America/Manaus">Amazonas (America/Manaus)</option>
                <option value="America/Belem">Pará (America/Belem)</option>
                <option value="America/Fortaleza">Ceará (America/Fortaleza)</option>
                <option value="America/Bahia">Bahia (America/Bahia)</option>
                <option value="America/Noronha">Fernando de Noronha (America/Noronha)</option>
                <option value="America/Campo_Grande">Mato Grosso do Sul (America/Campo_Grande)</option>
                <option value="America/Cuiaba">Mato Grosso (America/Cuiaba)</option>
              </select>
              {errors.timezone && <p className="mt-1 text-sm text-red-500">{errors.timezone.message}</p>}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex justify-center items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
              Salvar alterações
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-4 mt-8 pb-8">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-background border border-border text-foreground hover:bg-muted font-medium transition-colors"
        >
          {isDark ? 'Tema Claro' : 'Tema Escuro'}
        </button>

        <div className="flex justify-start">
          <button
            onClick={handleLogout}
            className="inline-flex justify-center items-center px-4 py-2 border border-border shadow-sm text-sm font-medium rounded-md text-foreground bg-background hover:bg-muted"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-12 pt-8 border-t border-red-200 dark:border-red-900/30">
        <h3 className="text-lg font-medium text-red-600 dark:text-red-400 flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" />
          Zona de Perigo
        </h3>
        
        {!showDeleteConfirm ? (
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200 mb-4">
              Ao excluir sua conta, todos os seus dados, histórico e configurações serão apagados permanentemente. Esta ação não pode ser desfeita.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex justify-center items-center px-4 py-2 border border-red-200 dark:border-red-800 shadow-sm text-sm font-medium rounded-md text-red-600 dark:text-red-400 bg-white dark:bg-black hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir minha conta
            </button>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-200 dark:border-red-800 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              Para confirmar, digite seu e-mail ({user?.email}):
            </p>
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              className="w-full rounded-md border border-red-300 dark:border-red-700 px-3 py-2 bg-white dark:bg-slate-900 text-foreground mb-4 focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder={user?.email || ''}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteEmail !== user?.email}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                Excluir permanentemente
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteEmail('');
                }}
                disabled={isDeleting}
                className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
