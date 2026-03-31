import { Outlet, NavLink } from 'react-router-dom';

const tabClass = ({ isActive }) =>
    `px-4 py-2 rounded-full text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
    }`;

export default function HealthCare() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Health Care</h1>
                    <p className="text-gray-500 text-sm">Manage medical reports and healthcare documents in one place.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <NavLink to="" end className={tabClass}>
                        Overview
                    </NavLink>
                    <NavLink to="documents" className={tabClass}>
                        Documents
                    </NavLink>
                    <NavLink to="diabetes" className={tabClass}>
                        Diabetes
                    </NavLink>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                <Outlet />
            </div>
        </div>
    );
}
