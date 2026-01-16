// // src/types/next-auth.d.ts
// import NextAuth from 'next-auth';
// import { MembershipLevel } from '@prisma/client';

// declare module 'next-auth' {
//   interface Session {
//     user: {
//       id: string;
//       username: string;
//       role: 'ADMIN' | 'USER';
//       currentMembershipLevel: MembershipLevel;
//       isMembershipExpired: boolean;  // 取代 hadPaidMembership
//     };
//   }

//   interface User {
//     currentMembershipLevel: MembershipLevel;
//   }
// }

// declare module 'next-auth/jwt' {
//   interface JWT {
//     currentMembershipLevel: MembershipLevel;
//     isMembershipExpired: boolean;
//   }
// }


// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { MembershipLevel } from '@prisma/client';

declare module 'next-auth' {
  interface User extends DefaultUser {
    id: string;
    username: string;
    role: 'ADMIN' | 'USER';
    currentMembershipLevel: MembershipLevel;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: 'ADMIN' | 'USER';
      currentMembershipLevel: MembershipLevel;
      isMembershipExpired?: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'ADMIN' | 'USER';
    currentMembershipLevel: MembershipLevel;
    isMembershipExpired?: boolean;
  }
}