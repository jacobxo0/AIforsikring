import { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { createUser, getUserByEmail } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      // For development, we'll use a simple email verification
      sendVerificationRequest: async ({ identifier: email, url }) => {
        console.log(`Verification email would be sent to ${email} with URL: ${url}`);
        // In production, implement proper email sending here
      },
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      
      try {
        // Get or create user in our database
        let dbUser = await getUserByEmail(user.email);
        if (!dbUser) {
          dbUser = await createUser(user.email);
        }
        
        return true;
      } catch (error) {
        console.error('Sign in error:', error);
        return false;
      }
    },

    async session({ session, token }) {
      if (session.user?.email) {
        try {
          const dbUser = await getUserByEmail(session.user.email);
          if (dbUser) {
            session.user = {
              ...session.user,
              id: dbUser.id,
              subscriptionType: dbUser.subscription_type,
              credits: dbUser.credits,
            };
          }
        } catch (error) {
          console.error('Session callback error:', error);
        }
      }
      
      return session;
    },

    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
  },

  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },

  session: {
    strategy: 'jwt',
  },
};

// Type extensions for NextAuth
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      subscriptionType: 'free' | 'premium';
      credits: number;
      name?: string | null;
      image?: string | null;
    };
  }
}

// Helper functions for checking user permissions
export function canUploadDocuments(user: any): boolean {
  if (user?.subscriptionType === 'premium') return true;
  // Free users can upload max 3 documents per session
  return true; // We'll check actual usage in the API
}

export function canExportReports(user: any): boolean {
  return user?.subscriptionType === 'premium' || user?.credits > 0;
}

export function canAccessAdvancedFeatures(user: any): boolean {
  return user?.subscriptionType === 'premium';
}

export function getUploadLimit(user: any): number {
  return user?.subscriptionType === 'premium' ? Infinity : 3;
}