import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useNavigation } from '../navigation/NavigationManager';
import {
  Plus, Trash2, Edit3, Save, X, Check, ToggleLeft, ToggleRight,
  Store, Hash, Utensils, CreditCard, Shield, Leaf, Flame, Coffee,
  IceCream, Search, MapPin, Phone, FileText, Receipt, Percent,
  Users, Eye, EyeOff, ChefHat, UserPlus, Key, LogOut, LayoutGrid,
  ImageIcon, ChevronRight, ChevronLeft, ChevronDown, ArrowLeft,
  Bell, Star, Wifi, Printer, HelpCircle, MessageCircle, Share2,
  Bluetooth, Globe, MessageSquare, Users2, RadioTower, Settings, Copy, CheckCircle2,
  Crown, Zap, BarChart2, Calendar, Gift, Sparkles, ExternalLink, Camera, Loader2, AlertCircle
} from 'lucide-react';
import { TableSettingsSkeleton } from './Skeleton';
import ImageUploader from './ImageUploader';
import { QRCodeSVG } from 'qrcode.react';

const DEFAULT_MENU_CATEGORIES = ['Veg', 'Non-Veg', 'Beverage', 'Dessert'];

const InstagramIcon = ({ size = 16, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

/* ─── tiny helpers ───────────────────────────────────────────────── */
const cn = (...c) => c.filter(Boolean).join(' ');

const SectionRow = ({ icon: Icon, label, sublabel, onPress, rightEl, danger, isActive }) => (
  <button
    onClick={onPress}
    className={cn(
      'w-full flex items-center gap-3 lg:gap-3.5 px-5 py-4 lg:px-4 lg:py-3 transition-colors text-left',
      isActive ? 'bg-[#FF5A36]/5 lg:bg-orange-50/50' : 'bg-white active:bg-gray-50'
    )}
  >
    {Icon && (
      <span className={cn('w-9 h-9 lg:w-8 lg:h-8 rounded-xl lg:rounded-lg flex items-center justify-center shrink-0 transition-colors',
        danger ? 'bg-red-50 text-red-500' 
        : isActive ? 'bg-[#FF5A36] text-white shadow-md shadow-orange-200' 
        : 'bg-blue-50 text-blue-600 lg:bg-slate-50 lg:text-slate-500')}>
        <Icon size={18} className="lg:w-[16px] lg:h-[16px]" />
      </span>
    )}
    <div className="flex-1 min-w-0">
      <p className={cn('text-[15px] lg:text-[14px] font-semibold leading-tight transition-colors', 
        danger ? 'text-red-500' 
        : isActive ? 'text-[#FF5A36]' 
        : 'text-gray-900 lg:text-slate-800')}>{label}</p>
      {sublabel && <p className={cn("text-[12px] lg:text-[11px] mt-0.5 leading-tight transition-colors", isActive ? 'text-orange-900/60' : 'text-gray-400')}>{sublabel}</p>}
    </div>
    {rightEl !== undefined ? rightEl : <ChevronRight size={16} className={cn("shrink-0 transition-colors lg:w-[14px] lg:h-[14px]", isActive ? 'text-[#FF5A36]' : 'text-gray-300')} />}
  </button>
);

const Divider = ({ className }) => <div className={cn('h-px bg-gray-100', className)} />;

const Card = ({ children, className }) => (
  <div className={cn('bg-white rounded-2xl lg:rounded-xl overflow-hidden border border-gray-100 lg:border-slate-200 shadow-sm', className)}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="text-[11px] lg:text-[10px] font-bold text-gray-400 lg:text-slate-500 uppercase tracking-[0.12em] px-5 lg:px-4 pt-5 lg:pt-4 pb-2 lg:pb-1.5">{children}</p>
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
const NativeScreen = ({ title, onBack, backLabel, children, rightAction, isSidebar, showDesktopBack, hideNav = false }) => (
  <div className={cn("flex flex-col h-full overflow-hidden", isSidebar ? "bg-white" : "bg-white lg:bg-slate-50")}>
    {!hideNav && (
      <div className={cn("flex items-center justify-between shrink-0", 
          isSidebar ? "px-4 pt-6 pb-4 bg-white border-b border-gray-100 lg:px-6 lg:pt-0 lg:pb-4 lg:h-auto lg:border-b-0 lg:sticky lg:top-0 lg:z-40" 
          : "px-4 pt-6 pb-4 bg-white border-b border-gray-100 lg:px-8 lg:pt-0 lg:pb-4 lg:h-auto lg:border-b-0 lg:sticky lg:top-0 lg:z-40 lg:bg-transparent")}>
        {onBack && (
          <button onClick={onBack} className={cn("flex items-center gap-0.5 lg:gap-1 text-slate-900 active:opacity-60 hover:text-blue-600 transition-colors", !showDesktopBack && "lg:hidden")}>
            <ChevronLeft size={22} strokeWidth={2.5} className={cn(showDesktopBack && "lg:w-7 lg:h-7 -ml-2")} />
            <span className={cn("text-[17px] font-bold", showDesktopBack && "lg:text-[22px] lg:font-semibold")}>{backLabel || title}</span>
          </button>
        )}
        <div className={cn("hidden lg:block text-[17px] font-semibold text-slate-900 lg:text-[22px]", showDesktopBack && "lg:hidden")}>
           {title || backLabel}
        </div>
        {rightAction && <div className="text-blue-600 text-[15px] font-semibold">{rightAction}</div>}
      </div>
    )}
    <div className={cn("flex-1 overflow-y-auto")} style={{ scrollbarWidth: 'none' }}>
      {children}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const SettingsPanel = ({ user, subscription, onSettingsUpdate, onShowPassword, onLogout, onClose, initialSection = 'home' }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { handleBack: triggerGlobalBack, registerBackInterceptor } = useNavigation();
  const activeSection = searchParams.get('section') || 'home';
  const activeForm = searchParams.get('form');
  const activeModal = searchParams.get('modal');
  const editingIdParam = searchParams.get('id');

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setShowLogoutConfirm(activeModal === 'logout');
    setShowResetConfirm(activeModal === 'reset_loyalty');
    setShowAddForm(activeForm === 'addMenuItem' || activeForm === 'editMenuItem');
    setShowAddStaff(activeForm === 'addStaff' || activeForm === 'editStaff');
    setEditingId(editingIdParam);
  }, [activeModal, activeForm, editingIdParam]);

  const activeSectionRef = React.useRef(activeSection);
  activeSectionRef.current = activeSection;

  const activeFormRef = React.useRef(activeForm);
  activeFormRef.current = activeForm;

  const activeModalRef = React.useRef(activeModal);
  activeModalRef.current = activeModal;

  const setActiveSection = (section, keepParams = false, shouldReplace = false) => {
    const newParams = new URLSearchParams(searchParams);
    if (section === 'home') {
      newParams.delete('section');
    } else {
      newParams.set('section', section);
    }
    if (!keepParams) {
      newParams.delete('form');
      newParams.delete('modal');
      newParams.delete('id');
    }
    // Push forward when entering a sub-section so browser history tracks the step!
    setSearchParams(newParams, { replace: shouldReplace });
  };

  const openForm = (form, id = null) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('form', form);
    if (id) newParams.set('id', id);
    else newParams.delete('id');
    setSearchParams(newParams);
  };

  const closeForm = () => {
    if (window.history.length > 1 && searchParams.get('form')) {
      navigate(-1);
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('form');
      newParams.delete('id');
      setSearchParams(newParams, { replace: true });
    }
  };

  const openModal = (name) => {
    if (name === 'logout') setShowLogoutConfirm(true);
    if (name === 'reset_loyalty') setShowResetConfirm(true);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('modal', name);
    setSearchParams(newParams);
  };

  const closeModal = () => {
    setShowLogoutConfirm(false);
    setShowResetConfirm(false);
    if (window.history.length > 1 && searchParams.get('modal')) {
      navigate(-1);
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('modal');
      setSearchParams(newParams, { replace: true });
    }
  };

  const handleBackToHome = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      setActiveSection('home', false, true);
    }
  };

  const handleBackToMenu = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      setActiveSection('menu', false, true);
    }
  };

  const handleBackToDashboard = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleSettingsBack = React.useCallback(() => {
    const actMod = searchParams.get('modal') || activeModalRef.current;
    const actForm = searchParams.get('form') || activeFormRef.current;
    const actSec = searchParams.get('section') || activeSectionRef.current;

    // 1. Modals (logout, reset_loyalty, etc.)
    if (actMod || showLogoutConfirm || showResetConfirm) {
      closeModal();
      return true;
    }

    // 2. Forms (addMenuItem, editMenuItem, addStaff, editStaff)
    if (actForm) {
      closeForm();
      return true;
    }

    // 3. Sub-sub-section: addMenuItem / editMenuItem -> go back to menu builder
    if (actSec === 'addMenuItem' || actSec === 'editMenuItem') {
      handleBackToMenu();
      return true;
    }

    // 4. Any sub-section (menu, loyalty, restaurant, taxes, tables, staff, printer, billing, password) -> go back to Settings Home
    if (actSec && actSec !== 'home') {
      handleBackToHome();
      return true;
    }

    // 5. Settings Home -> go directly to /dashboard
    handleBackToDashboard();
    return true;
  }, [searchParams, showLogoutConfirm, showResetConfirm, navigate]);

  useEffect(() => {
    return registerBackInterceptor(() => {
      return handleSettingsBack();
    });
  }, [registerBackInterceptor, handleSettingsBack]);

  /* ── Restaurant fields ─────────────────────────────────────────── */
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tableCount, setTableCount] = useState(10);
  const [restaurantLogo, setRestaurantLogo] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoStatus, setLogoStatus] = useState(null);
  const logoInputRef = React.useRef(null);
  const [menuCategoryImages, setMenuCategoryImages] = useState({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [localAutopay, setLocalAutopay] = useState(subscription?.autopayEnabled);

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoStatus({ type: 'error', message: 'Please select a valid image file (PNG, JPG, WEBP, SVG).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoStatus({ type: 'error', message: 'Image size exceeds 5 MB. Please choose a smaller file.' });
      return;
    }

    setLogoStatus(null);
    setLogoUploading(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUri = ev.target.result;
      setLogoPreview(dataUri);

      try {
        const uploadRes = await axios.post('/api/upload', { data: dataUri, folder: 'restro/logos' });
        const uploadedUrl = uploadRes.data.url;
        setRestaurantLogo(uploadedUrl);
        setLogoPreview('');

        // Persist immediately to settings so it stays saved across refresh/logout
        await axios.patch('/api/settings', { restaurantLogo: uploadedUrl });
        if (onSettingsUpdate) onSettingsUpdate();

        setLogoStatus({ type: 'success', message: 'Logo uploaded and saved successfully!' });
        setTimeout(() => setLogoStatus(null), 4000);
      } catch (err) {
        console.error('Logo upload error:', err);
        setLogoPreview('');
        setLogoStatus({
          type: 'error',
          message: err.response?.data?.error || 'Failed to upload logo. Please try again.'
        });
      } finally {
        setLogoUploading(false);
        if (logoInputRef.current) logoInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('Are you sure you want to remove your restaurant logo?')) return;
    setLogoUploading(true);
    try {
      setRestaurantLogo('');
      setLogoPreview('');
      await axios.patch('/api/settings', { restaurantLogo: '' });
      if (onSettingsUpdate) onSettingsUpdate();
      setLogoStatus({ type: 'success', message: 'Logo removed successfully.' });
      setTimeout(() => setLogoStatus(null), 3000);
    } catch (err) {
      console.error('Logo removal error:', err);
      setLogoStatus({ type: 'error', message: 'Failed to remove logo.' });
    } finally {
      setLogoUploading(false);
    }
  };

  useEffect(() => { setLocalAutopay(subscription?.autopayEnabled); }, [subscription?.autopayEnabled]);

  /* ── Tax ───────────────────────────────────────────────────────── */
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxes, setTaxes] = useState([]);
  const [packagingCharge, setPackagingCharge] = useState(20);

  /* ── Password ──────────────────────────────────────────────────── */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

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
  const [menuCategories, setMenuCategories] = useState(DEFAULT_MENU_CATEGORIES);
  const [newCategoryName, setNewCategoryName] = useState('');
  const EMPTY_ITEM = { name: '', category: DEFAULT_MENU_CATEGORIES[0], price: '', image: '', variations: [] };
  const [newItem, setNewItem] = useState({ name: '', category: '', price: '', image: '', variations: [], taxPercentage: 'None', stock: '' });
  const [editItem, setEditItem] = useState({ name: '', category: '', price: '', image: '', variations: [], taxPercentage: 'None', stock: '' });

  useEffect(() => { fetchMenu(); }, []);

  // Sync editItem when navigating directly via URL (e.g. /settings?section=addMenuItem&id=...)
  useEffect(() => {
    if (editingId && menuItems.length > 0) {
      const found = menuItems.find(i => i._id === editingId);
      if (found) {
        setEditItem(prev => {
          if (prev._id === found._id && prev.name === found.name) return prev;
          return {
            _id: found._id,
            name: found.name || '',
            category: found.category || '',
            price: found.price ?? '',
            image: found.image || '',
            variations: found.variations || [],
            taxPercentage: found.taxPercentage ?? 'None',
            stock: found.stock ?? ''
          };
        });
      }
    }
  }, [editingId, menuItems]);

  /* ── Staff ─────────────────────────────────────────────────────── */
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
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
  const fetchTablesData = async () => {
    setTablesLoading(true);
    try {
      const [tablesRes, areasRes] = await Promise.all([axios.get('/api/tables'), axios.get('/api/table-areas')]);
      const t = tablesRes.data || [];
      const a = Array.isArray(areasRes.data) && areasRes.data.length ? areasRes.data : ['Main Floor'];
      setAllTables(t); setTableAreas(a);
    } catch (err) { console.error('Error fetching tables:', err); }
    finally { setTablesLoading(false); }
  };
  useEffect(() => {
    if (activeSection === 'tables') {
      fetchTablesData();
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
      setInstagramUrl(user.instagramUrl || '');
      setTableCount(user.tableCount || 10);
      setRestaurantLogo(user.restaurantLogo || '');
      setMenuCategoryImages(user.menuCategoryImages || {});
      setTaxEnabled(user.taxEnabled || false);
      setPackagingCharge(user.packagingCharge ?? 20);
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
        gstNumber, fssaiNumber, instagramUrl, taxEnabled, taxes, packagingCharge,
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

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill both fields.');
      return;
    }
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      await axios.post('/api/auth/change-password', { currentPassword, newPassword });
      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
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
      closeForm();
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
    <NativeScreen hideNav={true} isSidebar={true}>
      <header className="px-5 pt-6 pb-4 bg-white border-b border-slate-100 sticky top-0 z-40 lg:-mx-6 lg:px-10 lg:pb-2 lg:border-b-0 shrink-0">
        <div className="flex items-center justify-between mb-4 lg:mb-2">
          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-1.5 text-slate-900 active:opacity-60 transition-opacity"
              onClick={handleBackToDashboard}
              title="Back to Dashboard"
            >
              <ChevronLeft size={22} strokeWidth={2.5} className="lg:hidden text-slate-800 -ml-1" />
              <h1 className="text-[17px] font-semibold text-slate-900 lg:text-[22px]">Settings</h1>
            </button>
          </div>
          {/* Avatar */}
          <button
            onClick={() => setActiveSection('restaurant')}
            className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm"
          >
            {restaurantLogo ? (
              <img src={restaurantLogo} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-slate-600 font-semibold text-[15px]">{(restaurantName || 'R')[0].toUpperCase()}</span>
            )}
          </button>
        </div>
      </header>

      {/* Section 1 */}
      <SectionLabel>Menu & Orders</SectionLabel>
      <div className="mx-4 mb-3">
        <Card>
          <SectionRow icon={Utensils} label="Menu Builder" sublabel="Add, edit, toggle items" onPress={() => setActiveSection('menu')} isActive={activeSection === 'menu'} />
          <Divider className="ml-[72px]" />
          <SectionRow icon={Percent} label="Tax Configuration" sublabel={taxEnabled ? 'Taxes enabled' : 'Taxes off'} onPress={() => setActiveSection('taxes')} isActive={activeSection === 'taxes'} />
          <Divider className="ml-[72px]" />
          <SectionRow icon={LayoutGrid} label="Table Management" sublabel={`${allTables.length} tables · ${tableAreas.length} sections`} onPress={() => setActiveSection('tables')} isActive={activeSection === 'tables'} />
        </Card>
      </div>

      {/* Section 2 */}
      <SectionLabel>Reach & Marketing</SectionLabel>
      <div className="mx-4 mb-3">
        <Card>
          <SectionRow icon={Users} label="Daily Loyalty QR" sublabel="Generate attendance QR for customers" onPress={() => setActiveSection('loyalty')} isActive={activeSection === 'loyalty'} />
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
          <SectionRow icon={Users2} label="Staff Management" sublabel={`${staffList.length} members`} onPress={() => setActiveSection('staff')} isActive={activeSection === 'staff'} />
        </Card>
      </div>

      {/* Section 4 — Hardware */}
      <SectionLabel>Hardware</SectionLabel>
      <div className="mx-4 mb-3">
        <Card>
          <SectionRow icon={Printer} label="Printer" sublabel="Connect Bluetooth or USB printer" onPress={() => setActiveSection('printer')} isActive={activeSection === 'printer'} />
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
            isActive={activeSection === 'billing'}
            rightEl={
              <div className="flex items-center gap-2">
                <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full',
                  subscription?.isValid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>
                  {subscription?.isValid ? 'Active' : 'Inactive'}
                </span>
                <ChevronRight size={16} className={cn("shrink-0 transition-colors", activeSection === 'billing' ? 'text-[#FF5A36]' : 'text-gray-300')} />
              </div>
            }
          />
          <Divider className="ml-[72px]" />
          <SectionRow icon={Key} label="Change Password" onPress={() => setActiveSection('password')} />
          <Divider className="ml-[72px]" />
          {onLogout && <SectionRow icon={LogOut} label="Log Out" onPress={() => openModal('logout')} danger />}
        </Card>
      </div>

      <div className="h-10 lg:h-32" />
    </NativeScreen>
  );

  /* ── RESTAURANT PROFILE ─────────────────────────────────────────── */
  const renderRestaurantScreen = () => (
    <NativeScreen title="Business Details" onBack={handleBackToHome}>
      {/* ── Logo Drop Area ── */}
      <div className="mx-4 mt-2 lg:mt-0 mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em]">Restaurant Logo</p>
          {(restaurantLogo || logoPreview) && !logoUploading && (
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Check size={12} strokeWidth={2.5} /> Active Logo
            </span>
          )}
        </div>

        {/* Status Alerts */}
        {logoStatus && (
          <div className={cn(
            "mb-3 p-3 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200",
            logoStatus.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-rose-50 text-rose-700 border border-rose-200/60"
          )}>
            <div className="flex items-center gap-2">
              {logoStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{logoStatus.message}</span>
            </div>
            <button onClick={() => setLogoStatus(null)} className="p-1 hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleLogoSelect}
        />

        {/* Logo Card Preview */}
        <div
          onClick={() => !logoUploading && logoInputRef.current?.click()}
          className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer group transition-all hover:border-blue-400"
          style={{ aspectRatio: '16/9' }}
        >
          {logoPreview || restaurantLogo ? (
            <div className="w-full h-full relative">
              <img
                src={logoPreview || restaurantLogo}
                alt="Restaurant Logo"
                className="w-full h-full object-cover"
              />
              {!logoUploading && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                  <Camera size={26} />
                  <span className="text-xs font-bold">Tap to Change Logo</span>
                </div>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                <Store size={28} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-gray-700">Tap to upload restaurant logo</p>
                <p className="text-[11px] text-gray-400 mt-0.5">PNG, JPG, WEBP, SVG up to 5 MB</p>
              </div>
            </div>
          )}

          {/* Uploading Spinner Overlay */}
          {logoUploading && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-white z-20">
              <Loader2 size={30} className="animate-spin text-white" />
              <p className="text-xs font-bold tracking-wide">Uploading & Saving Logo...</p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => !logoUploading && logoInputRef.current?.click()}
            disabled={logoUploading}
            className="flex-1 py-2.5 px-4 bg-white border border-gray-200 hover:border-gray-300 active:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
          >
            <Camera size={14} className="text-blue-500" />
            {restaurantLogo ? 'Change Logo' : 'Choose Logo Image'}
          </button>
          {restaurantLogo && (
            <button
              type="button"
              onClick={handleRemoveLogo}
              disabled={logoUploading}
              className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/60 rounded-xl text-xs font-bold text-rose-600 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Trash2 size={14} />
              Remove
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
          <NativeInput label="Instagram Link" value={instagramUrl} onChange={setInstagramUrl} placeholder="https://instagram.com/myrestaurant or @myrestaurant" icon={InstagramIcon} />
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

      {/* ── Public Restaurant Page Link ── */}
      <SectionLabel>Public Restaurant Page</SectionLabel>
      <div className="mx-4 mb-3">
        <Card>
          <div className="p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Globe size={14} className="text-blue-500" />
                Live Customer Link
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                Publicly Accessible
              </span>
            </div>
            <p className="text-[12px] text-gray-500 leading-relaxed">
              Customers can visit this link anytime without logging in to view your branding, attendance punch card, and menu.
            </p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <span className="text-xs font-mono text-gray-600 truncate flex-1">
                {`${getLoyaltyBaseUrl()}/restro/${user?.slug || (restaurantName ? restaurantName.toLowerCase().replace(/\s+/g, '-') : 'canvas-grove')}`}
              </span>
              <button
                type="button"
                onClick={() => handleCopyLoyaltyLink(`${getLoyaltyBaseUrl()}/restro/${user?.slug || (restaurantName ? restaurantName.toLowerCase().replace(/\s+/g, '-') : 'canvas-grove')}`)}
                className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                title="Copy Public Link"
              >
                {copiedLoyaltyLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
              <a
                href={`${getLoyaltyBaseUrl()}/restro/${user?.slug || (restaurantName ? restaurantName.toLowerCase().replace(/\s+/g, '-') : 'canvas-grove')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                title="Preview Public Page"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </Card>
      </div>

      <div className="h-24" />

      {/* ── Sticky Save Footer ── */}
      <div
        className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
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
    <NativeScreen title="Tax Configuration" onBack={handleBackToHome}>
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

      {/* Packaging Charge Configuration */}
      <SectionLabel>Packaging Charges</SectionLabel>
      <div className="mx-4 mb-6">
        <Card>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-[15px] font-semibold text-gray-900">Per-Unit Package Charge</p>
              <p className="text-[12px] text-gray-400 mt-0.5">Applied as a flat rate per parcel pack</p>
            </div>
            <div className="relative w-24">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
              <input
                type="number"
                value={packagingCharge}
                onChange={e => setPackagingCharge(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl py-2 pl-7 pr-3 text-[14px] font-bold outline-none focus:border-blue-400"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="h-24" />

      {/* Sticky Save Footer */}
      <div
        className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
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

  /* ── LOYALTY PROGRAM ────────────────────────────────────────────── */
  const [loyaltyCode, setLoyaltyCode] = useState('');
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyTab, setLoyaltyTab] = useState('attendance');

  const fetchLoyaltyCode = async (isBackground = false) => {
    if (!isBackground) setLoyaltyLoading(true);
    try {
      const res = await axios.get('/api/loyalty/code');
      setLoyaltyCode(res.data.code);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isBackground) setLoyaltyLoading(false);
    }
  };

  const handleResetLoyalty = async () => {
    if (!window.confirm('Are you sure you want to reset the streak for ALL customers of your restaurant? This action cannot be undone.')) return;
    try {
      await axios.post('/api/loyalty/reset');
      alert('All customer streaks have been successfully reset.');
    } catch (err) {
      alert('Failed to reset streaks.');
    }
  };

  useEffect(() => {
    let intervalId;
    if (activeSection === 'loyalty') {
      fetchLoyaltyCode();
      // Poll every 3 seconds in the background
      intervalId = setInterval(() => fetchLoyaltyCode(true), 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeSection]);

  const [copiedLoyaltyLink, setCopiedLoyaltyLink] = useState(false);

  const getLoyaltyBaseUrl = () => {
    const raw = (import.meta.env.VITE_APP_URL || import.meta.env.VITE_CLIENT_URL || window.location.origin || '').trim();
    if (!raw) return window.location.origin;
    let base = raw.replace(/\/+$/, '');
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      base = (base.includes('localhost') || base.includes('127.0.0.1')) ? `http://${base}` : `https://${base}`;
    }
    return base;
  };

  const handleCopyLoyaltyLink = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLoyaltyLink(true);
    setTimeout(() => setCopiedLoyaltyLink(false), 2000);
  };

  const renderLoyaltyScreen = () => {
    const baseUrl = getLoyaltyBaseUrl();
    const restroIdentifier = user?.slug || (restaurantName ? restaurantName.toLowerCase().replace(/\s+/g, '-') : user?.id || user?._id);
    const qrUrl = loyaltyCode ? `${baseUrl}/restro/${restroIdentifier}?c=${loyaltyCode}` : '';
    const statusUrl = `${baseUrl}/restro/${restroIdentifier}`;
    const activeUrl = loyaltyTab === 'attendance' ? qrUrl : statusUrl;

    return (
      <NativeScreen title="Loyalty Program" onBack={handleBackToHome}>
        {/* Tab Selector - matching Printer UI */}
        <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
          {[
            ['attendance', 'Check-In', CheckCircle2], 
            ['dashboard', 'Dashboard', LayoutGrid]
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setLoyaltyTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-4 text-[15px] font-bold border-b-2 transition-colors',
                loyaltyTab === id ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400'
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center py-10 px-5 text-center bg-white min-h-[calc(100vh-150px)]">
          {loyaltyLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col w-full max-w-sm mx-auto">
              {/* Dynamic QR Area */}
              <div>
                {loyaltyTab === 'attendance' ? (
                  <div className="animate-in fade-in duration-300">
                    <div className="mb-4 mt-2 inline-block">
                      {qrUrl && <QRCodeSVG value={qrUrl} size={220} />}
                    </div>
                    <h3 className="text-[17px] font-bold text-gray-900 mb-1">Attendance Scanner</h3>
                    <p className="text-[13px] text-gray-500 max-w-[250px] mx-auto mb-3">
                      Customers scan this to get +1 visit today. Code resets automatically every day.
                    </p>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-300">
                    <div className="mb-4 mt-2 inline-block">
                      {statusUrl && <QRCodeSVG value={statusUrl} size={220} />}
                    </div>
                    <h3 className="text-[17px] font-bold text-gray-900 mb-1">Customer Dashboard</h3>
                    <p className="text-[13px] text-gray-500 max-w-[250px] mx-auto mb-3">
                      Customers scan this to view their loyalty card without marking attendance.
                    </p>
                  </div>
                )}

                {/* Direct Link & Copy/Preview Action */}
                {activeUrl && (
                  <div className="mt-2 mb-8 flex flex-col items-center w-full">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 max-w-full shadow-sm">
                      <p className="text-[12px] font-mono text-slate-600 truncate max-w-[210px] select-all">
                        {activeUrl}
                      </p>
                      <div className="flex items-center gap-1 shrink-0 border-l border-slate-200 pl-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLoyaltyLink(activeUrl)}
                          className="p-1.5 hover:bg-white active:scale-95 rounded-lg text-slate-500 hover:text-slate-900 transition-all"
                          title="Copy Link"
                        >
                          {copiedLoyaltyLink ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                        </button>
                        <a
                          href={activeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-white active:scale-95 rounded-lg text-slate-500 hover:text-blue-600 transition-all"
                          title="Open Link Preview"
                        >
                          <ExternalLink size={15} />
                        </a>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                      Base URL configured via <span className="font-mono text-slate-500">.env</span> (VITE_APP_URL)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-24" />

        {/* Sticky Reset Footer (matching Printer/Staff style) */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <button
            onClick={() => openModal('reset_loyalty')}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-red-200"
          >
            <Trash2 size={20} strokeWidth={2.5} /> Reset All Streaks
          </button>
        </div>
      </NativeScreen>
    );
  };

  /* ── MENU ─────────────────────────────────────────────────────── */
  const renderMenuScreen = () => (
    <NativeScreen 
      title="Menu Builder" 
      onBack={handleBackToHome}
      rightAction={
        <div className="hidden lg:block">
          <button
            onClick={() => {
              setNewItem({ name: '', category: categoryOptions[0], price: '', image: '', variations: [], taxPercentage: 'None', stock: '' });
              setActiveSection('addMenuItem');
            }}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[14px] font-bold shadow-md shadow-blue-200 active:scale-[0.98] transition-all flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={18} strokeWidth={2.5} /> Add Menu Item
          </button>
        </div>
      }
    >
      {/* Search + filter */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 lg:px-8 lg:py-5 space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:bg-transparent lg:border-none">
        <div className="relative lg:max-w-xs w-full shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search Menu"
            value={menuSearch}
            onChange={e => setMenuSearch(e.target.value)}
            className="w-full bg-white lg:bg-white border border-gray-200 rounded-xl py-3 lg:py-2.5 pl-11 pr-4 text-[15px] lg:text-[14px] text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-medium transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          {['All', ...categoryOptions].map(cat => (
            <button
              key={cat}
              onClick={() => setMenuFilter(cat)}
              className={cn(
                'px-6 py-2 lg:px-5 lg:py-2 rounded-xl text-[13px] font-bold whitespace-nowrap border transition-all uppercase tracking-wider',
                menuFilter === cat ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
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
            className="px-4 py-2 rounded-xl border border-dashed border-blue-300 text-blue-600 bg-blue-50/50 hover:bg-blue-50 flex items-center justify-center shrink-0 transition-colors"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 pb-32 lg:pb-12 lg:px-8">
        {Object.entries(menuItemsByCategory).map(([category, items]) => {
          const bgColors = [
            'lg:bg-slate-200', 'lg:bg-blue-100', 'lg:bg-rose-100',
            'lg:bg-emerald-100', 'lg:bg-amber-100', 'lg:bg-violet-100',
            'lg:bg-cyan-100', 'lg:bg-fuchsia-100'
          ];
          const colorIndex = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % bgColors.length;
          const categoryBgColor = bgColors[colorIndex];

          return (
          <div key={category} className={cn("mt-4 lg:mt-6 lg:p-6 lg:rounded-3xl lg:border lg:border-slate-100", categoryBgColor)}>
            <div className="px-5 py-3 lg:px-2 lg:mb-4 flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] lg:text-[18px] font-black text-gray-900 uppercase tracking-widest">{category}</h3>
                <span className="text-[11px] lg:text-[12px] font-bold text-slate-500 bg-white/60 px-2 py-0.5 rounded-md">{items.length}</span>
              </div>
              <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleRenameCategory(category)} className="p-2 lg:p-1.5 text-gray-400 hover:text-blue-600 bg-white lg:rounded-md transition-colors">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDeleteCategory(category)} className="p-2 lg:p-1.5 text-gray-400 hover:text-red-600 bg-white lg:rounded-md transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            {/* Quick-Order Style Grid Layout for Desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 lg:bg-transparent lg:border-none">
              {items.map((item, idx) => (
                <div key={item._id}
                  onClick={() => { 
                    setEditItem({ ...item, stock: item.stock || '' }); 
                    const params = new URLSearchParams(searchParams);
                    params.set('section', 'addMenuItem');
                    params.set('id', item._id);
                    setSearchParams(params);
                  }}
                  className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm flex flex-col cursor-pointer hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98]"
                >
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-100 relative group-hover:border-blue-100">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <ImageIcon size={28} className="text-slate-300 mb-1.5" />
                        <span className="text-[11px] font-bold text-slate-400">No Image</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category}</span>
                    </div>
                  </div>

                  <h3 className="text-[15px] lg:text-[17px] font-bold text-slate-900 leading-tight mb-1.5">{item.name}</h3>
                  
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <p className="text-[15px] lg:text-[16px] font-black text-slate-900">₹{item.price}</p>
                    {item.variations?.length > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wide">
                        {item.variations.length} Vars
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )})}
      </div>

      {/* Fixed Add Button (Hidden on Desktop) */}
      <div
        className="fixed bottom-6 left-4 right-4 z-20 lg:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        <button
          onClick={() => {
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
      <NativeScreen title={isEdit ? "Edit Menu Item" : "Add Menu Item"} onBack={handleBackToMenu} showDesktopBack={true}>
        <div className="pb-32 lg:pb-12">
          <div className="bg-white lg:bg-transparent px-5 py-6 lg:px-8 lg:py-8 lg:grid lg:grid-cols-[1fr_1.5fr] lg:gap-12 space-y-6 lg:space-y-0">
            
            {/* LEFT COLUMN: Image Uploader */}
            <div className="order-first lg:order-none lg:sticky lg:top-[120px] self-start space-y-4">
              <div className="hidden lg:block">
                <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Item Photo</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-1">Upload a high-quality image of the dish to increase sales.</p>
              </div>
              <label className="block text-[13px] font-medium text-gray-500 mb-2 lg:hidden">Item Image</label>
              <div className="relative w-full aspect-[4/3] rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 lg:border-slate-300 overflow-hidden flex flex-col items-center justify-center gap-3 transition-colors hover:bg-slate-100 group">
                {data.image ? (
                  <img src={data.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="pointer-events-none flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
                      <ImageIcon size={28} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <p className="text-[14px] font-bold text-slate-400 group-hover:text-blue-500 transition-colors">Tap to upload image</p>
                  </div>
                )}
                
                {/* Always-on overlay */}
                <div className="absolute inset-0 z-0">
                  <ImageUploader
                    value={data.image}
                    onChange={url => setData({ ...data, image: url })}
                    label=""
                    shape="full"
                    folder="restro/menu"
                    className="w-full h-full"
                  />
                </div>

                {/* Remove button */}
                {data.image && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setData({ ...data, image: '' }); }}
                    className="absolute top-4 right-4 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white active:scale-95 transition-all z-10 hover:bg-red-500"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Form Details */}
            <div className="space-y-6 lg:bg-white lg:p-8 lg:rounded-3xl lg:border lg:border-slate-200 lg:shadow-sm">
              <div className="hidden lg:block border-b border-slate-100 pb-5 mb-6">
                <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Item Details</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-1">Configure pricing, categories, and variations.</p>
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-[13px] font-medium text-gray-500 mb-2">Item Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={data.name}
                  onChange={e => setData({ ...data, name: e.target.value })}
                  placeholder="e.g. Garlic Naan"
                  className="w-full bg-white lg:bg-slate-50 border border-gray-200 rounded-xl py-3.5 px-4 text-[15px] outline-none focus:border-blue-400 focus:bg-white font-medium placeholder:text-gray-300 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-500 mb-2">Category</label>
                  <div className="relative">
                    <select
                      value={data.category}
                      onChange={e => setData({ ...data, category: e.target.value })}
                      className="w-full bg-white lg:bg-slate-50 border border-gray-200 rounded-xl py-3.5 px-4 text-[15px] outline-none appearance-none font-medium text-gray-900 focus:border-blue-400 focus:bg-white transition-colors"
                    >
                      <option value="" disabled>Select</option>
                      {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>

                {/* Sale Price */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-500 mb-2">Base Price (₹)</label>
                  <input
                    type="number"
                    value={data.price}
                    onChange={e => setData({ ...data, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white lg:bg-slate-50 border border-gray-200 rounded-xl py-3.5 px-4 text-[15px] outline-none focus:border-blue-400 focus:bg-white font-bold placeholder:text-gray-300 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Stock */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-500 mb-2">Available Stock</label>
                  <input
                    type="number"
                    value={data.stock}
                    onChange={e => setData({ ...data, stock: e.target.value })}
                    placeholder="Leave empty for infinite"
                    className="w-full bg-white lg:bg-slate-50 border border-gray-200 rounded-xl py-3.5 px-4 text-[15px] outline-none focus:border-blue-400 focus:bg-white font-medium placeholder:text-gray-300 transition-colors"
                  />
                </div>
              </div>

              {/* Variations */}
              <div className="space-y-4 pt-4 lg:border-t lg:border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[14px] font-bold text-gray-900 block">Variations</label>
                    <p className="text-[12px] font-medium text-gray-400">Add different sizes or options (max 5)</p>
                  </div>
                  {data.variations.length < 5 && (
                    <button type="button" onClick={() => addVariation(isEdit)}
                      className="text-[13px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl active:scale-95 transition-all">
                      + Add Option
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {data.variations.map((v, idx) => (
                    <div key={idx} className="flex gap-3 items-center bg-white lg:bg-slate-50 p-3 lg:p-4 rounded-2xl border border-gray-100 lg:border-slate-200">
                      <input
                        type="text"
                        value={v.name}
                        onChange={e => updateVariation(idx, 'name', e.target.value, isEdit)}
                        placeholder="e.g. Full Size"
                        className="flex-1 bg-transparent text-[14px] lg:text-[15px] font-semibold outline-none"
                      />
                      <div className="w-[1px] h-6 bg-gray-200" />
                      <input
                        type="number"
                        value={v.price}
                        onChange={e => updateVariation(idx, 'price', e.target.value, isEdit)}
                        placeholder="₹0"
                        className="w-24 bg-transparent text-[14px] lg:text-[15px] font-bold outline-none text-right"
                      />
                      <button type="button" onClick={() => removeVariation(idx, isEdit)} className="text-gray-300 hover:text-red-500 ml-2 p-1 bg-white lg:bg-transparent rounded-lg">
                        <X size={20} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                  {data.variations.length === 0 && (
                    <div className="py-6 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center">
                      <p className="text-[13px] font-semibold text-slate-400">No variations added</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Desktop specific buttons (hidden on mobile) */}
              <div className="hidden lg:flex gap-3 pt-6 lg:border-t lg:border-slate-100 mt-8">
                {isEdit ? (
                  <button
                    onClick={() => { handleDeleteItem(editingId); handleBackToMenu(); }}
                    className="px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold flex items-center justify-center shrink-0 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                ) : (
                  <button
                    onClick={handleBackToMenu}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[15px] font-bold transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => isEdit ? handleEditItem(editingId) : handleAddItem({ preventDefault: () => { } })}
                  className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[15px] font-bold shadow-lg shadow-blue-200 active:scale-[0.98] transition-all"
                >
                  {isEdit ? "Update Item" : "Save Item"}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Mobile Footer Buttons (Hidden on Desktop) */}
        <div
          className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-3 z-30 lg:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          {isEdit ? (
            <button
              type="button"
              onClick={() => { handleDeleteItem(editingId); handleBackToMenu(); }}
              className="w-14 h-14 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl flex items-center justify-center shrink-0 active:scale-95 transition-all"
            >
              <Trash2 size={24} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBackToMenu}
              className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-gray-500 rounded-2xl text-[16px] font-bold"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => isEdit ? handleEditItem(editingId) : handleAddItem({ preventDefault: () => { } })}
            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[16px] font-bold shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isEdit ? "Update Item" : "Save Item"}
          </button>
        </div>
      </NativeScreen>
    );
  };

  /* ── TABLES ───────────────────────────────────────────────────── */
  const renderTablesScreen = () => (
    <NativeScreen title="Table Management" onBack={handleBackToHome}>
      {tableError && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600 font-semibold">{tableError}</div>
      )}

      {tablesLoading ? (
        <div className="flex items-center justify-center py-16">
          <span className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
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
    <NativeScreen title="Subscription" onBack={handleBackToHome}>
      <div className="mx-4 mt-5 mb-4 space-y-4 pb-20">
        
        {/* Current Plan card */}
        <div className="relative overflow-hidden bg-[#2672ff] rounded-3xl p-6 text-white shadow-xl shadow-blue-500/30">
          <svg className="absolute bottom-0 left-0 w-full translate-y-2 opacity-50" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="rgba(255,255,255,0.2)" d="M0,224L80,213.3C160,203,320,181,480,186.7C640,192,800,224,960,224C1120,224,1280,192,1360,176L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
          </svg>
          <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="rgba(255,255,255,0.15)" d="M0,160L80,176C160,192,320,224,480,229.3C640,235,800,213,960,202.7C1120,192,1280,192,1360,192L1440,192L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
          </svg>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-blue-200 uppercase tracking-widest mb-1">Current Plan</p>
              <p className="text-[32px] font-black capitalize leading-none mb-3">{subscription?.plan || 'Super'}</p>
              <span className={cn('text-[11px] font-bold px-3 py-1.5 rounded-full', subscription?.isValid ? 'bg-emerald-400/80 text-white' : 'bg-red-400/80 text-white')}>
                {subscription?.isValid ? '● Active' : '● Inactive'}
              </span>
            </div>
            <div className="relative pt-2">
              <div className="absolute inset-0 bg-yellow-400 blur-[30px] opacity-40"></div>
              <Sparkles size={16} className="absolute -top-2 left-0 text-yellow-300" fill="currentColor" />
              <Sparkles size={12} className="absolute bottom-2 -right-3 text-yellow-300" fill="currentColor" />
              <Crown size={56} className="text-yellow-400 drop-shadow-2xl relative z-10" strokeWidth={1} fill="#ffc107" />
            </div>
          </div>
        </div>

        {/* Yearly Cost */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-[#f0f5ff] to-slate-50 rounded-3xl p-6 shadow-sm border border-blue-50 flex flex-col items-center justify-center">
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-28 h-28 bg-white rounded-full blur-none opacity-80 mix-blend-overlay"></div>
          <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-28 h-28 bg-white rounded-full blur-none opacity-80 mix-blend-overlay"></div>
          
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 z-10">Yearly</p>
          <div className="flex items-center gap-3 z-10">
            <Sparkles size={14} className="text-blue-400 opacity-60" />
            <p className="text-[44px] font-black text-[#2672ff] leading-none">₹{subscription?.amount ?? 2}</p>
            <Sparkles size={14} className="text-blue-400 opacity-60" />
          </div>
        </div>

        {/* What's included? */}
        <div className="bg-[#f8f9fc] rounded-3xl p-6 border border-slate-100/50">
          <h3 className="text-[17px] font-black text-slate-900 mb-6">What's included?</h3>
          <div className="space-y-6">
            <div className="flex gap-4 items-center">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 text-[#2672ff] flex items-center justify-center shrink-0">
                <Zap size={22} fill="currentColor" strokeWidth={0} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-slate-800">Unlimited Access</p>
                <p className="text-[12px] text-slate-500 font-medium">Enjoy all premium features</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-center">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-500 flex items-center justify-center shrink-0">
                <BarChart2 size={22} strokeWidth={3} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-slate-800">Detailed Reports</p>
                <p className="text-[12px] text-slate-500 font-medium">Get in-depth insights</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-center">
              <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                <Crown size={22} fill="currentColor" strokeWidth={0} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-slate-800">Priority Support</p>
                <p className="text-[12px] text-slate-500 font-medium">Get faster help when you need it</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-center">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-500 flex items-center justify-center shrink-0">
                <Star size={22} fill="currentColor" strokeWidth={0} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-slate-800">New Features First</p>
                <p className="text-[12px] text-slate-500 font-medium">Be the first to try new updates</p>
              </div>
            </div>
          </div>
        </div>

        {/* You're all set! */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#f3efff] to-[#ebe4ff] rounded-3xl p-5 border border-purple-100/50 mt-2">
          <div className="flex gap-4 relative z-10 items-center">
            <div className="flex-1">
              <p className="text-[16px] font-bold text-purple-900 mb-1">You're all set!</p>
              <p className="text-[12px] font-medium text-purple-600/80 leading-relaxed pr-2">
                Your <span className="capitalize">{subscription?.plan || 'Super'}</span> plan is active. Keep enjoying all the premium benefits!
              </p>
            </div>
            <div className="relative shrink-0 pr-2">
              <div className="absolute inset-0 bg-yellow-300 blur-2xl opacity-60 rounded-full w-12 h-12"></div>
              <Sparkles size={12} className="absolute -top-2 -left-2 text-yellow-400" fill="currentColor" strokeWidth={0} />
              <Sparkles size={16} className="absolute bottom-2 -left-4 text-yellow-400 opacity-70" fill="currentColor" strokeWidth={0} />
              <Gift size={46} className="text-[#6d28d9] relative z-10 drop-shadow-xl" fill="#a855f7" strokeWidth={1} />
            </div>
          </div>
        </div>

      </div>
    </NativeScreen>
  );

  /* ── STAFF ────────────────────────────────────────────────────── */
  const renderStaffScreen = () => (
    <NativeScreen title="Manage Staff" onBack={handleBackToHome}>

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
                      closeForm(); fetchStaff();
                    } catch (err) { setStaffError(err.response?.data?.error || 'Failed to create staff.'); }
                  }}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Create
                </button>
                <button onClick={() => { closeForm(); setStaffError(''); }} className="px-5 py-3 bg-gray-100 text-gray-500 rounded-xl text-[14px] font-semibold">Cancel</button>
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
                          closeForm(); fetchStaff();
                        } catch (err) { alert(err.response?.data?.error || 'Failed to update.'); }
                      }}
                      className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2"
                    >
                      <Check size={15} /> Save
                    </button>
                    <button onClick={() => closeForm()} className="px-5 py-3 bg-gray-100 text-gray-500 rounded-xl text-[14px] font-semibold">Cancel</button>
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
                    <button onClick={() => { setEditStaff({ name: s.name, mobileNumber: s.mobileNumber, password: '' }); openForm('editStaff', s._id); }}
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
        <div
          className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <button
            onClick={() => { openForm('addStaff'); setStaffError(''); }}
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
    <NativeScreen title="Printer" onBack={handleBackToHome}>
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
      <div
        className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
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

  const renderPasswordScreen = () => (
    <NativeScreen title="Change Password" onBack={handleBackToHome}>
      <div className="mx-4 mt-6 pb-24">
        <Card>
          <div className="p-5 space-y-4">
            {passwordError && <div className="text-[13px] font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{passwordError}</div>}
            {passwordSuccess && <div className="text-[13px] font-bold text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">{passwordSuccess}</div>}
            
            <div>
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Current Password</p>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-[14px] font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div>
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">New Password</p>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-[14px] font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Sticky Save Footer */}
      <div
        className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-20"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <button
          onClick={handleChangePassword}
          disabled={passwordSaving}
          className="w-full py-4 bg-[#FF5A36] text-white rounded-2xl text-[16px] font-bold active:scale-[0.98] transition-all shadow-lg shadow-orange-100 disabled:opacity-50"
        >
          {passwordSaving ? 'Updating...' : 'Update Password'}
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
      case 'loyalty': return renderLoyaltyScreen();
      case 'password': return renderPasswordScreen();
      default: return renderHomeScreen();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-white lg:bg-slate-50 overflow-hidden -mx-2 lg:-mx-4 lg:-mt-4 font-sans relative">
      {/* ── LEFT: Sidebar Menu (Hidden on mobile if not home) ── */}
      <div className={cn(
        "w-full lg:w-[320px] bg-white flex-col shrink-0 border-r border-slate-200 z-10 h-full overflow-hidden",
        activeSection !== 'home' ? "hidden lg:flex" : "flex"
      )}>
        {renderHomeScreen()}
      </div>

      {/* ── RIGHT: Content Area (Hidden on mobile if home) ── */}
      <div className={cn(
        "flex-1 flex-col min-w-0 bg-white lg:bg-slate-50 h-full overflow-hidden relative",
        activeSection === 'home' ? "hidden lg:flex items-center justify-center" : "flex"
      )}>
        {activeSection === 'home' ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 mb-4">
              <Settings size={32} className="text-slate-300" />
            </div>
            <h2 className="text-[18px] font-bold text-slate-800">Select a Setting</h2>
            <p className="text-[14px] text-slate-500 mt-2 max-w-[250px]">Choose an option from the left menu to view and manage.</p>
          </div>
        ) : (
          renderActiveScreen()
        )}
      </div>

      {/* Logout Confirmation Bottom Sheet */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => closeModal()}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl translate-y-0 transition-transform duration-300">
            <h3 className="text-[22px] font-bold text-left text-gray-900 mb-2">Log Out?</h3>
            <p className="text-left text-gray-500 text-[15px] mb-8">
              Are you sure you want to log out?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => closeModal()}
                className="flex-1 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-[14px] text-[15px] font-semibold active:bg-white transition-all"
              >
                No, Cancel
              </button>
              <button
                onClick={() => {
                  closeModal();
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

      {/* Reset Loyalty Confirmation Bottom Sheet */}
      {showResetConfirm && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => closeModal()}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl translate-y-0 transition-transform duration-300">
            <h3 className="text-[22px] font-bold text-left text-gray-900 mb-2">Reset Streaks?</h3>
            <p className="text-left text-gray-500 text-[15px] mb-8">
              Are you sure you want to reset all customer visit streaks back to 0? This cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => closeModal()}
                className="flex-1 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-[14px] text-[15px] font-semibold active:bg-white transition-all"
              >
                No, Cancel
              </button>
              <button
                onClick={() => {
                  closeModal();
                  handleResetLoyalty();
                }}
                className="flex-1 py-3.5 bg-[#de3434] text-white rounded-[14px] text-[15px] font-semibold active:scale-[0.98] transition-all"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;