import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('src/components/TableView.jsx', 'utf8');

// 1. Add state
if (!code.includes('selectedItemForVars')) {
  code = code.replace(
    "const [paymentMode, setPaymentMode] = useState('Online');",
    "const [paymentMode, setPaymentMode] = useState('Online');\n  const [selectedItemForVars, setSelectedItemForVars] = useState(null);"
  );
}

// 2. Desktop Block Replacement
const newDesktopBlock = `              <div className="flex flex-col gap-3">
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
                    <div key={item._id} onClick={handleAdd} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-all duration-300 group cursor-pointer">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", item.category === 'Non-Veg' ? 'bg-rose-500' : item.category === 'Beverage' ? 'bg-amber-400' : item.category === 'Dessert' ? 'bg-purple-400' : 'bg-emerald-500')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 leading-snug truncate">{displayItem.name}</p>
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

const desktopRegex = /<div className="flex flex-col gap-3">\s*\{filteredMenu\.map\(item => \{[\s\S]*?\}\)\}\s*<\/div>/;
code = code.replace(desktopRegex, newDesktopBlock);

// 3. Mobile Block Replacement
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
                        <span className="absolute top-2 left-2 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">Options</span>
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

const mobileRegex = /<div className="flex-1 overflow-y-auto no-scrollbar p-3 bg-white grid grid-cols-1 gap-3 pb-40 auto-rows-max">[\s\S]*?(?=\{\/\* Sticky Bottom Bar \*\/})/;
code = code.replace(mobileRegex, newMobileBlock);

// 4. Inject Variation Modal at the end
const variationModalJSX = `
      {/* Variation Options Modal */}
      {selectedItemForVars && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity">
          <div className="bg-white w-full sm:w-[400px] max-h-[85vh] sm:rounded-3xl rounded-t-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50 sm:rounded-t-3xl rounded-t-3xl">
              <div>
                <h3 className="text-lg font-black text-slate-800">{selectedItemForVars.name}</h3>
                <p className="text-xs font-semibold text-slate-500">Choose your portion</p>
              </div>
              <button 
                onClick={() => setSelectedItemForVars(null)}
                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex flex-col divide-y divide-slate-100">
                {selectedItemForVars.variations?.map(v => {
                  const varId = \`\${selectedItemForVars._id}_\${v.name}\`;
                  const inCart = activeCurrent.find(i => i.menuId === varId);
                  const qty = inCart ? inCart.qty : 0;
                  return (
                    <div key={v.name} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors group">
                      <div className="flex-1 pr-4">
                        <p className={cn("text-[15px] font-bold text-slate-800", inCart && "text-[#1A62FF]")}>{v.name}</p>
                        <p className="text-[13px] font-black text-slate-500 mt-0.5">&#x20B9;{v.price}</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                        <button 
                          onClick={() => !isReadOnly && qty > 0 && removeVariationItem(selectedItemForVars, v)} 
                          disabled={qty === 0 || isReadOnly}
                          className={cn("w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-90", qty === 0 ? "opacity-30 cursor-not-allowed" : "text-[#1A62FF] bg-white shadow-sm border border-[#1A62FF]/20")}
                        >
                          <Minus size={18} strokeWidth={3} />
                        </button>
                        <span className={cn("w-7 text-center text-[15px] font-black transition-all duration-300", qty > 0 ? "text-slate-900 scale-110" : "text-slate-400")}>
                          {qty}
                        </span>
                        <button 
                          onClick={() => !isReadOnly && addVariationItem(selectedItemForVars, v)} 
                          disabled={isReadOnly}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-white bg-[#1A62FF] shadow-md shadow-[#1A62FF]/20 active:scale-90 transition-all"
                        >
                          <Plus size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white sm:rounded-b-3xl">
              <button 
                onClick={() => setSelectedItemForVars(null)}
                className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-transform"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
`;

if (!code.includes('{selectedItemForVars && (')) {
  // Inject before the final closing div of the component
  const finalDivRegex = /(<\/div>\s*)$/;
  code = code.replace(finalDivRegex, variationModalJSX + '\n$1');
}

writeFileSync('src/components/TableView.jsx', code, 'utf8');
console.log('UI refactored!');
