import { useEffect, useState } from 'react';
import RecordUploader from '../components/RecordUploader';
import { healthCareServices } from '../services/healthCareServices';
import { Download, Eye, Info, Trash2 } from 'lucide-react';

export default function HealthCare() {
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = async ({ critical = null }) => {
        healthCareServices.getAllRecords({ searchTerm, critical })
            .then(data => {
                setRecords(data);
            })
            .catch(error => {
                console.error("Failed to fetch medical records:", error);
            });
        setLoading(false);
    };

    useEffect(() => {
        loadData({ critical: true });
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
        <div className="p-2">
            <h1 className="text-2xl font-bold mb-4">Health Care</h1>
            <p className="text-gray-600">This is the Health Care page. Content coming soon!</p>
            <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all mt-4">
                Upload Medical Report
            </button>
            <div>
                <div>
                    <input
                        type='text'
                        placeholder='Search by patient name, report type, tags...'
                        className="mb-4 p-2 border rounded-lg w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button onClick={loadData} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg">
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
                                <div style={{ maxWidth: '82vw', overflow: 'auto' }}>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="px-4 py-2">Actions</th>
                                                <th className="px-4 py-2">Report Type</th>
                                                <th className="px-4 py-2">Report Date</th>
                                                <th className="px-4 py-2">Doctor Name</th>
                                                <th className="px-4 py-2">Tags</th>
                                                <th className="px-4 py-2">Patient Name</th>
                                                <th className="px-4 py-2">Critical</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {records.map(record => (
                                                <tr key={record.id}>
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <Info size={16} color='gray' />
                                                            <Eye onClick={() => window.open(record.cloudinary_url, '_blank')} color='steelblue' size={16} />
                                                            {/* <Download onClick={() => window.open(record.cloudinary_url, '_blank')} color='green' size={16} /> */}
                                                            <Trash2 onClick={() => deleteRecord(record.id)} color='salmon' size={16} />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">{record.report_type}</td>
                                                    <td className="px-4 py-2">{record.report_date}</td>
                                                    <td className="px-4 py-2">{record.doctor_name}</td>
                                                    <td className="px-4 py-2">{record.tags}</td>
                                                    <td className="px-4 py-2">{record.patient_name}</td>
                                                    <td className="px-4 py-2">{record.critical ? 'Yes' : 'No'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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