import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit3, Save, X, Check, ToggleLeft, ToggleRight, Store, Hash, Utensils, CreditCard, Shield, Leaf, Flame, Coffee, IceCream, Search, MapPin, Phone, FileText, Receipt, Percent } from 'lucide-react';

const SettingsPanel = ({ user, subscription, onSettingsUpdate }) => {
  const [activeSection, setActiveSection] = useState('restaurant');

  // Restaurant settings
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [tableCount, setTableCount] = useState(10);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [localAutopay, setLocalAutopay] = useState(subscription?.autopayEnabled);

  useEffect(() => {
    setLocalAutopay(subscription?.autopayEnabled);
  }, [subscription?.autopayEnabled]);

  // Tax config
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxes, setTaxes] = useState([]);

  // Menu management
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuFilter, setMenuFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', category: 'Veg', price: '' });
  const [editItem, setEditItem] = useState({ name: '', category: 'Veg', price: '' });

  useEffect(() => { fetchMenu(); }, []);

  useEffect(() => {
    if (user) {
      setRestaurantName(user.restaurantName || '');
      setRestaurantAddress(user.restaurantAddress || '');
      setRestaurantPhone(user.restaurantPhone || '');
      setGstNumber(user.gstNumber || '');
      setFssaiNumber(user.fssaiNumber || '');
      setTableCount(user.tableCount || 10);
      setTaxEnabled(user.taxEnabled || false);
      setTaxes(user.taxes?.length ? user.taxes : [{ name: 'CGST', percentage: 2.5, enabled: true }, { name: 'SGST', percentage: 2.5, enabled: true }]);
    }
  }, [user]);

  const fetchMenu = async () => {
    try {
      const res = await axios.get('/api/menu');
      setMenuItems(res.data);
    } catch (err) { console.error('Error fetching menu:', err); }
    finally { setMenuLoading(false); }
  };

  const filteredMenu = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase());
      const matchesFilter = menuFilter === 'All' || item.category === menuFilter;
      return matchesSearch && matchesFilter;
    });
  }, [menuItems, menuSearch, menuFilter]);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await axios.patch('/api/settings', { tableCount, restaurantName, restaurantAddress, restaurantPhone, gstNumber, fssaiNumber, taxEnabled, taxes });
      if (onSettingsUpdate) onSettingsUpdate();
    } catch (err) { console.error('Error saving settings:', err); }
    finally { setSettingsSaving(false); }
  };

  const handleCancelAutopay = async () => {
    if (!window.confirm('Are you sure you want to cancel autopay? Your subscription will expire after the current billing cycle.')) return;
    setLocalAutopay(false);
    try {
      await axios.patch('/api/subscription/cancel-autopay');
      if (onSettingsUpdate) onSettingsUpdate();
    } catch (err) {
      setLocalAutopay(true);
      console.error('Error cancelling autopay:', err);
    }
  };

  const handleEnableAutopay = async () => {
    if (!window.confirm('Enable autopay to keep your subscription active?')) return;
    setLocalAutopay(true);
    try {
      await axios.patch('/api/subscription/enable-autopay');
      if (onSettingsUpdate) onSettingsUpdate();
    } catch (err) {
      setLocalAutopay(false);
      console.error('Error enabling autopay:', err);
    }
  };

  // Tax handlers
  const addTax = () => setTaxes(prev => [...prev, { name: '', percentage: 0, enabled: true }]);
  const removeTax = (i) => setTaxes(prev => prev.filter((_, idx) => idx !== i));
  const updateTax = (i, field, val) => setTaxes(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));

  // Menu handlers
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    try {
      await axios.post('/api/menu', { ...newItem, price: parseFloat(newItem.price) });
      setNewItem({ name: '', category: 'Veg', price: '' });
      setShowAddForm(false);
      fetchMenu();
    } catch (err) { console.error('Error adding item:', err); }
  };

  const handleEditItem = async (id) => {
    try {
      await axios.patch(`/api/menu/${id}`, { ...editItem, price: parseFloat(editItem.price) });
      setEditingId(null);
      fetchMenu();
    } catch (err) { console.error('Error editing item:', err); }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this menu item?')) return;
    try { await axios.delete(`/api/menu/${id}`); fetchMenu(); }
    catch (err) { console.error('Error deleting item:', err); }
  };

  const handleToggleItem = async (id) => {
    try { await axios.patch(`/api/menu/${id}/toggle`); fetchMenu(); }
    catch (err) { console.error('Error toggling item:', err); }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setEditItem({ name: item.name, category: item.category, price: item.price });
  };

  const categoryIcon = (cat) => {
    switch (cat) {
      case 'Veg': return <Leaf size={14} className="text-emerald-500" />;
      case 'Non-Veg': return <Flame size={14} className="text-rose-500" />;
      case 'Beverage': return <Coffee size={14} className="text-amber-500" />;
      case 'Dessert': return <IceCream size={14} className="text-purple-500" />;
      default: return <Utensils size={14} className="text-gray-400" />;
    }
  };

  const sections = [
    { id: 'restaurant', icon: Store, label: 'Restaurant' },
    { id: 'taxes', icon: Percent, label: 'Taxes' },
    { id: 'menu', icon: Utensils, label: 'Menu Builder' },
    { id: 'billing', icon: CreditCard, label: 'Subscription' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Settings</h1>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Manage your restaurant profile, taxes, menu, and subscription.</p>
      </header>

      {/* Section Tabs */}
      <div className="flex gap-3 flex-wrap">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 ${
              activeSection === s.id ? 'bg-arche-text text-white shadow-lg shadow-arche-text/15' : 'bg-white text-gray-400 border border-gray-100 hover:text-arche-text hover:border-gray-200'
            }`}>
            <s.icon size={18} /><span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* ===================== RESTAURANT SECTION ===================== */}
      {activeSection === 'restaurant' && (
        <div className="bg-white border border-gray-50 rounded-[2.5rem] p-10 shadow-sm space-y-8 animate-in fade-in duration-300">
          <div>
            <h3 className="text-xl font-black text-arche-text mb-1">Restaurant Profile</h3>
            <p className="text-sm text-gray-400 font-medium">This info appears on your bills and receipts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingsInput icon={Store} label="Restaurant Name" value={restaurantName} onChange={setRestaurantName} placeholder="My Restaurant" />
            <SettingsInput icon={Phone} label="Phone Number" value={restaurantPhone} onChange={setRestaurantPhone} placeholder="+91 9876543210" />
            <div className="md:col-span-2">
              <SettingsInput icon={MapPin} label="Full Address" value={restaurantAddress} onChange={setRestaurantAddress} placeholder="123, Main Road, City - 411001" />
            </div>
            <SettingsInput icon={FileText} label="GST Number (GSTIN)" value={gstNumber} onChange={setGstNumber} placeholder="22AAAAA0000A1Z5" />
            <SettingsInput icon={FileText} label="FSSAI License No." value={fssaiNumber} onChange={setFssaiNumber} placeholder="12345678901234" />
          </div>



          <div className="flex justify-end pt-4">
            <button onClick={handleSaveSettings} disabled={settingsSaving}
              className="bg-arche-text text-white px-10 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-arche-text/10 active:scale-95 disabled:opacity-50">
              {settingsSaving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}

      {/* ===================== TAX SECTION ===================== */}
      {activeSection === 'taxes' && (
        <div className="bg-white border border-gray-50 rounded-[2.5rem] p-10 shadow-sm space-y-8 animate-in fade-in duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black text-arche-text mb-1">Tax Configuration</h3>
              <p className="text-sm text-gray-400 font-medium">
                {taxEnabled 
                  ? 'Taxes will be added on top of item prices automatically.'
                  : 'Taxes are OFF — prices are treated as inclusive (owner absorbs tax).'
                }
              </p>
            </div>
            <button onClick={() => { setTaxEnabled(!taxEnabled); }}
              className="transition-all shrink-0 mt-1">
              {taxEnabled ? <ToggleRight size={40} className="text-arche-blue-deep" /> : <ToggleLeft size={40} className="text-gray-300" />}
            </button>
          </div>

          {taxEnabled && (
            <div className="space-y-4">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Tax Entries</div>
              {taxes.map((tax, i) => (
                <div key={i} className="flex items-center gap-4 bg-gray-50/50 rounded-2xl p-4">
                  <button onClick={() => updateTax(i, 'enabled', !tax.enabled)} className="shrink-0">
                    {tax.enabled ? <ToggleRight size={28} className="text-arche-blue-deep" /> : <ToggleLeft size={28} className="text-gray-300" />}
                  </button>
                  <input type="text" value={tax.name} onChange={(e) => updateTax(i, 'name', e.target.value)}
                    placeholder="Tax Name (e.g. CGST)"
                    className="flex-1 bg-white border border-gray-100 rounded-full py-2.5 px-4 text-sm font-bold focus:outline-none focus:border-arche-blue-deep text-arche-text" />
                  <div className="relative w-28">
                    <input type="number" value={tax.percentage} onChange={(e) => updateTax(i, 'percentage', parseFloat(e.target.value) || 0)}
                      step="0.5" min="0" max="50"
                      className="w-full bg-white border border-gray-100 rounded-full py-2.5 px-4 pr-8 text-sm font-black focus:outline-none focus:border-arche-blue-deep text-arche-text" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">%</span>
                  </div>
                  <button onClick={() => removeTax(i)} className="text-gray-300 hover:text-rose-500 transition-colors p-2">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button onClick={addTax}
                className="bg-arche-blue-deep/5 text-arche-blue-deep px-5 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-arche-blue-deep/10 transition-all">
                <Plus size={16} /> Add Tax
              </button>

              {/* Tax preview */}
              <div className="bg-gray-50/50 rounded-2xl p-6 mt-4">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Preview (on ₹100 order)</div>
                {taxes.filter(t => t.enabled).map((t, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="text-gray-500">{t.name} ({t.percentage}%)</span>
                    <span className="font-bold">₹{(100 * t.percentage / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-black text-arche-text pt-2 mt-2 border-t border-gray-200">
                  <span>Total on ₹100</span>
                  <span>₹{(100 + taxes.filter(t => t.enabled).reduce((s, t) => s + t.percentage, 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button onClick={handleSaveSettings} disabled={settingsSaving}
              className="bg-arche-text text-white px-10 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-arche-text/10 active:scale-95 disabled:opacity-50">
              {settingsSaving ? 'Saving...' : <><Save size={18} /> Save Tax Settings</>}
            </button>
          </div>
        </div>
      )}

      {/* ===================== MENU BUILDER SECTION ===================== */}
      {activeSection === 'menu' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-arche-blue-deep transition-colors" size={18} />
              <input type="text" placeholder="Search menu items..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-full py-4 pl-14 pr-6 focus:outline-none focus:border-arche-blue-deep transition-all font-medium text-arche-text shadow-sm" />
            </div>
            <div className="flex gap-2">
              {['All', 'Veg', 'Non-Veg', 'Beverage', 'Dessert'].map(cat => (
                <button key={cat} onClick={() => setMenuFilter(cat)}
                  className={`px-5 py-3 rounded-full text-xs font-bold transition-all ${
                    menuFilter === cat ? 'bg-arche-text text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100 hover:text-arche-text'
                  }`}>{cat}</button>
              ))}
            </div>
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="bg-arche-blue-deep text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-arche-blue-light transition-all shadow-lg shadow-arche-blue-deep/20 active:scale-95">
              <Plus size={18} /> Add Item
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddItem} className="bg-white border border-gray-50 rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row gap-4 items-end animate-in slide-in-from-top-4 duration-300">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Item Name</label>
                <input type="text" required value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Paneer Tikka"
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-full py-3 px-5 focus:outline-none focus:border-arche-blue-deep transition-all font-medium text-arche-text" />
              </div>
              <div className="w-40 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Category</label>
                <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-full py-3 px-5 focus:outline-none focus:border-arche-blue-deep transition-all font-bold text-arche-text appearance-none cursor-pointer">
                  <option value="Veg">Veg</option><option value="Non-Veg">Non-Veg</option><option value="Beverage">Beverage</option><option value="Dessert">Dessert</option>
                </select>
              </div>
              <div className="w-32 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Price (₹)</label>
                <input type="number" required min="1" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} placeholder="₹0"
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-full py-3 px-5 focus:outline-none focus:border-arche-blue-deep transition-all font-bold text-arche-text" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-arche-text text-white p-3 rounded-full hover:bg-black transition-all shadow-md active:scale-95"><Check size={20} /></button>
                <button type="button" onClick={() => setShowAddForm(false)} className="bg-gray-100 text-gray-400 p-3 rounded-full hover:text-rose-500 hover:bg-rose-50 transition-all"><X size={20} /></button>
              </div>
            </form>
          )}

          <div className="bg-white border border-gray-50 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              <div className="col-span-1">Status</div><div className="col-span-4">Item Name</div><div className="col-span-2">Category</div><div className="col-span-2">Price</div><div className="col-span-3 text-right">Actions</div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {menuLoading ? (
                <div className="p-12 text-center text-gray-300 font-bold animate-pulse">Loading menu...</div>
              ) : filteredMenu.length === 0 ? (
                <div className="p-12 text-center text-gray-300 font-bold">No items found</div>
              ) : (
                filteredMenu.map((item) => (
                  <div key={item._id} className="grid grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-gray-50/50 transition-all group">
                    <div className="col-span-1">
                      <button onClick={() => handleToggleItem(item._id)} className="transition-all">
                        {item.isAvailable ? <ToggleRight size={28} className="text-arche-blue-deep" /> : <ToggleLeft size={28} className="text-gray-300" />}
                      </button>
                    </div>
                    <div className="col-span-4">
                      {editingId === item._id ? (
                        <input value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 px-4 text-sm font-bold focus:outline-none focus:border-arche-blue-deep" />
                      ) : (
                        <span className={`font-bold text-sm ${item.isAvailable ? 'text-arche-text' : 'text-gray-300 line-through'}`}>{item.name}</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {editingId === item._id ? (
                        <select value={editItem.category} onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                          className="bg-gray-50 border border-gray-200 rounded-full py-2 px-3 text-xs font-bold focus:outline-none focus:border-arche-blue-deep appearance-none">
                          <option value="Veg">Veg</option><option value="Non-Veg">Non-Veg</option><option value="Beverage">Beverage</option><option value="Dessert">Dessert</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500">{categoryIcon(item.category)} {item.category}</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {editingId === item._id ? (
                        <input type="number" value={editItem.price} onChange={(e) => setEditItem({ ...editItem, price: e.target.value })}
                          className="w-24 bg-gray-50 border border-gray-200 rounded-full py-2 px-4 text-sm font-black focus:outline-none focus:border-arche-blue-deep" />
                      ) : (
                        <span className="font-black text-arche-text">₹{item.price}</span>
                      )}
                    </div>
                    <div className="col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId === item._id ? (
                        <>
                          <button onClick={() => handleEditItem(item._id)} className="bg-arche-text text-white p-2.5 rounded-xl hover:bg-black transition-all shadow-sm"><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="bg-gray-100 text-gray-400 p-2.5 rounded-xl hover:text-rose-500 hover:bg-rose-50 transition-all"><X size={16} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(item)} className="bg-gray-50 text-gray-400 p-2.5 rounded-xl hover:text-arche-blue-deep hover:bg-arche-blue-light/10 transition-all"><Edit3 size={16} /></button>
                          <button onClick={() => handleDeleteItem(item._id)} className="bg-gray-50 text-gray-400 p-2.5 rounded-xl hover:text-rose-500 hover:bg-rose-50 transition-all"><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-8 py-4 bg-gray-50/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">{filteredMenu.length} items</span>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">{menuItems.filter(i => i.isAvailable).length} available / {menuItems.filter(i => !i.isAvailable).length} hidden</span>
            </div>
          </div>
        </div>
      )}

      {/* ===================== BILLING SECTION ===================== */}
      {activeSection === 'billing' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-50 rounded-[2.5rem] p-10 shadow-sm">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-arche-text mb-1">Current Plan</h3>
                <p className="text-sm text-gray-400 font-medium">Manage your subscription and billing details.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider ${
                  subscription?.isValid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'
                }`}>
                  {subscription?.isValid ? 'Active' : subscription?.status || 'None'}
                </div>
                {localAutopay ? (
                  <button onClick={handleCancelAutopay} className="bg-rose-50 text-rose-500 px-4 py-2 rounded-full text-xs font-black hover:bg-rose-100 transition-colors uppercase tracking-wider">
                    Cancel Autopay
                  </button>
                ) : (
                  subscription?.status === 'active' && (
                    <button onClick={handleEnableAutopay} className="bg-arche-blue-light/10 text-arche-blue-deep px-4 py-2 rounded-full text-xs font-black hover:bg-arche-blue-light/20 transition-colors uppercase tracking-wider">
                      Enable Autopay
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50/50 rounded-[2rem] p-6 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Plan</div>
                <div className="text-2xl font-black text-arche-text capitalize">{subscription?.plan || 'None'}</div>
              </div>
              <div className="bg-gray-50/50 rounded-[2rem] p-6 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">
                  {subscription?.plan === 'trial' ? 'Trial Days Left' : 'Monthly Cost'}
                </div>
                <div className="text-2xl font-black text-arche-blue-deep">
                  {subscription?.plan === 'trial' ? `${subscription?.trialDaysRemaining ?? 0} days` : `₹${subscription?.amount ?? 0}`}
                </div>
              </div>
              <div className="bg-gray-50/50 rounded-[2rem] p-6 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Autopay</div>
                <div className="text-2xl font-black text-arche-text">
                  {subscription?.autopayEnabled ? <span className="flex items-center justify-center gap-2"><Shield size={20} className="text-emerald-500" /> Enabled</span> : <span className="text-gray-300">Off</span>}
                </div>
              </div>
            </div>
            {subscription?.trialEndDate && (
              <div className="mt-6 text-xs text-gray-400 font-bold text-center">
                Trial period: {new Date(subscription.trialStartDate).toLocaleDateString('en-IN')} → {new Date(subscription.trialEndDate).toLocaleDateString('en-IN')}
              </div>
            )}
          </div>

          {subscription?.paymentHistory?.length > 0 && (
            <div className="bg-white border border-gray-50 rounded-[2.5rem] p-10 shadow-sm">
              <h3 className="text-xl font-black text-arche-text mb-6">Payment History</h3>
              <div className="space-y-3">
                {subscription.paymentHistory.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50/50 rounded-2xl px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${p.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <div>
                        <div className="text-sm font-bold text-arche-text capitalize">{p.method?.replace('_', ' ')}</div>
                        <div className="text-[10px] font-bold text-gray-400">{new Date(p.date).toLocaleDateString('en-IN')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-arche-text">₹{p.amount}</span>
                      <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${p.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Reusable input component
const SettingsInput = ({ icon: Icon, label, value, onChange, placeholder }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">{label}</label>
    <div className="relative">
      <Icon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-gray-50/50 border border-gray-100 rounded-full py-4 pl-14 pr-6 focus:outline-none focus:border-arche-blue-deep transition-all font-medium text-arche-text" />
    </div>
  </div>
);

export default SettingsPanel;
