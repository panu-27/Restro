import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Store, Search, CheckCircle2,
  UtensilsCrossed, Loader2,
  Plus, Minus, X, ArrowRight,
  Phone, Send, Check
} from 'lucide-react';

/* ── Sweetgreen Exact UI Color Palette Tokens ── */
const CANVAS = '#F5F3E9';
const FOREST = '#003B21';
const HERO_BG = '#004A3D';
const LIME = '#E2FF3B';
const MINT_BG = '#D1E2D3';
const TAN_BG = '#E7DFC6';

// Helper to filter out cigarette / tobacco items and nav categories strictly from this public menu page
const isCigaretteCategory = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /cig[ga]r|ciggerate|cigarette/i.test(str.trim());
};

// Sweetgreen Official High-Resolution CDN Assets for Categories & Dishes
const SWEETGREEN_SHOWCASE_DATA = {
  'Salads': [
    {
      _id: 'sg_kale_caesar',
      name: 'KALE CAESAR',
      description: 'Kale, romaine, roasted chicken, bread crumbs, parm crisps, lemon squeeze, Caesar dressing',
      allergens: 'Contains milk, eggs, fish, meat, wheat',
      price: 380,
      image: 'https://images.ctfassets.net/eum7w7yri3zr/5418ra5b4TcMHRxOIobxUx/708a4c5778892e8504a4358b68aa8f3f/SG_Web_Image_Salad_KaleCaesar-2.0.png?w=800&q=80',
      category: 'Salads',
      variations: []
    },
    {
      _id: 'sg_guac_greens',
      name: 'GUACAMOLE GREENS',
      description: 'Roasted chicken, avocado, pickled onions, shredded cabbage, corn salsa, spring mix, chopped romaine, lime squeeze, lime cilantro jalapeño sauce',
      allergens: 'Contains meat',
      price: 420,
      image: 'https://images.ctfassets.net/eum7w7yri3zr/3Z3fW9JhznhFDphzlHNmRx/ccf2bde9a2f37be9eb3966ada129a4a6/SG_Web_Image_Salad_GuacamoleGreens-2.0.png?w=800&q=80',
      category: 'Salads',
      variations: []
    },
    {
      _id: 'sg_buffalo_chicken',
      name: 'BUFFALO CHICKEN',
      description: 'Antibiotic-free blackened chicken, pickled onions, tomatoes, shredded carrots, cilantro, feta crumble, garlic breadcrumbs, shredded kale, chopped romaine, Sweetgreen hot sauce, caesar',
      allergens: 'Contains meat, milk, eggs, fish, wheat',
      price: 410,
      image: 'https://images.ctfassets.net/eum7w7yri3zr/DiHNAYmlek0vUQrUcfjST/d48fa92629fa033f9a165979d67a41e1/SG_Web_Image_Salad_BuffaloChicken.png?w=800&q=80',
      category: 'Salads',
      variations: []
    }
  ],
  'Warm Bowls': [
    {
      _id: 'sg_harvest_bowl',
      name: 'HARVEST BOWL',
      description: 'Antibiotic-free roasted chicken, roasted sweet potatoes, apples, goat cheese, roasted almonds, wild rice, organic shredded kale and balsamic vinaigrette',
      allergens: 'Contains milk, meat, tree nuts',
      price: 440,
      image: 'https://images.ctfassets.net/eum7w7yri3zr/Br3EYlf6srQYhCXdvOfwt/65b582e0c488a871e36cda2ea5e52df3/SG_Web_Image_Bowl_Harvest.png?w=800&q=80',
      category: 'Warm Bowls',
      variations: []
    },
    {
      _id: 'sg_chicken_pesto_parm',
      name: 'CHICKEN PESTO PARM',
      description: 'Roasted chicken, spicy broccoli, tomatoes, shaved parmesan, za’atar breadcrumbs, warm quinoa, baby spinach, sweetgreen hot sauce, pesto vinaigrette',
      allergens: 'Contains milk, meat, wheat',
      price: 450,
      image: 'https://images.ctfassets.net/eum7w7yri3zr/5Kw3escovLNb8uWqQuzR7o/fb77087267c6de716f49d50ff755ede5/SG_Web_Image_Bowl_Chicken_Pesto_Parm.png?w=800&q=80',
      category: 'Warm Bowls',
      variations: []
    },
    {
      _id: 'sg_shroomami',
      name: 'SHROOMAMI',
      description: 'Roasted tofu, warm portobello mix, cucumbers, basil, shredded cabbage, roasted almonds, wild rice, organic shredded kale and miso sesame ginger',
      allergens: 'Contains soybeans, sesame, tree nuts (Vegan)',
      price: 390,
      image: 'https://images.ctfassets.net/eum7w7yri3zr/57c1vaLIB4WtuQXQblhUa5/5bbbf55c178b7985a03f994749445040/SG_Web_Image_Bowl_Shroomami.png?w=800&q=80',
      category: 'Warm Bowls',
      variations: []
    }
  ],
  'Sides': [
    {
      _id: 'sg_rosemary_focaccia',
      name: 'ROSEMARY FOCACCIA',
      description: 'Locally baked fresh rosemary focaccia paired with extra virgin olive oil and flaky sea salt',
      allergens: 'Contains wheat',
      price: 180,
      image: 'https://images.ctfassets.net/eum7w7yri3zr/6KrjKxVXHWvcbVNVuRm4M4/dba9726d9afd6ac3e0bb6c4d5a4dd088/SG_Web_Image_Side_Rosemary_Focaccia.jpg?w=800&q=80',
      category: 'Sides',
      variations: []
    },
    {
      _id: 'sg_roasted_sweet_potatoes',
      name: 'ROASTED SWEET POTATOES',
      description: 'Warm roasted sweet potatoes served with a choice of hot honey mustard or green goddess ranch dip',
      allergens: 'Vegan option available',
      price: 240,
      image: 'https://images.ctfassets.net/eum7w7yri3zr/5emJWQD3CfWTvVfJbSG8G7/edf1cfed73259bd969af2f685b927884/SG_Web_Image_Side_Roasted_Sweet_Potatoes.jpg?w=800&q=80',
      category: 'Sides',
      variations: []
    },
    {
      _id: 'sg_hibiscus_tea',
      name: 'HIBISCUS CLOVER TEA',
      description: 'Refreshing crimson clover iced tea brewed with mountain botanicals, bright berries, and tangy hibiscus',
      allergens: 'Gluten-Free, Caffeine-Free',
      price: 160,
      image: 'https://images.ctfassets.net/eum7w7yri3zr/j28IU9sScvgvuvnQ5AkBj/a56a14858807fcd486277566fb11973d/SG_Web_Image_Beverage_Hibiscus_Berry_Tea.jpg?w=800&q=80',
      category: 'Sides',
      variations: []
    }
  ]
};

const CATEGORY_IMAGE_FALLBACKS = {
  'Salads': 'https://images.ctfassets.net/eum7w7yri3zr/5418ra5b4TcMHRxOIobxUx/708a4c5778892e8504a4358b68aa8f3f/SG_Web_Image_Salad_KaleCaesar-2.0.png?w=600&q=75',
  'Veg': 'https://images.ctfassets.net/eum7w7yri3zr/3Z3fW9JhznhFDphzlHNmRx/ccf2bde9a2f37be9eb3966ada129a4a6/SG_Web_Image_Salad_GuacamoleGreens-2.0.png?w=600&q=75',
  'Non-Veg': 'https://images.ctfassets.net/eum7w7yri3zr/Br3EYlf6srQYhCXdvOfwt/65b582e0c488a871e36cda2ea5e52df3/SG_Web_Image_Bowl_Harvest.png?w=600&q=75',
  'Warm Bowls': 'https://images.ctfassets.net/eum7w7yri3zr/5Kw3escovLNb8uWqQuzR7o/fb77087267c6de716f49d50ff755ede5/SG_Web_Image_Bowl_Chicken_Pesto_Parm.png?w=600&q=75',
  'Sides': 'https://images.ctfassets.net/eum7w7yri3zr/6KrjKxVXHWvcbVNVuRm4M4/dba9726d9afd6ac3e0bb6c4d5a4dd088/SG_Web_Image_Side_Rosemary_Focaccia.jpg?w=600&q=75',
  'Beverage': 'https://images.ctfassets.net/eum7w7yri3zr/j28IU9sScvgvuvnQ5AkBj/a56a14858807fcd486277566fb11973d/SG_Web_Image_Beverage_Hibiscus_Berry_Tea.jpg?w=600&q=75',
  'Drinks': 'https://images.ctfassets.net/eum7w7yri3zr/j28IU9sScvgvuvnQ5AkBj/a56a14858807fcd486277566fb11973d/SG_Web_Image_Beverage_Hibiscus_Berry_Tea.jpg?w=600&q=75',
  'Cold Drinks': 'https://images.ctfassets.net/eum7w7yri3zr/j28IU9sScvgvuvnQ5AkBj/a56a14858807fcd486277566fb11973d/SG_Web_Image_Beverage_Hibiscus_Berry_Tea.jpg?w=600&q=75',
  'Pasta': 'https://images.ctfassets.net/eum7w7yri3zr/5Kw3escovLNb8uWqQuzR7o/fb77087267c6de716f49d50ff755ede5/SG_Web_Image_Bowl_Chicken_Pesto_Parm.png?w=600&q=75',
  'Sandwiches': 'https://images.ctfassets.net/eum7w7yri3zr/6KrjKxVXHWvcbVNVuRm4M4/dba9726d9afd6ac3e0bb6c4d5a4dd088/SG_Web_Image_Side_Rosemary_Focaccia.jpg?w=600&q=75',
  'Maggie': 'https://images.ctfassets.net/eum7w7yri3zr/5Kw3escovLNb8uWqQuzR7o/fb77087267c6de716f49d50ff755ede5/SG_Web_Image_Bowl_Chicken_Pesto_Parm.png?w=600&q=75',
  'Snacks': 'https://images.ctfassets.net/eum7w7yri3zr/5emJWQD3CfWTvVfJbSG8G7/edf1cfed73259bd969af2f685b927884/SG_Web_Image_Side_Roasted_Sweet_Potatoes.jpg?w=600&q=75',
  'Dessert': 'https://images.ctfassets.net/eum7w7yri3zr/5emJWQD3CfWTvVfJbSG8G7/edf1cfed73259bd969af2f685b927884/SG_Web_Image_Side_Roasted_Sweet_Potatoes.jpg?w=600&q=75'
};

function getItemImage(item) {
  if (item.image && typeof item.image === 'string' && item.image.trim()) {
    return item.image;
  }
  const name = (item.name || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();

  if (name.includes('tea') || name.includes('chai')) {
    return 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('coffee') || name.includes('kappi') || name.includes('latte') || name.includes('cappuccino')) {
    return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('sandwich') || name.includes('toast') || name.includes('burger')) {
    return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('maggie') || name.includes('maggi') || name.includes('noodle')) {
    return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('pasta')) {
    return 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('salad')) {
    return 'https://images.ctfassets.net/eum7w7yri3zr/5418ra5b4TcMHRxOIobxUx/708a4c5778892e8504a4358b68aa8f3f/SG_Web_Image_Salad_KaleCaesar-2.0.png?w=600&q=75';
  }
  if (name.includes('paneer') || name.includes('curry') || name.includes('dal')) {
    return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('chicken') || name.includes('egg') || name.includes('biryani') || name.includes('kebab')) {
    return 'https://images.unsplash.com/photo-1604952564956-f51082a68a2d?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('dessert') || name.includes('sweet') || name.includes('cake') || name.includes('ice cream')) {
    return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80';
  }
  if (cat.includes('beverage') || cat.includes('drink')) {
    return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80';
  }
  if (cat.includes('sandwich')) {
    return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80';
  }
  if (cat.includes('pasta')) {
    return 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=600&auto=format&fit=crop&q=80';
  }
  if (cat.includes('maggie')) {
    return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80';
  }
  if (cat.includes('non-veg')) {
    return 'https://images.unsplash.com/photo-1604952564956-f51082a68a2d?w=600&auto=format&fit=crop&q=80';
  }
  if (cat.includes('dessert')) {
    return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80';
  }

  return CATEGORY_IMAGE_FALLBACKS[item.category] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
}

function getOrCreateCustomerId() {
  let id = localStorage.getItem('loyalty_customer_id');
  if (!id) {
    id = 'cust_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem('loyalty_customer_id', id);
  }
  return id;
}

export default function PublicRestaurantPage() {
  const { restro_name } = useParams();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Salads');
  const [searchQuery, setSearchQuery] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  // Attendance & Streak state
  const [visitCount, setVisitCount] = useState(0);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Mobile navigation drawer
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Horizontal items scroll ref
  const itemsScrollRef = useRef(null);

  // Bag / Quick Cart state
  const [bag, setBag] = useState(() => {
    try {
      const saved = localStorage.getItem(`bag_${restro_name}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [showBagDrawer, setShowBagDrawer] = useState(false);
  const [selectedItemModal, setSelectedItemModal] = useState(null);
  const [modalVariation, setModalVariation] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const customerId = useMemo(() => getOrCreateCustomerId(), []);

  // Save bag to local storage
  useEffect(() => {
    try {
      localStorage.setItem(`bag_${restro_name}`, JSON.stringify(bag));
    } catch (e) {
      console.warn('Failed to save bag:', e);
    }
  }, [bag, restro_name]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setNotFound(false);
    const loadData = async () => {
      try {
        const restroRes = await axios.get(`/api/public/restro/${encodeURIComponent(restro_name)}`);
        if (!isMounted) return;
        setRestaurant(restroRes.data);

        try {
          const menuRes = await axios.get(`/api/public/restro/${encodeURIComponent(restro_name)}/menu`);
          if (isMounted) {
            const rawItems = menuRes.data.items || [];
            // Hide cigarette/tobacco items from this public restaurant menu page
            const publicItems = rawItems.filter(i => !isCigaretteCategory(i.category) && !isCigaretteCategory(i.name));
            setMenuItems(publicItems);

            const rawCats = menuRes.data.categories || restroRes.data.menuCategories || [];
            const publicCats = rawCats.filter(c => !isCigaretteCategory(c));
            setCategories(publicCats);
          }
        } catch (menuErr) {
          console.warn('Failed to load menu items:', menuErr);
        }

        // Attendance & QR Check-In verification directly on this page
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const scanCode = urlParams.get('c') || urlParams.get('code');

          if (scanCode && isMounted) {
            try {
              const scanRes = await axios.post('/api/loyalty/scan', {
                restaurantId: restroRes.data._id,
                code: scanCode.trim(),
                customerId
              });
              if (isMounted) {
                const newCount = scanRes.data.visitCount || 1;
                setVisitCount(newCount);
                setFeedbackMsg(`🎉 Attendance recorded! You now have ${newCount} stamps for ${restroRes.data.restaurantName || 'this cafe'}.`);
                setTimeout(() => setFeedbackMsg(''), 6000);
              }
            } catch (scanErr) {
              const errMsg = scanErr.response?.data?.error || 'Could not verify attendance QR code.';
              if (isMounted) {
                if (scanErr.response?.data?.visitCount !== undefined) {
                  setVisitCount(scanErr.response.data.visitCount);
                }
                setFeedbackMsg(errMsg);
                setTimeout(() => setFeedbackMsg(''), 6000);
              }
            } finally {
              // Clear code from query string in browser bar without page reload
              urlParams.delete('c');
              urlParams.delete('code');
              const remaining = urlParams.toString();
              const cleanUrl = window.location.pathname + (remaining ? `?${remaining}` : '');
              window.history.replaceState({}, document.title, cleanUrl);
            }
          } else {
            const attendanceRes = await axios.get(
              `/api/loyalty/status?restaurantId=${encodeURIComponent(restroRes.data._id)}&customerId=${encodeURIComponent(customerId)}`
            );
            if (isMounted) {
              setVisitCount(attendanceRes.data.visitCount || 0);
            }
          }
        } catch (attErr) {
          console.warn('Attendance lookup failed:', attErr);
        }
      } catch (err) {
        if (!isMounted) return;
        setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (restro_name) loadData();
    return () => { isMounted = false; };
  }, [restro_name, customerId]);

  // Build category list from restaurant's actual menu items (excluding cigarette/tobacco nav categories)
  const categoryList = useMemo(() => {
    const fromItems = [];
    const seen = new Set();

    menuItems.forEach(i => {
      if (i.category && !seen.has(i.category) && !isCigaretteCategory(i.category)) {
        seen.add(i.category);
        fromItems.push(i.category);
      }
    });

    if (Array.isArray(categories)) {
      categories.forEach(c => {
        if (c && !seen.has(c) && !isCigaretteCategory(c) && menuItems.some(i => i.category === c)) {
          seen.add(c);
          fromItems.push(c);
        }
      });
    }

    if (fromItems.length > 0) {
      return fromItems;
    }

    return ['Salads', 'Warm Bowls', 'Sides'];
  }, [categories, menuItems]);

  // Keep selectedCategory synced with available categories
  useEffect(() => {
    if (categoryList.length > 0 && !categoryList.includes(selectedCategory)) {
      setSelectedCategory(categoryList[0]);
    }
  }, [categoryList, selectedCategory]);

  // Compute items to show in the horizontal track for the selected category
  const categoryItems = useMemo(() => {
    if (!selectedCategory) return menuItems.filter(i => !isCigaretteCategory(i.category));

    let items = menuItems.filter(item => item.category === selectedCategory && !isCigaretteCategory(item.category));

    // If searching, filter matching items
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(i =>
        !isCigaretteCategory(i.category) &&
        !isCigaretteCategory(i.name) &&
        (i.name.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q)))
      );
    }

    // Fallback to showcase dishes only if database has 0 items
    if (items.length === 0 && SWEETGREEN_SHOWCASE_DATA[selectedCategory]) {
      items = SWEETGREEN_SHOWCASE_DATA[selectedCategory];
    }

    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  const handleResetAttendance = async () => {
    if (!restaurant?._id) return;
    setResetting(true);
    try {
      await axios.post('/api/loyalty/customer-reset', { restaurantId: restaurant._id, customerId });
      setVisitCount(0);
      localStorage.removeItem(`loyalty_scan_${restaurant._id}`);
      setShowResetModal(false);
      setFeedbackMsg('Your Sweetpass streak has been reset.');
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err) {
      alert('Failed to reset streak.');
    } finally {
      setResetting(false);
    }
  };

  const addToBag = (item, variation = null, quantity = 1) => {
    const key = variation ? `${item._id}_${variation.name}` : item._id;
    const price = variation ? variation.price : item.price;
    const name = variation ? `${item.name} (${variation.name})` : item.name;
    setBag(prev => {
      const existing = prev[key];
      const newQty = (existing?.qty || 0) + quantity;
      return {
        ...prev,
        [key]: { key, itemId: item._id, name, price, qty: newQty, image: item.image, category: item.category }
      };
    });
  };

  const updateBagQty = (key, delta) => {
    setBag(prev => {
      const item = prev[key];
      if (!item) return prev;
      const nextQty = item.qty + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return { ...prev, [key]: { ...item, qty: nextQty } };
    });
  };

  const clearBag = () => setBag({});

  const bagItemsList = useMemo(() => Object.values(bag), [bag]);
  const bagTotalItems = useMemo(() => bagItemsList.reduce((acc, i) => acc + i.qty, 0), [bagItemsList]);
  const bagSubtotal = useMemo(() => bagItemsList.reduce((acc, i) => acc + (i.price * i.qty), 0), [bagItemsList]);

  // ── WhatsApp Order State ──
  const [showPhonePromptModal, setShowPhonePromptModal] = useState(false);
  const [customPhoneInput, setCustomPhoneInput] = useState('');

  // Helper to extract clean WhatsApp digits
  const getCleanPhone = (phoneStr) => {
    if (!phoneStr) return '';
    let digits = String(phoneStr).replace(/\D/g, '');
    if (digits.length === 10) {
      digits = '91' + digits;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = '91' + digits.slice(1);
    }
    return digits;
  };

  // Resolved cafe owner WhatsApp number (query param override -> whatsappNumber -> restaurantPhone -> mobileNumber)
  const resolvedOwnerWhatsApp = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const override = params.get('phone') || params.get('whatsapp');
      if (override) return getCleanPhone(override);
    } catch { }

    const raw = restaurant?.whatsappNumber || restaurant?.restaurantPhone || restaurant?.mobileNumber;
    return getCleanPhone(raw);
  }, [restaurant]);

  // Construct WhatsApp order message
  const createWhatsAppOrderMessage = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const cafeName = restaurant?.restaurantName || restaurant?.name || 'Cafe';

    let text = `🛍️ *NEW ORDER — ${cafeName.toUpperCase()}*\n`;
    text += `⏰ *Time:* ${timeStr}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 *ORDER ITEMS:*\n`;

    bagItemsList.forEach((item, idx) => {
      const variationPart = item.variation?.name ? ` (${item.variation.name})` : '';
      const itemSum = (item.price * item.qty).toFixed(2);
      text += `${idx + 1}. *${item.name}*${variationPart}\n`;
      text += `   └─ Qty: ${item.qty} × ₹${item.price} = ₹${itemSum}\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔢 *Total Items:* ${bagTotalItems}\n`;
    text += `💰 *TOTAL BILL: ₹${bagSubtotal.toFixed(2)}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✅ Placed from digital menu:\n${window.location.href.split('#')[0]}`;

    return text;
  };

  const handleSendWhatsAppOrder = (explicitNumber) => {
    const targetNumber = explicitNumber ? getCleanPhone(explicitNumber) : resolvedOwnerWhatsApp;

    if (!targetNumber) {
      setShowPhonePromptModal(true);
      return;
    }

    const message = createWhatsAppOrderMessage();
    const waLink = `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;

    // Open WhatsApp directly to send message
    window.open(waLink, '_blank');

    setShowBagDrawer(false);
    setShowPhonePromptModal(false);
  };

  const tier = useMemo(() => {
    if (visitCount >= 10) return { name: 'VIP Sweetpass Member', perk: 'Complimentary Treat Unlocked' };
    if (visitCount >= 7) return { name: 'Green Gold Explorer', perk: 'Almost at 10th Stamp Treat' };
    if (visitCount >= 3) return { name: 'Regular Patron', perk: 'Active streak blooming' };
    return { name: 'Welcome Guest', perk: 'Scan in-store to collect stamps' };
  }, [visitCount]);

  const progressPercent = Math.min(100, Math.max(5, ((visitCount % 10 === 0 && visitCount > 0 ? 10 : visitCount % 10) / 10) * 100));

  // Featured seasonal hero item
  const featuredHeroItem = useMemo(() => {
    if (menuItems.length > 0) return menuItems[0];
    return {
      _id: 'featured_pickle_caesar',
      name: "Molly's Pickle Caesar Sal",
      price: 349,
      category: 'Salads',
      variations: []
    };
  }, [menuItems]);

  const handleHeroOrder = () => {
    if (featuredHeroItem.variations?.length) {
      setSelectedItemModal(featuredHeroItem);
      setModalVariation(featuredHeroItem.variations[0]);
      setModalQty(1);
    } else {
      addToBag(featuredHeroItem, null, 1);
      setShowBagDrawer(true);
    }
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterSuccess(true);
    setNewsletterEmail('');
    setTimeout(() => setNewsletterSuccess(false), 5000);
  };

  const scrollToSection = (id) => {
    setShowMobileNav(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3E9] flex flex-col items-center justify-center p-6 text-center font-sans">
        <Loader2 size={36} className="animate-spin text-[#003B21] mb-4" />
        <p className="text-xl font-serif text-[#003B21] tracking-tight">Gathering fresh menu...</p>
      </div>
    );
  }

  if (notFound || !restaurant) {
    return (
      <div className="min-h-screen bg-[#F5F3E9] flex flex-col items-center justify-center p-6 text-center font-sans">
        <Store size={48} className="text-[#003B21] mb-4" />
        <h1 className="text-3xl font-serif font-bold text-[#003B21] mb-2">Restaurant Not Found</h1>
        <p className="text-[#003B21]/70 mb-6">We couldn't locate a menu corresponding to "{restro_name}".</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F3E9] text-[#003B21] font-sans antialiased overflow-x-clip relative  selection:bg-[#E2FF3B] selection:text-[#003B21]">

      {/* ── Top Accessibility Bar ── */}
      <div className="bg-[#F5F3E9] border-b border-[#003B21]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 text-right">
          <button className="text-[11px] sm:text-xs text-[#005c53] font-medium underline decoration-1 underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer">
            Enable Accessibility
          </button>
        </div>
      </div>

      {/* ── Header Bar ── */}
      <header className="sticky top-0 z-40 bg-[#F5F3E9]/95  h-[52px] sm:h-[60px] flex items-center transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">

          {/* Hamburger Menu Icon (Two horizontal lines) */}
          <button
            onClick={() => setShowMobileNav(true)}
            className="flex flex-col gap-[4.5px] p-1.5 hover:opacity-75 transition-opacity cursor-pointer group"
            aria-label="Toggle Navigation"
          >
            <span className="w-5 h-[1.75px] bg-[#003B21] rounded-full transition-all group-hover:w-6"></span>
            <span className="w-5 h-[1.75px] bg-[#003B21] rounded-full transition-all group-hover:w-4"></span>
          </button>

          {/* Sweetgreen Logo Wordmark */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-2xl sm:text-3xl font-serif font-extrabold tracking-tight text-[#003B21] lowercase select-none cursor-pointer"
          >
            {restaurant.restaurantName?.toLowerCase() || 'sweetgreen'}
          </div>

          {/* Right Header Action: ORDER → */}
          <button
            onClick={() => setShowBagDrawer(true)}
            className="text-xs sm:text-sm font-extrabold tracking-wider flex items-center gap-1 uppercase hover:opacity-80 transition-opacity text-[#003B21] cursor-pointer"
          >
            <span>ORDER</span>
            {bagTotalItems > 0 ? (
              <span className="bg-[#E2FF3B] text-[#003B21] px-2 py-0.5 rounded-full text-xs font-black shadow-2xs ml-0.5">
                {bagTotalItems}
              </span>
            ) : (
              <span className="font-bold text-base leading-none">→</span>
            )}
          </button>
        </div>
      </header>

      {/* ── Slide-Out Mobile Navigation Drawer ── */}
      {showMobileNav && (
        <div className="fixed inset-0 z-50 bg-[#003B21]/60 backdrop-blur-xs flex">
          <div className="bg-[#F5F3E9] w-full max-w-sm h-full flex flex-col p-6 sm:p-8 animate-in slide-in-from-left duration-300 shadow-2xl">
            <div className="flex items-center justify-between pb-6 border-b border-[#003B21]/15">
              <span className="text-2xl font-serif font-bold tracking-tight lowercase text-[#003B21]">
                {restaurant.restaurantName?.toLowerCase() || 'sweetgreen'}
              </span>
              <button
                onClick={() => setShowMobileNav(false)}
                className="w-9 h-9 rounded-full bg-white text-[#003B21] flex items-center justify-center hover:bg-[#EAE5DC] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 py-8 space-y-5 text-lg font-bold">
              <button
                onClick={() => scrollToSection('menu-section')}
                className="block w-full text-left py-2 hover:translate-x-1 transition-transform cursor-pointer"
              >
                Our Seasonal Menu
              </button>
              <button
                onClick={() => scrollToSection('loyalty-section')}
                className="block w-full text-left py-2 hover:translate-x-1 transition-transform cursor-pointer"
              >
                Sweetpass Loyalty
              </button>
              <button
                onClick={() => scrollToSection('work-section')}
                className="block w-full text-left py-2 hover:translate-x-1 transition-transform cursor-pointer"
              >
                Sweetgreen For Work
              </button>
              <button
                onClick={() => scrollToSection('lab-section')}
                className="block w-full text-left py-2 hover:translate-x-1 transition-transform cursor-pointer"
              >
                In The Lab
              </button>
              <button
                onClick={() => { setShowMobileNav(false); setShowBagDrawer(true); }}
                className="flex items-center justify-between w-full text-left py-2 hover:translate-x-1 transition-transform cursor-pointer"
              >
                <span>View Bag</span>
                {bagTotalItems > 0 && (
                  <span className="bg-[#E2FF3B] text-[#003B21] text-xs font-black px-2 py-0.5 rounded-full">
                    {bagTotalItems}
                  </span>
                )}
              </button>
            </div>

            <div className="pt-6 border-t border-[#003B21]/15 text-xs opacity-75 space-y-2">
              <p className="font-bold">{restaurant.restaurantName}</p>
              {restaurant.restaurantAddress && <p>{restaurant.restaurantAddress}</p>}
              <p>©2026 Sweetgreen experience. All rights reserved.</p>
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowMobileNav(false)}></div>
        </div>
      )}

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-4 bg-[#D1E2D3] border border-[#003B21]/20 text-[#003B21] text-sm font-medium rounded-2xl flex items-center gap-2.5">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        </div>
      )}

      {/* ── Exact Hero Banner (Full Viewport Height & First Impression) ── */}
      <section className="relative w-full bg-[#004A3D] text-white overflow-hidden select-none">
        <div className="relative w-full h-[calc(100dvh-76px)] min-h-[580px] max-h-[960px] sm:h-[calc(100vh-84px)] sm:min-h-[640px] flex flex-col justify-end">

          {/* Responsive Hero Picture: Exact Sweetgreen Assets */}
          <picture className="absolute inset-0 w-full h-full pointer-events-none">
            <source
              media="(max-width: 800px)"
              srcSet="https://images.ctfassets.net/eum7w7yri3zr/7nmO6mN8iKfRGGpjxApDr1/190b84cc940068593411fb302a6199dd/SG_Web_MobileCaesar_Cal.jpg?w=1000&q=85&fm=webp"
            />
            <source
              media="(min-width: 801px)"
              srcSet="https://images.ctfassets.net/eum7w7yri3zr/3ylppLo5syJ8hZCrZROzhb/904fce1b499c2bab06b3e91d0c60e241/SG_Web_DesktopCaesarSal.jpg?w=2000&q=85&fm=webp"
            />
            <img
              src="https://images.ctfassets.net/eum7w7yri3zr/7nmO6mN8iKfRGGpjxApDr1/190b84cc940068593411fb302a6199dd/SG_Web_MobileCaesar_Cal.jpg?w=1000&q=85&fm=webp"
              alt="Molly's Pickle Caesar Salad"
              className="w-full h-full object-cover object-center"
              loading="eager"
            />
          </picture>

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/40 to-transparent pointer-events-none"></div>

          {/* Banner Text & CTA Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pb-7 sm:pb-12 md:pb-14 w-full">
            <p className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-white/95 mb-2 drop-shadow-sm">
              MOLLY'S PICKLE CAESAR SAL
            </p>

            <h1 className="text-[38px] sm:text-6xl md:text-7xl lg:text-8xl font-light sm:font-normal tracking-[-0.03em] text-white leading-[1.0] mb-6 sm:mb-8 drop-shadow-md">
              Pickle-Forward
            </h1>

            {/* Added 'flex' to force them into the same row */}
            <div className="flex items-center justify-between gap-4 w-full">
              <button
                onClick={handleHeroOrder}
                className="bg-[#E2FF3B] hover:bg-[#d4f028] text-[#003B21] px-8 py-3.5 sm:py-4 rounded-full font-extrabold uppercase tracking-wider text-xs sm:text-sm shadow-xl active:scale-95 transition-transform flex items-center justify-center shrink-0 cursor-pointer w-fit"
              >
                ORDER NOW
              </button>

              <div className="text-2xl sm:text-3xl md:text-4xl font-semibold sm:font-semibold tracking-tight text-white text-right leading-none drop-shadow-md uppercase">
                ❤️
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Menu Category Navigation (Horizontal Scroll with Dot Indicator) ── */}
      <nav id="menu-section" className="bg-[#F5F3E9] pl-14 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start overflow-x-auto no-scrollbar scroll-smooth gap-10 sm:gap-16 px-6 sm:px-8 snap-x snap-mandatory">
            {categoryList.filter(cat => !isCigaretteCategory(cat)).map(cat => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    if (itemsScrollRef.current) {
                      itemsScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                    }
                  }}
                  className="flex flex-col items-center shrink-0 cursor-pointer group py-2 snap-start"
                >
                  <span
                    className={`font-serif text-3xl sm:text-4xl transition-colors whitespace-pre-line text-center tracking-tight leading-[1.1] ${isSelected ? 'text-[#003B21]' : 'text-[#003B21]/30 hover:text-[#003B21]/60'
                      }`}
                  >
                    {cat.includes(' ') ? cat.replace(' ', '\n') : cat}
                  </span>

                  {isSelected ? (
                    <span className="w-1.5 h-1.5 bg-[#003B21] rounded-full mt-3 shadow-xs"></span>
                  ) : (
                    <span className="w-1.5 h-1.5 bg-transparent mt-3"></span>
                  )}
                </button>
              );
            })}

            {/* Invisible spacer to ensure the last item doesn't stick to the right edge when fully scrolled */}
            <div className="w-2 shrink-0 sm:hidden"></div>
          </div>
        </div>
      </nav>

      {/* ── Selected Category Items (Horizontal Scroll Track Matching Sweetgreen App) ── */}
      <section className="py-6 sm:py-10 bg-[#F5F3E9] overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Horizontal Swiping / Scroll Track */}
          {categoryItems.length > 0 ? (
            <div
              ref={itemsScrollRef}
              className="flex overflow-x-auto gap-4 sm:gap-6 px-4 sm:px-6 lg:px-8 pb-8 no-scrollbar scroll-smooth snap-x snap-mandatory"
            >
              {categoryItems.map(item => {
                const hasVariations = Array.isArray(item.variations) && item.variations.length > 0;
                const displayImage = getItemImage(item);
                const minPrice = hasVariations ? Math.min(...item.variations.map(v => v.price)) : item.price;

                return (
                  <div
                    key={item._id}
                    className="w-[85vw] max-w-[340px] sm:max-w-[380px] shrink-0 snap-center flex flex-col group select-none"
                  >
                    {/* Dish Image Frame */}
                    <div
                      className="rounded-3xl sm:rounded-[32px] overflow-hidden mb-5 bg-[#E8E6DB] cursor-pointer"
                      onClick={() => {
                        setSelectedItemModal(item);
                        setModalVariation(hasVariations ? item.variations[0] : null);
                        setModalQty(1);
                      }}
                    >
                      <img
                        src={displayImage}
                        alt={item.name}
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col pr-4">
                      {/* Dish Title */}
                      <h2
                        onClick={() => {
                          setSelectedItemModal(item);
                          setModalVariation(hasVariations ? item.variations[0] : null);
                          setModalQty(1);
                        }}
                        className="text-xl font-normal uppercase tracking-wide text-[#003B21] mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {item.name}
                      </h2>

                      {/* Ingredients / Description */}
                      <p className="text-[15px] sm:text-base text-[#003B21] mb-2 leading-snug line-clamp-2">
                        {item.description || (hasVariations ? `Sizes: ${item.variations.map(v => v.name).join(', ')}` : `Freshly prepared in our ${item.category || 'kitchen'}.`)}
                      </p>

                      {/* Category & Freshness Note */}
                      <p className="text-xs sm:text-sm text-[#003B21]/60 mb-5 leading-snug">
                        {item.allergens || `${item.category || 'Specialty'} • Made fresh to order`}
                      </p>

                      {/* Order Action & Price */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => {
                            if (hasVariations) {
                              setSelectedItemModal(item);
                              setModalVariation(item.variations[0]);
                              setModalQty(1);
                            } else {
                              addToBag(item, null, 1);
                            }
                          }}
                          className="flex items-center gap-1 text-[15px] sm:text-base text-[#003B21] transition-opacity cursor-pointer text-left w-fit hover:opacity-75 font-medium"
                        >
                          Order now <span className="font-sans">→</span>
                        </button>

                        <span className="text-base sm:text-lg font-bold text-[#003B21]">
                          ₹{minPrice}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center opacity-60">
              <UtensilsCrossed size={36} className="mx-auto mb-3" />
              <p className="text-xl font-serif">No dishes found in "{selectedCategory}"</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Sweetgreen For Work Section ── */}
      <section id="work-section" className="bg-[#D1E2D3] pt-12 sm:py-20">
        <div className="max-w-7xl pb-16 mx-auto px-6 sm:px-8">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-14">

            <div className="flex-1">
              <p className="text-xs sm:text-sm uppercase tracking-wide text-[#003B21] mb-6">
                DINE WITH US
              </p>

              <h2 className="text-[42px] sm:text-[3.5rem] lg:text-7xl font-serif leading-[0.95] tracking-tighter text-[#003B21] mb-8">
                All the ways we make<br className="hidden sm:block" /> your gatherings<br className="hidden sm:block" /> unforgettable
              </h2>

              <div className="space-y-6 text-[#003B21]">
                <div>
                  <h3 className="text-[17px] font-bold underline decoration-2 underline-offset-[5px] mb-1">
                    Catering
                  </h3>
                  <p className="text-[17px] leading-[1.3] pr-4">
                    For the little things and the big milestones alike, we’re here to host your crew with flavors everyone will love.
                  </p>
                </div>

                <div>
                  <h3 className="text-[17px] font-bold underline decoration-2 underline-offset-[5px] mb-1">
                    Outpost
                  </h3>
                  <p className="text-[17px] leading-[1.3] pr-4">
                    Reserve our spaces for your next meetup or personal celebration. We handle the food and ambiance, you enjoy the party.
                  </p>
                </div>

                <div>
                  <h3 className="text-[17px] font-bold underline decoration-2 underline-offset-[5px] mb-1">
                    Still WTF ?
                  </h3>
                  <p className="text-[17px] leading-[1.3] pr-4">
                    Step away from the office desk. Set up a corporate tab so your team can fuel up with premium meals in an inspiring setting.
                  </p>
                </div>
              </div>
            </div>


          </div>

        </div>
        <div>
          <img
            src="https://images.ctfassets.net/eum7w7yri3zr/53svtEXgJA4ICa2TtlVkJN/e2daa0fb53184e729af5e10cfaeb9667/IMG_4358.jpg?w=1200&q=75&fm=avif"
            alt="Vegetables on shelf"
            className="w-full h-full"
          />
        </div>
      </section>

      {/* ── Community / Instagram Section ── */}
      <section id="community-section" className="bg-[#E7DFC6] pt-12 pb-16 sm:py-20 border-b border-[#003B21]/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs sm:text-sm uppercase tracking-wide text-[#003B21] mb-6">
              JOIN THE COMMUNITY
            </p>

            <h2 className="text-[42px] sm:text-[3.5rem] lg:text-7xl font-serif leading-[0.95] tracking-tighter text-[#003B21] mb-6">
              Step inside our daily<br />delicious life
            </h2>

            <p className="text-[19px] sm:text-xl leading-[1.3] mb-10 text-[#003B21] pr-4">
              Head over to Instagram for a sneak peek at our fresh everyday bakes, signature brews, and cozy cafe moments.
            </p>

            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 text-[15px] sm:text-base font-bold uppercase tracking-wide text-[#003B21] hover:opacity-70 transition-opacity group"
            >
              <span className="bg-[#0e150e] text-white p-1.5 rounded-[4px] flex items-center justify-center shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" fill="currentColor" role="img">
                  <title>Instagram</title>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </span>
              <span className="underline decoration-1 underline-offset-[5px]">
                FOLLOW US <span className="no-underline group-hover:translate-x-1 inline-block transition-transform">→</span>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Sweetpass Loyalty Section ── */}
      <section id="loyalty-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16 sm:my-24">
        <div className="bg-[#004A3D] text-white rounded-[24px] sm:rounded-[32px] p-8 sm:p-12 lg:p-16 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">

            {/* Text & Typography Side */}
            <div className="flex flex-col items-start">
              <p className="text-xs sm:text-sm uppercase tracking-widest font-bold mb-6 text-[#D4FF32]">
                Sweetpass Loyalty
              </p>

              <h3 className="text-[42px] sm:text-6xl font-serif leading-[0.95] tracking-tighter mb-4">
                {visitCount} Stamps<br /> Collected
              </h3>

              <p className="text-[17px] sm:text-lg text-white/80 mb-10 leading-snug max-w-md">
                {tier.name} · {tier.perk}
              </p>

              <button
                onClick={() => setShowResetModal(true)}
                className="text-[11px] uppercase tracking-widest underline decoration-1 underline-offset-[5px] text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                Reset Device Card
              </button>
            </div>

            {/* Clean Punch-Card Side */}
            <div className="flex flex-col justify-center">
              <div className="grid grid-cols-5 gap-3 sm:gap-4 mb-6 max-w-sm">
                {Array.from({ length: 10 }).map((_, index) => {
                  const stampNumber = index + 1;
                  const currentMod = visitCount % 10 === 0 && visitCount > 0 ? 10 : visitCount % 10;
                  const isEarned = visitCount > 0 && stampNumber <= currentMod;

                  return (
                    <div
                      key={index}
                      className={`aspect-square rounded-full flex items-center justify-center font-serif text-lg sm:text-xl transition-colors duration-300 ${isEarned
                        ? 'bg-[#D4FF32] text-[#003B21]'
                        : 'bg-white/10 text-white/30'
                        }`}
                    >
                      {stampNumber === 10 ? (isEarned ? '★' : '10') : isEarned ? '✓' : stampNumber}
                    </div>
                  );
                })}
              </div>

              <p className="text-[13px] sm:text-sm text-white/60 leading-relaxed max-w-sm">
                Scan your table QR code every visit to punch your pass and unlock seasonal treats.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Sweetgreen Footer Container (Cards + Directory + Credits) ── */}
      <footer className="w-full bg-[#D8E5D6] text-[#0E150E] border-t border-[#0E150E]/15 antialiased overflow-hidden selection:bg-[#0E150E] selection:text-[#D8E5D6]">

        {/* ── Top Footer Cards: Newsletter (Left) & Download The App (Right) ── */}
        <div className="max-w-7xl mx-auto border-b border-[#0E150E]/15">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#0E150E]/15">

            {/* Card 2: Download the app */}
            < div className="p-6 sm:p-10 lg:p-12 xl:p-16 flex flex-col justify-between relative overflow-hidden">
              <div>
                <h2 className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.12em] text-[#0E150E]/85 mb-4 sm:mb-5">
                  Download the app
                </h2>
              </div>

              <div className="flex flex-row items-end justify-between gap-4 mt-4">
                {/* Inert App Links with Sweetgreen typography */}
                <div className="space-y-3 sm:space-y-4 pb-2 z-10">
                  <div>
                    <button
                      type="button"
                      onClick={(e) => e.preventDefault()}
                      className="text-[26px] sm:text-[32px] lg:text-[36px] font-serif text-[#0E150E] hover:underline underline-offset-[6px] decoration-1 inline-flex items-center gap-2 group cursor-pointer text-left transition-colors"
                    >
                      <span>iOS</span>
                      <span className="font-sans font-light text-[22px] sm:text-[26px] group-hover:translate-x-1.5 transition-transform inline-block">→</span>
                    </button>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={(e) => e.preventDefault()}
                      className="text-[26px] sm:text-[32px] lg:text-[36px] font-serif text-[#0E150E] hover:underline underline-offset-[6px] decoration-1 inline-flex items-center gap-2 group cursor-pointer text-left transition-colors"
                    >
                      <span>Android</span>
                      <span className="font-sans font-light text-[22px] sm:text-[26px] group-hover:translate-x-1.5 transition-transform inline-block">→</span>
                    </button>
                  </div>
                </div>

                {/* Sweetgreen illustration */}
                <div className="shrink-0 flex items-end">
                  <img
                    src="https://images.ctfassets.net/eum7w7yri3zr/QeC14rNAsPTRIuV4EAafd/f6d5c7574ff3f26a87f23d4f9d1c0b8f/PickUp1.png?w=600&fm=webp&q=80"
                    alt="Illustration of Sweetgreen app"
                    className="w-36 sm:w-44 md:w-40 lg:w-52 xl:w-60 h-auto max-h-48 sm:max-h-56 object-contain select-none pointer-events-none translate-y-2 sm:translate-y-4"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Footer Navigation Columns ── */}
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 xl:px-16 pt-12 sm:pt-16 pb-12 sm:pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-12 pb-12 sm:pb-16 border-b border-[#0E150E]/15">
            {/* Column 1: About Us */}
            <div>
              <p className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.1em] text-[#0E150E] mb-4 sm:mb-5">
                About Us
              </p>
              <ul className="space-y-2.5 sm:space-y-3">
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Careers</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Investor Relations</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Locations</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Press</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Pos app</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">The Hex Bowl</button></li>
              </ul>
            </div>

            {/* Column 2: Social Media */}
            <div>
              <p className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.1em] text-[#0E150E] mb-4 sm:mb-5">
                Social Media
              </p>
              <ul className="space-y-2.5 sm:space-y-3">
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Instagram</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Twitter</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">TikTok</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Spotify</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Facebook</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">YouTube</button></li>
              </ul>
            </div>

            {/* Column 3: Support + Services */}
            <div>
              <p className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.1em] text-[#0E150E] mb-4 sm:mb-5">
                Support + Services
              </p>
              <ul className="space-y-2.5 sm:space-y-3">
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Nutrition + Allergens Guide</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Contact us</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Gift Cards</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Store</button></li>
              </ul>
            </div>

            {/* Column 4: Legal */}
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.1em] text-[#0E150E] mb-4 sm:mb-5">
                Legal
              </p>
              <ul className="space-y-2.5 sm:space-y-3">
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Privacy Policy</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Terms of Use</button></li>
                <li>
                  <button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer inline-flex items-center gap-1.5 leading-snug">
                    <span>Your Privacy Choices</span>
                    <img
                      src="https://images.ctfassets.net/eum7w7yri3zr/1i9FC9xIUHPwsE4dMheSHI/1a5e0c6d5a5d82e8347b86844d7bb07e/privacy.svg"
                      alt="Your Privacy Choices"
                      className="h-3.5 w-auto inline-block select-none"
                    />
                  </button>
                </li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Notice at Collection</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Accessibility Statement</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">Consumer Health Data Notice</button></li>
                <li><button type="button" onClick={(e) => e.preventDefault()} className="text-[13.5px] sm:text-[14.5px] text-[#0E150E]/80 hover:text-[#0E150E] hover:underline underline-offset-2 transition-colors text-left cursor-pointer block leading-snug">SG Rewards Program Terms</button></li>
              </ul>
            </div>

            {/* Column 5: Right Credits (Desktop) */}
            <div className="hidden lg:block lg:pl-4">
              <p className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.1em] text-[#0E150E] mb-4 sm:mb-5">
                Experience
              </p>
              <div className="text-[13px] text-[#0E150E]/75 leading-relaxed space-y-3">
                <p>Fresh whole food made in-house every morning.</p>
                <p>Taste the seasonal difference crafted with certified sustainable farm partners.</p>
              </div>
            </div>
          </div>

          {/* ── Sweetgreen Wordmark & Legal Credits Bar ── */}
          <div className="pt-10 sm:pt-14">
            <div className="text-4xl sm:text-5xl lg:text-6xl font-serif font-extrabold tracking-tight text-[#0E150E] lowercase mb-6 select-none">
              {restaurant.restaurantName?.toLowerCase() || 'sweetgreen'}
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-[12px] sm:text-[13px] text-[#0E150E]/70">
              <p>©2026 {restaurant.restaurantName || 'sweetgreen'}. All rights reserved.</p>
              <p className="max-w-md sm:text-right">
                Annapurna® and the Hex Bowl™ are trademarks of Annapurna, Inc.
              </p>
            </div>
          </div>
        </div>

      </footer >

      {/* ── Fixed Bottom Cart Pill (Visible when items in bag) ── */}
      {
        bagTotalItems > 0 && !showBagDrawer && (
          <div className="fixed bottom-6 left-0 right-0 z-40 px-4 sm:px-6 pointer-events-none">
            <div className="max-w-md mx-auto pointer-events-auto">
              <button
                onClick={() => setShowBagDrawer(true)}
                className="w-full bg-[#003B21] hover:bg-[#002e1a] text-white p-4 rounded-full shadow-2xl flex items-center justify-between gap-4 border border-white/10 active:scale-95 transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E2FF3B] text-[#003B21] flex items-center justify-center font-black text-xs">
                    {bagTotalItems}
                  </div>
                  <p className="text-sm font-extrabold tracking-wider uppercase">View Bag</p>
                </div>
                <div className="flex items-center gap-2 text-lg font-bold pr-1">
                  <span>₹{bagSubtotal.toFixed(2)}</span>
                  <ArrowRight size={18} />
                </div>
              </button>
            </div>
          </div>
        )
      }

      {/* ── Item Detail Modal ── */}
      {
        selectedItemModal && (
          <div className="fixed inset-0 z-50 bg-[#003B21]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-[#F5F3E9] rounded-t-[32px] sm:rounded-[36px] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
              <div className="flex items-center justify-between pb-4 border-b border-[#003B21]/10 mb-5">
                <span className="text-xs font-bold uppercase tracking-widest text-[#003B21]/60">
                  {selectedItemModal.category}
                </span>
                <button
                  onClick={() => setSelectedItemModal(null)}
                  className="w-8 h-8 rounded-full bg-white text-[#003B21] flex items-center justify-center hover:bg-[#EAE5DC] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <img
                src={selectedItemModal.image || CATEGORY_IMAGE_FALLBACKS[selectedItemModal.category] || CATEGORY_IMAGE_FALLBACKS['Salads']}
                alt={selectedItemModal.name}
                className="w-full max-h-64 object-cover rounded-2xl mb-5 bg-white shadow-xs"
              />

              <h3 className="text-2xl sm:text-3xl font-bold text-[#003B21] mb-2 leading-none uppercase">
                {selectedItemModal.name}
              </h3>

              {selectedItemModal.description && (
                <p className="text-sm text-[#003B21]/80 mb-5 leading-relaxed">
                  {selectedItemModal.description}
                </p>
              )}

              {selectedItemModal.variations && selectedItemModal.variations.length > 0 && (
                <div className="mb-6 mt-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#003B21] block mb-3 border-b border-[#003B21]/10 pb-2">
                    Choose Size
                  </label>
                  <div className="flex flex-col gap-2.5">
                    {selectedItemModal.variations.map((v, i) => {
                      const isSelected = modalVariation?.name === v.name;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setModalVariation(v)}
                          className={`p-3.5 rounded-xl border-2 text-left flex justify-between items-center transition-all cursor-pointer ${isSelected ? 'border-[#003B21] bg-[#003B21]/5' : 'border-[#003B21]/10 hover:border-[#003B21]/40'
                            }`}
                        >
                          <span className="font-bold text-sm uppercase">{v.name}</span>
                          <span className="text-base font-bold">₹{v.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="sticky bottom-0 bg-[#F5F3E9] pt-4 border-t border-[#003B21]/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 bg-white px-3.5 py-2.5 rounded-full border border-[#003B21]/10">
                  <button type="button" onClick={() => setModalQty(q => Math.max(1, q - 1))} className="hover:opacity-75 cursor-pointer"><Minus size={16} /></button>
                  <span className="font-bold text-base min-w-[20px] text-center">{modalQty}</span>
                  <button type="button" onClick={() => setModalQty(q => q + 1)} className="hover:opacity-75 cursor-pointer"><Plus size={16} /></button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    addToBag(selectedItemModal, modalVariation, modalQty);
                    setSelectedItemModal(null);
                    setShowBagDrawer(true);
                  }}
                  className="flex-1 py-3.5 px-6 bg-[#003B21] hover:bg-[#002e1a] text-white rounded-full font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-between transition-all active:scale-98 shadow-md cursor-pointer"
                >
                  <span>Add to Bag</span>
                  <span className="text-base font-bold">
                    ₹{((modalVariation ? modalVariation.price : selectedItemModal.price) * modalQty).toFixed(2)}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ── Bag Drawer ── */}
      {
        showBagDrawer && (
          <div className="fixed inset-0 z-50 bg-[#003B21]/60 backdrop-blur-xs flex justify-end">
            <div className="bg-[#F5F3E9] w-full max-w-md h-full flex flex-col p-6 sm:p-8 animate-in slide-in-from-right duration-300 shadow-2xl">
              <div className="flex items-center justify-between pb-6 border-b border-[#003B21]/15 shrink-0">
                <span className="text-2xl font-serif font-bold tracking-tight lowercase text-[#003B21]">
                  your bag
                </span>
                <button
                  onClick={() => setShowBagDrawer(false)}
                  className="w-9 h-9 rounded-full bg-white text-[#003B21] flex items-center justify-center hover:bg-[#EAE5DC] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 space-y-5 no-scrollbar">
                {bagItemsList.length === 0 ? (
                  <div className="py-20 text-center opacity-60">
                    <div className="w-16 h-16 rounded-full bg-white mx-auto flex items-center justify-center mb-4">
                      <UtensilsCrossed size={28} />
                    </div>
                    <p className="text-xl font-bold tracking-tight text-[#003B21]">Your bag is empty</p>
                    <p className="text-xs text-[#003B21]/60 mt-1">Explore our seasonal menu to add dishes.</p>
                  </div>
                ) : (
                  bagItemsList.map(item => (
                    <div key={item.key} className="flex items-start justify-between gap-4 border-b border-[#003B21]/10 pb-5">
                      <div className="flex-1">
                        <p className="font-bold text-base text-[#003B21] tracking-tight leading-snug mb-1">{item.name}</p>
                        <p className="text-xs text-[#003B21]/70 mb-3">₹{item.price} each</p>
                        <div className="flex items-center gap-3 bg-white w-fit px-3 py-1 rounded-full border border-[#003B21]/15">
                          <button onClick={() => updateBagQty(item.key, -1)} className="cursor-pointer hover:opacity-75 transition-opacity"><Minus size={14} /></button>
                          <span className="font-bold text-sm min-w-[20px] text-center text-[#003B21]">{item.qty}</span>
                          <button onClick={() => updateBagQty(item.key, 1)} className="cursor-pointer hover:opacity-75 transition-opacity"><Plus size={14} /></button>
                        </div>
                      </div>
                      <p className="font-bold text-base text-[#003B21] tracking-tight">
                        ₹{(item.price * item.qty).toFixed(2)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {bagItemsList.length > 0 && (
                <div className="pt-4 shrink-0 space-y-4 border-t border-[#003B21]/15">
                  {/* Total Bill breakdown */}
                  <div className="flex justify-between items-baseline px-1">
                    <div>
                      <span className="font-bold text-base text-[#003B21] block tracking-tight">Total Bill</span>
                      <span className="text-xs text-[#003B21]/60">{bagTotalItems} {bagTotalItems === 1 ? 'dish' : 'dishes'}</span>
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-[#003B21]">
                      ₹{bagSubtotal.toFixed(2)}
                    </span>
                  </div>

                  {/* WhatsApp Place Order Button */}
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppOrder()}
                    className="w-full py-4 bg-[#25D366] hover:bg-[#20ba5a] active:scale-98 text-white rounded-full font-bold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer group"
                  >
                    <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413Z" />
                    </svg>
                    <span>Place Order • ₹{bagSubtotal.toFixed(2)}</span>
                  </button>

                  {/* Direct Cafe Destination Badge */}
                  {resolvedOwnerWhatsApp && (
                    <p className="text-[11px] text-center text-[#003B21]/65">
                      Sends directly to: <span className="font-bold text-[#003B21]">{restaurant?.restaurantName || 'Cafe Owner'}</span> (+{resolvedOwnerWhatsApp})
                    </p>
                  )}

                  <button
                    onClick={clearBag}
                    className="w-full text-center text-xs opacity-60 underline underline-offset-4 hover:opacity-100 transition-opacity cursor-pointer pt-1"
                  >
                    Clear Bag
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1" onClick={() => setShowBagDrawer(false)}></div>
          </div>
        )
      }

      {/* ── Reset Streak Modal ── */}
      {
        showResetModal && (
          <div className="fixed inset-0 z-50 bg-[#003B21]/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#F5F3E9] text-[#003B21] rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl border border-[#003B21]/15 animate-in zoom-in-95 duration-200">
              <h3 className="text-3xl font-serif font-bold mb-4 uppercase leading-none">Reset Streak?</h3>
              <p className="text-base leading-snug mb-8 opacity-80">
                This will clear the {visitCount} stamps recorded on this device.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleResetAttendance}
                  disabled={resetting}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-widest rounded-full transition-all active:scale-98 cursor-pointer"
                >
                  {resetting ? 'Resetting...' : 'Yes, Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                  className="w-full py-4 bg-white hover:bg-slate-50 border border-[#003B21]/20 font-bold text-sm uppercase tracking-widest rounded-full transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ── Prompt for WhatsApp Number (Fallback if cafe has no phone configured) ── */}
      {showPhonePromptModal && (
        <div className="fixed inset-0 z-50 bg-[#003B21]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5F3E9] text-[#003B21] rounded-3xl max-w-sm w-full p-6 sm:p-8 text-center shadow-2xl border border-[#003B21]/15 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.584 1.83.896 2.796.896 3.182 0 5.768-2.587 5.768-5.766.001-3.181-2.585-5.767-5.768-5.767zm7.551 5.766c.002 4.161-3.385 7.549-7.55 7.549-1.328 0-2.571-.349-3.666-.968l-4.086 1.07 1.091-3.987c-.694-1.151-1.085-2.493-1.086-3.882 0-4.161 3.387-7.55 7.55-7.55 4.162.001 7.548 3.388 7.548 7.548z" />
              </svg>
            </div>
            <h3 className="text-2xl font-serif font-bold mb-2">Cafe's WhatsApp</h3>
            <p className="text-xs text-[#003B21]/70 mb-5 leading-relaxed">
              Enter the cafe or owner's WhatsApp number to dispatch your order with total bill.
            </p>
            <input
              type="tel"
              value={customPhoneInput}
              onChange={(e) => setCustomPhoneInput(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full bg-white border border-[#003B21]/20 rounded-xl px-4 py-3 text-sm font-bold text-[#003B21] mb-4 text-center focus:outline-none focus:border-[#003B21]"
            />
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (customPhoneInput.trim()) {
                    handleSendWhatsAppOrder(customPhoneInput.trim());
                  }
                }}
                disabled={!customPhoneInput.trim()}
                className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba5a] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-md transition-all cursor-pointer"
              >
                Send Order to WhatsApp →
              </button>
              <button
                type="button"
                onClick={() => setShowPhonePromptModal(false)}
                className="w-full py-2.5 text-xs text-[#003B21]/70 hover:text-[#003B21] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}



    </div >
  );
}