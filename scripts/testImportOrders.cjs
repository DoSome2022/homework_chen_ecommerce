// // scripts/testImportOrders.cjs
// const { PrismaClient } = require('@prisma/client');
// const fs = require('fs');
// const path = require('path');

// // 使用測試環境的資料庫連接
// // 或者使用同一個資料庫但加上測試標記
// const prisma = new PrismaClient();

// // 工具函數
// function formatDate(dateStr) {
//   if (!dateStr) return new Date();
//   return new Date(dateStr);
// }

// // 載入生成的數據
// function loadGeneratedData() {
//   const dataDir = path.join(process.cwd(), 'scripts', 'generated_data');
  
//   console.log('📂 載入生成的數據...');
  
//   const orders = JSON.parse(
//     fs.readFileSync(path.join(dataDir, 'orders.json'), 'utf-8')
//   );
  
//   const receiptsAndInvoices = JSON.parse(
//     fs.readFileSync(path.join(dataDir, 'receipts_invoices.json'), 'utf-8')
//   );
  
//   let report = null;
//   const reportPath = path.join(dataDir, 'report.json');
//   if (fs.existsSync(reportPath)) {
//     report = JSON.parse(
//       fs.readFileSync(reportPath, 'utf-8')
//     );
//   }
  
//   console.log(`   ✅ 載入 ${orders.length} 筆訂單`);
//   console.log(`   ✅ 載入 ${receiptsAndInvoices.length} 筆收據/發票`);
  
//   return { orders, receiptsAndInvoices, report };
// }

// // 測試導入（不實際寫入資料庫）
// async function testImport(orders, receiptsAndInvoices) {
//   console.log('\n🧪 開始測試導入（不實際寫入資料庫）...\n');
  
//   let testResults = {
//     total: orders.length,
//     valid: 0,
//     invalid: 0,
//     errors: [],
//     warnings: [],
//     samples: []
//   };
  
//   // 只測試前 20 筆，如果太多
//   const testLimit = Math.min(orders.length, 20);
//   console.log(`📊 測試前 ${testLimit} 筆訂單（共 ${orders.length} 筆）\n`);
  
//   for (let i = 0; i < testLimit; i++) {
//     const orderData = orders[i];
//     const { receipt, invoice } = receiptsAndInvoices[i] || {};
    
//     console.log(`\n📝 測試訂單 ${i + 1}/${testLimit}: ${orderData.orderNumber}`);
    
//     const issues = [];
//     const warnings = [];
    
//     // 1. 檢查用戶是否存在
//     let user = null;
//     if (orderData.user && orderData.user.username) {
//       user = await prisma.user.findFirst({
//         where: { username: orderData.user.username }
//       });
//     }
    
//     if (!user && orderData.userId) {
//       user = await prisma.user.findFirst({
//         where: { id: orderData.userId }
//       });
//     }
    
//     if (!user) {
//       const error = `❌ 找不到用戶: ${orderData.userId || orderData.user?.username}`;
//       issues.push(error);
//       console.log(`   ${error}`);
//     } else {
//       console.log(`   ✅ 找到用戶: ${user.username} (${user.name || 'N/A'})`);
//     }
    
//     // 2. 檢查訂單是否已存在
//     const existingOrder = await prisma.order.findFirst({
//       where: { orderNumber: orderData.orderNumber }
//     });
    
//     if (existingOrder) {
//       const warning = `⚠️ 訂單 ${orderData.orderNumber} 已存在，將被跳過`;
//       warnings.push(warning);
//       console.log(`   ${warning}`);
//     } else {
//       console.log(`   ✅ 訂單號可用: ${orderData.orderNumber}`);
//     }
    
//     // 3. 檢查訂單項目
//     if (orderData.items && orderData.items.length > 0) {
//       console.log(`   ✅ 有 ${orderData.items.length} 個訂單項目`);
      
//       let validItems = 0;
//       let invalidItems = 0;
      
//       for (const item of orderData.items) {
//         // 檢查產品是否存在
//         const product = await prisma.product.findFirst({
//           where: { id: item.productId }
//         });
        
//         if (product) {
//           validItems++;
//         } else {
//           invalidItems++;
//           const error = `   ❌ 找不到產品: ${item.productId} (${item.title})`;
//           issues.push(error);
//           console.log(error);
//         }
        
//         // 檢查價格是否有效
//         if (item.price <= 0) {
//           const warning = `   ⚠️ 價格為 0 或負數: ${item.title}`;
//           warnings.push(warning);
//           console.log(warning);
//         }
        
//         if (item.quantity <= 0) {
//           const warning = `   ⚠️ 數量為 0 或負數: ${item.title}`;
//           warnings.push(warning);
//           console.log(warning);
//         }
//       }
      
//       console.log(`   📊 有效產品: ${validItems}, 無效產品: ${invalidItems}`);
//     } else {
//       const error = `❌ 沒有訂單項目`;
//       issues.push(error);
//       console.log(`   ${error}`);
//     }
    
//     // 4. 檢查金額一致性
//     if (orderData.items && orderData.items.length > 0) {
//       const calculatedTotal = orderData.items.reduce((sum, item) => {
//         return sum + (item.price * item.quantity);
//       }, 0) + (orderData.shippingFee || 0);
      
//       if (calculatedTotal !== orderData.total) {
//         const warning = `⚠️ 金額不一致: 計算 ${calculatedTotal}, 訂單 ${orderData.total}`;
//         warnings.push(warning);
//         console.log(`   ${warning}`);
//       } else {
//         console.log(`   ✅ 金額一致: HK$${(orderData.total / 100).toFixed(2)}`);
//       }
//     }
    
//     // 5. 檢查收據和發票
//     if (receipt) {
//       console.log(`   ✅ 有收據數據`);
//     } else {
//       const warning = `⚠️ 沒有收據數據`;
//       warnings.push(warning);
//       console.log(`   ${warning}`);
//     }
    
//     if (invoice) {
//       console.log(`   ✅ 有發票數據`);
//     } else {
//       const warning = `⚠️ 沒有發票數據`;
//       warnings.push(warning);
//       console.log(`   ${warning}`);
//     }
    
//     // 6. 檢查地址
//     if (orderData.shippingAddress) {
//       console.log(`   ✅ 地址: ${orderData.shippingAddress.substring(0, 30)}...`);
//     } else {
//       const warning = `⚠️ 沒有地址`;
//       warnings.push(warning);
//       console.log(`   ${warning}`);
//     }
    
//     // 記錄結果
//     if (issues.length === 0) {
//       testResults.valid++;
//       // 記錄一個有效樣本
//       if (testResults.samples.length < 3) {
//         testResults.samples.push({
//           orderNumber: orderData.orderNumber,
//           user: user?.username || 'Unknown',
//           total: orderData.total,
//           items: orderData.items?.length || 0,
//           date: orderData.createdAt
//         });
//       }
//     } else {
//       testResults.invalid++;
//       testResults.errors.push({
//         orderNumber: orderData.orderNumber,
//         issues: issues
//       });
//     }
    
//     if (warnings.length > 0) {
//       testResults.warnings.push({
//         orderNumber: orderData.orderNumber,
//         warnings: warnings
//       });
//     }
//   }
  
//   return testResults;
// }

// // 顯示測試報告
// function showTestReport(results) {
//   console.log('\n' + '='.repeat(60));
//   console.log('📊 測試報告');
//   console.log('='.repeat(60));
  
//   console.log(`\n📈 測試統計:`);
//   console.log(`   ✅ 有效訂單: ${results.valid}`);
//   console.log(`   ❌ 無效訂單: ${results.invalid}`);
//   console.log(`   ⚠️  有警告的訂單: ${results.warnings.length}`);
//   console.log(`   📊 成功率: ${results.total > 0 ? ((results.valid / results.total) * 100).toFixed(1) : 0}%`);
  
//   if (results.samples.length > 0) {
//     console.log(`\n📝 有效訂單樣本:`);
//     results.samples.forEach((sample, i) => {
//       console.log(`   ${i + 1}. ${sample.orderNumber}`);
//       console.log(`      用戶: ${sample.user}`);
//       console.log(`      金額: HK$${(sample.total / 100).toFixed(2)}`);
//       console.log(`      項目: ${sample.items} 項`);
//       console.log(`      日期: ${formatDate(sample.date).toLocaleDateString('zh-HK')}`);
//     });
//   }
  
//   if (results.errors.length > 0) {
//     console.log(`\n❌ 錯誤詳細:`);
//     results.errors.forEach((error, i) => {
//       console.log(`   ${i + 1}. ${error.orderNumber}`);
//       error.issues.forEach(issue => {
//         console.log(`      ${issue}`);
//       });
//     });
//   }
  
//   if (results.warnings.length > 0) {
//     console.log(`\n⚠️  警告詳細:`);
//     results.warnings.slice(0, 5).forEach((warning, i) => {
//       console.log(`   ${i + 1}. ${warning.orderNumber}`);
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
//     console.log('   ✅ 所有測試訂單都有效，可以安全導入！');
//     console.log('   🚀 執行: npm run import-orders');
//   } else if (results.invalid === 0 && results.warnings.length > 0) {
//     console.log('   ⚠️  有警告但無錯誤，可以導入，但建議檢查警告項目。');
//     console.log('   🚀 執行: npm run import-orders');
//   } else {
//     console.log('   ❌ 有錯誤訂單，建議修復後再導入。');
//     console.log('   🔍 檢查: scripts/generateOrders.cjs 中的數據生成邏輯');
//   }
// }

// // 主函數
// async function main() {
//   try {
//     console.log('🧪 測試導入模式');
//     console.log('='.repeat(60));
//     console.log('ℹ️  此模式只檢查數據，不會實際寫入資料庫\n');
    
//     // 1. 載入生成的數據
//     const { orders, receiptsAndInvoices, report } = loadGeneratedData();
    
//     if (orders.length === 0) {
//       console.log('⚠️ 沒有訂單數據需要測試');
//       return;
//     }
    
//     // 2. 執行測試導入
//     const results = await testImport(orders, receiptsAndInvoices);
    
//     // 3. 顯示測試報告
//     showTestReport(results);
    
//     // 4. 顯示完整流程建議
//     console.log('\n📋 完整流程:');
//     console.log('   1️⃣  npm run generate-names      # 生成英文名字');
//     console.log('   2️⃣  npm run export-data          # 導出現有數據');
//     console.log('   3️⃣  npm run check-data           # 檢查數據');
//     console.log('   4️⃣  npm run generate-orders      # 生成訂單');
//     console.log('   5️⃣  npm run test-import          # 測試導入（當前步驟）');
//     console.log('   6️⃣  npm run import-orders        # 正式導入');
//     console.log('   7️⃣  npm run generate-account     # 生成 AccountEntry');
    
//   } catch (error) {
//     console.error('❌ 測試失敗:', error);
//     console.error(error.stack);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// // 執行
// main();



    // "generate-names": "node scripts/nameData.cjs",
    // "export-data": "node scripts/exportData.cjs",
    // "check-data": "node scripts/checkData.cjs",
    // "generate-orders": "node scripts/generateOrders.cjs",
    // "test-import": "node scripts/testImportOrders.cjs",
    // "import-orders": "node scripts/importOrdersOnly.cjs",
    // "generate-account": "node scripts/generateAccountEntries.cjs",
    // "test-account": "node scripts/testImportAccountEntries.cjs",
    // "import-account": "node scripts/importAccountEntriesOnly.cjs",
    // "full-process": "npm run generate-names && npm run export-data && npm run check-data && npm run generate-orders && npm run test-import && npm run import-orders && npm run generate-account && npm run test-account && npm run import-account",