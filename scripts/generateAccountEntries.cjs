// // scripts/generateAccountEntries.cjs
// const { PrismaClient } = require('@prisma/client');
// const fs = require('fs');
// const path = require('path');

// const prisma = new PrismaClient();

// // 工具函數
// function randomInt(min, max) {
//   return Math.floor(Math.random() * (max - min + 1)) + min;
// }

// function formatDate(date) {
//   if (!date) return new Date();
//   return new Date(date);
// }

// // 獲取所有已完成且沒有 AccountEntry 的訂單
// async function getOrdersWithoutAccountEntry() {
//   console.log('🔍 查找需要生成 AccountEntry 的訂單...');
  
//   const orders = await prisma.order.findMany({
//     where: {
//       status: 'completed',
//       accountEntry: null // 還沒有 AccountEntry
//     },
//     include: {
//       user: {
//         select: {
//           id: true,
//           username: true,
//           name: true
//         }
//       },
//       items: true
//     },
//     orderBy: {
//       createdAt: 'asc'
//     }
//   });
  
//   console.log(`   ✅ 找到 ${orders.length} 筆需要生成 AccountEntry 的訂單`);
//   return orders;
// }

// // 計算產品總金額（不含運費）
// function calculateProductAmount(order) {
//   // 從訂單項目計算產品總金額
//   const productAmount = order.items.reduce((sum, item) => {
//     return sum + (item.price * item.quantity);
//   }, 0);
  
//   return productAmount;
// }

// // 生成 AccountEntry 數據
// async function generateAccountEntries(orders) {
//   console.log('\n📊 開始生成 AccountEntry...');
  
//   const accountEntries = [];
//   let successCount = 0;
//   let failCount = 0;
//   let skipCount = 0;
  
//   for (const order of orders) {
//     try {
//       // 計算產品總金額（從訂單項目計算）
//       const calculatedProductAmount = calculateProductAmount(order);
      
//       // 從訂單中獲取運費
//       const shippingFee = order.shippingFee || 0;
      
//       // 計算總金額 = 產品金額 + 運費
//       const calculatedTotal = calculatedProductAmount + shippingFee;
      
//       // 驗證計算的總金額是否與訂單的 total 一致
//       if (calculatedTotal !== order.total) {
//         console.log(`   ⚠️ 訂單 ${order.orderNumber} 金額不一致:`);
//         console.log(`      訂單總額: ${order.total}`);
//         console.log(`      計算總額: ${calculatedTotal}`);
//         console.log(`      產品金額: ${calculatedProductAmount}`);
//         console.log(`      運費: ${shippingFee}`);
//         console.log(`      使用訂單的 total 值: ${order.total}`);
        
//         // 使用訂單的 total 值，並重新計算 productAmount
//         const adjustedProductAmount = order.total - shippingFee;
        
//         console.log(`      ✅ 調整後產品金額: ${adjustedProductAmount}`);
        
//         // 選擇一個管理員用戶來結算
//         let adminUser = await prisma.user.findFirst({
//           where: { role: 'ADMIN' }
//         });
        
//         if (!adminUser) {
//           adminUser = await prisma.user.findFirst({
//             where: { role: 'USER' }
//           });
//         }
        
//         if (!adminUser) {
//           console.error('❌ 找不到任何用戶來作為結算者');
//           break;
//         }
        
//         // 使用訂單的 total 值創建 AccountEntry
//         const accountEntryData = {
//           orderId: order.id,
//           settledById: adminUser.id,
//           settledAt: new Date(order.createdAt.getTime() + randomInt(1, 7) * 24 * 60 * 60 * 1000),
//           totalAmount: order.total, // 直接使用訂單的 total
//           shippingFee: shippingFee,
//           productAmount: adjustedProductAmount, // 調整後的產品金額
//           createdAt: new Date(order.createdAt)
//         };
        
//         const accountEntry = await prisma.accountEntry.create({
//           data: accountEntryData,
//           include: {
//             order: {
//               select: {
//                 orderNumber: true,
//                 total: true
//               }
//             },
//             settledBy: {
//               select: {
//                 username: true,
//                 name: true
//               }
//             }
//           }
//         });
        
//         accountEntries.push(accountEntry);
//         successCount++;
        
//         if (successCount % 10 === 0) {
//           console.log(`   📊 已生成 ${successCount}/${orders.length} 筆 AccountEntry`);
//         }
        
//         continue;
//       }
      
//       // 如果金額一致，正常生成
//       let adminUser = await prisma.user.findFirst({
//         where: { role: 'ADMIN' }
//       });
      
//       if (!adminUser) {
//         adminUser = await prisma.user.findFirst({
//           where: { role: 'USER' }
//         });
//       }
      
//       if (!adminUser) {
//         console.error('❌ 找不到任何用戶來作為結算者');
//         break;
//       }
      
//       // 創建 AccountEntry - 直接使用訂單的數值
//       const accountEntryData = {
//         orderId: order.id,
//         settledById: adminUser.id,
//         settledAt: new Date(order.createdAt.getTime() + randomInt(1, 7) * 24 * 60 * 60 * 1000),
//         totalAmount: order.total, // 直接使用訂單的 total
//         shippingFee: order.shippingFee || 0,
//         productAmount: calculatedProductAmount,
//         createdAt: new Date(order.createdAt)
//       };
      
//       const accountEntry = await prisma.accountEntry.create({
//         data: accountEntryData,
//         include: {
//           order: {
//             select: {
//               orderNumber: true,
//               total: true
//             }
//           },
//           settledBy: {
//             select: {
//               username: true,
//               name: true
//             }
//           }
//         }
//       });
      
//       accountEntries.push(accountEntry);
//       successCount++;
      
//       if (successCount % 10 === 0) {
//         console.log(`   📊 已生成 ${successCount}/${orders.length} 筆 AccountEntry`);
//       }
      
//     } catch (error) {
//       console.error(`   ❌ 訂單 ${order.orderNumber} 生成失敗:`, error.message);
//       failCount++;
//     }
//   }
  
//   console.log(`\n   ✅ 成功生成 ${successCount} 筆 AccountEntry`);
//   if (skipCount > 0) {
//     console.log(`   ⏭️  跳過 ${skipCount} 筆（金額不匹配）`);
//   }
//   if (failCount > 0) {
//     console.log(`   ❌ 失敗 ${failCount} 筆`);
//   }
  
//   return { accountEntries, successCount, failCount, skipCount };
// }

// // 驗證生成的 AccountEntry 與訂單數據的一致性
// async function verifyAccountEntries() {
//   console.log('\n🔍 驗證 AccountEntry 與訂單數據的一致性...');
  
//   try {
//     // 獲取所有有 AccountEntry 的訂單
//     const ordersWithEntries = await prisma.order.findMany({
//       where: {
//         status: 'completed',
//         accountEntry: {
//           isNot: null
//         }
//       },
//       include: {
//         accountEntry: true,
//         items: true
//       }
//     });
    
//     console.log(`   📊 檢查 ${ordersWithEntries.length} 筆訂單的 AccountEntry`);
    
//     let inconsistentCount = 0;
//     let consistentCount = 0;
    
//     for (const order of ordersWithEntries) {
//       const entry = order.accountEntry;
//       const calculatedProductAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
//       const calculatedTotal = calculatedProductAmount + (order.shippingFee || 0);
      
//       // 檢查一致性
//       const isTotalConsistent = entry.totalAmount === order.total;
//       const isShippingConsistent = entry.shippingFee === (order.shippingFee || 0);
//       const isProductAmountConsistent = entry.productAmount === calculatedProductAmount;
      
//       if (!isTotalConsistent || !isShippingConsistent || !isProductAmountConsistent) {
//         inconsistentCount++;
//         console.log(`   ⚠️ 訂單 ${order.orderNumber} 數據不一致:`);
//         console.log(`      total: ${entry.totalAmount} vs ${order.total}`);
//         console.log(`      shippingFee: ${entry.shippingFee} vs ${order.shippingFee || 0}`);
//         console.log(`      productAmount: ${entry.productAmount} vs ${calculatedProductAmount}`);
//       } else {
//         consistentCount++;
//       }
//     }
    
//     console.log(`\n   ✅ 一致: ${consistentCount} 筆`);
//     if (inconsistentCount > 0) {
//       console.log(`   ❌ 不一致: ${inconsistentCount} 筆`);
//     }
    
//     // 顯示統計
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
    
//     return { consistentCount, inconsistentCount };
    
//   } catch (error) {
//     console.error('❌ 驗證失敗:', error.message);
//     return { consistentCount: 0, inconsistentCount: 0 };
//   }
// }

// // 主函數
// async function main() {
//   try {
//     console.log('🚀 開始生成 AccountEntry 數據...\n');
    
//     // 1. 獲取需要生成 AccountEntry 的訂單
//     const orders = await getOrdersWithoutAccountEntry();
    
//     if (orders.length === 0) {
//       console.log('ℹ️  所有已完成訂單都已有 AccountEntry，無需生成');
      
//       // 驗證現有數據的一致性
//       await verifyAccountEntries();
//       return;
//     }
    
//     // 2. 顯示將要處理的訂單資訊
//     console.log(`\n📋 將處理 ${orders.length} 筆訂單`);
//     const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);
//     console.log(`   💰 總金額: HK$${(totalAmount / 100).toFixed(2)}`);
    
//     // 3. 生成 AccountEntry
//     const { accountEntries, successCount, failCount, skipCount } = await generateAccountEntries(orders);
    
//     // 4. 驗證結果
//     const { consistentCount, inconsistentCount } = await verifyAccountEntries();
    
//     // 5. 顯示總結
//     console.log('\n✅ AccountEntry 生成完成！');
//     console.log(`\n📊 總結:`);
//     console.log(`   📦 處理訂單: ${orders.length}`);
//     console.log(`   ✅ 成功生成: ${successCount}`);
//     console.log(`   ❌ 失敗: ${failCount}`);
//     console.log(`   📊 數據一致性: ${consistentCount} 筆一致, ${inconsistentCount} 筆不一致`);
    
//     // 儲存生成的數據到檔案
//     if (accountEntries.length > 0) {
//       const outputDir = path.join(process.cwd(), 'scripts', 'generated_data');
//       if (!fs.existsSync(outputDir)) {
//         fs.mkdirSync(outputDir, { recursive: true });
//       }
      
//       fs.writeFileSync(
//         path.join(outputDir, 'account_entries.json'),
//         JSON.stringify(accountEntries, null, 2)
//       );
//       console.log(`\n💾 AccountEntry 數據已儲存到: ${outputDir}/account_entries.json`);
//     }
    
//   } catch (error) {
//     console.error('❌ 生成失敗:', error);
//     console.error(error.stack);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// // 執行
// main();