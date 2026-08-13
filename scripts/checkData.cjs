// // scripts/checkData.cjs
// const fs = require('fs');
// const path = require('path');

// function checkExportedData() {
//   console.log('🔍 檢查導出的數據...\n');
  
//   const dataDir = path.join(process.cwd(), 'scripts', 'data');
  
//   try {
//     // 檢查所有檔案是否存在
//     const files = ['users.json', 'products.json', 'categories.json', 'materials.json', 'units.json'];
    
//     for (const file of files) {
//       const filePath = path.join(dataDir, file);
//       if (fs.existsSync(filePath)) {
//         const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
//         console.log(`✅ ${file}: ${data.length} 筆數據`);
        
//         // 顯示範例數據
//         if (data.length > 0) {
//           const sample = data[0];
//           console.log(`   📌 範例: ${JSON.stringify(sample).slice(0, 100)}...`);
//         }
//       } else {
//         console.log(`❌ ${file}: 檔案不存在`);
//       }
//     }
    
//     // 檢查匯總報告
//     const summaryPath = path.join(dataDir, 'export_summary.json');
//     if (fs.existsSync(summaryPath)) {
//       const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
//       console.log('\n📊 匯總報告:');
//       console.log(`   導出時間: ${summary.exportDate}`);
//       console.log(`   用戶範例:`, summary.sampleUsers);
//     }
    
//   } catch (error) {
//     console.error('❌ 檢查失敗:', error);
//   }
// }

// checkExportedData();