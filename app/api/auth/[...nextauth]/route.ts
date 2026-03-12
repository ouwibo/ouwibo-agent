import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import TwitterProvider from "next-auth/providers/twitter"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "dummy",
      clientSecret: process.env.GOOGLE_SECRET || "dummy",
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_ID || "dummy",
      clientSecret: process.env.TWITTER_SECRET || "dummy",
      version: "2.0",
    })
  ],
  pages: {
    signIn: '/login', // We will create a custom beautiful login page
  },
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "ouwibo_super_secret_agent_key_2026",
});

export { handler as GET, handler as POST }
