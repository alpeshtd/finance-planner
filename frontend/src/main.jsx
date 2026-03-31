import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

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
import HealthCareDocuments from './pages/HealthCareDocuments.jsx';
import HealthCareDiabetes from './pages/HealthCareDiabetes.jsx';
import HealthCareOverview from './pages/HealthCareOverview.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import { SelectedUserProvider } from './contexts/SelectedUserContext.jsx';

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
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
      {
        path: "healthcare",
        element: <HealthCare />,
        children: [
          { index: true, element: <HealthCareOverview /> },
          { path: "documents", element: <HealthCareDocuments /> },
          { path: "diabetes", element: <HealthCareDiabetes /> }
        ]
      },
      { path: "settings", element: <Settings /> }
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SelectedUserProvider>
      <RouterProvider router={router} />
    </SelectedUserProvider>
  </StrictMode>,
)
