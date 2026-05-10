import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('src/components/TableView.jsx', 'utf8');
let lines = code.split('\n');

const newDesktopBlock = `              <div className="flex flex-col gap-3">
                {filteredMenu.map(item => {
                  const hasVars = item.variations?.length >= 2;
                  const displayItem = item.variations?.length === 1 
                    ? { ...item, name: \`\${item.name} (\${item.variations[0].name})\`, price: item.variations[0].price }
                    : item;

                  // ── Grouped Subcategory Card (>= 2 variations) ──
                  if (hasVars) {
                    return (
                      <div key={item._id} className="flex bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-all duration-300">
                        {/* LEFT: Category Container */}
                        <div className="w-32 sm:w-40 bg-slate-50 relative shrink-0 border-r border-slate-100 flex flex-col justify-end">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-200">
                              <ImageIcon size={32} strokeWidth={1} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                          <div className="relative p-3 pb-4 z-10">
                            <p className="text-white font-black text-sm leading-tight drop-shadow-md">{item.name}</p>
                          </div>
                        </div>

                        {/* RIGHT: Subcategory Rows */}
                        <div className="flex-1 flex flex-col divide-y divide-slate-100 bg-white justify-center">
                          {item.variations.map(v => {
                            const varId = \`\${item._id}_\${v.name}\`;
                            const inCart = activeCurrent.find(i => i.menuId === varId);
                            const qty = inCart ? inCart.qty : 0;
                            return (
                              <div key={v.name} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/50 transition-colors group">
                                {/* Small rounded image */}
                                {item.image ? (
                                  <img src={item.image} className="w-9 h-9 rounded-full object-cover shrink-0 shadow-sm border border-slate-100 group-hover:scale-105 transition-transform" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-[#f4f7fe] flex items-center justify-center shrink-0 border border-slate-100 group-hover:scale-105 transition-transform">
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
                                    className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90", qty === 0 ? "opacity-30 cursor-not-allowed" : "text-[#FF5A36] bg-white shadow-sm border border-[#FF5A36]/20 hover:bg-orange-50")}
                                  >
                                    <Minus size={16} strokeWidth={3} />
                                  </button>
                                  <span className={cn("w-6 text-center text-sm font-black transition-all duration-300", qty > 0 ? "text-slate-900 scale-110" : "text-slate-400")}>
                                    {qty}
                                  </span>
                                  <button 
                                    onClick={() => !isReadOnly && addVariationItem(item, v)} 
                                    disabled={isReadOnly}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white bg-[#FF5A36] shadow-md shadow-[#FF5A36]/20 hover:bg-[#ff4620] transition-all active:scale-90"
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
                    <div key={item._id} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-all duration-300 group">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", item.category === 'Non-Veg' ? 'bg-rose-500' : item.category === 'Beverage' ? 'bg-amber-400' : item.category === 'Dessert' ? 'bg-purple-400' : 'bg-emerald-500')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 leading-snug truncate">{displayItem.name}</p>
                        <p className="text-xs font-black text-slate-500 mt-0.5">&#x20B9;{displayItem.price}</p>
                      </div>
                      
                      <div className="flex items-center shrink-0 ml-2">
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm">
                          <button 
                            onClick={handleRemove} 
                            disabled={qty === 0 || isReadOnly}
                            className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90", qty === 0 ? "opacity-30 cursor-not-allowed" : "text-[#FF5A36] bg-white shadow-sm border border-[#FF5A36]/20 hover:bg-orange-50")}
                          >
                            <Minus size={16} strokeWidth={3} />
                          </button>
                          <span className={cn("w-6 text-center text-sm font-black transition-all duration-300", qty > 0 ? "text-slate-900 scale-110" : "text-slate-400")}>
                            {qty}
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

// Replace lines 954 to 1104
const before = lines.slice(0, 953);
const after = lines.slice(1104);
lines = [...before, newDesktopBlock, ...after];
writeFileSync('src/components/TableView.jsx', lines.join('\n'), 'utf8');
console.log('Fixed Desktop layout syntax error!');
