import { useState } from "react";
import { CategoryDropdown } from "./CategoryDropdown";

export default function TransactionFilters({ categories, accounts, users, onApplyFilters, filters: initialFilters }) {
    const [filters, setFilters] = useState(initialFilters);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <h2 className="text-xl font-bold mb-6">Filter Transactions</h2>
                <div className="space-y-4 flex flex-col">
                    <input
                        type="date"
                        value={filters.start}
                        onChange={(e) => setFilters({ ...filters, start: e.target.value })}
                        className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="date"
                        value={filters.end}
                        onChange={(e) => setFilters({ ...filters, end: e.target.value })}
                        className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <CategoryDropdown
                        categories={categories}
                        value={filters.category_id}
                        onChange={(value) => setFilters({ ...filters, category_id: value })}
                    />
                    <select
                        value={filters.account_id}
                        onChange={(e) => setFilters({ ...filters, account_id: e.target.value })}
                        className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Accounts</option>
                        {accounts.map(account => (
                            <option key={account.id} value={account.id}>{account.name}</option>
                        ))}
                    </select>
                    <select
                        value={filters.user_id}
                        onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                        className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Users</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onApplyFilters(filters)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold transition-all"
                        >
                            Apply
                        </button>
                        <button
                            onClick={() => {
                                setFilters({
                                    category_id: "",
                                    account_id: "",
                                    user_id: "",
                                });
                            }}
                            className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-semibold transition-all"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}