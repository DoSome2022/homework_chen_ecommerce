// // scripts/importOrdersOnly.cjs
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
  
//   return { orders, receiptsAndInvoices, report };
// }

// // 導入訂單到資料庫
// async function importOrders(orders, receiptsAndInvoices) {
//   console.log(`\n📦 開始導入 ${orders.length} 筆訂單...`);
  
//   let successCount = 0;
//   let failCount = 0;
//   let skipCount = 0;
  
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
//         skipCount++;
//         continue;
//       }
      
//       // 查找用戶 - 只通過 username 查找（因為用戶已存在）
//       let user = null;
      
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
      
//       // 準備訂單數據
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
      
//       // 每導入 10 筆顯示進度
//       if (successCount % 10 === 0) {
//         console.log(`   📊 已導入 ${successCount}/${orders.length} 筆訂單`);
//       }
      
//     } catch (error) {
//       console.error(`   ❌ 導入訂單 ${orderData.orderNumber} 失敗:`, error.message);
//       failCount++;
//     }
//   }
  
//   console.log(`\n   ✅ 成功導入 ${successCount} 筆訂單`);
//   if (skipCount > 0) {
//     console.log(`   ⏭️  跳過 ${skipCount} 筆已存在的訂單`);
//   }
//   if (failCount > 0) {
//     console.log(`   ❌ 失敗 ${failCount} 筆訂單`);
//   }
  
//   return { successCount, failCount, skipCount };
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
    
//     // 顯示日期範圍
//     const dateStats = await prisma.$queryRaw`
//       SELECT 
//         MIN(createdAt) as earliest,
//         MAX(createdAt) as latest,
//         COUNT(*) as total
//       FROM "Order"
//     `;
    
//     if (dateStats && dateStats.length > 0) {
//       console.log(`\n   📅 訂單日期範圍:`);
//       console.log(`      最早: ${formatDate(dateStats[0].earliest).toLocaleDateString('zh-HK')}`);
//       console.log(`      最晚: ${formatDate(dateStats[0].latest).toLocaleDateString('zh-HK')}`);
//       console.log(`      總數: ${dateStats[0].total}`);
//     }
    
//   } catch (error) {
//     console.error('❌ 驗證失敗:', error.message);
//   }
// }

// // 主函數
// async function main() {
//   try {
//     console.log('🚀 開始導入訂單數據到資料庫...\n');
    
//     // 1. 載入生成的數據
//     const { orders, receiptsAndInvoices, report } = loadGeneratedData();
    
//     if (orders.length === 0) {
//       console.log('⚠️ 沒有訂單數據需要導入');
//       return;
//     }
    
//     // 2. 導入訂單（跳過用戶導入）
//     const { successCount, failCount, skipCount } = await importOrders(orders, receiptsAndInvoices);
    
//     // 3. 驗證結果
//     await verifyImport();
    
//     // 4. 顯示總結
//     console.log('\n✅ 訂單數據導入完成！');
//     console.log(`\n📊 總結:`);
//     console.log(`   📦 訂單: ${successCount} 成功, ${skipCount} 跳過, ${failCount} 失敗`);
    
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