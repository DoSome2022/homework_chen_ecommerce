
// ./auth.ts
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { MembershipLevel } from '@prisma/client';

const authOptions: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
async authorize(credentials) {
  console.log('收到登入請求，憑證資料：', credentials);

  if (!credentials?.username || !credentials?.password) {
    console.log('缺少 username 或 password');
    return null;
  }

  const username = credentials.username as string;
  console.log('嘗試登入的使用者名稱：', username);

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      currentMembershipLevel: true,
    },
  });

  if (!user) {
    console.log(`找不到使用者：${username}`);
    return null;
  }

  console.log('找到使用者：', user.username, '是否有密碼欄位：', !!user.passwordHash);

  if (!user.passwordHash) {
    console.log(`使用者 ${username} 沒有設定密碼（可能是 Google 註冊帳號）`);
    return null;
  }

  const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);
  console.log(`密碼比對結果：${isValid} （輸入密碼：${credentials.password}）`);

  if (!isValid) {
    console.log(`密碼錯誤，使用者：${username}`);
    return null;
  }

  console.log(`登入成功，使用者：${username}`);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    currentMembershipLevel: user.currentMembershipLevel,
  };
}
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // 初始登入
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.currentMembershipLevel = user.currentMembershipLevel;
      }
      
      // 如果是 Google 登入
      if (account?.provider === 'google') {
        token.provider = 'google';
        
        // 確保用戶在資料庫中存在
        const email = token.email;
        if (email) {
          let dbUser = await db.user.findUnique({
            where: { email },
          });
          
          if (!dbUser) {
            // 創建新用戶
            dbUser = await db.user.create({
              data: {
                email,
                username: email.split('@')[0] + '_google',
                name: token.name || email.split('@')[0],
                passwordHash: '',
                role: 'USER',
                currentMembershipLevel: MembershipLevel.FREE,
              },
            });
          }
          
          // 更新 token 中的用戶信息
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.username = dbUser.username;
          token.currentMembershipLevel = dbUser.currentMembershipLevel;
        }
      }
      
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as 'ADMIN' | 'USER';
        session.user.currentMembershipLevel = token.currentMembershipLevel as MembershipLevel;
        
        const isExpired = token.currentMembershipLevel === 'FREE' && token.role !== 'ADMIN';
        (session.user as any).isMembershipExpired = isExpired;
      }
      return session;
    },

    // 新增：根據用戶角色進行導向
    async redirect({ url, baseUrl }) {
      try {
        // 從 URL 中提取 callbackUrl 參數
        const callbackUrl = new URL(url, baseUrl).searchParams.get('callbackUrl');
        
        if (callbackUrl) {
          // 如果有指定的 callbackUrl，使用它
          const decodedCallbackUrl = decodeURIComponent(callbackUrl);
          return decodedCallbackUrl.startsWith('/') 
            ? `${baseUrl}${decodedCallbackUrl}`
            : decodedCallbackUrl;
        }
        
        // 否則返回首頁，讓前端處理導向
        return `${baseUrl}/`;
      } catch (error) {
        return `${baseUrl}/`;
      }
    },
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;

export const { 
  handlers: { GET, POST }, 
  auth, 
  signIn: authSignIn, 
  signOut 
} = NextAuth(authOptions);