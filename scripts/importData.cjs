// // scripts/importData.cjs
// const { PrismaClient } = require('@prisma/client');
// const fs = require('fs');
// const path = require('path');

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
  
//   // 載入訂單
//   const orders = JSON.parse(
//     fs.readFileSync(path.join(dataDir, 'orders.json'), 'utf-8')
//   );
  
//   // 載入收據和發票
//   const receiptsAndInvoices = JSON.parse(
//     fs.readFileSync(path.join(dataDir, 'receipts_invoices.json'), 'utf-8')
//   );
  
//   // 載入新用戶（如果有）
//   let newUsers = [];
//   const newUsersPath = path.join(dataDir, 'new_users.json');
//   if (fs.existsSync(newUsersPath)) {
//     newUsers = JSON.parse(
//       fs.readFileSync(newUsersPath, 'utf-8')
//     );
//   }
  
//   // 載入報告（可選）
//   let report = null;
//   const reportPath = path.join(dataDir, 'report.json');
//   if (fs.existsSync(reportPath)) {
//     report = JSON.parse(
//       fs.readFileSync(reportPath, 'utf-8')
//     );
//   }
  
//   console.log(`   ✅ 載入 ${orders.length} 筆訂單`);
//   console.log(`   ✅ 載入 ${receiptsAndInvoices.length} 筆收據/發票`);
//   console.log(`   ✅ 載入 ${newUsers.length} 個新用戶`);
  
//   return { orders, receiptsAndInvoices, newUsers, report };
// }

// // 導入新用戶到資料庫
// async function importNewUsers(newUsers) {
//   if (newUsers.length === 0) {
//     console.log('ℹ️  沒有新用戶需要導入');
//     return [];
//   }
  
//   console.log(`\n👤 開始導入 ${newUsers.length} 個新用戶...`);
//   const importedUsers = [];
  
//   for (const userData of newUsers) {
//     try {
//       // 檢查用戶是否已存在
//       const existingUser = await prisma.user.findFirst({
//         where: {
//           OR: [
//             { username: userData.username },
//             { email: userData.email || undefined }
//           ]
//         }
//       });
      
//       if (existingUser) {
//         console.log(`   ⚠️ 用戶 ${userData.username} 已存在，使用現有用戶`);
//         importedUsers.push(existingUser);
//         continue;
//       }
      
//       // 創建新用戶（移除 updatedAt，讓 Prisma 自動管理）
//       const user = await prisma.user.create({
//         data: {
//           username: userData.username,
//           Fname: userData.Fname || null,
//           Lname: userData.Lname || null,
//           name: userData.name || null,
//           email: userData.email || null,
//           phone: userData.phone || null,
//           passwordHash: '$2a$10$dummyHashForGeneratedUser',
//           role: userData.role || 'USER',
//           currentMembershipLevel: userData.currentMembershipLevel || 'FREE',
//           createdAt: formatDate(userData.createdAt)
//         }
//       });
      
//       importedUsers.push(user);
//       console.log(`   ✅ 創建用戶: ${user.username} (${user.name || 'N/A'})`);
      
//     } catch (error) {
//       console.error(`   ❌ 導入用戶 ${userData.username} 失敗:`, error.message);
//     }
//   }
  
//   console.log(`   ✅ 成功導入 ${importedUsers.length} 個新用戶`);
//   return importedUsers;
// }

// // 導入訂單到資料庫
// async function importOrders(orders, receiptsAndInvoices) {
//   console.log(`\n📦 開始導入 ${orders.length} 筆訂單...`);
  
//   let successCount = 0;
//   let failCount = 0;
  
//   for (let i = 0; i < orders.length; i++) {
//     const orderData = orders[i];
//     const { receipt, invoice } = receiptsAndInvoices[i] || {};
    
//     try {
//       // 檢查訂單是否已存在
//       const existingOrder = await prisma.order.findFirst({
//         where: { orderNumber: orderData.orderNumber }
//       });
      
//       if (existingOrder) {
//         console.log(`   ⚠️ 訂單 ${orderData.orderNumber} 已存在，跳過`);
//         successCount++;
//         continue;
//       }
      
//       // 查找用戶
//       let user = null;
      
//       // 嘗試通過 username 查找
//       if (orderData.user && orderData.user.username) {
//         user = await prisma.user.findFirst({
//           where: { username: orderData.user.username }
//         });
//       }
      
//       // 如果找不到，嘗試通過 userId
//       if (!user && orderData.userId) {
//         user = await prisma.user.findFirst({
//           where: { id: orderData.userId }
//         });
//       }
      
//       if (!user) {
//         console.log(`   ❌ 找不到用戶: ${orderData.userId || orderData.user?.username} (訂單 ${orderData.orderNumber})`);
//         failCount++;
//         continue;
//       }
      
//       // 準備訂單數據（移除 updatedAt，讓 Prisma 自動管理）
//       const orderCreateData = {
//         userId: user.id,
//         orderNumber: orderData.orderNumber,
//         status: orderData.status || 'completed',
//         total: orderData.total || 0,
//         shippingMethod: orderData.shippingMethod || '標準配送',
//         paymentMethod: orderData.paymentMethod || 'cash',
//         paymentStatus: orderData.paymentStatus || 'succeeded',
//         shippingFee: orderData.shippingFee || 0,
//         shippingName: orderData.shippingName || user.name || user.username || 'Customer',
//         shippingPhone: orderData.shippingPhone || user.phone || '00000000',
//         shippingAddress: orderData.shippingAddress || '香港',
//         preferredDeliveryTime: orderData.preferredDeliveryTime || '不限',
//         notes: orderData.notes || '',
//         createdAt: formatDate(orderData.createdAt),
//         paidAt: formatDate(orderData.paidAt)
//       };
      
//       // 如果有訂單項目，添加到創建數據中
//       if (orderData.items && orderData.items.length > 0) {
//         orderCreateData.items = {
//           create: orderData.items.map(item => ({
//             productId: item.productId,
//             title: item.title || '商品',
//             image: item.image || null,
//             size: item.size || '標準',
//             price: item.price || 0,
//             quantity: item.quantity || 1,
//             isPicked: Math.random() > 0.2 // 80% 已備貨
//           }))
//         };
//       }
      
//       // 創建訂單
//       const order = await prisma.order.create({
//         data: orderCreateData
//       });
      
//       // 創建 Receipt
//       if (receipt) {
//         try {
//           await prisma.receipt.create({
//             data: {
//               orderId: order.id,
//               createdAt: formatDate(receipt.createdAt) || new Date()
//             }
//           });
//         } catch (error) {
//           // 忽略收據創建失敗
//         }
//       }
      
//       // 創建 Invoice
//       if (invoice) {
//         try {
//           await prisma.invoice.create({
//             data: {
//               orderId: order.id,
//               invoiceNumber: invoice.invoiceNumber || `INV-${String(i + 1).padStart(8, '0')}`,
//               buyerName: invoice.buyerName || order.shippingName,
//               buyerUBN: invoice.buyerUBN || null,
//               createdAt: formatDate(invoice.createdAt) || new Date()
//             }
//           });
//         } catch (error) {
//           // 忽略發票創建失敗
//         }
//       }
      
//       successCount++;
      
//       if (successCount % 10 === 0) {
//         console.log(`   📊 已導入 ${successCount}/${orders.length} 筆訂單`);
//       }
      
//     } catch (error) {
//       console.error(`   ❌ 導入訂單 ${orderData.orderNumber} 失敗:`, error.message);
//       failCount++;
//     }
//   }
  
//   console.log(`\n   ✅ 成功導入 ${successCount} 筆訂單`);
//   if (failCount > 0) {
//     console.log(`   ❌ 失敗 ${failCount} 筆訂單`);
//   }
  
//   return { successCount, failCount };
// }

// // 驗證導入結果
// async function verifyImport() {
//   console.log('\n🔍 驗證導入結果...');
  
//   try {
//     const orderCount = await prisma.order.count();
//     const userCount = await prisma.user.count();
//     const receiptCount = await prisma.receipt.count();
//     const invoiceCount = await prisma.invoice.count();
//     const orderItemCount = await prisma.orderItem.count();
    
//     console.log(`   📊 資料庫統計:`);
//     console.log(`      👤 用戶: ${userCount}`);
//     console.log(`      📦 訂單: ${orderCount}`);
//     console.log(`      📄 訂單項目: ${orderItemCount}`);
//     console.log(`      📄 收據: ${receiptCount}`);
//     console.log(`      📄 發票: ${invoiceCount}`);
    
//     // 顯示最近的 5 筆訂單
//     const recentOrders = await prisma.order.findMany({
//       take: 5,
//       orderBy: { createdAt: 'desc' },
//       include: {
//         user: {
//           select: {
//             username: true,
//             name: true
//           }
//         },
//         items: {
//           select: {
//             title: true,
//             quantity: true,
//             price: true
//           }
//         }
//       }
//     });
    
//     if (recentOrders.length > 0) {
//       console.log(`\n   📝 最近的訂單:`);
//       recentOrders.forEach(order => {
//         const userName = order.user?.name || order.user?.username || 'Unknown';
//         const itemCount = order.items?.length || 0;
//         console.log(`      ${order.orderNumber} - ${userName} - HK$${(order.total / 100).toFixed(2)} - ${itemCount}項商品`);
//       });
//     }
    
//   } catch (error) {
//     console.error('❌ 驗證失敗:', error.message);
//   }
// }

// // 清理失敗的導入（可選）
// async function cleanupFailedImports() {
//   console.log('\n🧹 清理失敗的導入...');
  
//   try {
//     // 查找沒有訂單項目的訂單
//     const emptyOrders = await prisma.order.findMany({
//       where: {
//         items: {
//           none: {}
//         }
//       }
//     });
    
//     if (emptyOrders.length > 0) {
//       console.log(`   ⚠️ 發現 ${emptyOrders.length} 筆沒有項目的訂單`);
      
//       // 刪除這些訂單
//       for (const order of emptyOrders) {
//         // 先刪除關聯的收據和發票
//         await prisma.receipt.deleteMany({
//           where: { orderId: order.id }
//         });
//         await prisma.invoice.deleteMany({
//           where: { orderId: order.id }
//         });
//         // 刪除訂單
//         await prisma.order.delete({
//           where: { id: order.id }
//         });
//       }
      
//       console.log(`   ✅ 已清理 ${emptyOrders.length} 筆無效訂單`);
//     } else {
//       console.log(`   ✅ 沒有需要清理的訂單`);
//     }
    
//   } catch (error) {
//     console.error('❌ 清理失敗:', error.message);
//   }
// }

// // 主函數
// async function main() {
//   try {
//     console.log('🚀 開始導入數據到資料庫...\n');
    
//     // 1. 載入生成的數據
//     const { orders, receiptsAndInvoices, newUsers, report } = loadGeneratedData();
    
//     if (orders.length === 0) {
//       console.log('⚠️ 沒有訂單數據需要導入');
//       return;
//     }
    
//     // 2. 先導入新用戶
//     const importedUsers = await importNewUsers(newUsers);
    
//     // 3. 導入訂單
//     const { successCount, failCount } = await importOrders(orders, receiptsAndInvoices);
    
//     // 4. 清理失敗的導入
//     await cleanupFailedImports();
    
//     // 5. 驗證結果
//     await verifyImport();
    
//     // 6. 顯示總結
//     console.log('\n✅ 數據導入完成！');
//     console.log(`\n📊 總結:`);
//     console.log(`   👤 新用戶: ${importedUsers.length}`);
//     console.log(`   📦 訂單: ${successCount} 成功, ${failCount} 失敗`);
    
//     if (report) {
//       console.log(`\n📈 報告摘要:`);
//       console.log(`   生成日期: ${report.generatedAt}`);
//       console.log(`   總訂單數: ${report.totalOrders}`);
//       console.log(`   總交易額: HK$${(report.totalAmount / 100).toFixed(2)}`);
//       console.log(`   平均訂單金額: HK$${(report.avgAmount / 100).toFixed(2)}`);
//     }
    
//   } catch (error) {
//     console.error('❌ 導入失敗:', error);
//     console.error(error.stack);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// // 執行導入
// main();