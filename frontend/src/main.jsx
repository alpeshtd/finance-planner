import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories.jsx';
import Users from './pages/Users.jsx';
import Emergency from './pages/Emergency.jsx';
import Budget from './pages/Budget.jsx';
import Milestones from './pages/Milestones.jsx';
import Utility from './pages/Utility.jsx';
import HealthCare from './pages/HealthCare.jsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />, // This contains your Navbar and Sidebar
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "budget", element: <Budget /> },
      { path: "transactions", element: <Transactions /> },
      { path: "accounts", element: <Accounts /> },
      { path: "milestones", element: <Milestones /> },
      { path: "categories", element: <Categories /> },
      { path: "emergency", element: <Emergency /> },
      { path: "users", element: <Users /> },
      { path: "utility", element: <Utility /> },
      { path: "healthcare", element: <HealthCare /> }
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
