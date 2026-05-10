const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add router imports
content = content.replace(
  /import \{ LayoutGrid/, 
  'import { Routes, Route, useNavigate, useLocation, Navigate, Link, useParams } from "react-router-dom";\nimport { LayoutGrid'
);

// 2. Remove pushNav
content = content.replace(/\/\/ ── PWA back-navigation helper[\s\S]*?const pushNav = \(key\) => \{[\s\S]*?\};\n\n/, '');

// 3. Add TableViewWrapper
content = content.replace(
  /function App\(\) \{/, 
  `const TableViewWrapper = ({ menuItems, user, fetchActiveOrders, isHistoryView = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 bg-white z-[120] animate-in slide-in-from-bottom-full duration-300">
      <TableView
        tableId={!isHistoryView ? id : null}
        orderId={isHistoryView ? id : null}
        isHistoryView={isHistoryView}
        menuItems={menuItems}
        user={user}
        onClose={() => {
          fetchActiveOrders();
          navigate(-1);
        }}
        onCheckoutComplete={() => {
          fetchActiveOrders();
          navigate(-1);
        }}
      />
    </div>
  );
};

function App() {`
);

// 4. State replacements
content = content.replace(/  const \[activeTab, setActiveTab\] = useState\('dashboard'\);\n/, '  const navigate = useNavigate();\n  const location = useLocation();\n  const activeTab = location.pathname.split(\'/\')[1] || \'dashboard\';\n');
content = content.replace(/  const \[openTableId, setOpenTableId\] = useState\(null\);     \/\/ full-screen TableView for tables\n/, '');
content = content.replace(/  const \[openOrderId, setOpenOrderId\] = useState\(null\);     \/\/ full-screen TableView for specific orders \(parcels\)\n/, '');

// 5. Handlers
content = content.replace(
  /\/\* Table click → open full-screen TableView \*\/[\s\S]*?const handleTableClick = \(tableId\) => \{[\s\S]*?\};\n/,
  `const handleTableClick = (tableId) => {
    navigate('/table/' + tableId);
  };\n`
);

content = content.replace(
  /const handlePlanActivated = \(\) => \{[\s\S]*?\};\n/,
  `const handlePlanActivated = () => {
    navigate('/dashboard');
    fetchSubscription();
    fetchInitialData();
  };\n`
);

// 6. Remove popstate hook
content = content.replace(/\/\/ ── PWA back-button: intercept popstate so Android back navigates inside app ──[\s\S]*?window\.removeEventListener\('popstate', handlePop\);\n  \}, \[\]\);\n\n/, '');

// 7. handleTabChange
content = content.replace(
  /\/\/ ── useCallback hooks MUST be before any early returns \(Rules of Hooks\) ────────\n  const handleTabChange = useCallback\(\(tabId\) => \{[\s\S]*?\}, \[\]\);\n/,
  `const handleTabChange = (tabId) => {
    navigate('/' + tabId);
    window.dispatchEvent(new Event('close-notifications'));
  };\n`
);

// 8. Full-screen view override
content = content.replace(/\/\/ ── FULL-SCREEN VIEW \(replaces entire UI\) ──────────────────────────────────[\s\S]*?if \(openTableId \|\| openOrderId\) \{[\s\S]*?return \([\s\S]*?\);\n  \}\n/, '');

// 9. Render block inner routing
content = content.replace(
  /\{!bannerDismissed && \([\s\S]*?SubscriptionBanner subscription=\{subscription\} onDismiss=\{.*?\} \/\>\n          \)\}\n\n          \{\/\* Dashboard View \*\/\}/,
  `{!bannerDismissed && (
            <SubscriptionBanner subscription={subscription} onDismiss={() => setBannerDismissed(true)} />
          )}

          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={
              <DashboardView
                activeOrders={activeOrders}
                tableCount={tableCount}
                onTabChange={(tab) => navigate('/' + tab)}
              />
            } />
            <Route path="/tables" element={
              <div className="animate-in fade-in duration-500">
                <TableGrid
                  activeOrders={activeOrders}
                  onTableClick={handleTableClick}
                  tableCount={tableCount}
                />
              </div>
            } />
            <Route path="/pos" element={
              <div className="animate-in fade-in duration-500">
                <POSInterface
                  activeOrders={activeOrders}
                  user={user}
                  onOrderUpdate={fetchActiveOrders}
                  onOrderClick={(orderId) => navigate('/order/' + orderId)}
                />
              </div>
            } />
            <Route path="/history" element={
              <div className="animate-in fade-in duration-500">
                <OrderHistory
                  activeOrders={activeOrders}
                  onOrderUpdate={fetchActiveOrders}
                  onOrderClick={(orderId) => navigate('/order/' + orderId)}
                />
              </div>
            } />
            <Route path="/sales" element={
              <div className="animate-in fade-in duration-500">
                <SalesReport />
              </div>
            } />
            <Route path="/settings" element={
              <div className="animate-in fade-in duration-500">
                <SettingsPanel
                  user={user}
                  subscription={subscription}
                  onSettingsUpdate={handleSettingsUpdate}
                  onShowPassword={() => setShowPasswordModal(true)}
                  onLogout={handleLogout}
                />
              </div>
            } />
          </Routes>
          {/* Old conditionals start */}`
);

// Remove the old conditionals
content = content.replace(/\{\/\* Dashboard View \*\/\}(.|\n)*?\{\/\* Settings \*\/\}\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n/, '');

// Append the table and order routes to the very end of App (just before the last closing div)
content = content.replace(
  /<\/div>\n  \);\n\}\n\nexport default App;/,
  `  <Routes>
        <Route path="/table/:id" element={<TableViewWrapper menuItems={menuItems} user={user} fetchActiveOrders={fetchActiveOrders} isHistoryView={false} />} />
        <Route path="/order/:id" element={<TableViewWrapper menuItems={menuItems} user={user} fetchActiveOrders={fetchActiveOrders} isHistoryView={true} />} />
      </Routes>
    </div>
  );
}

export default App;`
);

fs.writeFileSync('src/App.jsx', content);
