import { createContext, useContext, useState, useEffect } from 'react';
import { account, ID } from '../lib/appwrite';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();
      setUser(currentUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function register(email, password, name) {
    try {
      await account.create(ID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();
      setUser(currentUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function logout() {
    try {
      await account.deleteSession('current');
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function updatePrefs(prefs) {
    try {
      await account.updatePrefs(prefs);
      const currentUser = await account.get();
      setUser(currentUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updatePrefs,
    isDriver: user?.prefs?.role === 'driver',
    isStudent: user?.prefs?.role === 'student',
    userRole: user?.prefs?.role || null,
    userRoute: user?.prefs?.routeId || null,
    userStop: user?.prefs?.stopName || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
