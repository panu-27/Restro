import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Plus, Trash2, Edit3, Save, X, Check, ToggleLeft, ToggleRight,
  Store, Hash, Utensils, CreditCard, Shield, Leaf, Flame, Coffee,
  IceCream, Search, MapPin, Phone, FileText, Receipt, Percent,
  Users, Eye, EyeOff, ChefHat, UserPlus, Key, LogOut, LayoutGrid,
  ImageIcon, ChevronRight, ChevronLeft, ChevronDown, ArrowLeft,
  Bell, Star, Wifi, Printer, HelpCircle, MessageCircle, Share2,
  Bluetooth, Globe, MessageSquare, Users2, RadioTower
} from 'lucide-react';
import { TableSettingsSkeleton } from './Skeleton';
import ImageUploader from './ImageUploader';

const DEFAULT_MENU_CATEGORIES = ['Veg', 'Non-Veg', 'Beverage', 'Dessert'];

/* ─── tiny helpers ───────────────────────────────────────────────── */
const cn = (...c) => c.filter(Boolean).join(' ');

const SectionRow = ({ icon: Icon, label, sublabel, onPress, rightEl, danger }) => (
  <button
    onClick={onPress}
    className={cn(
      'w-full flex items-center gap-4 px-5 py-4 bg-white active:bg-white transition-colors text-left',
      danger && 'text-red-500'
    )}
  >
    {Icon && (
      <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        danger ? 'bg-red-50' : 'bg-blue-50')}>
        <Icon size={18} className={danger ? 'text-red-500' : 'text-blue-600'} />
      </span>
    )}
    <div className="flex-1 min-w-0">
      <p className={cn('text-[15px] font-semibold leading-tight', danger ? 'text-red-500' : 'text-gray-900')}>{label}</p>
      {sublabel && <p className="text-[12px] text-gray-400 mt-0.5 leading-tight">{sublabel}</p>}
    </div>
    {rightEl !== undefined ? rightEl : <ChevronRight size={16} className="text-gray-300 shrink-0" />}
  </button>
);

const Divider = ({ className }) => <div className={cn('h-px bg-gray-100', className)} />;

const Card = ({ children, className }) => (
  <div className={cn('bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm', className)}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] px-5 pt-5 pb-2">{children}</p>
);

const NativeInput = ({ label, value, onChange, placeholder, icon: Icon, type = 'text', multiline }) => (
  <div className="border-b border-gray-100 last:border-b-0 px-5 py-4">
    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
    <div className="flex items-center gap-3">
      {Icon && <Icon size={16} className="text-gray-400 shrink-0" />}
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="flex-1 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-300 outline-none resize-none font-medium"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-300 outline-none font-medium"
        />
      )}
    </div>
  </div>
);

const PillToggle = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} className="shrink-0">
    {value
      ? <ToggleRight size={32} className="text-blue-500" />
      : <ToggleLeft size={32} className="text-gray-300" />}
  </button>
);

/* ─── Screen wrapper: simulates a pushed native screen ──────────── */
const NativeScreen = ({ title, onBack, backLabel, children, rightAction }) => (
  <div className="flex flex-col h-full bg-white overflow-hidden">
    {/* Nav bar */}
    <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 shrink-0">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-0.5 text-gray-900 active:opacity-60">
          <ChevronLeft size={22} strokeWidth={2.5} />
          <span className="text-[17px] font-bold">{backLabel || title}</span>
        </button>
      )}
      {rightAction && <div className="text-blue-600 text-[15px] font-semibold">{rightAction}</div>}
    </div>
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {children}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const SettingsPanel = ({ user, subscription, onSettingsUpdate, onShowPassword, onLogout, onClose, initialSection = 'home' }) => {
  const [activeSection, setActiveSection] = useState(initialSection);

  useEffect(() => {
    if (initialSection) setActiveSection(initialSection);
  }, [initialSection]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  /* ── Restaurant fields ─────────────────────────────────────────── */
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [tableCount, setTableCount] = useState(10);
  const [restaurantLogo, setRestaurantLogo] = useState('');
  const [menuCategoryImages, setMenuCategoryImages] = useState({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [localAutopay, setLocalAutopay] = useState(subscription?.autopayEnabled);

  useEffect(() => { setLocalAutopay(subscription?.autopayEnabled); }, [subscription?.autopayEnabled]);

  /* ── Tax ───────────────────────────────────────────────────────── */
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxes, setTaxes] = useState([]);

  /* ── Printer ───────────────────────────────────────────────────── */
  const [printerTab, setPrinterTab] = useState('bluetooth');
  const [printerPermissionGranted, setPrinterPermissionGranted] = useState(false);
  const [printerScanning, setPrinterScanning] = useState(false);

  const handleGrantPrinterPermission = () => {
    setPrinterScanning(true);
    setTimeout(() => { setPrinterPermissionGranted(true); setPrinterScanning(false); }, 1500);
  };

  /* ── Menu ──────────────────────────────────────────────────────── */
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuFilter, setMenuFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [menuCategories, setMenuCategories] = useState(DEFAULT_MENU_CATEGORIES);
  const [newCategoryName, setNewCategoryName] = useState('');
  const EMPTY_ITEM = { name: '', category: DEFAULT_MENU_CATEGORIES[0], price: '', image: '', variations: [] };
  const [newItem, setNewItem] = useState({ name: '', category: '', price: '', image: '', variations: [], taxPercentage: 'None', stock: '' });
  const [editItem, setEditItem] = useState({ name: '', category: '', price: '', image: '', variations: [], taxPercentage: 'None', stock: '' });

  useEffect(() => { fetchMenu(); }, []);

  /* ── Staff ─────────────────────────────────────────────────────── */
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', mobileNumber: '', password: '', role: 'Waiter' });
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [editStaff, setEditStaff] = useState({ name: '', mobileNumber: '', password: '' });
  const [staffError, setStaffError] = useState('');

  /* ── Tables ────────────────────────────────────────────────────── */
  const [allTables, setAllTables] = useState([]);
  const [tableAreas, setTableAreas] = useState(['Main Floor']);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [editingTableId, setEditingTableId] = useState(null);
  const [editTableName, setEditTableName] = useState('');
  const [editingSection, setEditingSection] = useState(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [tableError, setTableError] = useState('');
  const [showAddTableToSection, setShowAddTableToSection] = useState(null);
  const [newTableId, setNewTableId] = useState('');
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [isSavingSection, setIsSavingSection] = useState(false);

  /* ── Staff fetch ───────────────────────────────────────────────── */
  const fetchStaff = async () => {
    setStaffLoading(true);
    try { const res = await axios.get('/api/staff'); setStaffList(res.data); }
    catch (err) { console.error('Error fetching staff:', err); }
    finally { setStaffLoading(false); }
  };
  useEffect(() => { fetchStaff(); }, []);

  /* ── Tables cache/fetch ────────────────────────────────────────── */
  const SETTINGS_TABLES_CACHE = 'restro_settings_tables_cache';
  const SETTINGS_AREAS_CACHE = 'restro_settings_areas_cache';
  const readSettingsCache = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  };
  const fetchTablesData = async (silent = false) => {
    if (!silent) setTablesLoading(true);
    try {
      const [tablesRes, areasRes] = await Promise.all([axios.get('/api/tables'), axios.get('/api/table-areas')]);
      const t = tablesRes.data || [];
      const a = Array.isArray(areasRes.data) && areasRes.data.length ? areasRes.data : ['Main Floor'];
      setAllTables(t); setTableAreas(a);
      localStorage.setItem(SETTINGS_TABLES_CACHE, JSON.stringify(t));
      localStorage.setItem(SETTINGS_AREAS_CACHE, JSON.stringify(a));
    } catch (err) { console.error('Error fetching tables:', err); }
    finally { if (!silent) setTablesLoading(false); }
  };
  useEffect(() => {
    if (activeSection === 'tables') {
      const cachedTables = readSettingsCache(SETTINGS_TABLES_CACHE, null);
      const cachedAreas = readSettingsCache(SETTINGS_AREAS_CACHE, null);
      if (cachedTables) { setAllTables(cachedTables); setTableAreas(cachedAreas || ['Main Floor']); setTablesLoading(false); fetchTablesData(true); }
      else fetchTablesData(false);
    }
  }, [activeSection]);

  /* ── Table operations (ALL logic preserved) ───────────────────── */
  const handleRenameTable = async (oldId) => {
    const newId = editTableName.trim();
    if (!newId || newId === oldId) { setEditingTableId(null); return; }
    setTableError('');
    try { await axios.patch(`/api/tables/${oldId}/rename`, { newTableId: newId }); setEditingTableId(null); fetchTablesData(); }
    catch (err) { setTableError(err.response?.data?.error || 'Failed to rename table.'); }
  };
  const handleDeleteTableFromSettings = async (tableId) => {
    if (!window.confirm(`Remove table "${tableId}"?`)) return;
    try { await axios.delete(`/api/tables/${tableId}`); fetchTablesData(); }
    catch { alert('Failed to delete table'); }
  };
  const handleAddSection = async () => {
    const name = newSectionName.trim();
    if (!name || isSavingSection) return;
    setIsSavingSection(true);
    try { await axios.post('/api/table-areas', { name }); setNewSectionName(''); setShowAddSection(false); fetchTablesData(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to add section'); }
    finally { setIsSavingSection(false); }
  };
  const handleDeleteSection = async (area) => {
    if (!window.confirm(`Delete section "${area}" and all its tables?`)) return;
    try { await axios.delete(`/api/table-areas/${encodeURIComponent(area)}`); fetchTablesData(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete section'); }
  };
  const handleRenameSection = async (oldName) => {
    const newName = editSectionName.trim();
    if (!newName || newName === oldName) { setEditingSection(null); return; }
    try { await axios.patch(`/api/table-areas/${encodeURIComponent(oldName)}/rename`, { newName }); setEditingSection(null); fetchTablesData(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to rename section'); }
  };
  const handleAddTable = async (area) => {
    const tableId = newTableId.trim();
    if (!tableId || isAddingTable) return;
    setIsAddingTable(true);
    try {
      await axios.post('/api/tables', { tableId, area, seats: 4 });
      setNewTableId('');
      setShowAddTableToSection(null);
      fetchTablesData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add table');
    } finally {
      setIsAddingTable(false);
    }
  };

  /* ── Populate from user ────────────────────────────────────────── */
  useEffect(() => {
    if (user) {
      setRestaurantName(user.restaurantName || '');
      setRestaurantAddress(user.restaurantAddress || '');
      setRestaurantPhone(user.restaurantPhone || '');
      setGstNumber(user.gstNumber || '');
      setFssaiNumber(user.fssaiNumber || '');
      setTableCount(user.tableCount || 10);
      setRestaurantLogo(user.restaurantLogo || '');
      setMenuCategoryImages(user.menuCategoryImages || {});
      setTaxEnabled(user.taxEnabled || false);
      setTaxes(user.taxes?.length ? user.taxes : [
        { name: 'CGST', percentage: 2.5, enabled: true },
        { name: 'SGST', percentage: 2.5, enabled: true }
      ]);
      setMenuCategories(user.menuCategories?.length ? user.menuCategories : DEFAULT_MENU_CATEGORIES);
    }
  }, [user]);

  const categoryOptions = useMemo(() => {
    const fromItems = [...new Set(menuItems.map(i => i.category).filter(Boolean))];
    const merged = [...new Set([...(menuCategories || []), ...fromItems])];
    return merged.length ? merged : DEFAULT_MENU_CATEGORIES;
  }, [menuCategories, menuItems]);

  /* ── Menu ops ──────────────────────────────────────────────────── */
  const fetchMenu = async () => {
    try { const res = await axios.get('/api/menu'); setMenuItems(res.data); }
    catch (err) { console.error('Error fetching menu:', err); }
    finally { setMenuLoading(false); }
  };

  const filteredMenu = useMemo(() => menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase());
    const matchesFilter = menuFilter === 'All' || item.category === menuFilter;
    return matchesSearch && matchesFilter;
  }), [menuItems, menuSearch, menuFilter]);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await axios.patch('/api/settings', {
        tableCount, restaurantName, restaurantAddress, restaurantPhone,
        gstNumber, fssaiNumber, taxEnabled, taxes,
        menuCategories: categoryOptions, restaurantLogo, menuCategoryImages,
      });
      if (onSettingsUpdate) onSettingsUpdate();
    } catch (err) { console.error('Error saving settings:', err); }
    finally { setSettingsSaving(false); }
  };

  const handleAddCategory = () => {
    const value = newCategoryName.trim();
    if (!value) return;
    if (menuCategories.some(c => c.toLowerCase() === value.toLowerCase())) { setNewCategoryName(''); return; }
    setMenuCategories(prev => [...prev, value]); setNewCategoryName('');
  };

  const handleDeleteCategory = (categoryName) => {
    if (categoryOptions.length <= 1) { alert('At least one category is required.'); return; }
    const inUse = menuItems.some(item => item.category === categoryName);
    if (inUse) { alert(`"${categoryName}" is used by existing menu items. Reassign or delete those items first.`); return; }
    if (!window.confirm(`Delete category "${categoryName}"?`)) return;
    setMenuCategories(prev => prev.filter(c => c !== categoryName));
    if (menuFilter === categoryName) setMenuFilter('All');
  };

  const handleRenameCategory = (oldName) => {
    const newName = window.prompt('Rename category to:', oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;
    const value = newName.trim();
    if (menuCategories.some(c => c.toLowerCase() === value.toLowerCase())) { alert('Category already exists.'); return; }
    setMenuCategories(prev => prev.map(c => c === oldName ? value : c));
    if (menuFilter === oldName) setMenuFilter(value);
  };

  const handleCancelAutopay = async () => {
    if (!window.confirm('Are you sure you want to cancel autopay?')) return;
    setLocalAutopay(false);
    try { await axios.patch('/api/subscription/cancel-autopay'); if (onSettingsUpdate) onSettingsUpdate(); }
    catch { setLocalAutopay(true); }
  };
  const handleEnableAutopay = async () => {
    if (!window.confirm('Enable autopay?')) return;
    setLocalAutopay(true);
    try { await axios.patch('/api/subscription/enable-autopay'); if (onSettingsUpdate) onSettingsUpdate(); }
    catch { setLocalAutopay(false); }
  };

  const addTax = () => setTaxes(prev => [...prev, { name: '', percentage: 0, enabled: true }]);
  const removeTax = (i) => setTaxes(prev => prev.filter((_, idx) => idx !== i));
  const updateTax = (i, field, val) => setTaxes(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));

  const handleAddItem = async (e) => {
    e.preventDefault();
    const hasVars = newItem.variations.length > 0;
    if (!newItem.name) return;
    if (hasVars) { if (newItem.variations.some(v => !v.name || v.price === '')) return; }
    else { if (newItem.price === '') return; }
    const payload = {
      ...newItem,
      price: hasVars ? 0 : parseFloat(newItem.price),
      variations: hasVars ? newItem.variations.map(v => ({ name: v.name, price: parseFloat(v.price) })) : [],
      taxPercentage: newItem.taxPercentage === 'None' ? 0 : parseFloat(newItem.taxPercentage),
      stock: newItem.stock ? parseInt(newItem.stock) : 0
    };
    try {
      await axios.post('/api/menu', payload);
      setNewItem({ name: '', category: categoryOptions[0], price: '', image: '', variations: [], taxPercentage: 'None', stock: '' });
      setActiveSection('menu');
      fetchMenu();
    }
    catch (err) { console.error('Error adding item:', err); }
  };

  const handleEditItem = async (id) => {
    const hasVars = editItem.variations.length > 0;
    const payload = {
      ...editItem,
      price: hasVars ? 0 : parseFloat(editItem.price),
      variations: hasVars ? editItem.variations.map(v => ({ name: v.name, price: parseFloat(v.price) })) : [],
      taxPercentage: editItem.taxPercentage === 'None' ? 0 : parseFloat(editItem.taxPercentage),
      stock: editItem.stock ? parseInt(editItem.stock) : 0
    };
    try {
      await axios.patch(`/api/menu/${id}`, payload);
      setEditingId(null);
      setActiveSection('menu');
      fetchMenu();
    }
    catch (err) { console.error('Error editing item:', err); }
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

  const startEdit = (item) => { setEditingId(item._id); setEditItem({ name: item.name, category: item.category, price: item.price || '', image: item.image || '', variations: item.variations || [] }); };

  const addVariation = (isEdit) => { const setter = isEdit ? setEditItem : setNewItem; setter(prev => prev.variations.length >= 5 ? prev : { ...prev, variations: [...prev.variations, { name: '', price: '' }] }); };
  const removeVariation = (idx, isEdit) => { const setter = isEdit ? setEditItem : setNewItem; setter(prev => ({ ...prev, variations: prev.variations.filter((_, i) => i !== idx) })); };
  const updateVariation = (idx, field, val, isEdit) => { const setter = isEdit ? setEditItem : setNewItem; setter(prev => ({ ...prev, variations: prev.variations.map((v, i) => i === idx ? { ...v, [field]: val } : v) })); };

  const categoryIcon = (cat) => {
    switch (cat) {
      case 'Veg': return <Leaf size={13} className="text-emerald-500" />;
      case 'Non-Veg': return <Flame size={13} className="text-rose-500" />;
      case 'Beverage': return <Coffee size={13} className="text-amber-500" />;
      case 'Dessert': return <IceCream size={13} className="text-purple-500" />;
      default: return <Utensils size={13} className="text-gray-400" />;
    }
  };

  const menuItemsByCategory = useMemo(() => {
    const grouped = {};
    categoryOptions.forEach(cat => {
      const items = filteredMenu.filter(i => i.category === cat);
      if (items.length) grouped[cat] = items;
    });
    return grouped;
  }, [filteredMenu, categoryOptions]);

  /* ══════════════════ SCREENS ══════════════════════════════════════ */

  /* ── HOME (menu list) ─────────────────────────────────────────── */
  const renderHomeScreen = () => (
    <NativeScreen title="" onBack={onClose} backLabel="Menu" rightAction={null}>
      {/* Profile card */}
      <div className="mx-4 mt-5 mb-3">
        <Card>
          <button
            onClick={() => setActiveSection('restaurant')}
            className="w-full flex items-center gap-4 px-5 py-4 active:bg-white"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
              {restaurantLogo
                ? <img src={restaurantLogo} alt="" className="w-full h-full object-cover" />
                : <span className="text-blue-600 font-bold text-xl">{(restaurantName || 'R')[0].toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[16px] font-bold text-gray-900">
                {restaurantName 
                  ? (restaurantName.length > 15 ? restaurantName.substring(0, 15) + '..' : restaurantName)
                  : 'My Restaurant'}
              </p>
              <p className="text-[13px] text-gray-400">{restaurantPhone || '+91 —'}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        </Card>
      </div>

      {/* Section 1 */}
      <SectionLabel>Menu & Orders</SectionLabel>
      <div className="mx-4 mb-3">
        <Card>
          <SectionRow icon={Utensils} label="Menu Builder" sublabel="Add, edit, toggle items" onPress={() => setActiveSection('menu')} />
          <Divider className="ml-[72px]" />
          <SectionRow icon={Percent} label="Tax Configuration" sublabel={taxEnabled ? 'Taxes enabled' : 'Taxes off'} onPress={() => setActiveSection('taxes')} />
          <Divider className="ml-[72px]" />
          <SectionRow icon={LayoutGrid} label="Table Management" sublabel={`${allTables.length} tables · ${tableAreas.length} sections`} onPress={() => setActiveSection('tables')} />
        </Card>
      </div>

      {/* Section 2 */}
      <SectionLabel>Reach & Marketing</SectionLabel>
      <div className="mx-4 mb-3">
        <Card>
          <SectionRow icon={Users} label="Regular Customers" sublabel="View loyalty and repeat visits" onPress={() => { }} />
          <Divider className="ml-[72px]" />
          <SectionRow icon={MessageSquare} label="Manage WhatsApp" sublabel="Connect your WhatsApp Business" onPress={() => { }} />
          <Divider className="ml-[72px]" />
          <SectionRow icon={RadioTower} label="WhatsApp Marketing" sublabel="Send bulk offers & updates" onPress={() => { }} />
          <Divider className="ml-[72px]" />
          <SectionRow icon={Globe} label="Google Profile Manager" sublabel="Manage your Google listing" onPress={() => { }} />
        </Card>
      </div>

      {/* Section 3 — Team */}
      <SectionLabel>Team</SectionLabel>
      <div className="mx-4 mb-3">
        <Card>
          <SectionRow icon={Users2} label="Staff Management" sublabel={`${staffList.length} members`} onPress={() => setActiveSection('staff')} />
        </Card>
      </div>

      {/* Section 4 — Hardware */}
      <SectionLabel>Hardware</SectionLabel>
      <div className="mx-4 mb-3">
        <Card>
          <SectionRow icon={Printer} label="Printer" sublabel="Connect Bluetooth or USB printer" onPress={() => setActiveSection('printer')} />
        </Card>
      </div>

      {/* Section 5 — Account */}
      <SectionLabel>Account</SectionLabel>
      <div className="mx-4 mb-3">
        <Card>
          <SectionRow
            icon={CreditCard}
            label="Subscription"
            sublabel={subscription?.isValid ? `${subscription?.plan || 'Active'} plan` : 'No active plan'}
            onPress={() => setActiveSection('billing')}
            rightEl={
              <div className="flex items-center gap-2">
                <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full',
                  subscription?.isValid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>
                  {subscription?.isValid ? 'Active' : 'Inactive'}
                </span>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            }
          />
          <Divider className="ml-[72px]" />
          {onShowPassword && <SectionRow icon={Key} label="Change Password" onPress={onShowPassword} />}
          {onShowPassword && <Divider className="ml-[72px]" />}
          {onLogout && <SectionRow icon={LogOut} label="Log Out" onPress={() => setShowLogoutConfirm(true)} danger />}
        </Card>
      </div>

      <div className="h-10" />
    </NativeScreen>
  );

  /* ── RESTAURANT PROFILE ─────────────────────────────────────────── */
  const renderRestaurantScreen = () => (
    <NativeScreen title="Business Details" onBack={() => setActiveSection('home')}>
      {/* ── Logo Drop Area ── */}
      <div className="mx-4 mt-5 mb-4">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-2 px-1">Restaurant Logo</p>
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50"
          style={{ aspectRatio: '16/9' }}>
          {restaurantLogo ? (
            <img src={restaurantLogo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                <Store size={28} className="text-gray-300" />
              </div>
              <p className="text-[13px] font-semibold text-gray-400">Tap to upload logo</p>
              <p className="text-[11px] text-gray-300">PNG, JPG up to 5 MB</p>
            </div>
          )}

          {/* ✅ FIX: ImageUploader always covers full area — tapping anywhere triggers file picker */}
          <div className="absolute inset-0">
            <ImageUploader
              value={restaurantLogo}
              onChange={setRestaurantLogo}
              label=""
              shape="full"
              folder="restro/logos"
              className="w-full h-full"
            />
          </div>

          {/* Remove button — stopPropagation so it doesn't re-open the picker */}
          {restaurantLogo && (
            <button
              onClick={(e) => { e.stopPropagation(); setRestaurantLogo(''); }}
              className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white active:scale-95 transition-all z-10"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* ── Business Information ── */}
      <SectionLabel>Business Information</SectionLabel>
      <div className="mx-4 mb-3">
        <Card>
          <NativeInput label="Business Name" value={restaurantName} onChange={setRestaurantName} placeholder="My Restaurant" icon={Store} />
          <NativeInput label="Phone Number" value={restaurantPhone} onChange={setRestaurantPhone} placeholder="+91 9876543210" icon={Phone} type="tel" />
          <NativeInput label="Outlet Address" value={restaurantAddress} onChange={setRestaurantAddress} placeholder="123, Main Road, City" icon={MapPin} multiline />
        </Card>
      </div>

      {/* ── Legal Details ── */}
      <SectionLabel>Legal Details</SectionLabel>
      <div className="mx-4 mb-3">
        <Card>
          <NativeInput label="GST Number (GSTIN)" value={gstNumber} onChange={setGstNumber} placeholder="22AAAAA0000A1Z5" icon={FileText} />
          <NativeInput label="FSSAI License No." value={fssaiNumber} onChange={setFssaiNumber} placeholder="12345678901234" icon={FileText} />
        </Card>
      </div>

      <div className="h-24" />

      {/* ── Sticky Save Footer ── */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20">
        <button
          onClick={handleSaveSettings}
          disabled={settingsSaving}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[16px] font-bold active:scale-[0.98] transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
        >
          {settingsSaving ? 'Saving…' : 'Update Details'}
        </button>
      </div>
    </NativeScreen>
  );

  /* ── TAX ──────────────────────────────────────────────────────── */
  const renderTaxScreen = () => (
    <NativeScreen title="Tax Configuration" onBack={() => setActiveSection('home')}>
      <SectionLabel>Tax Settings</SectionLabel>
      <div className="mx-4 mb-4">
        <Card>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-[15px] font-semibold text-gray-900">Enable Taxes</p>
              <p className="text-[12px] text-gray-400 mt-0.5">{taxEnabled ? 'Added on top of item prices' : 'Prices treated as inclusive'}</p>
            </div>
            <PillToggle value={taxEnabled} onChange={setTaxEnabled} />
          </div>
        </Card>
      </div>

      {taxEnabled && (
        <>
          <SectionLabel>Tax Entries</SectionLabel>
          <div className="mx-4 mb-4 space-y-2 pb-16">
            {taxes.map((tax, i) => (
              <Card key={i}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <PillToggle value={tax.enabled} onChange={v => updateTax(i, 'enabled', v)} />
                  <input
                    type="text"
                    value={tax.name}
                    onChange={e => updateTax(i, 'name', e.target.value)}
                    placeholder="Tax Name (e.g. CGST)"
                    className="flex-1 bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-[14px] font-semibold outline-none focus:border-blue-400"
                  />
                  <div className="relative w-20">
                    <input
                      type="number"
                      value={tax.percentage}
                      onChange={e => updateTax(i, 'percentage', parseFloat(e.target.value) || 0)}
                      step="0.5" min="0" max="50"
                      className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 pr-6 text-[14px] font-bold outline-none focus:border-blue-400"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                  </div>
                  <button onClick={() => removeTax(i)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            ))}
            <button
              onClick={addTax}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-[14px] font-semibold text-blue-500 flex items-center justify-center gap-2 active:bg-blue-50"
            >
              <Plus size={16} strokeWidth={2.5} /> Add Tax
            </button>
          </div>

          {/* Preview */}
          <SectionLabel>Preview on ₹100</SectionLabel>
          <div className="mx-4 mb-6">
            <Card>
              {taxes.filter(t => t.enabled).map((t, i) => (
                <div key={i} className="flex justify-between items-center px-5 py-3 border-b border-gray-50">
                  <span className="text-[14px] text-gray-600">{t.name} ({t.percentage}%)</span>
                  <span className="text-[14px] font-semibold text-gray-800">₹{(100 * t.percentage / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-5 py-4">
                <span className="text-[15px] font-bold text-gray-900">Total on ₹100</span>
                <span className="text-[16px] font-black text-blue-600">₹{(100 + taxes.filter(t => t.enabled).reduce((s, t) => s + t.percentage, 0)).toFixed(2)}</span>
              </div>
            </Card>
          </div>
        </>
      )}

      <div className="h-24" />

      {/* Sticky Save Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20">
        <button
          onClick={handleSaveSettings}
          disabled={settingsSaving}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[16px] font-bold active:scale-[0.98] transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
        >
          {settingsSaving ? 'Saving...' : 'Save Tax Settings'}
        </button>
      </div>
    </NativeScreen>
  );

  /* ── MENU ─────────────────────────────────────────────────────── */
  const renderMenuScreen = () => (
    <NativeScreen title="Menu Item" onBack={() => setActiveSection('home')}>
      {/* Search + filter */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input
            type="text"
            placeholder="Search"
            value={menuSearch}
            onChange={e => setMenuSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-[15px] text-gray-900 outline-none focus:border-blue-400 font-medium"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['All', ...categoryOptions].map(cat => (
            <button
              key={cat}
              onClick={() => setMenuFilter(cat)}
              className={cn(
                'px-6 py-2 rounded-lg text-[13px] font-bold whitespace-nowrap border transition-all uppercase tracking-wider',
                menuFilter === cat ? 'bg-white border-blue-500 text-blue-600' : 'bg-white border-gray-200 text-gray-500'
              )}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => {
              const name = window.prompt('Enter new category name:');
              if (name && name.trim()) {
                const value = name.trim();
                if (!menuCategories.some(c => c.toLowerCase() === value.toLowerCase())) {
                  setMenuCategories(prev => [...prev, value]);
                }
              }
            }}
            className="px-4 py-2 rounded-lg border border-blue-500 text-blue-600 flex items-center justify-center shrink-0"
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="flex-1 pb-32">
        {Object.entries(menuItemsByCategory).map(([category, items]) => (
          <div key={category} className="mt-4">
            <div className="px-5 py-3 flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-black text-gray-900 uppercase tracking-widest">{category}</h3>
                <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{items.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleRenameCategory(category)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDeleteCategory(category)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="bg-white border-y border-gray-50">
              {items.map((item, idx) => (
                <div key={item._id}
                  onClick={() => { setEditingId(item._id); setEditItem({ ...item, stock: item.stock || '' }); setActiveSection('addMenuItem'); }}
                  className={cn('flex items-center justify-between px-5 py-4 active:bg-white transition-colors', idx !== items.length - 1 && 'border-b border-gray-50')}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[15px] font-bold text-gray-900 leading-tight mb-1">{item.name}</p>
                    <div className="flex items-center gap-2">
                      {item.variations?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {item.variations.map((v, i) => (
                            <span key={i} className="text-[11px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-100">
                              {v.name}: ₹{v.price}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[14px] font-medium text-gray-500">₹{item.price}</p>
                      )}
                    </div>
                  </div>
                  {item.image ? (
                    <img src={item.image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 bg-white" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center shrink-0">
                      <ImageIcon size={20} className="text-gray-200" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed Add Button */}
      <div className="fixed bottom-6 left-4 right-4 z-20">
        <button
          onClick={() => {
            setEditingId(null);
            setNewItem({ name: '', category: categoryOptions[0], price: '', image: '', variations: [], taxPercentage: 'None', stock: '' });
            setActiveSection('addMenuItem');
          }}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[16px] font-bold shadow-xl shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Add Menu Item
        </button>
      </div>
      <div className="h-4" />
    </NativeScreen>
  );

  /* ── ADD / EDIT MENU ITEM ───────────────────────────────────────── */
  const renderAddMenuItemScreen = () => {
    const isEdit = !!editingId;
    const data = isEdit ? editItem : newItem;
    const setData = isEdit ? setEditItem : setNewItem;

    return (
      <NativeScreen title={isEdit ? "Edit Menu Item" : "Add Menu Item"} onBack={() => setActiveSection('menu')}>
        <div className="space-y-6 pb-24">
          <div className="bg-white px-5 py-6 space-y-6">
            {/* Item Name */}
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-2">Item Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={data.name}
                onChange={e => setData({ ...data, name: e.target.value })}
                placeholder="Tap to Enter"
                className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-[15px] outline-none focus:border-blue-400 font-medium placeholder:text-gray-300"
              />
            </div>

            {/* Item Image */}
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-2">Item Image</label>
              <div className="relative">
                <div className="w-full aspect-[16/9] rounded-2xl bg-white border border-gray-200 overflow-hidden flex flex-col items-center justify-center gap-3">
                  {data.image ? (
                    <img src={data.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="pointer-events-none flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <ImageIcon size={24} className="text-gray-300" />
                      </div>
                      <p className="text-[14px] font-medium text-gray-400">Upload Item Image</p>
                    </div>
                  )}
                  {/* ✅ FIX: Always-on overlay — tapping anywhere on the image area opens file picker */}
                  <div className="absolute inset-0">
                    <ImageUploader
                      value={data.image}
                      onChange={url => setData({ ...data, image: url })}
                      label=""
                      shape="full"
                    />
                  </div>
                </div>
                {/* Remove button — stopPropagation so it doesn't re-open the picker */}
                {data.image && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setData({ ...data, image: '' }); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white active:scale-95 transition-all z-10"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-2">Item Category</label>
              <div className="relative">
                <select
                  value={data.category}
                  onChange={e => setData({ ...data, category: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-[15px] outline-none appearance-none font-medium text-gray-900"
                >
                  <option value="" disabled>Tap To Select</option>
                  {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>

            {/* Sale Price */}
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-2">Sale Price</label>
              <div className="relative">
                <input
                  type="number"
                  value={data.price}
                  onChange={e => setData({ ...data, price: e.target.value })}
                  placeholder="Tap to Enter"
                  className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-[15px] outline-none focus:border-blue-400 font-bold placeholder:text-gray-300"
                />
              </div>
            </div>

            {/* Variations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-gray-500">Variations (max 5)</label>
                {data.variations.length < 5 && (
                  <button type="button" onClick={() => addVariation(isEdit)}
                    className="text-[12px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full active:scale-95 transition-all">
                    + Add
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {data.variations.map((v, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-white p-3 rounded-xl border border-gray-100">
                    <input
                      type="text"
                      value={v.name}
                      onChange={e => updateVariation(idx, 'name', e.target.value, isEdit)}
                      placeholder="e.g. Full"
                      className="flex-1 bg-transparent text-[14px] font-semibold outline-none"
                    />
                    <div className="w-[1px] h-4 bg-gray-200" />
                    <input
                      type="number"
                      value={v.price}
                      onChange={e => updateVariation(idx, 'price', e.target.value, isEdit)}
                      placeholder="₹0"
                      className="w-20 bg-transparent text-[14px] font-bold outline-none text-right"
                    />
                    <button type="button" onClick={() => removeVariation(idx, isEdit)} className="text-gray-300 hover:text-red-500 ml-1">
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Stock */}
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-2">Current Stock</label>
              <input
                type="number"
                value={data.stock}
                onChange={e => setData({ ...data, stock: e.target.value })}
                placeholder="Tap to Enter"
                className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-[15px] outline-none focus:border-blue-400 font-medium placeholder:text-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-3 z-20">
          {isEdit ? (
            <button
              onClick={() => { handleDeleteItem(editingId); setActiveSection('menu'); }}
              className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0 active:scale-95 transition-all"
            >
              <Trash2 size={24} />
            </button>
          ) : (
            <button
              onClick={() => setActiveSection('menu')}
              className="flex-1 py-4 bg-white text-gray-400 rounded-2xl text-[16px] font-bold"
            >
              Save & New
            </button>
          )}
          <button
            onClick={() => isEdit ? handleEditItem(editingId) : handleAddItem({ preventDefault: () => { } })}
            className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-[16px] font-bold shadow-lg shadow-red-100 active:scale-[0.98] transition-all"
          >
            {isEdit ? "Update Item" : "Save Item"}
          </button>
        </div>
      </NativeScreen>
    );
  };

  /* ── TABLES ───────────────────────────────────────────────────── */
  const renderTablesScreen = () => (
    <NativeScreen title="Table Management" onBack={() => setActiveSection('home')}>
      {tableError && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600 font-semibold">{tableError}</div>
      )}

      {tablesLoading ? (
        <div className="mx-4 mt-5"><TableSettingsSkeleton /></div>
      ) : (
        <div className="space-y-0">
          {tableAreas.map((area) => {
            const areaTablesRaw = allTables.filter(t => (t.area || 'Main Floor') === area);
            const areaTables = [...areaTablesRaw].sort((a, b) => {
              const numA = parseInt((a.tableId || '').replace(/\D+/g, ''), 10);
              const numB = parseInt((b.tableId || '').replace(/\D+/g, ''), 10);
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
              return (a.tableId || '').localeCompare(b.tableId || '');
            });

            return (
              <div key={area}>
                <div className="flex items-center justify-between px-5 pt-5 pb-2">
                  {editingSection === area ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        autoFocus value={editSectionName}
                        onChange={e => setEditSectionName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameSection(area); if (e.key === 'Escape') setEditingSection(null); }}
                        className="flex-1 bg-white border border-blue-300 rounded-xl py-2 px-3 text-[14px] font-bold outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button onClick={() => handleRenameSection(area)} className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-[12px] font-bold">✓</button>
                      <button onClick={() => setEditingSection(null)} className="px-3 py-2 bg-gray-100 text-gray-400 rounded-lg text-[12px] font-bold">✕</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <h4 className="text-[13px] font-black text-gray-800 uppercase tracking-wider">{area}</h4>
                        <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{areaTables.length}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingSection(area); setEditSectionName(area); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50">
                          <Edit3 size={13} />
                        </button>
                        {area.toLowerCase() !== 'main floor' && (
                          <button onClick={() => handleDeleteSection(area)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="mx-4 mb-2">
                  <div className="grid grid-cols-2 gap-2">
                    {areaTables.map((table) => (
                      <div key={table._id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        {editingTableId === table.tableId ? (
                          <div className="flex items-center gap-2 p-2.5">
                            <input
                              autoFocus value={editTableName}
                              onChange={e => setEditTableName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleRenameTable(table.tableId); if (e.key === 'Escape') setEditingTableId(null); }}
                              className="flex-1 bg-white border border-blue-300 rounded-xl py-2 px-3 text-[13px] font-bold outline-none"
                            />
                            <button onClick={() => handleRenameTable(table.tableId)} className="w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-lg"><Check size={13} /></button>
                            <button onClick={() => setEditingTableId(null)} className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg"><X size={13} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center px-4 py-3.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-bold text-gray-800 truncate">{table.tableId}</p>
                              <p className="text-[11px] text-gray-400">{table.seats || 4} seats</p>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingTableId(table.tableId); setEditTableName(table.tableId); setTableError(''); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50">
                                <Edit3 size={12} />
                              </button>
                              <button onClick={() => handleDeleteTableFromSettings(table.tableId)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Add Table UI inside section */}
                    <div className="col-span-1">
                      {showAddTableToSection === area ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            placeholder="T-11"
                            disabled={isAddingTable}
                            value={newTableId}
                            onChange={e => setNewTableId(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddTable(area); if (e.key === 'Escape') setShowAddTableToSection(null); }}
                            className="w-full bg-white border border-blue-300 rounded-2xl py-3 px-3 text-[13px] font-bold outline-none disabled:opacity-50"
                          />
                          <button
                            onClick={() => handleAddTable(area)}
                            disabled={isAddingTable || !newTableId.trim()}
                            className="w-10 h-10 shrink-0 flex items-center justify-center bg-blue-600 text-white rounded-2xl shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {isAddingTable ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                          </button>
                          <button
                            onClick={() => setShowAddTableToSection(null)}
                            disabled={isAddingTable}
                            className="w-10 h-10 shrink-0 flex items-center justify-center bg-gray-100 text-gray-400 rounded-2xl active:scale-95 disabled:opacity-50"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowAddTableToSection(area); setNewTableId(''); }}
                          className="w-full min-h-[50px] py-3.5 rounded-2xl border-2 border-dashed border-gray-100 text-[12px] font-bold text-blue-400 flex items-center justify-center gap-1.5 hover:bg-blue-50/30 transition-colors"
                        >
                          <Plus size={14} /> Add Table
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Section */}
          <div className="px-4 pt-3 pb-8">
            {showAddSection ? (
              <div className="flex gap-2 items-center">
                <input
                  autoFocus type="text" value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') { setShowAddSection(false); setNewSectionName(''); } }}
                  placeholder="Section name e.g. Terrace"
                  className="flex-1 bg-white border border-gray-200 rounded-xl py-3 px-4 text-[14px] outline-none focus:border-blue-400 disabled:opacity-50"
                  disabled={isSavingSection}
                />
                <button
                  onClick={handleAddSection}
                  disabled={isSavingSection || !newSectionName.trim()}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl text-[13px] font-bold disabled:opacity-50 min-w-[80px] flex items-center justify-center"
                >
                  {isSavingSection ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Add'}
                </button>
                <button
                  onClick={() => { setShowAddSection(false); setNewSectionName(''); }}
                  disabled={isSavingSection}
                  className="px-4 py-3 bg-gray-100 text-gray-400 rounded-xl text-[13px] font-bold disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddSection(true)}
                className="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-[14px] font-semibold text-blue-500 flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Section
              </button>
            )}
          </div>
        </div>
      )}
    </NativeScreen>
  );

  /* ── BILLING ──────────────────────────────────────────────────── */
  const renderBillingScreen = () => (
    <NativeScreen title="Subscription" onBack={() => setActiveSection('home')}>
      {/* Plan card */}
      <div className="mx-4 mt-5 mb-4">
        <div className="bg-blue-600 rounded-3xl p-6 text-white">
          <p className="text-[12px] font-semibold text-blue-200 uppercase tracking-wider mb-1">Current Plan</p>
          <p className="text-[28px] font-black capitalize">{subscription?.plan || 'None'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full',
              subscription?.isValid ? 'bg-emerald-400/30 text-emerald-200' : 'bg-red-400/30 text-red-200')}>
              {subscription?.isValid ? '● Active' : '● Inactive'}
            </span>
            {localAutopay && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/70 flex items-center gap-1">
                <Shield size={10} /> Autopay On
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="px-4 py-5 text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                {subscription?.plan === 'trial' ? 'Trial Days Left' : 'Monthly Cost'}
              </p>
              <p className="text-[24px] font-black text-blue-600">
                {subscription?.plan === 'trial' ? `${subscription?.trialDaysRemaining ?? 0}d` : `₹${subscription?.amount ?? 0}`}
              </p>
            </div>
          </Card>
          <Card>
            <div className="px-4 py-5 text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Autopay</p>
              <p className="text-[24px] font-black text-gray-900">
                {localAutopay ? <span className="text-emerald-500">On</span> : <span className="text-gray-300">Off</span>}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Autopay toggle */}
      <div className="mx-4 mb-4">
        <Card>
          {localAutopay ? (
            <SectionRow
              icon={Shield}
              label="Cancel Autopay"
              sublabel="Subscription expires at end of cycle"
              onPress={handleCancelAutopay}
              danger
              rightEl={<span className="text-[13px] font-bold text-red-500">Cancel</span>}
            />
          ) : subscription?.status === 'active' ? (
            <SectionRow
              icon={Shield}
              label="Enable Autopay"
              sublabel="Keep subscription active automatically"
              onPress={handleEnableAutopay}
              rightEl={<span className="text-[13px] font-bold text-blue-600">Enable</span>}
            />
          ) : null}
        </Card>
      </div>

      {subscription?.trialEndDate && (
        <p className="text-center text-[12px] text-gray-400 font-medium mb-4">
          Trial: {new Date(subscription.trialStartDate).toLocaleDateString('en-IN')} → {new Date(subscription.trialEndDate).toLocaleDateString('en-IN')}
        </p>
      )}

      {/* Payment history */}
      {subscription?.paymentHistory?.length > 0 && (
        <>
          <SectionLabel>Payment History</SectionLabel>
          <div className="mx-4 mb-8">
            <Card>
              {subscription.paymentHistory.map((p, i) => (
                <div key={i}>
                  {i > 0 && <Divider className="ml-[60px]" />}
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', p.status === 'success' ? 'bg-emerald-50' : 'bg-red-50')}>
                      <div className={cn('w-2.5 h-2.5 rounded-full', p.status === 'success' ? 'bg-emerald-500' : 'bg-red-500')} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold text-gray-900 capitalize">{p.method?.replace('_', ' ')}</p>
                      <p className="text-[12px] text-gray-400">{new Date(p.date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-black text-gray-900">₹{p.amount}</p>
                      <span className={cn('text-[10px] font-bold', p.status === 'success' ? 'text-emerald-600' : 'text-red-500')}>{p.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}
    </NativeScreen>
  );

  /* ── STAFF ────────────────────────────────────────────────────── */
  const renderStaffScreen = () => (
    <NativeScreen title="Manage Staff" onBack={() => setActiveSection('home')}>

      {/* Add staff form */}
      {showAddStaff && (
        <div className="mx-4 mb-3">
          <Card>
            <div className="p-4 space-y-3">
              <p className="text-[12px] font-black text-gray-400 uppercase tracking-wider">New Staff Member</p>
              {staffError && <div className="bg-red-50 text-red-600 text-[13px] font-semibold p-3 rounded-xl border border-red-100">{staffError}</div>}
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Name"
                  className="col-span-2 bg-white border border-gray-200 rounded-xl py-3 px-4 text-[14px] outline-none focus:border-blue-400" />
                <input type="tel" value={newStaff.mobileNumber} onChange={e => setNewStaff({ ...newStaff, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="Mobile Number" maxLength={10}
                  className="bg-white border border-gray-200 rounded-xl py-3 px-4 text-[14px] outline-none focus:border-blue-400" />
                <input type="text" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} placeholder="Password (min 4)"
                  className="bg-white border border-gray-200 rounded-xl py-3 px-4 text-[14px] outline-none focus:border-blue-400" />
              </div>
              <div className="flex gap-2">
                {['Waiter', 'Kitchen'].map(role => (
                  <button key={role} onClick={() => setNewStaff({ ...newStaff, role })}
                    className={cn('flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-all',
                      newStaff.role === role ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200')}>
                    {role}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setStaffError('');
                    if (!newStaff.name || !newStaff.mobileNumber || !newStaff.password) { setStaffError('All fields are required.'); return; }
                    if (newStaff.mobileNumber.length < 10) { setStaffError('Enter a valid 10-digit mobile number.'); return; }
                    if (newStaff.password.length < 4) { setStaffError('Password must be at least 4 characters.'); return; }
                    try {
                      await axios.post('/api/staff', newStaff);
                      setNewStaff({ name: '', mobileNumber: '', password: '', role: 'Waiter' });
                      setShowAddStaff(false); fetchStaff();
                    } catch (err) { setStaffError(err.response?.data?.error || 'Failed to create staff.'); }
                  }}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Create
                </button>
                <button onClick={() => { setShowAddStaff(false); setStaffError(''); }} className="px-5 py-3 bg-gray-100 text-gray-500 rounded-xl text-[14px] font-semibold">Cancel</button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Staff list */}
      {staffLoading ? (
        <div className="p-10 text-center text-gray-300 font-semibold animate-pulse text-[14px]">Loading staff...</div>
      ) : staffList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Users size={28} className="text-gray-300" />
          </div>
          <p className="text-[15px] font-semibold text-gray-400">No staff members yet</p>
          <p className="text-[13px] text-gray-300 mt-1">Add waiters or kitchen staff</p>
        </div>
      ) : (
        <div className="mx-4 mb-6 space-y-2">
          {staffList.map(s => (
            <Card key={s._id}>
              {editingStaffId === s._id ? (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <input value={editStaff.name} onChange={e => setEditStaff({ ...editStaff, name: e.target.value })} placeholder="Name"
                      className="bg-white border border-gray-200 rounded-xl py-3 px-4 text-[14px] font-semibold outline-none focus:border-blue-400" />
                    <input type="tel" value={editStaff.mobileNumber} onChange={e => setEditStaff({ ...editStaff, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="Mobile" maxLength={10}
                      className="bg-white border border-gray-200 rounded-xl py-3 px-4 text-[14px] outline-none focus:border-blue-400" />
                    <input type="text" value={editStaff.password} onChange={e => setEditStaff({ ...editStaff, password: e.target.value })} placeholder="New password (optional)"
                      className="bg-white border border-gray-200 rounded-xl py-3 px-4 text-[14px] outline-none focus:border-blue-400" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const payload = { name: editStaff.name, mobileNumber: editStaff.mobileNumber };
                          if (editStaff.password) payload.password = editStaff.password;
                          await axios.patch(`/api/staff/${s._id}`, payload);
                          setEditingStaffId(null); fetchStaff();
                        } catch (err) { alert(err.response?.data?.error || 'Failed to update.'); }
                      }}
                      className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2"
                    >
                      <Check size={15} /> Save
                    </button>
                    <button onClick={() => setEditingStaffId(null)} className="px-5 py-3 bg-gray-100 text-gray-500 rounded-xl text-[14px] font-semibold">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 px-4 py-4">
                  <div className={cn('w-11 h-11 rounded-full flex items-center justify-center shrink-0',
                    s.role === 'Kitchen' ? 'bg-amber-100' : 'bg-blue-100')}>
                    {s.role === 'Kitchen' ? <ChefHat size={20} className="text-amber-600" /> : <Users size={20} className="text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-gray-900">{s.name}</span>
                      <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full uppercase',
                        s.role === 'Kitchen' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600')}>
                        {s.role}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-400 mt-0.5 flex items-center gap-1"><Phone size={10} />{s.mobileNumber}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingStaffId(s._id); setEditStaff({ name: s.name, mobileNumber: s.mobileNumber, password: '' }); }}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Remove ${s.name}?`)) return;
                        try { await axios.delete(`/api/staff/${s._id}`); fetchStaff(); }
                        catch (err) { alert(err.response?.data?.error || 'Failed to delete.'); }
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
          <div className="flex justify-between text-[11px] font-semibold text-gray-400 pt-2 px-1">
            <span>{staffList.filter(s => s.role === 'Waiter').length} waiters</span>
            <span>{staffList.filter(s => s.role === 'Kitchen').length} kitchen</span>
          </div>
        </div>
      )}
      <div className="h-24" />

      {/* Sticky Footer */}
      {!showAddStaff && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20">
          <button
            onClick={() => { setShowAddStaff(true); setStaffError(''); }}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-blue-100"
          >
            <UserPlus size={20} strokeWidth={2.5} /> Add New Staff Member
          </button>
        </div>
      )}
    </NativeScreen>
  );

  /* ── PRINTER ──────────────────────────────────────────────────── */
  const renderPrinterScreen = () => (
    <NativeScreen title="Printer" onBack={() => setActiveSection('home')}>
      {/* Bluetooth / USB tabs */}
      <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10">
        {[['bluetooth', 'Bluetooth', Bluetooth], ['usb', 'USB', Printer]].map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => { setPrinterTab(id); setPrinterPermissionGranted(false); setPrinterScanning(false); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-4 text-[15px] font-bold border-b-2 transition-colors',
              printerTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Content area */}
      {!printerPermissionGranted ? (
        <div className="flex flex-col items-center justify-center px-8 pt-16 pb-32 text-center">
          <div className="w-52 h-52 mb-8 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-44 h-44 rounded-full border-2 border-blue-50" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-2 border-blue-100" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                {printerTab === 'bluetooth'
                  ? <Bluetooth size={36} className="text-blue-400" />
                  : <Printer size={36} className="text-blue-400" />}
              </div>
            </div>
          </div>
          <h2 className="text-[20px] font-bold text-gray-900 mb-3">Permission Required</h2>
          <p className="text-[14px] text-gray-400 leading-relaxed max-w-xs">
            {printerTab === 'bluetooth'
              ? 'Please grant Bluetooth permission to connect to your thermal receipt printer.'
              : 'Please grant USB access permission to connect to your USB thermal printer.'}
          </p>
        </div>
      ) : printerScanning ? (
        <div className="flex flex-col items-center justify-center px-8 pt-24 pb-32 text-center">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6" />
          <p className="text-[16px] font-bold text-gray-900">Scanning for printers…</p>
          <p className="text-[13px] text-gray-400 mt-2">Make sure your printer is on and nearby</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-8 pt-24 pb-32 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Printer size={28} className="text-gray-300" />
          </div>
          <p className="text-[16px] font-bold text-gray-900">No printers found</p>
          <p className="text-[13px] text-gray-400 mt-2">Turn on your printer and try scanning again</p>
          <button
            onClick={() => { setPrinterScanning(true); setTimeout(() => setPrinterScanning(false), 2000); }}
            className="mt-6 px-6 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[14px] font-bold active:scale-95 transition-all"
          >
            Scan Again
          </button>
        </div>
      )}

      {/* Sticky Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20">
        <button
          onClick={handleGrantPrinterPermission}
          disabled={printerScanning}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-blue-100 disabled:opacity-60"
        >
          {printerScanning
            ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting…</>
            : printerPermissionGranted
              ? <><Check size={20} /> Permission Granted</>
              : printerTab === 'bluetooth'
                ? <><Bluetooth size={20} /> Grant Bluetooth Permission</>
                : <><Printer size={20} /> Grant USB Permission</>}
        </button>
      </div>
    </NativeScreen>
  );

  const renderActiveScreen = () => {
    switch (activeSection) {
      case 'restaurant': return renderRestaurantScreen();
      case 'taxes': return renderTaxScreen();
      case 'menu': return renderMenuScreen();
      case 'addMenuItem': return renderAddMenuItemScreen();
      case 'tables': return renderTablesScreen();
      case 'billing': return renderBillingScreen();
      case 'staff': return renderStaffScreen();
      case 'printer': return renderPrinterScreen();
      default: return renderHomeScreen();
    }
  };

  return (
    <div className="h-full bg-white font-sans overflow-hidden relative">
      {renderActiveScreen()}

      {/* Logout Confirmation Bottom Sheet */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowLogoutConfirm(false)}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl translate-y-0 transition-transform duration-300">
            <h3 className="text-[22px] font-bold text-left text-gray-900 mb-2">Log Out?</h3>
            <p className="text-left text-gray-500 text-[15px] mb-8">
              Are you sure you want to log out?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-[14px] text-[15px] font-semibold active:bg-white transition-all"
              >
                No, Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-3.5 bg-[#de3434] text-white rounded-[14px] text-[15px] font-semibold active:scale-[0.98] transition-all"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;