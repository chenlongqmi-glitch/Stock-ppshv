const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

// 1. Expand stockInModal container width
const oldInContainer = `<div class="relative w-full max-w-5xl xl:max-w-6xl space-y-2.5 sm:space-y-3 shrink-0 pb-2 sm:pb-3" onclick="event.stopPropagation()">
      <div id="stockInFormCard" class="glass-card p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl shadow-sm border-2 border-emerald-300/80 bg-gradient-to-br from-emerald-50/30 via-white to-teal-50/20">`;

const newInContainer = `<div class="relative w-full max-w-[98%] xl:max-w-[97%] 2xl:max-w-[1760px] space-y-3 shrink-0 pb-2 sm:pb-3" onclick="event.stopPropagation()">
      <div id="stockInFormCard" class="glass-card p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl shadow-md border-2 border-emerald-300/80 bg-gradient-to-br from-emerald-50/30 via-white to-teal-50/20">`;

if (!content.includes(oldInContainer)) {
  console.error('Failed to find oldInContainer!');
  process.exit(1);
}
content = content.replace(oldInContainer, newInContainer);

// 2. Expand stockIn image preview
const oldInImg = `<div class="w-full lg:w-40 xl:w-44 shrink-0 flex flex-col justify-stretch">
                  <div id="stockInImgCard"
                    class="flex-1 w-full border-2 border-emerald-300/80 rounded-2xl bg-emerald-50/20 flex flex-col items-center justify-center p-3 relative overflow-hidden group cursor-pointer shadow-xs hover:border-emerald-500 hover:bg-white transition min-h-[165px] lg:min-h-[175px]"
                    onclick="previewStockInCurrentItemImage()"
                    title="ចុចដើម្បីមើលរូបភាពធំ (Click to preview)">
                    
                    <div id="stockInImgPlaceholderBox" class="flex flex-col items-center justify-center text-center p-2 my-auto select-none space-y-1.5">
                      <i class="fa-regular fa-image text-emerald-400 text-4xl mb-1"></i>
                      <span class="text-sm font-extrabold text-slate-700 font-khmer">រូបភាពទំនិញ</span>
                      <span class="text-[11px] text-slate-400 font-khmer">ចុចមើលរូបភាពធំ</span>
                    </div>
                    
                    <img id="stockInItemImg" src="" alt="" class="w-full h-full max-h-[200px] object-contain hidden rounded-xl transition group-hover:scale-105 pointer-events-none drop-shadow-xs">`;

const newInImg = `<div class="w-full lg:w-56 xl:w-64 2xl:w-72 shrink-0 flex flex-col justify-stretch">
                  <div id="stockInImgCard"
                    class="flex-1 w-full border-2 border-emerald-300/80 rounded-2xl bg-emerald-50/20 flex flex-col items-center justify-center p-3.5 relative overflow-hidden group cursor-pointer shadow-xs hover:border-emerald-500 hover:bg-white transition min-h-[210px] lg:min-h-[240px] xl:min-h-[260px]"
                    onclick="previewStockInCurrentItemImage()"
                    title="ចុចដើម្បីមើលរូបភាពធំ (Click to preview)">
                    
                    <div id="stockInImgPlaceholderBox" class="flex flex-col items-center justify-center text-center p-2 my-auto select-none space-y-2">
                      <i class="fa-regular fa-image text-emerald-400 text-5xl mb-1"></i>
                      <span class="text-base font-extrabold text-slate-700 font-khmer">រូបភាពទំនិញ</span>
                      <span class="text-xs text-slate-400 font-khmer">ចុចមើលរូបភាពធំ</span>
                    </div>
                    
                    <img id="stockInItemImg" src="" alt="" class="w-full h-full max-h-[260px] object-contain hidden rounded-xl transition group-hover:scale-105 pointer-events-none drop-shadow-xs">`;

if (!content.includes(oldInImg)) {
  console.error('Failed to find oldInImg!');
  process.exit(1);
}
content = content.replace(oldInImg, newInImg);

// 3. Expand stockIn fields container gap
const oldInGrid = `<div id="stockInFieldsContainer" class="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_1.2fr] stock-entry-fields-grid gap-3 items-end w-full">`;
const newInGrid = `<div id="stockInFieldsContainer" class="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_1.2fr] stock-entry-fields-grid gap-3.5 sm:gap-4 md:gap-5 items-end w-full">`;

if (!content.includes(oldInGrid)) {
  console.error('Failed to find oldInGrid!');
  process.exit(1);
}
content = content.replace(oldInGrid, newInGrid);

// 4. Expand stockOutModal container width
const oldOutContainer = `<div class="relative w-full max-w-5xl xl:max-w-6xl space-y-2.5 sm:space-y-3 shrink-0 pb-2 sm:pb-3" onclick="event.stopPropagation()">
      <div id="stockOutFormCard" class="glass-card p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl shadow-sm border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/30 via-white to-orange-50/20">`;

const newOutContainer = `<div class="relative w-full max-w-[98%] xl:max-w-[97%] 2xl:max-w-[1760px] space-y-3 shrink-0 pb-2 sm:pb-3" onclick="event.stopPropagation()">
      <div id="stockOutFormCard" class="glass-card p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl shadow-md border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/30 via-white to-orange-50/20">`;

if (!content.includes(oldOutContainer)) {
  console.error('Failed to find oldOutContainer!');
  process.exit(1);
}
content = content.replace(oldOutContainer, newOutContainer);

// 5. Expand stockOut image preview
const oldOutImg = `<div class="w-full lg:w-48 xl:w-56 shrink-0 flex flex-col justify-stretch">
                  <div id="stockOutImgCard"
                    class="flex-1 w-full border-2 border-amber-300/80 rounded-2xl bg-amber-50/20 flex flex-col items-center justify-center p-3 relative overflow-hidden group cursor-pointer shadow-xs hover:border-amber-500 hover:bg-white transition min-h-[165px] lg:min-h-[175px]"
                    onclick="previewStockOutCurrentItemImage()"
                    title="ចុចដើម្បីមើលរូបភាពធំ (Click to preview)">
                    
                    <div id="stockOutImgPlaceholderBox" class="flex flex-col items-center justify-center text-center p-2 my-auto select-none space-y-1.5">
                      <i class="fa-regular fa-image text-amber-400 text-4xl mb-1"></i>
                      <span class="text-sm font-extrabold text-slate-700 font-khmer">រូបភាពទំនិញ</span>
                      <span class="text-[11px] text-slate-400 font-khmer">ចុចមើលរូបភាពធំ</span>
                    </div>
                    
                    <img id="stockOutItemImg" src="" alt="" class="w-full h-full max-h-[200px] object-contain hidden rounded-xl transition group-hover:scale-105 pointer-events-none drop-shadow-xs">`;

const newOutImg = `<div class="w-full lg:w-56 xl:w-64 2xl:w-72 shrink-0 flex flex-col justify-stretch">
                  <div id="stockOutImgCard"
                    class="flex-1 w-full border-2 border-amber-300/80 rounded-2xl bg-amber-50/20 flex flex-col items-center justify-center p-3.5 relative overflow-hidden group cursor-pointer shadow-xs hover:border-amber-500 hover:bg-white transition min-h-[210px] lg:min-h-[240px] xl:min-h-[260px]"
                    onclick="previewStockOutCurrentItemImage()"
                    title="ចុចដើម្បីមើលរូបភាពធំ (Click to preview)">
                    
                    <div id="stockOutImgPlaceholderBox" class="flex flex-col items-center justify-center text-center p-2 my-auto select-none space-y-2">
                      <i class="fa-regular fa-image text-amber-400 text-5xl mb-1"></i>
                      <span class="text-base font-extrabold text-slate-700 font-khmer">រូបភាពទំនិញ</span>
                      <span class="text-xs text-slate-400 font-khmer">ចុចមើលរូបភាពធំ</span>
                    </div>
                    
                    <img id="stockOutItemImg" src="" alt="" class="w-full h-full max-h-[260px] object-contain hidden rounded-xl transition group-hover:scale-105 pointer-events-none drop-shadow-xs">`;

if (!content.includes(oldOutImg)) {
  console.error('Failed to find oldOutImg!');
  process.exit(1);
}
content = content.replace(oldOutImg, newOutImg);

// 6. Expand stockOut fields container gap
const oldOutGrid = `<div id="stockOutFieldsContainer" class="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_1.2fr] stock-entry-fields-grid gap-3 items-end w-full">`;
const newOutGrid = `<div id="stockOutFieldsContainer" class="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_1.2fr] stock-entry-fields-grid gap-3.5 sm:gap-4 md:gap-5 items-end w-full">`;

if (!content.includes(oldOutGrid)) {
  console.error('Failed to find oldOutGrid!');
  process.exit(1);
}
content = content.replace(oldOutGrid, newOutGrid);

// Increase input heights to h-12 in stockInForm and stockOutForm
// Let's replace 'w-full h-11' with 'w-full h-11 sm:h-12' in stockInFormCard and stockOutFormCard
const idxInStart = content.indexOf('id="stockInFormCard"');
const idxInEnd = content.indexOf('<!-- BATCH QUEUE CARD', idxInStart);
let inCardContent = content.slice(idxInStart, idxInEnd);
inCardContent = inCardContent.replace(/w-full h-11/g, 'w-full h-11 sm:h-12');
inCardContent = inCardContent.replace(/h-11 px-/g, 'h-11 sm:h-12 px-');
inCardContent = inCardContent.replace(/text-xs font-bold text-slate-700 uppercase mb-1\.5/g, 'text-xs sm:text-[13px] font-bold text-slate-700 uppercase mb-1.5');
content = content.slice(0, idxInStart) + inCardContent + content.slice(idxInEnd);

const idxOutStart = content.indexOf('id="stockOutFormCard"');
const idxOutEnd = content.indexOf('<!-- BATCH QUEUE CARD', idxOutStart);
let outCardContent = content.slice(idxOutStart, idxOutEnd);
outCardContent = outCardContent.replace(/w-full h-11/g, 'w-full h-11 sm:h-12');
outCardContent = outCardContent.replace(/h-11 px-/g, 'h-11 sm:h-12 px-');
outCardContent = outCardContent.replace(/text-xs font-bold text-slate-700 uppercase mb-1\.5/g, 'text-xs sm:text-[13px] font-bold text-slate-700 uppercase mb-1.5');
content = content.slice(0, idxOutStart) + outCardContent + content.slice(idxOutEnd);

fs.writeFileSync('index.html', content, 'utf8');
console.log('Successfully expanded Stock In and Stock Out modals to wide spacious dimensions!');
