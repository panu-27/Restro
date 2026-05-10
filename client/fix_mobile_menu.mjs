import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('src/components/TableView.jsx', 'utf8');

const newMobileBlock = `            <div className="flex-1 overflow-y-auto no-scrollbar p-3 bg-white grid grid-cols-1 gap-3 pb-40 auto-rows-max">
              {filteredMenu.map(item => {
                const hasVars = item.variations?.length >= 2;
                const displayItem = item.variations?.length === 1 
                  ? { ...item, name: \`\${item.name} (\${item.variations[0].name})\`, price: item.variations[0].price }
                  : item;

                // ── Grouped Subcategory Card (>= 2 variations) ──
                if (hasVars) {
                  return (
                    <div key={item._id} className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                      {/* TOP: Category Container */}
                      <div className="w-full h-32 bg-slate-50 relative shrink-0 border-b border-slate-100 flex flex-col justify-end">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-slate-200">
                            <ImageIcon size={32} strokeWidth={1} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                        <div className="relative p-3 pb-3 z-10">
                          <p className="text-white font-black text-sm leading-tight drop-shadow-md">{item.name}</p>
                        </div>
                      </div>

                      {/* BOTTOM: Subcategory Rows */}
                      <div className="flex flex-col divide-y divide-slate-100 bg-white">
                        {item.variations.map(v => {
                          const varId = \`\${item._id}_\${v.name}\`;
                          const inCart = activeCurrent.find(i => i.menuId === varId);
                          const qty = inCart ? inCart.qty : 0;
                          return (
                            <div key={v.name} className="flex items-center gap-3 px-3 py-3 hover:bg-slate-50/50 transition-colors">
                              {/* Small rounded image */}
                              {item.image ? (
                                <img src={item.image} className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm border border-slate-100" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[#f4f7fe] flex items-center justify-center shrink-0 border border-slate-100">
                                  <ImageIcon size={14} className="text-slate-300" />
                                </div>
                              )}
                              
                              {/* Subcategory Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-slate-800 truncate">{v.name}</p>
                                <p className="text-[11px] font-black text-slate-500">&#x20B9;{v.price}</p>
                              </div>

                              {/* [-] 0 [+] Quantity Controls */}
                              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                                <button 
                                  onClick={() => !isReadOnly && qty > 0 && removeVariationItem(item, v)} 
                                  disabled={qty === 0 || isReadOnly}
                                  className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90", qty === 0 ? "opacity-30 cursor-not-allowed" : "text-[#1A62FF] bg-white shadow-sm border border-[#1A62FF]/20")}
                                >
                                  <Minus size={16} strokeWidth={3} />
                                </button>
                                <span className={cn("w-6 text-center text-sm font-black transition-all duration-300", qty > 0 ? "text-slate-900 scale-110" : "text-slate-400")}>
                                  {qty}
                                </span>
                                <button 
                                  onClick={() => !isReadOnly && addVariationItem(item, v)} 
                                  disabled={isReadOnly}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white bg-[#1A62FF] shadow-md shadow-[#1A62FF]/20 active:scale-90 transition-all"
                                >
                                  <Plus size={16} strokeWidth={3} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ── Standard Item (0 or 1 variation) ──
                const isSingleVar = item.variations?.length === 1;
                const inCart = activeCurrent.find(i => i.menuId === (isSingleVar ? \`\${item._id}_\${item.variations[0].name}\` : item._id));
                const qty = inCart ? inCart.qty : 0;

                const handleAdd = () => {
                  if (isReadOnly) return;
                  if (isSingleVar) addVariationItem(item, item.variations[0]);
                  else addItem(item);
                };
                const handleRemove = () => {
                  if (isReadOnly) return;
                  if (isSingleVar) removeVariationItem(item, item.variations[0]);
                  else updateQty(item._id, -1);
                };

                return (
                  <div key={item._id} className="flex flex-col relative group border border-slate-200 rounded-2xl overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] bg-white">
                    <div className="relative w-full h-36 bg-[#f4f7fe]">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                          <ImageIcon size={32} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                      <span className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-lg z-10 tracking-wider shadow-sm">&#x20B9;{displayItem.price}</span>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-3 z-10 flex items-end justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className={cn("w-2 h-2 rounded-full shrink-0 shadow-sm", item.category === 'Non-Veg' ? 'bg-rose-500' : item.category === 'Beverage' ? 'bg-amber-400' : item.category === 'Dessert' ? 'bg-purple-400' : 'bg-emerald-500')} />
                            <p className="text-white font-black text-sm leading-tight truncate drop-shadow-md">{displayItem.name}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-white flex justify-end border-t border-slate-100">
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                        <button 
                          onClick={handleRemove} 
                          disabled={qty === 0 || isReadOnly}
                          className={cn("w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-90", qty === 0 ? "opacity-30 cursor-not-allowed" : "text-[#1A62FF] bg-white shadow-sm border border-[#1A62FF]/20")}
                        >
                          <Minus size={18} strokeWidth={3} />
                        </button>
                        <span className={cn("w-6 text-center text-sm font-black transition-all duration-300", qty > 0 ? "text-slate-900 scale-110" : "text-slate-400")}>
                          {qty}
                        </span>
                        <button 
                          onClick={handleAdd} 
                          disabled={isReadOnly}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-white bg-[#1A62FF] shadow-md shadow-[#1A62FF]/20 active:scale-90 transition-all"
                        >
                          <Plus size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>`;

const mobileRegex = /<div className="flex-1 overflow-y-auto no-scrollbar p-3 bg-white grid grid-cols-3 gap-3 pb-40 auto-rows-max">[\s\S]*?(?=\{\/\* Sticky Bottom Bar \*\/})/;

if (mobileRegex.test(code)) {
  code = code.replace(mobileRegex, newMobileBlock);
  writeFileSync('src/components/TableView.jsx', code, 'utf8');
  console.log('Mobile layout successfully replaced!');
} else {
  console.log('Mobile layout regex missed!');
}
