// // scripts/generateOrders.cjs
// const { PrismaClient } = require('@prisma/client');
// const fs = require('fs');
// const path = require('path');

// const prisma = new PrismaClient();

// // 香港地址數據
// const HK_DISTRICTS = [
//   '中西區', '灣仔區', '東區', '南區',
//   '油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區',
//   '葵青區', '荃灣區', '屯門區', '元朗區', '北區', '大埔區', '沙田區', '西貢區', '離島區'
// ];

// const HK_STREETS = [
//   '彌敦道', '廣東道', '北京道', '梳士巴利道', '加拿分道',
//   '軒尼詩道', '駱克道', '謝斐道', '告士打道', '菲林明道',
//   '英皇道', '電氣道', '渣華道', '糖水道', '七姊妹道',
//   '長沙灣道', '荔枝角道', '青山道', '東京街', '興華街',
//   '太子道西', '亞皆老街', '窩打老道', '界限街', '聯合道',
//   '觀塘道', '牛頭角道', '啟田道', '秀茂坪道', '曉光街',
//   '青山公路', '大河道', '沙咀道', '楊屋道', '眾安街',
//   '屯門公路', '青山公路', '杯渡路', '蔡意橋路', '石排頭路',
//   '元朗大馬路', '青山公路', '鳳翔路', '壽富街', '又新街',
//   '粉嶺聯和墟', '馬會道', '和泰街', '聯興街', '聯盛街',
//   '大埔太和路', '安慈路', '安邦路', '汀角路', '大埔公路'
// ];

// const HK_BUILDINGS = [
//   '海港城', '朗豪坊', '時代廣場', '太古城中心', '又一城',
//   '新城市廣場', '沙田中心', '大埔中心', '屯門市廣場', '元朗廣場',
//   '中環中心', '力寶中心', '合和中心', '花旗銀行大廈', '長江集團中心',
//   '海富中心', '金鐘廊', '統一中心', '海港中心', '中環廣場'
// ];

// const HK_ESTATES = [
//   '太古城', '黃埔花園', '海怡半島', '嘉湖山莊', '沙田第一城',
//   '新都城', '將軍澳中心', '蔚藍灣畔', '日出康城', '峻巒',
//   'YOHO系列', 'Grand YOHO', 'Park YOHO', '御半山', '天賦海灣',
//   '逸瓏灣', '天鑄', '皓畋', '海之戀', '柏傲灣'
// ];

// // 工具函數
// function randomInt(min, max) {
//   return Math.floor(Math.random() * (max - min + 1)) + min;
// }

// function randomPick(array) {
//   if (!array || array.length === 0) return null;
//   return array[Math.floor(Math.random() * array.length)];
// }

// function formatDate(date) {
//   return date.toISOString().split('T')[0];
// }

// // 生成真實的香港地址
// function generateHKAddress() {
//   const district = randomPick(HK_DISTRICTS);
//   const street = randomPick(HK_STREETS);
//   const building = randomPick(HK_BUILDINGS);
//   const estate = randomPick(HK_ESTATES);
//   const floor = randomInt(1, 40);
//   const unit = String.fromCharCode(65 + randomInt(0, 7)); // A-H
  
//   const types = [
//     `${district} ${street} ${randomInt(1, 999)}號 ${building} ${floor}樓${unit}室`,
//     `${district} ${estate} ${randomInt(1, 50)}座 ${floor}樓${unit}室`,
//     `${district} ${street} ${randomInt(1, 999)}號 ${randomInt(1, 30)}樓${unit}室`,
//     `${district} ${estate} ${randomPick(['一期', '二期', '三期'])} ${randomInt(1, 50)}座 ${floor}樓${unit}室`
//   ];
  
//   return randomPick(types);
// }

// // 生成香港電話號碼
// function generateHKPhone() {
//   const prefixes = ['5', '6', '7', '9'];
//   const prefix = randomPick(prefixes);
//   const number = String(randomInt(10000000, 99999999));
//   return `${prefix}${number}`;
// }

// // 載入數據
// function loadData() {
//   const dataDir = path.join(process.cwd(), 'scripts', 'data');
  
//   const users = JSON.parse(
//     fs.readFileSync(path.join(dataDir, 'users.json'), 'utf-8')
//   );
  
//   const products = JSON.parse(
//     fs.readFileSync(path.join(dataDir, 'products.json'), 'utf-8')
//   );

//   // 載入英文名字數據
//   let nameData = { firstNames: [], lastNames: [] };
//   try {
//     nameData = JSON.parse(
//       fs.readFileSync(path.join(dataDir, 'english_names.json'), 'utf-8')
//     );
//     console.log(`✅ 載入英文名字: ${nameData.firstNames.length} 個, 姓氏: ${nameData.lastNames.length} 個`);
//   } catch (error) {
//     console.warn('⚠️ 未找到英文名字數據，使用默認名字');
//     nameData = {
//       firstNames: ['John', 'Mary', 'Tom', 'Jane', 'David', 'Lisa', 'Michael', 'Sarah'],
//       lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
//     };
//   }

//   return { users, products, nameData };
// }

// // 生成隨機英文全名
// function generateEnglishName(nameData) {
//   const firstName = randomPick(nameData.firstNames);
//   const lastName = randomPick(nameData.lastNames);
//   return {
//     firstName: firstName,
//     lastName: lastName,
//     fullName: `${firstName} ${lastName}`
//   };
// }

// // 生成訂單
// function generateOrders(users, products, nameData, startDate, endDate, minDailyAmount = 10000) {
//   console.log('🚀 開始生成訂單...');
  
//   const orders = [];
//   const currentDate = new Date(startDate);
//   let newUserCounter = 0;
//   const existingUsers = [...users];
//   let allUsers = [...users];
  
//   // 記錄每個月已生成的新用戶
//   const monthlyNewUsers = new Map();

//   while (currentDate <= endDate) {
//     const year = currentDate.getFullYear();
//     const month = currentDate.getMonth();
//     const day = currentDate.getDate();
//     const dateKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    
//     // 檢查是否是交易日（10-20日）
//     if (day >= 10 && day <= 20) {
//       console.log(`\n📅 處理日期: ${formatDate(currentDate)}`);
      
//       // 每月10號生成新用戶
//       if (day === 10) {
//         const numNewUsers = randomInt(1, 3);
//         console.log(`   👤 生成 ${numNewUsers} 個新用戶...`);
        
//         for (let i = 0; i < numNewUsers; i++) {
//           newUserCounter++;
          
//           // 生成英文名字
//           const englishName = generateEnglishName(nameData);
//           const username = `${englishName.firstName}${englishName.lastName}${newUserCounter}`;
          
//           const newUser = {
//             id: `new_${Date.now()}_${newUserCounter}`,
//             username: username,
//             Fname: englishName.firstName,
//             Lname: englishName.lastName,
//             name: englishName.fullName,
//             email: `${username.toLowerCase()}@gmail.com`,
//             phone: generateHKPhone(),
//             role: 'USER',
//             currentMembershipLevel: randomPick(['FREE', 'SILVER', 'GOLD', 'PLATINUM']),
//             createdAt: new Date(currentDate),
//             isNewUser: true,
//             // 保存英文名字以便後續使用
//             englishName: englishName
//           };
          
//           allUsers.push(newUser);
          
//           if (!monthlyNewUsers.has(dateKey)) {
//             monthlyNewUsers.set(dateKey, []);
//           }
//           monthlyNewUsers.get(dateKey).push(newUser);
//         }
//         console.log(`   ✅ 目前總用戶數: ${allUsers.length}`);
//       }
      
//       // 決定今天要生成多少筆訂單
//       let dailyTotal = 0;
//       const dailyOrders = [];
//       let attempts = 0;
//       const maxAttempts = 100;
      
//       // 獲取今天可用的用戶
//       const newUsersThisMonth = monthlyNewUsers.get(dateKey) || [];
      
//       while (dailyTotal < minDailyAmount && attempts < maxAttempts) {
//         attempts++;
        
//         // 選擇用戶（50%機率使用新用戶）
//         let user;
//         if (newUsersThisMonth.length > 0 && Math.random() < 0.5) {
//           user = randomPick(newUsersThisMonth);
//         } else {
//           user = randomPick(allUsers);
//         }
        
//         if (!user) continue;
        
//         // 選擇商品（1-5個）
//         const numItems = randomInt(1, Math.min(5, products.length));
//         const shuffledProducts = [...products].sort(() => Math.random() - 0.5);
//         const selectedItems = [];
//         let orderTotal = 0;
        
//         for (let i = 0; i < Math.min(numItems, shuffledProducts.length); i++) {
//           const product = shuffledProducts[i];
          
//           let price = 0;
//           if (product.price) {
//             price = parseInt(product.price);
//             if (isNaN(price)) price = randomInt(50, 500);
//           } else {
//             price = randomInt(50, 500);
//           }
          
//           const quantity = randomInt(1, 5);
//           const itemTotal = price * quantity;
          
//           let unit = '個';
//           if (product.unit && product.unit.length > 0) {
//             unit = randomPick(product.unit);
//           }
          
//           selectedItems.push({
//             productId: product.id,
//             title: product.title || '商品',
//             image: product.img || null,
//             size: unit,
//             price: price,
//             quantity: quantity
//           });
          
//           orderTotal += itemTotal;
//         }
        
//         if (selectedItems.length === 0) continue;
        
//         // 運費（50-150港幣）
//         const shippingFee = randomInt(50, 150) * 100;
//         const totalWithShipping = orderTotal + shippingFee;
        
//         // 生成訂單號
//         const orderNumber = `ORD-${formatDate(currentDate).replace(/-/g, '')}-${String(orders.length + 1).padStart(6, '0')}`;
        
//         // 獲取用戶名稱
//         const userName = user.name || user.username || 'Customer';
        
//         // 創建訂單
//         const order = {
//           userId: user.id,
//           user: user,
//           orderNumber: orderNumber,
//           status: 'completed',
//           total: totalWithShipping,
//           items: selectedItems,
//           shippingMethod: randomPick(['標準配送', '門市自取', '快遞', '宅配便']),
//           paymentMethod: 'cash',
//           paymentStatus: 'succeeded',
//           shippingFee: shippingFee,
//           shippingName: userName,
//           shippingPhone: user.phone || generateHKPhone(),
//           shippingAddress: generateHKAddress(),
//           preferredDeliveryTime: randomPick(['上午9-12點', '下午1-5點', '晚上6-9點', '不限']),
//           notes: `訂單生成於 ${formatDate(currentDate)}`,
//           createdAt: new Date(currentDate),
//           paidAt: new Date(currentDate),
//           hasReturn: Math.random() < 0.05 ? {
//             reason: randomPick(['商品損壞', '尺寸不合', '不喜歡', '寄錯商品']),
//             description: '客戶申請退貨',
//             status: randomPick(['PENDING', 'APPROVED', 'REJECTED'])
//           } : null
//         };
        
//         dailyOrders.push(order);
//         dailyTotal += totalWithShipping;
//       }
      
//       // 如果交易額不足，補充一筆大訂單
//       if (dailyTotal < minDailyAmount && dailyOrders.length > 0) {
//         const lastOrder = dailyOrders[dailyOrders.length - 1];
//         const additionalAmount = minDailyAmount - dailyTotal + randomInt(1000, 5000);
        
//         const extraOrder = {
//           ...lastOrder,
//           id: `order_${Date.now()}_${orders.length + dailyOrders.length}`,
//           orderNumber: `ORD-${formatDate(currentDate).replace(/-/g, '')}-${String(orders.length + dailyOrders.length + 1).padStart(6, '0')}`,
//           total: lastOrder.total + additionalAmount,
//           items: [...lastOrder.items, ...lastOrder.items.slice(0, 2)]
//         };
//         dailyOrders.push(extraOrder);
//         dailyTotal += additionalAmount;
//         console.log(`   💰 補上大訂單: HK$${(additionalAmount / 100).toFixed(2)}`);
//       }
      
//       if (dailyOrders.length > 0) {
//         orders.push(...dailyOrders);
//         console.log(`   ✅ 生成 ${dailyOrders.length} 筆訂單，總額: HK$${(dailyTotal / 100).toFixed(2)}`);
//       } else {
//         console.log(`   ⚠️ 無法生成訂單`);
//       }
//     }
    
//     currentDate.setDate(currentDate.getDate() + 1);
//   }
  
//   console.log(`\n📊 總共生成 ${orders.length} 筆訂單`);
//   return orders;
// }

// // 生成 Receipt 和 Invoice
// function generateReceiptsAndInvoices(orders) {
//   console.log('📄 生成收據和發票...');
  
//   return orders.map((order, index) => {
//     const receipt = {
//       orderId: order.id,
//       createdAt: order.createdAt
//     };
    
//     const invoice = {
//       orderId: order.id,
//       invoiceNumber: `INV-${String(index + 1).padStart(8, '0')}`,
//       buyerName: order.shippingName,
//       buyerUBN: Math.random() < 0.3 ? `${String(randomInt(10000000, 99999999))}` : null,
//       createdAt: order.createdAt
//     };
    
//     return { receipt, invoice };
//   });
// }

// // 主函數
// async function main() {
//   try {
//     console.log('🚀 開始生成訂單數據...\n');
    
//     // 載入數據
//     const { users, products, nameData } = loadData();
//     console.log(`\n📊 載入數據:`);
//     console.log(`   👤 用戶: ${users.length} 位`);
//     console.log(`   📦 商品: ${products.length} 個`);
//     console.log(`   📝 英文名字: ${nameData.firstNames.length} 個`);
//     console.log(`   📝 英文姓氏: ${nameData.lastNames.length} 個\n`);
    
//     // 設定日期範圍
//     const startDate = new Date('2025-01-01');
//     const endDate = new Date('2027-12-31');
//     console.log(`📅 日期範圍: ${formatDate(startDate)} 至 ${formatDate(endDate)}`);
//     console.log(`💰 每日最低交易額: HK$10,000\n`);
    
//     // 生成訂單
//     const orders = generateOrders(users, products, nameData, startDate, endDate, 10000);
    
//     // 生成 Receipt 和 Invoice
//     const receiptsAndInvoices = generateReceiptsAndInvoices(orders);
    
//     // 計算統計
//     const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);
//     const avgAmount = orders.length > 0 ? totalAmount / orders.length : 0;
    
//     // 按月份統計
//     const monthlyStats = {};
//     orders.forEach(order => {
//       const date = new Date(order.createdAt);
//       const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
//       if (!monthlyStats[key]) {
//         monthlyStats[key] = { count: 0, total: 0 };
//       }
//       monthlyStats[key].count++;
//       monthlyStats[key].total += order.total;
//     });
    
//     // 儲存生成的數據
//     const outputDir = path.join(process.cwd(), 'scripts', 'generated_data');
//     if (!fs.existsSync(outputDir)) {
//       fs.mkdirSync(outputDir, { recursive: true });
//     }
    
//     console.log('\n💾 儲存生成的數據...');
    
//     // 儲存訂單
//     fs.writeFileSync(
//       path.join(outputDir, 'orders.json'),
//       JSON.stringify(orders, null, 2)
//     );
    
//     // 儲存收據和發票
//     fs.writeFileSync(
//       path.join(outputDir, 'receipts_invoices.json'),
//       JSON.stringify(receiptsAndInvoices, null, 2)
//     );
    
//     // 儲存新生成的用戶
//     const newUsers = orders
//       .map(o => o.user)
//       .filter((user, index, self) => 
//         user.isNewUser && self.findIndex(u => u.id === user.id) === index
//       );
    
//     if (newUsers.length > 0) {
//       fs.writeFileSync(
//         path.join(outputDir, 'new_users.json'),
//         JSON.stringify(newUsers, null, 2)
//       );
//     }
    
//     // 生成匯總報告
//     const report = {
//       generatedAt: new Date().toISOString(),
//       totalOrders: orders.length,
//       totalAmount: totalAmount,
//       avgAmount: avgAmount,
//       newUsersGenerated: newUsers.length,
//       dateRange: {
//         start: startDate,
//         end: endDate
//       },
//       monthlyStats: monthlyStats,
//       sampleOrders: orders.slice(0, 5).map(o => ({
//         orderNumber: o.orderNumber,
//         date: o.createdAt,
//         total: o.total,
//         items: o.items.length,
//         user: o.user.name || o.user.username,
//         address: o.shippingAddress
//       }))
//     };
    
//     fs.writeFileSync(
//       path.join(outputDir, 'report.json'),
//       JSON.stringify(report, null, 2)
//     );
    
//     // 顯示結果
//     console.log('\n📊 匯總報告:');
//     console.log(`   📦 總訂單數: ${report.totalOrders}`);
//     console.log(`   💰 總交易額: HK$${(report.totalAmount / 100).toFixed(2)}`);
//     console.log(`   📊 平均訂單金額: HK$${(report.avgAmount / 100).toFixed(2)}`);
//     console.log(`   👤 新用戶數: ${report.newUsersGenerated}`);
//     console.log(`\n   📈 每月統計:`);
    
//     const sortedMonths = Object.keys(monthlyStats).sort();
//     sortedMonths.forEach(month => {
//       const stats = monthlyStats[month];
//       console.log(`      ${month}: ${stats.count} 筆訂單, HK$${(stats.total / 100).toFixed(2)}`);
//     });
    
//     console.log('\n✅ 數據生成完成！');
//     console.log(`📁 儲存位置: ${outputDir}`);
//     console.log('\n📝 範例訂單:');
//     report.sampleOrders.forEach((order, i) => {
//       console.log(`   ${i + 1}. ${order.orderNumber}`);
//       console.log(`      日期: ${formatDate(new Date(order.date))}`);
//       console.log(`      用戶: ${order.user}`);
//       console.log(`      金額: HK$${(order.total / 100).toFixed(2)}`);
//       console.log(`      地址: ${order.address}`);
//       console.log(`      商品數: ${order.items}項\n`);
//     });
    
//   } catch (error) {
//     console.error('❌ 生成失敗:', error);
//     console.error(error.stack);
//   }
// }

// // 執行
// main();