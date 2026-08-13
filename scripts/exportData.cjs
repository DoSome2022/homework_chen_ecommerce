// // scripts/exportData.cjs
// const { PrismaClient } = require('@prisma/client');
// const fs = require('fs');
// const path = require('path');

// const prisma = new PrismaClient();

// async function exportData() {
//   try {
//     console.log('🔌 連接到資料庫...');
    
//     // 測試連接
//     await prisma.$connect();
//     console.log('✅ 資料庫連接成功！\n');
    
//     // 1. 導出 Users (只導出 USER 角色)
//     console.log('📊 正在導出 Users...');
//     const users = await prisma.user.findMany({
//       where: { 
//         role: 'USER' 
//       },
//       select: {
//         id: true,
//         username: true,
//         Fname: true,
//         Lname: true,
//         name: true,
//         email: true,
//         phone: true,
//         role: true,
//         currentMembershipLevel: true,
//         createdAt: true
//       }
//     });
//     console.log(`   ✅ 導出 ${users.length} 位用戶`);

//     // 2. 導出 Products
//     console.log('📦 正在導出 Products...');
//     const products = await prisma.product.findMany({
//       include: {
//         category: true,
//         materials: true
//       }
//     });
//     console.log(`   ✅ 導出 ${products.length} 個商品`);

//     // 3. 導出 Categories
//     console.log('📂 正在導出 Categories...');
//     const categories = await prisma.category.findMany();
//     console.log(`   ✅ 導出 ${categories.length} 個分類`);

//     // 4. 導出 Materials
//     console.log('🧱 正在導出 Materials...');
//     const materials = await prisma.materials.findMany();
//     console.log(`   ✅ 導出 ${materials.length} 個材質`);

//     // 5. 導出 Units
//     console.log('📏 正在導出 Units...');
//     const units = await prisma.unit.findMany();
//     console.log(`   ✅ 導出 ${units.length} 個單位`);

//     // 創建數據目錄
//     const dataDir = path.join(process.cwd(), 'scripts', 'data');
//     if (!fs.existsSync(dataDir)) {
//       fs.mkdirSync(dataDir, { recursive: true });
//     }

//     // 儲存數據到 JSON 檔案
//     console.log('\n💾 正在儲存數據...');
    
//     fs.writeFileSync(
//       path.join(dataDir, 'users.json'),
//       JSON.stringify(users, null, 2)
//     );

//     fs.writeFileSync(
//       path.join(dataDir, 'products.json'),
//       JSON.stringify(products, null, 2)
//     );

//     fs.writeFileSync(
//       path.join(dataDir, 'categories.json'),
//       JSON.stringify(categories, null, 2)
//     );

//     fs.writeFileSync(
//       path.join(dataDir, 'materials.json'),
//       JSON.stringify(materials, null, 2)
//     );

//     fs.writeFileSync(
//       path.join(dataDir, 'units.json'),
//       JSON.stringify(units, null, 2)
//     );

//     // 生成匯總報告
//     const summary = {
//       exportDate: new Date().toISOString(),
//       counts: {
//         users: users.length,
//         products: products.length,
//         categories: categories.length,
//         materials: materials.length,
//         units: units.length
//       },
//       sampleUsers: users.slice(0, 5).map(u => ({
//         id: u.id,
//         username: u.username,
//         name: u.name
//       })),
//       sampleProducts: products.slice(0, 5).map(p => ({
//         id: p.id,
//         title: p.title,
//         price: p.price
//       }))
//     };

//     fs.writeFileSync(
//       path.join(dataDir, 'export_summary.json'),
//       JSON.stringify(summary, null, 2)
//     );

//     console.log('\n✅ 數據導出成功！');
//     console.log(`📁 儲存位置: ${dataDir}`);
//     console.log('\n📊 匯總:');
//     console.log(`   👤 用戶: ${users.length}`);
//     console.log(`   📦 商品: ${products.length}`);
//     console.log(`   📂 分類: ${categories.length}`);
//     console.log(`   🧱 材質: ${materials.length}`);
//     console.log(`   📏 單位: ${units.length}`);

//   } catch (error) {
//     console.error('❌ 導出失敗:', error);
//     console.error('請確認:');
//     console.error('1. 資料庫是否正在運行');
//     console.error('2. .env 檔案中的 DATABASE_URL 是否正確');
//     console.error('3. 是否已執行 prisma generate');
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// // 執行導出
// exportData();