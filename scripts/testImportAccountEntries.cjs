// // scripts/testImportAccountEntries.cjs
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
  
//   // 載入 AccountEntry
//   let accountEntries = [];
//   const accountPath = path.join(dataDir, 'account_entries.json');
//   if (fs.existsSync(accountPath)) {
//     accountEntries = JSON.parse(
//       fs.readFileSync(accountPath, 'utf-8')
//     );
//     console.log(`   ✅ 載入 ${accountEntries.length} 筆 AccountEntry`);
//   } else {
//     console.log('   ⚠️ 找不到 account_entries.json 檔案');
//     console.log('   💡 請先執行: npm run generate-account');
//   }
  
//   return { accountEntries };
// }

// // 測試導入 AccountEntry（不實際寫入資料庫）
// async function testImportAccountEntries(accountEntries) {
//   console.log('\n🧪 開始測試導入 AccountEntry（不實際寫入資料庫）...\n');
  
//   // 只測試前 20 筆
//   const testLimit = Math.min(accountEntries.length, 20);
//   console.log(`📊 測試前 ${testLimit} 筆 AccountEntry（共 ${accountEntries.length} 筆）\n`);
  
//   let testResults = {
//     total: accountEntries.length,
//     tested: testLimit,
//     valid: 0,
//     invalid: 0,
//     errors: [],
//     warnings: [],
//     samples: []
//   };
  
//   for (let i = 0; i < testLimit; i++) {
//     const entryData = accountEntries[i];
    
//     console.log(`\n📝 測試 AccountEntry ${i + 1}/${testLimit}:`);
//     console.log(`   訂單 ID: ${entryData.orderId}`);
//     console.log(`   金額: HK$${(entryData.totalAmount / 100).toFixed(2)}`);
    
//     const issues = [];
//     const warnings = [];
    
//     // 1. 檢查關聯的訂單是否存在
//     const order = await prisma.order.findFirst({
//       where: { id: entryData.orderId },
//       include: {
//         items: true
//       }
//     });
    
//     if (!order) {
//       const error = `❌ 找不到關聯的訂單: ${entryData.orderId}`;
//       issues.push(error);
//       console.log(`   ${error}`);
//     } else {
//       console.log(`   ✅ 找到關聯訂單: ${order.orderNumber}`);
      
//       // 2. 檢查訂單狀態是否為 completed
//       if (order.status !== 'completed') {
//         const warning = `⚠️ 訂單狀態不是 completed: ${order.status}`;
//         warnings.push(warning);
//         console.log(`   ${warning}`);
//       } else {
//         console.log(`   ✅ 訂單狀態: ${order.status}`);
//       }
      
//       // 3. 檢查訂單是否已有 AccountEntry
//       const existingEntry = await prisma.accountEntry.findFirst({
//         where: { orderId: entryData.orderId }
//       });
      
//       if (existingEntry) {
//         const warning = `⚠️ 訂單 ${order.orderNumber} 已有 AccountEntry，將被跳過`;
//         warnings.push(warning);
//         console.log(`   ${warning}`);
//       } else {
//         console.log(`   ✅ 訂單尚未有 AccountEntry`);
//       }
      
//       // 4. 檢查金額一致性
//       const calculatedProductAmount = order.items.reduce((sum, item) => {
//         return sum + (item.price * item.quantity);
//       }, 0);
      
//       const calculatedTotal = calculatedProductAmount + (order.shippingFee || 0);
      
//       // 檢查 totalAmount
//       if (entryData.totalAmount !== order.total) {
//         const error = `❌ totalAmount 不一致: 訂單 ${order.total}, AccountEntry ${entryData.totalAmount}`;
//         issues.push(error);
//         console.log(`   ${error}`);
//       } else {
//         console.log(`   ✅ totalAmount 一致: HK$${(entryData.totalAmount / 100).toFixed(2)}`);
//       }
      
//       // 檢查 shippingFee
//       if (entryData.shippingFee !== (order.shippingFee || 0)) {
//         const warning = `⚠️ shippingFee 不一致: 訂單 ${order.shippingFee || 0}, AccountEntry ${entryData.shippingFee}`;
//         warnings.push(warning);
//         console.log(`   ${warning}`);
//       } else {
//         console.log(`   ✅ shippingFee 一致: HK$${(entryData.shippingFee / 100).toFixed(2)}`);
//       }
      
//       // 檢查 productAmount
//       if (entryData.productAmount !== calculatedProductAmount) {
//         const warning = `⚠️ productAmount 不一致: 計算 ${calculatedProductAmount}, AccountEntry ${entryData.productAmount}`;
//         warnings.push(warning);
//         console.log(`   ${warning}`);
//       } else {
//         console.log(`   ✅ productAmount 一致: HK$${(entryData.productAmount / 100).toFixed(2)}`);
//       }
      
//       // 驗證公式: totalAmount = productAmount + shippingFee
//       const verifyTotal = entryData.productAmount + entryData.shippingFee;
//       if (verifyTotal !== entryData.totalAmount) {
//         const error = `❌ 公式驗證失敗: ${entryData.productAmount} + ${entryData.shippingFee} = ${verifyTotal} ≠ ${entryData.totalAmount}`;
//         issues.push(error);
//         console.log(`   ${error}`);
//       } else {
//         console.log(`   ✅ 公式驗證通過: ${entryData.productAmount} + ${entryData.shippingFee} = ${entryData.totalAmount}`);
//       }
//     }
    
//     // 5. 檢查結算者是否存在
//     const settledBy = await prisma.user.findFirst({
//       where: { id: entryData.settledById }
//     });
    
//     if (!settledBy) {
//       const error = `❌ 找不到結算者: ${entryData.settledById}`;
//       issues.push(error);
//       console.log(`   ${error}`);
//     } else {
//       console.log(`   ✅ 找到結算者: ${settledBy.username} (${settledBy.name || 'N/A'})`);
      
//       // 檢查是否為 ADMIN
//       if (settledBy.role !== 'ADMIN') {
//         const warning = `⚠️ 結算者不是 ADMIN: ${settledBy.role}`;
//         warnings.push(warning);
//         console.log(`   ${warning}`);
//       } else {
//         console.log(`   ✅ 結算者角色: ${settledBy.role}`);
//       }
//     }
    
//     // 6. 檢查日期
//     if (entryData.settledAt) {
//       const settledDate = new Date(entryData.settledAt);
//       if (isNaN(settledDate.getTime())) {
//         const error = `❌ 無效的結算日期: ${entryData.settledAt}`;
//         issues.push(error);
//         console.log(`   ${error}`);
//       } else {
//         console.log(`   ✅ 結算日期: ${settledDate.toLocaleDateString('zh-HK')}`);
//       }
//     } else {
//       const warning = `⚠️ 沒有結算日期`;
//       warnings.push(warning);
//       console.log(`   ${warning}`);
//     }
    
//     // 記錄結果
//     if (issues.length === 0) {
//       testResults.valid++;
//       if (testResults.samples.length < 3) {
//         testResults.samples.push({
//           orderId: entryData.orderId,
//           orderNumber: order?.orderNumber || 'Unknown',
//           totalAmount: entryData.totalAmount,
//           settledBy: settledBy?.username || 'Unknown',
//           settledAt: entryData.settledAt
//         });
//       }
//     } else {
//       testResults.invalid++;
//       testResults.errors.push({
//         orderId: entryData.orderId,
//         issues: issues
//       });
//     }
    
//     if (warnings.length > 0) {
//       testResults.warnings.push({
//         orderId: entryData.orderId,
//         warnings: warnings
//       });
//     }
//   }
  
//   return testResults;
// }

// // 檢查數據庫中已有的 AccountEntry
// async function checkExistingAccountEntries() {
//   console.log('\n📊 檢查資料庫中已有的 AccountEntry...');
  
//   try {
//     const existingCount = await prisma.accountEntry.count();
//     const completedOrders = await prisma.order.count({
//       where: { status: 'completed' }
//     });
    
//     console.log(`   📦 已完成訂單: ${completedOrders}`);
//     console.log(`   📄 已有 AccountEntry: ${existingCount}`);
//     console.log(`   📊 覆蓋率: ${completedOrders > 0 ? ((existingCount / completedOrders) * 100).toFixed(1) : 0}%`);
    
//     // 顯示最近的 3 筆
//     const recentEntries = await prisma.accountEntry.findMany({
//       take: 3,
//       orderBy: { settledAt: 'desc' },
//       include: {
//         order: {
//           select: {
//             orderNumber: true
//           }
//         },
//         settledBy: {
//           select: {
//             username: true
//           }
//         }
//       }
//     });
    
//     if (recentEntries.length > 0) {
//       console.log(`\n   📝 最近的 AccountEntry:`);
//       recentEntries.forEach(entry => {
//         console.log(`      ${entry.order.orderNumber} - ${entry.settledBy.username} - HK$${(entry.totalAmount / 100).toFixed(2)}`);
//       });
//     }
    
//     return { existingCount, completedOrders };
    
//   } catch (error) {
//     console.error('❌ 檢查失敗:', error.message);
//     return { existingCount: 0, completedOrders: 0 };
//   }
// }

// // 顯示測試報告
// function showTestReport(results) {
//   console.log('\n' + '='.repeat(60));
//   console.log('📊 AccountEntry 測試報告');
//   console.log('='.repeat(60));
  
//   console.log(`\n📈 測試統計:`);
//   console.log(`   ✅ 有效 AccountEntry: ${results.valid}`);
//   console.log(`   ❌ 無效 AccountEntry: ${results.invalid}`);
//   console.log(`   ⚠️  有警告的: ${results.warnings.length}`);
//   console.log(`   📊 成功率: ${results.tested > 0 ? ((results.valid / results.tested) * 100).toFixed(1) : 0}%`);
//   console.log(`   📦 總數: ${results.total}`);
  
//   if (results.samples.length > 0) {
//     console.log(`\n📝 有效 AccountEntry 樣本:`);
//     results.samples.forEach((sample, i) => {
//       console.log(`   ${i + 1}. 訂單: ${sample.orderNumber}`);
//       console.log(`      金額: HK$${(sample.totalAmount / 100).toFixed(2)}`);
//       console.log(`      結算者: ${sample.settledBy}`);
//       console.log(`      結算日期: ${formatDate(sample.settledAt).toLocaleDateString('zh-HK')}`);
//     });
//   }
  
//   if (results.errors.length > 0) {
//     console.log(`\n❌ 錯誤詳細:`);
//     results.errors.forEach((error, i) => {
//       console.log(`   ${i + 1}. 訂單 ID: ${error.orderId}`);
//       error.issues.forEach(issue => {
//         console.log(`      ${issue}`);
//       });
//     });
//   }
  
//   if (results.warnings.length > 0) {
//     console.log(`\n⚠️  警告詳細:`);
//     results.warnings.slice(0, 5).forEach((warning, i) => {
//       console.log(`   ${i + 1}. 訂單 ID: ${warning.orderId}`);
//       warning.warnings.forEach(w => {
//         console.log(`      ${w}`);
//       });
//     });
//     if (results.warnings.length > 5) {
//       console.log(`   ... 還有 ${results.warnings.length - 5} 個警告`);
//     }
//   }
  
//   console.log('\n' + '='.repeat(60));
  
//   // 給出建議
//   console.log('\n💡 建議:');
//   if (results.invalid === 0 && results.warnings.length === 0) {
//     console.log('   ✅ 所有測試 AccountEntry 都有效，可以安全導入！');
//     console.log('   🚀 執行: npm run import-account');
//   } else if (results.invalid === 0 && results.warnings.length > 0) {
//     console.log('   ⚠️  有警告但無錯誤，可以導入，但建議檢查警告項目。');
//     console.log('   🚀 執行: npm run import-account');
//   } else {
//     console.log('   ❌ 有錯誤 AccountEntry，建議修復後再導入。');
//     console.log('   🔍 檢查: scripts/generateAccountEntries.cjs 中的生成邏輯');
//   }
// }

// // 主函數
// async function main() {
//   try {
//     console.log('🧪 測試導入 AccountEntry 模式');
//     console.log('='.repeat(60));
//     console.log('ℹ️  此模式只檢查數據，不會實際寫入資料庫\n');
    
//     // 1. 檢查資料庫中已有的 AccountEntry
//     await checkExistingAccountEntries();
    
//     // 2. 載入生成的 AccountEntry 數據
//     const { accountEntries } = loadAccountEntryData();
    
//     if (accountEntries.length === 0) {
//       console.log('\n⚠️ 沒有 AccountEntry 數據需要測試');
//       console.log('💡 請先執行: npm run generate-account');
//       return;
//     }
    
//     // 3. 執行測試導入
//     const results = await testImportAccountEntries(accountEntries);
    
//     // 4. 顯示測試報告
//     showTestReport(results);
    
//     // 5. 顯示完整流程建議
//     console.log('\n📋 完整流程:');
//     console.log('   1️⃣  npm run generate-account      # 生成 AccountEntry');
//     console.log('   2️⃣  npm run test-account           # 測試 AccountEntry（當前步驟）');
//     console.log('   3️⃣  npm run import-account         # 正式導入 AccountEntry');
    
//   } catch (error) {
//     console.error('❌ 測試失敗:', error);
//     console.error(error.stack);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// // 執行
// main();