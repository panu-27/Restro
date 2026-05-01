import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit3, Save, X, Check, ToggleLeft, ToggleRight, Store, Hash, Utensils, CreditCard, Shield, Leaf, Flame, Coffee, IceCream, Search, MapPin, Phone, FileText, Receipt, Percent, Users, Eye, EyeOff, ChefHat, UserPlus, Key, LogOut } from 'lucide-react';

const DEFAULT_MENU_CATEGORIES = ['Veg', 'Non-Veg', 'Beverage', 'Dessert'];

const SettingsPanel = ({ user, subscription, onSettingsUpdate, onShowPassword, onLogout }) => {
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
  const [menuCategories, setMenuCategories] = useState(DEFAULT_MENU_CATEGORIES);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItem, setNewItem] = useState({ name: '', category: DEFAULT_MENU_CATEGORIES[0], price: '' });
  const [editItem, setEditItem] = useState({ name: '', category: DEFAULT_MENU_CATEGORIES[0], price: '' });

  useEffect(() => { fetchMenu(); }, []);

  // Staff management
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', mobileNumber: '', password: '', role: 'Waiter' });
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [editStaff, setEditStaff] = useState({ name: '', mobileNumber: '', password: '' });
  const [showStaffPw, setShowStaffPw] = useState({});
  const [staffError, setStaffError] = useState('');

  const fetchStaff = async () => {
    setStaffLoading(true);
    try {
      const res = await axios.get('/api/staff');
      setStaffList(res.data);
    } catch (err) { console.error('Error fetching staff:', err); }
    finally { setStaffLoading(false); }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

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
      setMenuCategories(user.menuCategories?.length ? user.menuCategories : DEFAULT_MENU_CATEGORIES);
    }
  }, [user]);

  const categoryOptions = useMemo(() => {
    const fromItems = [...new Set(menuItems.map(item => item.category).filter(Boolean))];
    const merged = [...new Set([...(menuCategories || []), ...fromItems])];
    return merged.length ? merged : DEFAULT_MENU_CATEGORIES;
  }, [menuCategories, menuItems]);

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
      await axios.patch('/api/settings', { tableCount, restaurantName, restaurantAddress, restaurantPhone, gstNumber, fssaiNumber, taxEnabled, taxes, menuCategories: categoryOptions });
      if (onSettingsUpdate) onSettingsUpdate();
    } catch (err) { console.error('Error saving settings:', err); }
    finally { setSettingsSaving(false); }
  };

  const handleAddCategory = () => {
    const value = newCategoryName.trim();
    if (!value) return;
    if (menuCategories.some(c => c.toLowerCase() === value.toLowerCase())) {
      setNewCategoryName('');
      return;
    }
    setMenuCategories(prev => [...prev, value]);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (categoryName) => {
    if (categoryOptions.length <= 1) {
      alert('At least one category is required.');
      return;
    }
    const inUse = menuItems.some(item => item.category === categoryName);
    if (inUse) {
      alert(`"${categoryName}" is used by existing menu items. Reassign or delete those items first.`);
      return;
    }
    setMenuCategories(prev => prev.filter(c => c !== categoryName));
    if (menuFilter === categoryName) setMenuFilter('All');
    if (newItem.category === categoryName) setNewItem(prev => ({ ...prev, category: categoryOptions[0] || DEFAULT_MENU_CATEGORIES[0] }));
    if (editItem.category === categoryName) setEditItem(prev => ({ ...prev, category: categoryOptions[0] || DEFAULT_MENU_CATEGORIES[0] }));
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
      setNewItem({ name: '', category: categoryOptions[0] || DEFAULT_MENU_CATEGORIES[0], price: '' });
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
    { id: 'staff', icon: Users, label: 'Staff' },
  ];

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-8 space-y-5 lg:space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-lg lg:text-[1.7rem] font-black text-slate-900 tracking-tight uppercase">Settings</h1>
          <p className="text-[8px] lg:text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-1">Manage your restaurant profile, taxes, menu, and subscription.</p>
        </div>
        <div className="flex gap-2">
          {onShowPassword && (
            <button onClick={onShowPassword} className="p-2.5 lg:px-4 lg:py-2.5 bg-white border border-gray-100 rounded-xl lg:rounded-2xl flex items-center gap-2 hover:border-orange-200 hover:text-orange-500 hover:bg-orange-50 transition-all shadow-sm text-gray-500" title="Change Password">
              <Key size={16} />
              <span className="hidden lg:block text-xs font-black uppercase tracking-widest">Password</span>
            </button>
          )}
          {onLogout && (
            <button onClick={onLogout} className="p-2.5 lg:px-4 lg:py-2.5 bg-white border border-gray-100 rounded-xl lg:rounded-2xl flex items-center gap-2 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm text-gray-500" title="Logout">
              <LogOut size={16} />
              <span className="hidden lg:block text-xs font-black uppercase tracking-widest">Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* Section Tabs */}
      <div className="flex gap-2 lg:gap-3 overflow-x-auto no-scrollbar pb-2 lg:pb-0 w-full">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 lg:gap-3 px-4 lg:px-6 py-2.5 lg:py-3 rounded-full font-bold text-xs lg:text-sm transition-all duration-300 shrink-0 ${
              activeSection === s.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15' : 'bg-white text-gray-400 border border-gray-100 hover:text-slate-900 hover:border-gray-200'
            }`}>
            <s.icon size={16} className="lg:w-[18px] lg:h-[18px]" /><span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* ===================== RESTAURANT SECTION ===================== */}
      {activeSection === 'restaurant' && (
        <div className="bg-white border border-gray-50 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-10 shadow-sm space-y-6 lg:space-y-8 animate-in fade-in duration-300">
          <div>
            <h3 className="text-xl font-black text-slate-900 mb-1">Restaurant Profile</h3>
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
              className="bg-[#FF5A36] hover:bg-orange-600 text-white px-8 lg:px-10 py-3.5 lg:py-4 rounded-full font-black flex items-center gap-2 transition-all shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 text-sm tracking-widest uppercase">
              {settingsSaving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}

      {/* ===================== TAX SECTION ===================== */}
      {activeSection === 'taxes' && (
        <div className="bg-white border border-gray-50 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-10 shadow-sm space-y-6 lg:space-y-8 animate-in fade-in duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-1">Tax Configuration</h3>
              <p className="text-sm text-gray-400 font-medium">
                {taxEnabled 
                  ? 'Taxes will be added on top of item prices automatically.'
                  : 'Taxes are OFF — prices are treated as inclusive (owner absorbs tax).'
                }
              </p>
            </div>
            <button onClick={() => { setTaxEnabled(!taxEnabled); }}
              className="transition-all shrink-0 mt-1">
              {taxEnabled ? <ToggleRight size={40} className="text-[#FF5A36]" /> : <ToggleLeft size={40} className="text-gray-300" />}
            </button>
          </div>

          {taxEnabled && (
            <div className="space-y-4">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Tax Entries</div>
              {taxes.map((tax, i) => (
                <div key={i} className="flex items-center flex-wrap gap-3 lg:gap-4 bg-gray-50/50 rounded-2xl p-4">
                  <button onClick={() => updateTax(i, 'enabled', !tax.enabled)} className="shrink-0">
                    {tax.enabled ? <ToggleRight size={28} className="text-[#FF5A36]" /> : <ToggleLeft size={28} className="text-gray-300" />}
                  </button>
                  <input type="text" value={tax.name} onChange={(e) => updateTax(i, 'name', e.target.value)}
                    placeholder="Tax Name (e.g. CGST)"
                    className="flex-1 min-w-[120px] bg-white border border-gray-100 rounded-full py-2.5 px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 text-slate-900" />
                  <div className="relative w-24 lg:w-28">
                    <input type="number" value={tax.percentage} onChange={(e) => updateTax(i, 'percentage', parseFloat(e.target.value) || 0)}
                      step="0.5" min="0" max="50"
                      className="w-full bg-white border border-gray-100 rounded-full py-2.5 px-4 pr-8 text-sm font-black focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 text-slate-900" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs lg:text-sm">%</span>
                  </div>
                  <button onClick={() => removeTax(i)} className="text-gray-300 hover:text-rose-500 transition-colors p-2 shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button onClick={addTax}
                className="bg-orange-50 text-[#FF5A36] px-5 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-orange-500/10 transition-all">
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
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 mt-2 border-t border-gray-200">
                  <span>Total on ₹100</span>
                  <span>₹{(100 + taxes.filter(t => t.enabled).reduce((s, t) => s + t.percentage, 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button onClick={handleSaveSettings} disabled={settingsSaving}
              className="bg-[#FF5A36] hover:bg-orange-600 text-white px-8 lg:px-10 py-3.5 lg:py-4 rounded-full font-black flex items-center gap-2 transition-all shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 text-sm tracking-widest uppercase">
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
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#FF5A36] transition-colors" size={18} />
              <input type="text" placeholder="Search menu items..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-full py-4 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all font-medium text-slate-900 shadow-sm" />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0 shrink-0">
              {['All', ...categoryOptions].map(cat => (
                <button key={cat} onClick={() => setMenuFilter(cat)}
                  className={`px-4 lg:px-5 py-2.5 lg:py-3 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    menuFilter === cat ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100 hover:text-slate-900'
                  }`}>{cat}</button>
              ))}
            </div>
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="bg-emerald-500 text-white px-4 lg:px-6 py-2.5 lg:py-3 rounded-full font-bold text-xs lg:text-sm flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 active:scale-95 shrink-0">
              <Plus size={16} strokeWidth={3} /> Add Item
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddItem} className="bg-white border border-gray-50 rounded-3xl lg:rounded-[2rem] p-6 lg:p-8 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-end animate-in slide-in-from-top-4 duration-300">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Item Name</label>
                <input type="text" required value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Paneer Tikka"
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-full py-3 px-5 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all font-medium text-slate-900" />
              </div>
              <div className="w-full md:w-40 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Category</label>
                <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-full py-3 px-5 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all font-bold text-slate-900 appearance-none cursor-pointer">
                  {categoryOptions.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-32 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Price (₹)</label>
                <input type="number" required min="1" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} placeholder="₹0"
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-full py-3 px-5 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all font-bold text-slate-900" />
              </div>
              <div className="flex justify-end gap-2 mt-2 md:mt-0">
                <button type="submit" className="bg-emerald-500 text-white px-5 py-3 md:p-3 rounded-xl hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 flex-1 md:flex-none flex items-center justify-center"><Check size={20} /></button>
                <button type="button" onClick={() => setShowAddForm(false)} className="bg-gray-100 text-gray-400 px-5 py-3 md:p-3 rounded-xl hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"><X size={20} /></button>
              </div>
            </form>
          )}

          <div className="bg-white border border-gray-50 rounded-2xl p-4 lg:p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.16em]">Manage Categories</div>
              <div className="flex gap-2 w-full lg:w-auto lg:ml-auto">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Add new category"
                  className="w-full lg:w-56 bg-gray-50/50 border border-gray-100 rounded-full py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="bg-slate-900 text-white px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map(cat => (
                <div key={cat} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-100 bg-gray-50 text-xs font-bold text-slate-600">
                  <span>{cat}</span>
                  <button type="button" onClick={() => handleDeleteCategory(cat)} className="text-rose-500 hover:text-rose-600">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Mobile Card Layout ──────────────────────────────── */}
          <div className="lg:hidden space-y-3">
            {menuLoading ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-300 font-bold animate-pulse">Loading menu...</div>
            ) : filteredMenu.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-300 font-bold">No items found</div>
            ) : (
              filteredMenu.map((item) => (
                <div key={item._id} className={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${item.isAvailable ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                  {editingId === item._id ? (
                    <div className="space-y-3">
                      <input value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400" />
                      <div className="flex gap-2">
                        <select value={editItem.category} onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-none appearance-none">
                          {categoryOptions.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <input type="number" value={editItem.price} onChange={(e) => setEditItem({ ...editItem, price: e.target.value })}
                          className="w-24 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-black focus:outline-none" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditItem(item._id)} className="flex-1 bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5"><Check size={14} /> Save</button>
                        <button onClick={() => setEditingId(null)} className="px-4 py-2.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-black uppercase">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button onClick={() => handleToggleItem(item._id)} className="shrink-0">
                            {item.isAvailable ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-gray-300" />}
                          </button>
                          <span className={`font-bold text-sm truncate ${item.isAvailable ? 'text-slate-900' : 'text-gray-300 line-through'}`}>{item.name}</span>
                        </div>
                        <span className="font-black text-slate-900 text-base shrink-0 ml-2">₹{item.price}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-400">{categoryIcon(item.category)} {item.category}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => startEdit(item)} className="bg-gray-50 text-gray-400 p-2 rounded-lg hover:text-blue-500 hover:bg-blue-50 transition-all"><Edit3 size={14} /></button>
                          <button onClick={() => handleDeleteItem(item._id)} className="bg-gray-50 text-gray-400 p-2 rounded-lg hover:text-rose-500 hover:bg-rose-50 transition-all"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
            <div className="flex justify-between items-center px-1 py-2">
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{filteredMenu.length} items</span>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{menuItems.filter(i => i.isAvailable).length} active / {menuItems.filter(i => !i.isAvailable).length} hidden</span>
            </div>
          </div>

          {/* ─── Desktop Table Layout ────────────────────────────── */}
          <div className="hidden lg:block bg-white border border-gray-50 rounded-[2.5rem] overflow-hidden shadow-sm">
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
                        {item.isAvailable ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-300" />}
                      </button>
                    </div>
                    <div className="col-span-4">
                      {editingId === item._id ? (
                        <input value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400" />
                      ) : (
                        <span className={`font-bold text-sm ${item.isAvailable ? 'text-slate-900' : 'text-gray-300 line-through'}`}>{item.name}</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {editingId === item._id ? (
                        <select value={editItem.category} onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                          className="bg-gray-50 border border-gray-200 rounded-full py-2 px-3 text-xs font-bold focus:outline-none appearance-none">
                          {categoryOptions.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500">{categoryIcon(item.category)} {item.category}</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {editingId === item._id ? (
                        <input type="number" value={editItem.price} onChange={(e) => setEditItem({ ...editItem, price: e.target.value })}
                          className="w-24 bg-gray-50 border border-gray-200 rounded-full py-2 px-4 text-sm font-black focus:outline-none" />
                      ) : (
                        <span className="font-black text-slate-900">₹{item.price}</span>
                      )}
                    </div>
                    <div className="col-span-3 flex justify-end gap-2">
                      {editingId === item._id ? (
                        <>
                          <button onClick={() => handleEditItem(item._id)} className="bg-emerald-500 text-white p-2.5 rounded-xl hover:bg-emerald-600 transition-all shadow-sm"><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="bg-gray-100 text-gray-400 p-2.5 rounded-xl hover:text-rose-500 hover:bg-rose-50 transition-all"><X size={16} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(item)} className="bg-gray-50 text-gray-400 p-2.5 rounded-xl hover:text-blue-500 hover:bg-blue-50 transition-all"><Edit3 size={16} /></button>
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
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-50 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-10 shadow-sm">
            <div className="flex items-start justify-between mb-6 lg:mb-8">
              <div>
                <h3 className="text-lg lg:text-xl font-black text-slate-900 mb-1">Current Plan</h3>
                <p className="text-[10px] lg:text-sm text-gray-400 font-medium">Manage your subscription and billing details.</p>
              </div>
              <div className="flex flex-col items-end gap-2 lg:flex-row lg:items-center lg:gap-3">
                <div className={`px-4 py-1.5 lg:px-5 lg:py-2 rounded-full text-[10px] lg:text-xs font-black uppercase tracking-wider ${
                  subscription?.isValid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'
                }`}>
                  {subscription?.isValid ? 'Active' : subscription?.status || 'None'}
                </div>
                {localAutopay ? (
                  <button onClick={handleCancelAutopay} className="bg-rose-50 text-rose-500 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-[10px] lg:text-xs font-black hover:bg-rose-100 transition-colors uppercase tracking-wider">
                    Cancel Autopay
                  </button>
                ) : (
                  subscription?.status === 'active' && (
                    <button onClick={handleEnableAutopay} className="bg-orange-50 text-[#FF5A36] px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-[10px] lg:text-xs font-black hover:bg-orange-100/20 transition-colors uppercase tracking-wider">
                      Enable Autopay
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              <div className="bg-gray-50/50 rounded-2xl lg:rounded-[2rem] p-5 lg:p-6 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Plan</div>
                <div className="text-xl lg:text-2xl font-black text-slate-900 capitalize">{subscription?.plan || 'None'}</div>
              </div>
              <div className="bg-gray-50/50 rounded-2xl lg:rounded-[2rem] p-5 lg:p-6 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">
                  {subscription?.plan === 'trial' ? 'Trial Days Left' : 'Monthly Cost'}
                </div>
                <div className="text-xl lg:text-2xl font-black text-[#FF5A36]">
                  {subscription?.plan === 'trial' ? `${subscription?.trialDaysRemaining ?? 0} days` : `₹${subscription?.amount ?? 0}`}
                </div>
              </div>
              <div className="bg-gray-50/50 rounded-2xl lg:rounded-[2rem] p-5 lg:p-6 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Autopay</div>
                <div className="text-xl lg:text-2xl font-black text-slate-900">
                  {subscription?.autopayEnabled ? <span className="flex items-center justify-center gap-2"><Shield size={18} className="text-emerald-500 lg:w-5 lg:h-5" /> Enabled</span> : <span className="text-gray-300">Off</span>}
                </div>
              </div>
            </div>
            {subscription?.trialEndDate && (
              <div className="mt-4 lg:mt-6 text-[10px] lg:text-xs text-gray-400 font-bold text-center">
                Trial period: {new Date(subscription.trialStartDate).toLocaleDateString('en-IN')} → {new Date(subscription.trialEndDate).toLocaleDateString('en-IN')}
              </div>
            )}
          </div>

          {subscription?.paymentHistory?.length > 0 && (
            <div className="bg-white border border-gray-50 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-10 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-6">Payment History</h3>
              <div className="space-y-3">
                {subscription.paymentHistory.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50/50 rounded-2xl px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${p.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <div>
                        <div className="text-sm font-bold text-slate-900 capitalize">{p.method?.replace('_', ' ')}</div>
                        <div className="text-[10px] font-bold text-gray-400">{new Date(p.date).toLocaleDateString('en-IN')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-slate-900">₹{p.amount}</span>
                      <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${p.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== STAFF SECTION ===================== */}
      {activeSection === 'staff' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-50 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-10 shadow-sm space-y-6 lg:space-y-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-1">Staff Management</h3>
                <p className="text-sm text-gray-400 font-medium">Create credentials for waiters and manage your kitchen account.</p>
              </div>
              <button
                onClick={() => { setShowAddStaff(!showAddStaff); setStaffError(''); }}
                className="bg-emerald-500 text-white px-4 lg:px-6 py-2.5 lg:py-3 rounded-full font-bold text-xs lg:text-sm flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 active:scale-95 shrink-0"
              >
                <UserPlus size={16} strokeWidth={3} /> Add Staff
              </button>
            </div>

            {/* Add Staff Form */}
            {showAddStaff && (
              <div className="bg-gray-50/50 rounded-2xl p-6 space-y-4 animate-in slide-in-from-top-4 duration-300 border border-gray-100">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">New Staff Member</div>
                {staffError && (
                  <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100">{staffError}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Name</label>
                    <input type="text" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                      placeholder="e.g. Raju" className="w-full bg-white border border-gray-100 rounded-full py-3 px-5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Mobile Number</label>
                    <input type="tel" value={newStaff.mobileNumber} onChange={e => setNewStaff({ ...newStaff, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="9876543210" maxLength={10} className="w-full bg-white border border-gray-100 rounded-full py-3 px-5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Password</label>
                    <input type="text" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                      placeholder="Min 4 characters" className="w-full bg-white border border-gray-100 rounded-full py-3 px-5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Role</label>
                    <select value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                      className="w-full bg-white border border-gray-100 rounded-full py-3 px-5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 appearance-none cursor-pointer">
                      <option value="Waiter">Waiter</option>
                      <option value="Kitchen">Kitchen</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => { setShowAddStaff(false); setStaffError(''); }} className="px-5 py-2.5 bg-gray-100 text-gray-400 rounded-full text-xs font-bold uppercase hover:text-rose-500 hover:bg-rose-50 transition-all">Cancel</button>
                  <button
                    onClick={async () => {
                      setStaffError('');
                      if (!newStaff.name || !newStaff.mobileNumber || !newStaff.password) {
                        setStaffError('All fields are required.'); return;
                      }
                      if (newStaff.mobileNumber.length < 10) { setStaffError('Enter a valid 10-digit mobile number.'); return; }
                      if (newStaff.password.length < 4) { setStaffError('Password must be at least 4 characters.'); return; }
                      try {
                        await axios.post('/api/staff', newStaff);
                        setNewStaff({ name: '', mobileNumber: '', password: '', role: 'Waiter' });
                        setShowAddStaff(false);
                        fetchStaff();
                      } catch (err) {
                        setStaffError(err.response?.data?.error || 'Failed to create staff.');
                      }
                    }}
                    className="px-6 py-2.5 bg-emerald-500 text-white rounded-full text-xs font-bold uppercase flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-md shadow-emerald-200"
                  >
                    <Check size={14} /> Create
                  </button>
                </div>
              </div>
            )}

            {/* Staff List */}
            <div className="space-y-3">
              {staffLoading ? (
                <div className="p-12 text-center text-gray-300 font-bold animate-pulse">Loading staff...</div>
              ) : staffList.length === 0 ? (
                <div className="p-12 text-center">
                  <Users size={40} className="mx-auto mb-4 text-gray-200" />
                  <p className="text-sm font-bold text-gray-300">No staff members yet</p>
                  <p className="text-xs text-gray-300 mt-1">Add waiters or kitchen staff to get started.</p>
                </div>
              ) : (
                staffList.map(s => (
                  <div key={s._id} className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 transition-all hover:border-gray-200">
                    {editingStaffId === s._id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input value={editStaff.name} onChange={e => setEditStaff({ ...editStaff, name: e.target.value })}
                            placeholder="Name" className="bg-white border border-gray-200 rounded-full py-2.5 px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400" />
                          <input type="tel" value={editStaff.mobileNumber} onChange={e => setEditStaff({ ...editStaff, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            placeholder="Mobile" maxLength={10} className="bg-white border border-gray-200 rounded-full py-2.5 px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400" />
                          <input type="text" value={editStaff.password} onChange={e => setEditStaff({ ...editStaff, password: e.target.value })}
                            placeholder="New password (optional)" className="bg-white border border-gray-200 rounded-full py-2.5 px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400" />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingStaffId(null)} className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-xs font-black uppercase">Cancel</button>
                          <button
                            onClick={async () => {
                              try {
                                const payload = { name: editStaff.name, mobileNumber: editStaff.mobileNumber };
                                if (editStaff.password) payload.password = editStaff.password;
                                await axios.patch(`/api/staff/${s._id}`, payload);
                                setEditingStaffId(null);
                                fetchStaff();
                              } catch (err) {
                                alert(err.response?.data?.error || 'Failed to update.');
                              }
                            }}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 hover:bg-emerald-600"
                          >
                            <Check size={14} /> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                            s.role === 'Kitchen' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {s.role === 'Kitchen' ? <ChefHat size={20} /> : <Users size={20} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{s.name}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                s.role === 'Kitchen' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>{s.role}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                <Phone size={10} /> {s.mobileNumber}
                              </span>
                              <span className="text-[10px] text-gray-300">
                                Added {new Date(s.createdAt).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setEditingStaffId(s._id); setEditStaff({ name: s.name, mobileNumber: s.mobileNumber, password: '' }); }}
                            className="bg-white text-gray-400 p-2.5 rounded-xl hover:text-blue-500 hover:bg-blue-50 transition-all border border-gray-100"
                          ><Edit3 size={14} /></button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Remove ${s.name} (${s.role})?`)) return;
                              try {
                                await axios.delete(`/api/staff/${s._id}`);
                                fetchStaff();
                              } catch (err) {
                                alert(err.response?.data?.error || 'Failed to delete.');
                              }
                            }}
                            className="bg-white text-gray-400 p-2.5 rounded-xl hover:text-rose-500 hover:bg-rose-50 transition-all border border-gray-100"
                          ><Trash2 size={14} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Staff count footer */}
            {staffList.length > 0 && (
              <div className="flex justify-between items-center px-1 py-2">
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                  {staffList.filter(s => s.role === 'Waiter').length} waiters
                </span>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                  {staffList.filter(s => s.role === 'Kitchen').length} kitchen
                </span>
              </div>
            )}
          </div>
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
        className="w-full bg-gray-50/50 border border-gray-100 rounded-full py-4 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all font-medium text-slate-900" />
    </div>
  </div>
);

export default SettingsPanel;
