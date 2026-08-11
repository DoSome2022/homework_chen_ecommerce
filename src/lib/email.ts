// lib/email.ts
import nodemailer from 'nodemailer';

// 郵件傳輸配置
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// ✅ 修改：接受更寬鬆的型別
interface UserInfo {
  name: string | null | undefined;
  email: string | null | undefined;
  username: string;
}

interface LoginInfo {
  ip: string;
  userAgent: string;
  timestamp: Date;
  provider: string;
}

// 登入通知郵件模板
export async function sendLoginNotificationEmail(
  user: UserInfo,
  loginInfo: LoginInfo
) {
  // ✅ 檢查 email 是否存在
  if (!user.email) {
    console.warn('用戶沒有 email，無法發送通知');
    return;
  }

  const loginTime = loginInfo.timestamp.toLocaleString('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // ✅ 處理姓名，如果為空則使用 username
  const displayName = user.name || user.username;

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="zh-HK">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>登入通知</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background-color: #2563eb; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔐 登入通知</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            親愛的 <strong>${displayName}</strong>，您好：
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            我們偵測到您的帳戶有新的登入活動。以下是登入詳情：
          </p>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">登入時間</td>
                <td style="padding: 8px 0; color: #0f172a; text-align: right;">${loginTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">登入方式</td>
                <td style="padding: 8px 0; color: #0f172a; text-align: right;">${loginInfo.provider === 'google' ? 'Google 帳戶' : '帳號密碼'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">IP 位址</td>
                <td style="padding: 8px 0; color: #0f172a; text-align: right;">${loginInfo.ip || '無法取得'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">裝置資訊</td>
                <td style="padding: 8px 0; color: #0f172a; text-align: right; font-size: 12px;">${loginInfo.userAgent || '無法取得'}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
              ⚠️ 如果您沒有進行此登入操作，請立即 <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" style="color: #2563eb; text-decoration: underline;">變更密碼</a> 並聯絡客服。
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
            此郵件由系統自動發送，請勿回覆。
            <br>
            如有任何疑問，請聯絡客服：<a href="mailto:${process.env.SUPPORT_EMAIL || 'support@example.com'}" style="color: #2563eb; text-decoration: none;">${process.env.SUPPORT_EMAIL || 'support@example.com'}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"德昌五金" <${process.env.SMTP_FROM_EMAIL}>`,
      to: user.email, // ✅ 這裡已經確認不是 null/undefined
      subject: `🔐 登入通知 - ${process.env.NEXT_PUBLIC_STORE_NAME || '德昌五金'}`,
      html: emailHtml,
      text: `
        親愛的 ${displayName}，您好：
        
        我們偵測到您的帳戶有新的登入活動。
        
        登入時間：${loginTime}
        登入方式：${loginInfo.provider === 'google' ? 'Google 帳戶' : '帳號密碼'}
        IP 位址：${loginInfo.ip || '無法取得'}
        裝置資訊：${loginInfo.userAgent || '無法取得'}
        
        如果您沒有進行此登入操作，請立即變更密碼並聯絡客服。
        
        此郵件由系統自動發送，請勿回覆。
      `,
    });
    
    console.log(`登入通知郵件已發送至 ${user.email}`);
  } catch (error) {
    console.error('發送登入通知郵件失敗:', error);
  }
}