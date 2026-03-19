import { useEffect, useState } from "react";
import { utilityServices } from "../services/utilityServices";
import { userService } from "../services/userService";
import { accountService } from "../services/accountService";
import { categoryService } from "../services/catServices";
import { transactionService } from "../services/transactionService";
import { Check } from "lucide-react";
import { CategoryDropdown } from "../components/CategoryDropdown";

export default function Utility() {
    const [file, setFile] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState('EXPENSE');
    const [users, setUsers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    const [commonFormData, setCommonFormData] = useState({
        user_id: '',
        from_account_id: '',
    });

    useEffect(() => {
        // Fetch all required data for the dropdowns
        Promise.all([
            userService.getAll(),
            accountService.getAll(),
            categoryService.getAll()
        ]).then(([userData, accountData, catData]) => {
            setUsers(userData);
            setAccounts(accountData);
            setCategories(catData);

            // Default to first user if available
            if (userData.length > 0) {
                setCommonFormData(prev => ({ ...prev, user_id: userData[0].id }));
            }
        });
    }, []);

    useEffect(() => {
        if (selectAll) {
            setTransactions(prev => prev.map(txn => ({ ...txn, selected: true })));
        }
    }, [selectAll]);

    useEffect(() => {
        const allSelected = transactions.every(txn => txn.selected);
        setSelectAll(allSelected);
    }, [transactions]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) {
            alert("Please select a PDF file");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            setLoading(true);

            utilityServices.create(
                formData,
            ).then((res) => {
                if(res.transactions?.length) {
                    const temp = res.transactions.map((trx)=>{
                        return {
                            selected: true,
                            added: false,
                            date: formatToInputDate(trx.date),
                            amount: trx.amount,
                            note: trx.description,
                            type: trx.amount < 0 ? 'EXPENSE' : 'INCOME',
                            category_id: null,
                            from_account_id: trx.amount < 0 ? commonFormData.from_account_id || null : null,
                            to_account_id: trx.amount > 0 ? commonFormData.from_account_id || null : null,
                            user_id: commonFormData.user_id
                        }
                    })
                    setTransactions(temp);
                }
                setSummary(res.summary || {});
            });

        } catch (err) {
            console.error(err);
            alert("Error processing file");
        } finally {
            setLoading(false);
        }
    };

    function formatToInputDate(dateStr) {
        if (!dateStr) return "";

        const [day, month, year] = dateStr.split(".");
        return `${year}-${month}-${day}`;
    }

    function onSelectTxnToggle(index) {
        const newTransactions = [...transactions];
        newTransactions[index].selected = !newTransactions[index].selected;
        setTransactions(newTransactions);
        if(!newTransactions[index].selected) {
            setSelectAll(false);
        }
    }

    function onDeselectAllClick() {
        setSelectAll(false);
        setTransactions(prev => prev.map(txn => ({ ...txn, selected: false })));
    }

    function handleAddTransactions() {
        transactionService.bulkCreate(transactions.filter(txn => txn.selected && !txn.added).map(txn => ({ ...txn, amount: Math.abs(txn.amount) }))).then((res) => {
            alert(`Added ${res.created_count} transactions successfully!`);
            setTransactions(prev => prev.map(txn => txn.selected && !txn.added ? { ...txn, added: true } : txn));
        }).catch((err) => {
            console.error(err);
            alert("Error adding transactions");
        });
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold mb-4">Utility Page</h1>
            <div>
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <div>
                        <div className="space-y-1 mb-4">
                            <label className="text-xs font-bold text-gray-400 ml-1 uppercase">Logged By</label>
                            <select
                                className="w-full p-3 border rounded-xl bg-gray-50"
                                value={commonFormData.user_id}
                                onChange={(e) => setCommonFormData({ ...commonFormData, user_id: e.target.value })}
                                required
                            >
                                <option value="">Select User</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <select
                                className="w-full p-3 border rounded-xl"
                                onChange={(e) => setCommonFormData({ ...commonFormData, from_account_id: e.target.value })}
                            >
                                <option value="">From Account</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                        <h2 className="text-xs font-bold text-gray-400 ml-1">Upload Bank Statement</h2>
                        <label for="file-upload" class="relative cursor-pointer rounded-md bg-transparent font-semibold text-indigo-600 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-600 hover:text-indigo-500">
                            <input id="file-upload" type="file" accept="application/pdf" onChange={handleFileChange} />
                        </label>

                        <button onClick={handleUpload} disabled={loading || !commonFormData.from_account_id} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2 my-3">
                            {loading ? "Processing..." : "Upload & Analyze"}
                        </button>

                        {/* Summary */}
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Summary</h3>
                        <ul>
                            {Object.entries(summary).map(([cat, amt]) => (
                                <li key={cat}>
                                    {cat}: ₹{amt.toFixed(2)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center my-3">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Transactions</h3>
                        {!!transactions?.length && <>
                        <span>Select All: <input type="checkbox" checked={selectAll} onChange={() => setSelectAll(!selectAll)} /></span>
                        <span><button onClick={onDeselectAllClick}>Deselect</button></span></>}
                    </div>
                    <div>
                        {transactions.map((txn, index) => (
                            <div className="bg-white p-3 my-2 rounded-2xl shadow-sm border border-gray-100 h-fit" style={{ maxWidth: '91vw' }}>
                                <div className="flex justify-between items-center">
                                    <input type="checkbox" checked={txn.selected} onChange={() => onSelectTxnToggle(index)} />
                                {txn.added && <span><Check color="green" /> </span>}
                                </div>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <input
                                            type="date"
                                            className="w-full p-1 mr-1 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                            value={txn.date} // Assuming date is in dd.mm.yyyy format
                                            // onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <span className={`font-bold ${txn.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            ₹{txn.amount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <select
                                        className="w-full p-1 mr-1 mt-1 border rounded-xl"
                                        value={txn.type}
                                        onChange={(e) => {
                                            const newType = e.target.value;
                                            const newTransactions = [...transactions];
                                            newTransactions[index].type = newType;
                                            setTransactions(newTransactions);
                                        }}
                                        required
                                    >
                                        <option value="">Type</option>
                                        <option value="INCOME">INCOME</option>
                                        <option value="EXPENSE">EXPENSE</option>
                                        <option value="TRANSFER">TRANSFER</option>
                                    </select>
                                    <CategoryDropdown value={transactions[index].category_id} categories={categories} onChange={(value) => {
                                        const newTransactions = [...transactions];
                                            newTransactions[index].category_id = +value;
                                            setTransactions(newTransactions);
                                    }} />
                                </div>
                                <div className="flex justify-between items-center">
                                    {txn.type === 'TRANSFER' && (
                                        <select
                                            className="w-full p-1 mt-1 border rounded-xl"
                                            onChange={(e) => {
                                                const newTransactions = [...transactions];
                                                newTransactions[index].to_account_id = e.target.value;
                                                setTransactions(newTransactions);
                                            }}
                                            value={txn.to_account_id || ''}
                                        >
                                            <option value="">To Account</option>
                                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div style={{ wordWrap: 'break-word' }}>
                                    <span className="text-gray-400 text-sm leading-1">
                                        <textarea className="w-full pt-2 leading-tight" name="note" rows={3} value={txn.note} onChange={(e) => {
                                            const newTransactions = [...transactions];
                                            newTransactions[index].note = e.target.value;
                                            setTransactions(newTransactions);
                                        }} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div>
                        <button onClick={handleAddTransactions} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2 my-3">Add Transactions</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// This page can be expanded in the future to include features like:
// - CSV Import/Export for transactions and accounts
// - Data backup and restore options
// - Integration with third-party financial APIs
// - Custom report generation tools