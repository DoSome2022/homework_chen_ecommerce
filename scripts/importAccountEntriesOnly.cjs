// // scripts/importAccountEntriesOnly.cjs
// const { PrismaClient } = require('@prisma/client');
// const fs = require('fs');
// const path = require('path');

// const prisma = new PrismaClient();

// // 工具函數
// function formatDate(dateStr) {
//   if (!dateStr) return new Date();
//   return new Date(dateStr);
// }

// // 載入生成的 AccountEntry 數據
// function loadAccountEntryData() {
//   const dataDir = path.join(process.cwd(), 'scripts', 'generated_data');
  
//   console.log('📂 載入生成的 AccountEntry 數據...');
  
//   const accountPath = path.join(dataDir, 'account_entries.json');
//   if (!fs.existsSync(accountPath)) {
//     console.error('❌ 找不到 account_entries.json 檔案');
//     console.log('💡 請先執行: npm run generate-account');
//     process.exit(1);
//   }
  
//   const accountEntries = JSON.parse(
//     fs.readFileSync(accountPath, 'utf-8')
//   );
  
//   console.log(`   ✅ 載入 ${accountEntries.length} 筆 AccountEntry`);
//   return accountEntries;
// }

// // 導入 AccountEntry 到資料庫
// async function importAccountEntries(accountEntries) {
//   console.log(`\n📦 開始導入 ${accountEntries.length} 筆 AccountEntry...`);
  
//   let successCount = 0;
//   let skipCount = 0;
//   let failCount = 0;
  
//   for (let i = 0; i < accountEntries.length; i++) {
//     const entryData = accountEntries[i];
    
//     try {
//       // 檢查訂單是否存在
//       const order = await prisma.order.findFirst({
//         where: { id: entryData.orderId }
//       });
      
//       if (!order) {
//         console.log(`   ❌ 找不到訂單: ${entryData.orderId}`);
//         failCount++;
//         continue;
//       }
      
//       // 檢查是否已有 AccountEntry
//       const existingEntry = await prisma.accountEntry.findFirst({
//         where: { orderId: entryData.orderId }
//       });
      
//       if (existingEntry) {
//         console.log(`   ⚠️ 訂單 ${order.orderNumber} 已有 AccountEntry，跳過`);
//         skipCount++;
//         continue;
//       }
      
//       // 檢查結算者是否存在
//       const settledBy = await prisma.user.findFirst({
//         where: { id: entryData.settledById }
//       });
      
//       if (!settledBy) {
//         console.log(`   ❌ 找不到結算者: ${entryData.settledById} (訂單 ${order.orderNumber})`);
//         failCount++;
//         continue;
//       }
      
//       // 創建 AccountEntry
//       await prisma.accountEntry.create({
//         data: {
//           orderId: entryData.orderId,
//           settledById: entryData.settledById,
//           settledAt: formatDate(entryData.settledAt),
//           totalAmount: entryData.totalAmount,
//           shippingFee: entryData.shippingFee,
//           productAmount: entryData.productAmount,
//           createdAt: formatDate(entryData.createdAt)
//         }
//       });
      
//       successCount++;
      
//       if (successCount % 10 === 0) {
//         console.log(`   📊 已導入 ${successCount}/${accountEntries.length} 筆 AccountEntry`);
//       }
      
//     } catch (error) {
//       console.error(`   ❌ 導入失敗 (訂單 ID: ${entryData.orderId}):`, error.message);
//       failCount++;
//     }
//   }
  
//   console.log(`\n   ✅ 成功導入 ${successCount} 筆 AccountEntry`);
//   if (skipCount > 0) {
//     console.log(`   ⏭️  跳過 ${skipCount} 筆（已有 AccountEntry）`);
//   }
//   if (failCount > 0) {
//     console.log(`   ❌ 失敗 ${failCount} 筆`);
//   }
  
//   return { successCount, skipCount, failCount };
// }

// // 驗證導入結果
// async function verifyImport() {
//   console.log('\n🔍 驗證導入結果...');
  
//   try {
//     const totalAccountEntries = await prisma.accountEntry.count();
//     const completedOrders = await prisma.order.count({
//       where: { status: 'completed' }
//     });
    
//     console.log(`   📊 資料庫統計:`);
//     console.log(`      📦 已完成訂單: ${completedOrders}`);
//     console.log(`      📄 AccountEntry: ${totalAccountEntries}`);
//     console.log(`      📊 覆蓋率: ${completedOrders > 0 ? ((totalAccountEntries / completedOrders) * 100).toFixed(1) : 0}%`);
    
//     // 顯示最近的 5 筆
//     const recentEntries = await prisma.accountEntry.findMany({
//       take: 5,
//       orderBy: { settledAt: 'desc' },
//       include: {
//         order: {
//           select: {
//             orderNumber: true,
//             total: true
//           }
//         },
//         settledBy: {
//           select: {
//             username: true,
//             name: true
//           }
//         }
//       }
//     });
    
//     if (recentEntries.length > 0) {
//       console.log(`\n   📝 最近的 AccountEntry:`);
//       recentEntries.forEach(entry => {
//         const settledByName = entry.settledBy?.name || entry.settledBy?.username || 'Unknown';
//         console.log(`      ${entry.order.orderNumber} - ${settledByName} - HK$${(entry.totalAmount / 100).toFixed(2)}`);
//       });
//     }
    
//     // 顯示匯總統計
//     const stats = await prisma.$queryRaw`
//       SELECT 
//         COUNT(*) as total,
//         SUM("totalAmount") as totalAmount,
//         AVG("totalAmount") as avgAmount,
//         MIN("settledAt") as earliest,
//         MAX("settledAt") as latest
//       FROM "AccountEntry"
//     `;
    
//     if (stats && stats.length > 0) {
//       console.log(`\n   📈 匯總統計:`);
//       console.log(`      總筆數: ${stats[0].total}`);
//       console.log(`      總金額: HK$${(stats[0].totalAmount / 100).toFixed(2)}`);
//       console.log(`      平均金額: HK$${(stats[0].avgAmount / 100).toFixed(2)}`);
//       console.log(`      最早結算: ${formatDate(stats[0].earliest).toLocaleDateString('zh-HK')}`);
//       console.log(`      最晚結算: ${formatDate(stats[0].latest).toLocaleDateString('zh-HK')}`);
//     }
    
//   } catch (error) {
//     console.error('❌ 驗證失敗:', error.message);
//   }
// }

// // 主函數
// async function main() {
//   try {
//     console.log('🚀 開始導入 AccountEntry 到資料庫...\n');
    
//     // 1. 載入生成的數據
//     const accountEntries = loadAccountEntryData();
    
//     if (accountEntries.length === 0) {
//       console.log('⚠️ 沒有 AccountEntry 數據需要導入');
//       return;
//     }
    
//     // 2. 顯示將要導入的資訊
//     const totalAmount = accountEntries.reduce((sum, entry) => sum + entry.totalAmount, 0);
//     console.log(`\n📋 將導入 ${accountEntries.length} 筆 AccountEntry`);
//     console.log(`   💰 總金額: HK$${(totalAmount / 100).toFixed(2)}`);
    
//     // 3. 確認導入
//     console.log('\n⚠️  確認導入: 這將寫入資料庫');
//     console.log('   按 Ctrl+C 取消，或等待 5 秒後自動繼續...');
    
//     // 等待 5 秒讓用戶有機會取消
//     await new Promise(resolve => setTimeout(resolve, 5000));
//     console.log('   ✅ 繼續導入...\n');
    
//     // 4. 導入 AccountEntry
//     const { successCount, skipCount, failCount } = await importAccountEntries(accountEntries);
    
//     // 5. 驗證結果
//     await verifyImport();
    
//     // 6. 顯示總結
//     console.log('\n✅ AccountEntry 導入完成！');
//     console.log(`\n📊 總結:`);
//     console.log(`   ✅ 成功導入: ${successCount}`);
//     console.log(`   ⏭️  跳過: ${skipCount}`);
//     console.log(`   ❌ 失敗: ${failCount}`);
    
//   } catch (error) {
//     console.error('❌ 導入失敗:', error);
//     console.error(error.stack);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// // 執行導入
// main();