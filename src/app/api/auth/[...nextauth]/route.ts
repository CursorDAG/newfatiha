import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "teacher@fatiha.ru" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password')
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
          throw new Error('No user found with those credentials')
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isCorrectPassword) {
          throw new Error('Invalid password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // After sign-in, go to /auth/redirect so we can route by role
      if (url === baseUrl || url === `${baseUrl}/`) return `${baseUrl}/auth/redirect`;
      // Allow relative redirects
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allow same-origin redirects
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/auth/redirect`;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      // Refresh user status on each request
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { status: true, role: true },
        });
        if (dbUser) {
          token.status = dbUser.status;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        if (session.user) {
          session.user.role = token.role;
          session.user.id = token.id;
          session.user.status = token.status;
        }
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
