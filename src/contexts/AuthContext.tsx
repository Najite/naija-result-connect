import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

interface Admin {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'super_admin' | 'registrar';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface AuthContextType {
  admin: Admin | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: string | string[]) => boolean;
  updateLastLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin is logged in from localStorage
    const checkStoredAuth = () => {
      try {
        const savedAdmin = localStorage.getItem('admin');
        const authExpiry = localStorage.getItem('authExpiry');
        
        if (savedAdmin && authExpiry) {
          const expiryTime = parseInt(authExpiry);
          const currentTime = Date.now();
          
          // Check if auth has expired (24 hours)
          if (currentTime < expiryTime) {
            const adminData = JSON.parse(savedAdmin);
            setAdmin(adminData);
          } else {
            // Auth expired, clear storage
            localStorage.removeItem('admin');
            localStorage.removeItem('authExpiry');
          }
        }
      } catch (error) {
        console.error('Error checking stored auth:', error);
        localStorage.removeItem('admin');
        localStorage.removeItem('authExpiry');
      }
      setLoading(false);
    };

    checkStoredAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Validate input
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      // Query admin user from database
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Database error:', error);
        return { success: false, error: 'Invalid credentials' };
      }

      if (!adminData) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is active
      if (!adminData.is_active) {
        return { success: false, error: 'Account is inactive. Please contact administrator.' };
      }

      // Verify password
      let isPasswordValid = false;
      
      // Check if the stored hash is the placeholder hash
      if (adminData.password_hash === '$2b$10$example_hash') {
        // For development/demo purposes, accept any password for the demo account
        // In production, you should replace this with proper password validation
        console.warn('Using placeholder password hash - this should not be used in production');
        isPasswordValid = true;
      } else {
        // Verify password against stored hash using bcrypt
        try {
          isPasswordValid = await bcrypt.compare(password, adminData.password_hash);
        } catch (bcryptError) {
          console.error('Bcrypt comparison error:', bcryptError);
          return { success: false, error: 'Password verification failed' };
        }
      }
      
      if (!isPasswordValid) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Create admin object
      const admin: Admin = {
        id: adminData.id,
        email: adminData.email,
        full_name: adminData.full_name,
        role: adminData.role as 'admin' | 'super_admin' | 'registrar',
        is_active: adminData.is_active,
        last_login: adminData.last_login,
        created_at: adminData.created_at
      };

      // Set authentication state
      setAdmin(admin);
      
      // Store in localStorage with expiry (24 hours)
      const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
      localStorage.setItem('admin', JSON.stringify(admin));
      localStorage.setItem('authExpiry', expiryTime.toString());

      // Update last login timestamp
      await updateLastLoginInDB(adminData.id);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const updateLastLoginInDB = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', adminId);

      if (error) {
        console.error('Error updating last login:', error);
      }
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  };

  const updateLastLogin = async () => {
    if (admin) {
      await updateLastLoginInDB(admin.id);
      // Update the admin state with new last_login
      const updatedAdmin = {
        ...admin,
        last_login: new Date().toISOString()
      };
      setAdmin(updatedAdmin);
      localStorage.setItem('admin', JSON.stringify(updatedAdmin));
    }
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem('admin');
    localStorage.removeItem('authExpiry');
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!admin) return false;
    
    if (typeof role === 'string') {
      return admin.role === role;
    }
    
    return role.includes(admin.role);
  };

  const isAuthenticated = admin !== null;

  return (
    <AuthContext.Provider value={{ 
      admin, 
      login, 
      logout, 
      loading, 
      isAuthenticated,
      hasRole,
      updateLastLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Utility function to create admin users (for seeding)
export const createAdminUser = async (
  email: string, 
  password: string, 
  fullName: string, 
  role: 'admin' | 'super_admin' | 'registrar' = 'admin'
) => {
  try {
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert into database
    const { data, error } = await supabase
      .from('admin_users')
      .insert([
        {
          email: email.toLowerCase().trim(),
          full_name: fullName,
          password_hash: passwordHash,
          role: role,
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating admin user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error creating admin user:', error);
    return { success: false, error: 'Failed to create admin user' };
  }
};

// Helper function to update placeholder password with real hash
export const updateAdminPassword = async (email: string, newPassword: string) => {
  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const { data, error } = await supabase
      .from('admin_users')
      .update({ password_hash: passwordHash })
      .eq('email', email.toLowerCase().trim())
      .select()
      .single();

    if (error) {
      console.error('Error updating password:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating password:', error);
    return { success: false, error: 'Failed to update password' };
  }
};

// Role-based access control helper
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  REGISTRAR: 'registrar'
} as const;

// Role hierarchy for permission checking
export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.REGISTRAR],
  [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.REGISTRAR],
  [ROLES.REGISTRAR]: [ROLES.REGISTRAR]
} as const;

// Check if user has permission based on role hierarchy
export const hasPermission = (userRole: string, requiredRole: string): boolean => {
  const allowedRoles = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY];
  return allowedRoles ? allowedRoles.includes(requiredRole as any) : false;
};