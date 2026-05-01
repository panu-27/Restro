import React, { useState } from 'react';
import { ArrowLeft, ShoppingBag, Star, ChevronDown, Search, Flame, Leaf } from 'lucide-react';

const FontLink = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Serif+Display:ital@0;1&display=swap');
  `}</style>
);

const MENU = {
  categories: ['All', 'Veg', 'Non-Veg', 'Beverages', 'Desserts'],
  items: [
    { id: 1, name: 'Paneer Butter Masala', cat: 'Veg', price: 250, desc: 'Creamy tomato-based curry with soft paneer cubes', rating: 4.8, popular: true, veg: true },
    { id: 2, name: 'Dal Makhani', cat: 'Veg', price: 190, desc: 'Slow-cooked black lentils in rich buttery gravy', rating: 4.7, popular: false, veg: true },
    { id: 3, name: 'Chicken Tikka Masala', cat: 'Non-Veg', price: 320, desc: 'Smoky grilled chicken in spiced masala sauce', rating: 4.9, popular: true, veg: false },
    { id: 4, name: 'Butter Chicken', cat: 'Non-Veg', price: 300, desc: 'Tender chicken in a mild, creamy tomato sauce', rating: 4.8, popular: false, veg: false },
    { id: 5, name: 'Garlic Naan', cat: 'Veg', price: 60, desc: 'Soft leavened bread with garlic and butter', rating: 4.6, popular: false, veg: true },
    { id: 6, name: 'Mango Lassi', cat: 'Beverages', price: 90, desc: 'Chilled yogurt drink blended with Alphonso mango', rating: 4.9, popular: true, veg: true },
    { id: 7, name: 'Masala Chai', cat: 'Beverages', price: 50, desc: 'Freshly brewed spiced Indian tea with milk', rating: 4.7, popular: false, veg: true },
    { id: 8, name: 'Gulab Jamun', cat: 'Desserts', price: 100, desc: 'Soft milk-solid dumplings soaked in rose sugar syrup', rating: 4.8, popular: true, veg: true },
    { id: 9, name: 'Rasgulla', cat: 'Desserts', price: 90, desc: 'Spongy cottage cheese balls in light sugar syrup', rating: 4.5, popular: false, veg: true },
  ]
};

const FOOD_IMAGES = {
  'Paneer Butter Masala': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&fit=crop&q=80',
  'Dal Makhani': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&fit=crop&q=80',
  'Chicken Tikka Masala': 'https://images.unsplash.com/photo-1604952564956-f51082a68a2d?w=400&fit=crop&q=80',
  'Butter Chicken': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&fit=crop&q=80',
  'Garlic Naan': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&fit=crop&q=80',
  'Mango Lassi': 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&fit=crop&q=80',
  'Masala Chai': 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&fit=crop&q=80',
  'Gulab Jamun': 'https://images.unsplash.com/photo-1666278379869-10b65b9af75e?w=400&fit=crop&q=80',
  'Rasgulla': 'https://images.unsplash.com/photo-1645177628172-a94c1f96debb?w=400&fit=crop&q=80',
};

export default function MenuPreview() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({});

  const filtered = MENU.items.filter(item => {
    const matchesCat = activeCategory === 'All' || item.cat === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  const addToCart = (id) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const removeFromCart = (id) => setCart(prev => {
    const next = { ...prev };
    if (next[id] > 1) next[id]--;
    else delete next[id];
    return next;
  });

  return (
    <div className="min-h-screen bg-white text-[#111111] font-['DM_Sans',sans-serif] antialiased">
      <FontLink />

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 h-20 bg-white/90 backdrop-blur-xl border-b border-zinc-100 flex items-center px-6 sm:px-8 justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="flex items-center gap-2 text-zinc-500 hover:text-[#111111] transition-colors text-[14px] font-medium no-underline group"
          >
            <div className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center group-hover:border-zinc-400 transition-colors">
              <ArrowLeft size={15} />
            </div>
            Back
          </a>
          <div className="h-5 w-px bg-zinc-200" />
          <img src="/brand-logo.png" alt="Restro" className="h-9 object-contain" />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-2 text-[13px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-100 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Demo
          </span>
          {totalItems > 0 && (
            <div className="flex items-center gap-2 bg-[#FF5A36] text-white px-4 py-2 rounded-full text-[13px] font-bold">
              <ShoppingBag size={15} />
              {totalItems} item{totalItems > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </nav>

      <div className="pt-20">
        {/* HERO / VIDEO SECTION */}
        <section className="py-20 px-6 sm:px-8 max-w-[1100px] mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#FF5A36]/8 text-[#FF5A36] text-[12px] font-bold px-4 py-2 rounded-full border border-[#FF5A36]/20 mb-6 tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-[#FF5A36] animate-pulse" />
              Product Demo
            </div>
            <h1 className="font-['DM_Serif_Display',serif] text-[clamp(36px,5vw,64px)] leading-tight text-[#111111] mb-5">
              See it in action.
            </h1>
            <p className="text-[18px] text-zinc-500 max-w-[500px] mx-auto leading-relaxed">
              Watch how modern restaurants manage orders, tables, and billing — all from one screen.
            </p>
          </div>

          {/* YouTube Embed */}
          <div className="w-full aspect-video rounded-[2rem] overflow-hidden border border-zinc-100 shadow-xl shadow-zinc-100 bg-zinc-50 relative">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=replace_with_your_video_id&rel=0&modestbranding=1&color=white"
              title="Restro POS Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <p className="text-center text-[13px] text-zinc-400 mt-4">
            Replace this with your actual demo video — just swap the YouTube video ID above.
          </p>
        </section>

        {/* DIVIDER */}
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8">
          <div className="flex items-center gap-6 py-4">
            <div className="flex-1 h-px bg-zinc-100" />
            <span className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Digital Menu Preview</span>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>
        </div>

        {/* DIGITAL MENU SECTION */}
        <section className="py-12 pb-24 px-6 sm:px-8 max-w-[1100px] mx-auto">
          <div className="mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-['DM_Serif_Display',serif] text-[32px] sm:text-[40px] text-[#111111] leading-tight">
                Spice Garden
              </h2>
              <p className="text-zinc-400 text-[14px] mt-1 flex items-center gap-2">
                <Star size={13} className="text-[#FF5A36]" fill="#FF5A36" />
                <span className="font-bold text-zinc-700">4.8</span> · North Indian · Mumbai
              </p>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-auto">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search dishes..."
                className="w-full sm:w-[220px] bg-zinc-50 border border-zinc-100 rounded-full py-3 pl-10 pr-4 text-[14px] outline-none focus:border-[#FF5A36]/40 focus:ring-2 focus:ring-[#FF5A36]/10 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-8">
            {MENU.categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[14px] font-medium border transition-all ${
                  activeCategory === cat
                    ? 'bg-[#111111] text-white border-[#111111]'
                    : 'bg-white text-zinc-600 border-zinc-100 hover:border-zinc-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-zinc-400 text-[16px]">No items found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(item => (
                <div
                  key={item.id}
                  className="bg-white border border-zinc-100 rounded-[1.5rem] overflow-hidden hover:shadow-md hover:border-zinc-200 transition-all duration-300 group flex flex-col"
                >
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden bg-zinc-50">
                    <img
                      src={FOOD_IMAGES[item.name]}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    {item.popular && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#FF5A36] text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                        <Flame size={11} /> Popular
                      </div>
                    )}
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-sm border-2 flex items-center justify-center ${item.veg ? 'border-emerald-600' : 'border-red-600'}`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${item.veg ? 'bg-emerald-600' : 'bg-red-600'}`} />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-semibold text-[16px] text-[#111111] leading-snug">{item.name}</h3>
                      <div className="flex items-center gap-1 shrink-0 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full">
                        <Star size={11} className="text-[#FF5A36]" fill="#FF5A36" />
                        <span className="text-[12px] font-bold text-zinc-700">{item.rating}</span>
                      </div>
                    </div>
                    <p className="text-[13px] text-zinc-400 leading-relaxed mb-4 flex-1">{item.desc}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="font-['DM_Serif_Display',serif] text-[22px] text-[#111111]">₹{item.price}</span>
                      {cart[item.id] ? (
                        <div className="flex items-center gap-3 bg-[#FF5A36]/8 border border-[#FF5A36]/20 rounded-full px-1 py-1">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-7 h-7 rounded-full bg-[#FF5A36] text-white flex items-center justify-center font-bold text-lg leading-none hover:bg-[#D94420] transition-colors"
                          >–</button>
                          <span className="text-[15px] font-bold text-[#FF5A36] w-4 text-center">{cart[item.id]}</span>
                          <button
                            onClick={() => addToCart(item.id)}
                            className="w-7 h-7 rounded-full bg-[#FF5A36] text-white flex items-center justify-center font-bold text-lg leading-none hover:bg-[#D94420] transition-colors"
                          >+</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item.id)}
                          className="px-5 py-2.5 bg-[#111111] text-white text-[13px] font-semibold rounded-full hover:bg-[#FF5A36] active:scale-95 transition-all"
                        >
                          Add +
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA Banner */}
          <div className="mt-16 bg-[#111111] rounded-[2rem] p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div>
              <h3 className="font-['DM_Serif_Display',serif] text-[28px] md:text-[36px] text-white leading-tight mb-3">
                Ready to go digital?
              </h3>
              <p className="text-zinc-400 text-[16px] max-w-[400px]">
                Set up your own branded digital menu in minutes. No tech skills required.
              </p>
            </div>
            <a
              href="/"
              className="shrink-0 inline-flex items-center gap-2 bg-[#FF5A36] text-white px-8 py-4 rounded-full font-bold text-[15px] hover:bg-white hover:text-[#111111] transition-all duration-300"
            >
              Get Started Free
            </a>
          </div>
        </section>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
