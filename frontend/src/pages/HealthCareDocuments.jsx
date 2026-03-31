import { useEffect, useState } from 'react';
import RecordUploader from '../components/RecordUploader';
import { healthCareServices } from '../services/healthCareServices';
import { Download, Eye, Info, Trash2 } from 'lucide-react';

export default function HealthCareDocuments() {
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('last 20');

    const loadData = async () => {
        try {
            const data = await healthCareServices.getAllRecords({ searchTerm });
            setRecords(data);
        } catch (error) {
            console.error('Failed to fetch medical records:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const deleteRecord = async (id) => {
        if (!window.confirm('Are you sure you want to delete this report? This cannot be undone.')) {
            return;
        }

        try {
            const response = await healthCareServices.deleteRecord(id);
            if (response.message === 'Record and file deleted successfully') {
                loadData();
                alert('Deleted successfully');
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Documents</h2>
                    <p className="text-gray-500 text-sm">Upload and manage your medical records from one place.</p>
                </div>
                <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2">
                    <span className="text-xl">+</span>Add Report
                </button>
            </div>

            <div className='mt-2 flex flex-col gap-2 sm:flex-row'>
                <input
                    type='text'
                    placeholder='Search by patient name, report type, tags...'
                    className="flex-1 p-2 border rounded-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={loadData} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md">
                    Search
                </button>
            </div>

            {loading ? (
                <p className="text-gray-500 mt-4">Loading medical records...</p>
            ) : (
                <div className="mt-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                    {records.length > 0 ? (
                        <div className="space-y-3">
                            {records.map(record => (
                                <div key={record.id} className="p-3 hover:bg-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center rounded-xl transition-colors">
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{record.report_type}</p>
                                        <p className="text-xs text-gray-400 mt-1">{record.report_date} • {record.doctor_name} • {record.patient_name} • {record.tags}</p>
                                    </div>
                                    <div className="mt-3 sm:mt-0 flex items-center gap-3">
                                        <Info size={16} color='gray' />
                                        <Eye onClick={() => window.open(record.cloudinary_url, '_blank')} className="cursor-pointer" color='steelblue' size={16} />
                                        <Trash2 onClick={() => deleteRecord(record.id)} className="cursor-pointer" color='salmon' size={16} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No medical records found.</p>
                    )}
                </div>
            )}

            {showForm && <RecordUploader onClose={() => setShowForm(false)} />}
        </div>
    );
}
