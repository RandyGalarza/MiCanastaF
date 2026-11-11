import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { Usuario } from '@/types/database';
import { User } from '@supabase/supabase-js';
import {
  eliminarContrasenaLocal,
  obtenerUsuarioPorCorreo,
} from '@/repositories/usuarioRepository';
import { supabase } from '@/database/supabaseClient';

export type AuthUser = Pick<
  Usuario,
  'id_usuario' | 'nombre' | 'apellido' | 'telefono' | 'correo' | 'rol' | 'id_comercio' | 'fecha_creacion'
>;

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  isComercio: boolean;
  signIn: (user: Usuario) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;

    const loadUser = async (authUser: User | null | undefined) => {
      if (!authUser?.email) {
        if (active) setUser(null);
        return;
      }

      try {
        const usuario = await obtenerUsuarioPorCorreo(authUser.email);
        if (usuario?.usu_estado === 1) {
          await eliminarContrasenaLocal(usuario.id_usuario);
        }
        if (active) {
          setUser(usuario?.usu_estado === 1 ? toAuthUser(usuario) : null);
        }
      } catch (error) {
        console.error('No se pudo cargar el perfil de la sesión:', error);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadUser(session?.user);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('No se pudo restaurar la sesión de Supabase:', error);
        return;
      }
      return loadUser(data.session?.user);
    }).catch((error) => {
      console.error('No se pudo restaurar la sesión de Supabase:', error);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: user?.rol === 'admin',
      isComercio: user?.rol === 'comercio',
      signIn: (usuario) => {
        setUser(toAuthUser(usuario));
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function toAuthUser(usuario: Usuario): AuthUser {
  const { id_usuario, nombre, apellido, telefono, correo, rol, id_comercio, fecha_creacion } = usuario;
  return {
    id_usuario,
    nombre,
    apellido,
    telefono,
    correo,
    rol: rol || 'usuario',
    id_comercio: id_comercio ?? null,
    fecha_creacion,
  };
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }
  return context;
}
