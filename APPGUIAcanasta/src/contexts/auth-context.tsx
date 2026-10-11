import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import { Usuario } from '@/types/database';

export type AuthUser = Pick<
  Usuario,
  'id_usuario' | 'nombre' | 'apellido' | 'telefono' | 'correo' | 'fecha_creacion'
>;

interface AuthContextValue {
  user: AuthUser | null;
  signIn: (user: Usuario) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      signIn: (usuario) => {
        const { id_usuario, nombre, apellido, telefono, correo, fecha_creacion } = usuario;
        setUser({ id_usuario, nombre, apellido, telefono, correo, fecha_creacion });
      },
      signOut: () => setUser(null),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }
  return context;
}
