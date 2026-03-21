import { useEffect, useState } from 'react';
import RecordUploader from '../components/RecordUploader';
import { healthCareServices } from '../services/healthCareServices';
import { Download, Eye, Info, Trash2 } from 'lucide-react';

export default function HealthCare() {
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('last 20');

    const loadData = async () => {
        healthCareServices.getAllRecords({ searchTerm })
            .then(data => {
                setRecords(data);
            })
            .catch(error => {
                console.error("Failed to fetch medical records:", error);
            });
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const deleteRecord = async (id) => {
        if (!window.confirm("Are you sure you want to delete this report? This cannot be undone.")) {
            return;
        }

        try {
            // Send a DELETE request to the server
            const response = await healthCareServices.deleteRecord(id);

            if (response.message === "Record and file deleted successfully") {
                // Update your local React state to remove the item from the list
                // setRecords(records.filter(record => record.id !== id));
                loadData(); // Refresh the list after deletion
                alert("Deleted successfully");
            }
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    return (
        <div className="">
            <div className='flex justify-between items-center'>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Health Care</h1>
                    <p className="text-gray-500 text-sm">This is the Health Care page. Content coming soon!</p>
                </div>
                <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all mt-4 flex items-center gap-2">
                    <span className="text-xl">+</span>Add Report
                </button>
            </div>
            <div>
                <div className='mt-5 flex justify-center gap-2'>
                    <input
                        type='text'
                        placeholder='Search by patient name, report type, tags...'
                        className="p-2 border rounded-lg w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button onClick={loadData} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-1 rounded-md">
                        Search
                    </button>
                </div>
                {loading ? (
                    <p className="text-gray-500 mt-4">Loading medical records...</p>
                ) : (
                    <div className="mt-4">
                        {records.length > 0 ? (
                            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                                <h2 className="text-xl font-semibold mb-2">Medical Records</h2>
                                {records.map(record => (
                                    <div key={record.id} className="p-2 hover:bg-gray-50 flex justify-between items-center transition-colors group">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '20ch' }}>{record.report_type}</span>
                                            <span className="text-xs text-gray-400">{record.report_date} • {record.doctor_name} • {record.patient_name} • {record.tags}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {/* <span className={`font-bold`}>
                                                {record.report_type}
                                            </span> */}
                                            <div className="flex items-center gap-2">
                                                <Info size={16} color='gray' />
                                                <Eye onClick={() => window.open(record.cloudinary_url, '_blank')} color='steelblue' size={16} />
                                                {/* <Download onClick={() => window.open(record.cloudinary_url, '_blank')} color='green' size={16} /> */}
                                                <Trash2 onClick={() => deleteRecord(record.id)} color='salmon' size={16} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">No medical records found.</p>
                        )}
                    </div>
                )}
            </div>
            <div>

            </div>
            {showForm && <RecordUploader onClose={() => setShowForm(false)} />}
        </div>
    );
}