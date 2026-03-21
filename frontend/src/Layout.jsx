import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { utilityServices } from './services/utilityServices';

export default function Layout() {
  // 1. Create the 'switch' (state)
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Helper function to close menu when a link is clicked
  const closeMenu = () => setIsMenuOpen(false);

  const refreshClickHandle = async () => {
    try {
      const data = await utilityServices.refreshBe()
      alert(data.status)
    } catch(error) {
      alert('Health Error');
      console.error("Failed to fetch transactions:", error);
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      
      {/* 2. MOBILE OVERLAY (The dark background when menu is open) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={closeMenu}
        />
      )}

      {/* 3. SIDEBAR (Enhanced with mobile positioning) */}
      <nav className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:flex md:flex-col md:shadow-md
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 text-xl font-bold text-blue-600 border-b">Personal Finance</div>
        <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          <Link to="/" onClick={closeMenu} className="block p-3 rounded-lg hover:bg-blue-50">Dashboard</Link>
          <Link to="/budget" onClick={closeMenu} className="block p-3 rounded-lg hover:bg-blue-50">Budget</Link>
          <Link to="/transactions" onClick={closeMenu} className="block p-3 rounded-lg hover:bg-blue-50">Transactions</Link>
          <Link to="/categories" onClick={closeMenu} className="block p-3 rounded-lg hover:bg-blue-50">Categories</Link>
          <Link to="/emergency" onClick={closeMenu} className="block p-3 rounded-lg hover:bg-blue-50">Emergency</Link>
          <Link to="/accounts" onClick={closeMenu} className="block p-3 rounded-lg hover:bg-blue-50">Accounts</Link>
          <Link to="/milestones" onClick={closeMenu} className="block p-3 rounded-lg hover:bg-blue-50">Milestones</Link>
          <Link to="/users" onClick={closeMenu} className="block p-3 rounded-lg hover:bg-blue-50">Users</Link>
          <Link to="/utility" onClick={closeMenu} className="block p-3 rounded-lg hover:bg-blue-50">Utility</Link>
          <Link to="/healthcare" onClick={closeMenu} className="block p-3 rounded-lg hover:bg-blue-50">Health Care</Link>
          <button className="" onClick={refreshClickHandle}>Refresh BE</button>
        </div>
      </nav>

      {/* 4. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col">
        
        {/* MOBILE TOP BAR */}
        <header className="md:hidden bg-white p-4 shadow-sm flex justify-between items-center z-30">
          <span className="font-bold text-blue-600">Personal Finance</span>
          {/* 5. THE BUTTON (Flipping the switch) */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {isMenuOpen ? 'Close' : 'Menu'}
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}