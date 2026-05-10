import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('src/components/TableView.jsx', 'utf8');
let lines = code.split('\n');

// 1. Find Desktop map bounds
let dStart = -1;
let dEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<div className="flex flex-col gap-3">')) {
    dStart = i;
    let openCount = 1;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].includes('<div')) openCount++;
      if (lines[j].includes('</div')) openCount--;
      if (openCount === 0) {
        dEnd = j;
        break;
      }
    }
    break;
  }
}

console.log('Desktop bounds:', dStart, dEnd);

const newDesktopBlock = `              <div className="flex flex-col gap-3">
                {filteredMenu.map(item => {
                  const hasVars = item.variations?.length >= 2;
                  const isSingleVar = item.variations?.length === 1;
                  const displayItem = isSingleVar 
                    ? { ...item, name: \`\${item.name} (\${item.variations[0].name})\`, price: item.variations[0].price }
                    : item;

                  const inCartItems = activeCurrent.filter(i => i.menuId === item._id || i.menuId.startsWith(\`\${item._id}_\`));
                  const totalQty = inCartItems.reduce((acc, i) => acc + i.qty, 0);

                  const handleAdd = (e) => {
                    e?.stopPropagation();
                    if (isReadOnly) return;
                    if (hasVars) {
                      setSelectedItemForVars(item);
                    } else if (isSingleVar) {
                      addVariationItem(item, item.variations[0]);
                    } else {
                      addItem(item);
                    }
                  };

                  const handleRemove = (e) => {
                    e?.stopPropagation();
                    if (isReadOnly) return;
                    if (hasVars) {
                      setSelectedItemForVars(item);
                    } else if (isSingleVar) {
                      removeVariationItem(item, item.variations[0]);
                    } else {
                      updateQty(item._id, -1);
                    }
                  };

                  return (
                    <div key={item._id} onClick={handleAdd} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-all duration-300 group cursor-pointer">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", item.category === 'Non-Veg' ? 'bg-rose-500' : item.category === 'Beverage' ? 'bg-amber-400' : item.category === 'Dessert' ? 'bg-purple-400' : 'bg-emerald-500')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800 leading-snug truncate">{displayItem.name}</p>
                          {hasVars && <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-indigo-100 uppercase tracking-wider">Options</span>}
                        </div>
                        <p className="text-xs font-black text-slate-500 mt-0.5">&#x20B9;{displayItem.price}</p>
                      </div>
                      
                      <div className="flex items-center shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm">
                          <button 
                            onClick={handleRemove} 
                            disabled={totalQty === 0 || isReadOnly}
                            className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90", totalQty === 0 ? "opacity-30 cursor-not-allowed" : "text-[#FF5A36] bg-white shadow-sm border border-[#FF5A36]/20 hover:bg-orange-50")}
                          >
                            <Minus size={16} strokeWidth={3} />
                          </button>
                          <span className={cn("w-6 text-center text-sm font-black transition-all duration-300", totalQty > 0 ? "text-slate-900 scale-110" : "text-slate-400")}>
                            {totalQty}
                          </span>
                          <button 
                            onClick={handleAdd} 
                            disabled={isReadOnly}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-white bg-[#FF5A36] shadow-md shadow-[#FF5A36]/20 hover:bg-[#ff4620] transition-all active:scale-90"
                          >
                            <Plus size={16} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>`;

if (dStart !== -1 && dEnd !== -1) {
  lines.splice(dStart, dEnd - dStart + 1, newDesktopBlock);
  console.log('Spliced desktop block');
}

// Write back to code string to evaluate mobile block
code = lines.join('\n');
lines = code.split('\n');

// 2. Find Mobile map bounds
let mStart = -1;
let mEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<div className="flex-1 overflow-y-auto no-scrollbar p-3 bg-white grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-40 auto-rows-max">')) {
    mStart = i;
    let openCount = 1;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].includes('<div')) openCount++;
      if (lines[j].includes('</div')) openCount--;
      if (openCount === 0) {
        mEnd = j;
        break;
      }
    }
    break;
  }
}

console.log('Mobile bounds:', mStart, mEnd);

const newMobileBlock = `            <div className="flex-1 overflow-y-auto no-scrollbar p-3 bg-white grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-40 auto-rows-max">
              {filteredMenu.map(item => {
                const hasVars = item.variations?.length >= 2;
                const isSingleVar = item.variations?.length === 1;
                const displayItem = isSingleVar 
                  ? { ...item, name: \`\${item.name} (\${item.variations[0].name})\`, price: item.variations[0].price }
                  : item;

                // Total quantity of this item (including all variations)
                const inCartItems = activeCurrent.filter(i => i.menuId === item._id || i.menuId.startsWith(\`\${item._id}_\`));
                const totalQty = inCartItems.reduce((acc, i) => acc + i.qty, 0);

                const handleAdd = (e) => {
                  e?.stopPropagation();
                  if (isReadOnly) return;
                  if (hasVars) {
                    setSelectedItemForVars(item);
                  } else if (isSingleVar) {
                    addVariationItem(item, item.variations[0]);
                  } else {
                    addItem(item);
                  }
                };

                const handleRemove = (e) => {
                  e?.stopPropagation();
                  if (isReadOnly) return;
                  if (hasVars) {
                    setSelectedItemForVars(item);
                  } else if (isSingleVar) {
                    removeVariationItem(item, item.variations[0]);
                  } else {
                    updateQty(item._id, -1);
                  }
                };

                return (
                  <div key={item._id} onClick={handleAdd} className="flex flex-col relative group border border-slate-200 rounded-2xl overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] bg-white cursor-pointer active:scale-[0.98] transition-transform">
                    <div className="relative w-full h-32 bg-[#f4f7fe]">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                          <ImageIcon size={32} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                      <span className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-lg z-10 tracking-wider shadow-sm">&#x20B9;{displayItem.price}</span>
                      
                      {hasVars && (
                        <span className="absolute top-2 left-2 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm tracking-wider uppercase">Options</span>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-3 z-10 flex items-end justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className={cn("w-2 h-2 rounded-full shrink-0 shadow-sm", item.category === 'Non-Veg' ? 'bg-rose-500' : item.category === 'Beverage' ? 'bg-amber-400' : item.category === 'Dessert' ? 'bg-purple-400' : 'bg-emerald-500')} />
                            <p className="text-white font-black text-sm leading-tight truncate drop-shadow-md">{displayItem.name}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2.5 bg-white flex justify-end border-t border-slate-100" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                        <button 
                          onClick={handleRemove} 
                          disabled={totalQty === 0 || isReadOnly}
                          className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90", totalQty === 0 ? "opacity-30 cursor-not-allowed" : "text-[#1A62FF] bg-white shadow-sm border border-[#1A62FF]/20")}
                        >
                          <Minus size={16} strokeWidth={3} />
                        </button>
                        <span className={cn("w-6 text-center text-sm font-black transition-all duration-300", totalQty > 0 ? "text-slate-900 scale-110" : "text-slate-400")}>
                          {totalQty}
                        </span>
                        <button 
                          onClick={handleAdd} 
                          disabled={isReadOnly}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-white bg-[#1A62FF] shadow-md shadow-[#1A62FF]/20 active:scale-90 transition-all"
                        >
                          <Plus size={16} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>`;

if (mStart !== -1 && mEnd !== -1) {
  lines.splice(mStart, mEnd - mStart + 1, newMobileBlock);
  console.log('Spliced mobile block');
}

writeFileSync('src/components/TableView.jsx', lines.join('\n'), 'utf8');
console.log('Syntax errors resolved. Clean blocks spliced.');
