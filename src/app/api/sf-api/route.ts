// // src/app/api/sf-api/route.ts - 最终解决方案
// import { NextRequest, NextResponse } from 'next/server';
// import axios from 'axios';
// import { createHash } from 'crypto';
// import https from 'https';

// // 环境变量
// const partnerID = process.env.PARTNER_ID;
// const partnerKey = process.env.PARTNER_KEY;
// const sfUrl = process.env.SF_URL;

// // 签名函数
// function sign(msgData: string, timestamp: string, checkWord: string): string {
//   const rawString = msgData + timestamp + checkWord;
//   const encodedString = encodeURIComponent(rawString)
//     .replace(/[!'()*]/g, (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase());
//   const md5Hash = createHash('md5').update(encodedString).digest();
//   return md5Hash.toString('base64');
// }

// export async function POST(request: NextRequest) {
//   console.log('🚀 顺丰API请求开始');
  
//   try {
//     // 1. 解析请求
//     const body = await request.json();
//     const { serviceCode, msgData } = body;
    
//     if (!serviceCode || !msgData) {
//       return NextResponse.json(
//         { error: '缺少必要参数' },
//         { status: 400 }
//       );
//     }

//     // 2. 验证环境变量
//     if (!partnerKey || !partnerID || !sfUrl) {
//       return NextResponse.json(
//         { error: '服务器配置错误' },
//         { status: 500 }
//       );
//     }

//     // 3. 准备数据
//     const requestID = crypto.randomUUID();
//     const timestamp = Date.now().toString();
//     const msgDataStr = typeof msgData === 'string' ? msgData : JSON.stringify(msgData);
//     const msgDigest = sign(msgDataStr, timestamp, partnerKey);

//     const payload = new URLSearchParams({
//       partnerID,
//       requestID,
//       serviceCode,
//       timestamp,
//       msgDigest,
//       msgData: msgDataStr
//     });

//     // 4. 创建自定义https agent解决TLS问题
//     const httpsAgent = new https.Agent({
//       family: 4, // 强制使用IPv4
//       keepAlive: true,
//       timeout: 30000,
//       // 增加TLS兼容性设置
//       secureOptions: require('constants').SSL_OP_NO_TLSv1 | require('constants').SSL_OP_NO_TLSv1_1,
//       minVersion: 'TLSv1.2',
//       maxVersion: 'TLSv1.3',
//       ciphers: [
//         'TLS_AES_128_GCM_SHA256',
//         'TLS_AES_256_GCM_SHA384',
//         'TLS_CHACHA20_POLY1305_SHA256',
//         'ECDHE-RSA-AES128-GCM-SHA256',
//         'ECDHE-RSA-AES256-GCM-SHA384'
//       ].join(':'),
//       honorCipherOrder: true
//     });

//     // 5. 发送请求（大陆用户可能需要VPN）
//     const response = await axios({
//       method: 'POST',
//       url: sfUrl,
//       data: payload.toString(),
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded',
//         'Accept': 'application/json',
//         'Connection': 'close',
//       },
//       httpsAgent: httpsAgent,
//       timeout: 45000,
//       // 禁用代理
//       proxy: false,
//       // 重试机制
//       maxRedirects: 0,
//       validateStatus: (status) => status >= 200 && status < 300,
//     });

//     console.log('✅ API请求成功:', response.data);
//     return NextResponse.json(response.data);
    
//   } catch (error: any) {
//     console.error('❌ API请求失败:', error.message);
    
//     // 提供具体解决方案
//     let solution = '';
    
//     if (error.code === 'ECONNREFUSED') {
//       solution = '代理服务器未运行。请运行代理软件或使用VPN。';
//     } else if (error.code === 'ECONNRESET') {
//       solution = '连接被重置。大陆用户需要VPN或代理访问境外API。';
//     } else if (error.code === 'ENOTFOUND') {
//       solution = 'DNS解析失败。检查网络或使用8.8.8.8 DNS。';
//     }
    
//     return NextResponse.json({
//       error: '请求失败',
//       reason: error.message,
//       solution: solution || '请检查网络连接，大陆用户需要VPN/代理',
//       quickFix: '临时解决方案：使用以下测试链接',
//       testUrl: 'https://requestbin.com/r/en4cxt7jgp0rq/1JcKOTuCgAXY9k9HCthjpNwGk7S'
//     }, { status: 500 });
//   }
// }

// src/app/api/sf-api/route.ts - 简单完美版
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createHash } from 'crypto';
import { SfApiResponse } from '../../../../types/sf-express'


// 关键：正确的沙箱校验码（顺丰官方提供）
const PARTNER_ID = 'SHKJ0K5TRXK';
const PARTNER_KEY = '2C0D15t13gyEBHr9M2Ks6wDaNoZonuAB'; // 沙箱密钥
const SF_URL = 'https://sfapi-sbox.sf-express.com/std/service';

// 顺丰官方签名算法
function sign(msgData: string, timestamp: string, checkWord: string): string {
  // 1. 拼接
  const raw = msgData + timestamp + checkWord;
  console.log('🔑 签名原始字符串:', raw.substring(0, 50) + '...');
  
  // 2. URL编码（关键步骤）
  const encoded = encodeURIComponent(raw)
    .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  
  // 3. MD5 + Base64
  const hash = createHash('md5').update(encoded).digest('base64');
  console.log('✅ 计算签名:', hash);
  
  return hash;
}

export async function POST(request: NextRequest) {
  try {
    const { serviceCode, msgData } = await request.json();
    
    // 准备请求数据
    const requestID = crypto.randomUUID();
    const timestamp = Date.now().toString();
    const msgDataStr = JSON.stringify(msgData);
    const msgDigest = sign(msgDataStr, timestamp, PARTNER_KEY);
    
    console.log('📦 请求参数:');
    console.log('- 时间戳:', timestamp);
    console.log('- 签名:', msgDigest);
    console.log('- partnerKey长度:', PARTNER_KEY.length);

    // 构建请求体
    const params = new URLSearchParams({
      partnerID: PARTNER_ID,
      requestID,
      serviceCode,
      timestamp,
      msgDigest,
      msgData: msgDataStr
    });

    // 发送请求
    const response = await axios.post(SF_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });

    return NextResponse.json(response.data);
    
  } catch (error: unknown) {
  console.error('❌ 錯誤:', error);

  if (axios.isAxiosError(error)) {
    const axiosError = error as import('axios').AxiosError<SfApiResponse>;

    console.error('Axios 詳細錯誤:', {
      status: axiosError.response?.status,
      data: axiosError.response?.data,
      message: axiosError.message,
    });

    const responseData = axiosError.response?.data as SfApiResponse | undefined;

    if (
      responseData &&
      typeof responseData === 'object' &&
      'apiResultCode' in responseData &&
      responseData.apiResultCode === 'A1006'
    ) {
      return NextResponse.json({
        error: '數字簽名無效 (A1006)',
        solution: [
          '1. 確認使用的是沙箱環境的校验碼',
          '2. 沙箱校验碼: 2C0D15t13gyEBHr9M2Ks6wDaNoZonuAB',
          '3. 生產環境校验碼: D73Hvjmc7iQzTLjEhoENXpAdeBfHQp6i',
          '4. 確認 msgData + timestamp + checkWord 拼接順序正確',
          '5. 確認 URL 編碼使用的是 UTF-8 並正確處理特殊字符'
        ]
      }, { status: 400 });
    }

    return NextResponse.json(
      { error: axiosError.message || '順豐 API 請求失敗' },
      { status: axiosError.response?.status || 500 }
    );
  }

  const errMessage = error instanceof Error ? error.message : '未知錯誤';
  return NextResponse.json({ error: errMessage }, { status: 500 });
}
}