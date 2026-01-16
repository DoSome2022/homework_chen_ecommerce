// // lib/auth/adapter.ts

// import type { Adapter } from "next-auth/adapters";
// import { db } from "../db";

// export const adapter: Adapter = {
//   // 登入後建立 User（Google 首次登入會走到這裡）
//   async createUser(data) {
//     const username = data.email!.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") || "user";

//     const user = await db.user.create({
//       data: {
//         email: data.email,
//         name: data.name ?? null,
//         phone: data.phone,
//         Fname: data.Fname,
//         Lname: data.Lname,
//         username,
//         role: "USER" as const,

//       },
//     });

//     return {
//       id: user.id,
//       email: user.email,
//       name: user.name,
//         phone: data.phone,
//         Fname: data.Fname,
//         Lname: data.Lname,
//       // 下面這幾個是我們自訂欄位，Auth.js 不認，但我們在 session 裡會補回來
//       username: user.username,
//       role: user.role,
//     } as any;
//   },

//   // 取得 User
//   async getUser(id) {
//     const user = await db.user.findUnique({ where: { id } });
//     if (!user) return null;
//     return {
//       id: user.id,
//       email: user.email,

//       name: user.name,
//               phone: user.phone,
//         Fname: user.Fname,
//         Lname: user.Lname,
//       username: user.username,
//       role: user.role,
//     } as any;
//   },

//   async getUserByEmail(email) {
//     const user = await db.user.findUnique({ where: { email } });
//     if (!user) return null;
//     return {
//       id: user.id,
//       email: user.email,
//       name: user.name,
//     phone: user.phone,
//         Fname: user.Fname,
//         Lname: user.Lname,
//       username: user.username,
//       role: user.role,
//     } as any;
//   },

//   async getUserByAccount({ providerAccountId, provider }) {
//     // 如果您有需要 OAuth 帳號綁定再實作，現在先留空也沒問題
//     return null;
//   },

//   async updateUser(user) {
//     const updated = await db.user.update({
//       where: { id: user.id },
//       data: {
//         name: user.name ?? undefined,
//         email: user.email ?? undefined,
//         phone: user.phone ?? undefined,
//         Fname: user.Fname ?? undefined,
//         Lname: user.Lname ?? undefined,
//       },
//     });
//     return {
//       id: updated.id,
//       email: updated.email,
//       name: updated.name,
//         phone: updated.phone,
//         Fname: updated.Fname,
//         Lname: updated.Lname,
//       username: updated.username,
//       role: updated.role,
//     } as any;
//   },

//   async linkAccount(account) {
//     // 如果您不需要 OAuth 帳號綁定歷史，可以留空
//     return;
//   },

//   async createSession(session) {
//     return session as any;
//   },
//   async getSessionAndUser(sessionToken) {
//     return null;
//   },
//   async updateSession(session) {
//     return session as any;
//   },
//   async deleteSession(sessionToken) {
//     return;
//   },
// };