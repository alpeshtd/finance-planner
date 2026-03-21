import React, { useState } from 'react';
import api from '../services/api';
import { healthCareServices } from '../services/healthCareServices';

const ReportUploader = ({ onClose }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState({
        patient_name: '',
        report_type: '',
        report_date: new Date().toISOString().split('T')[0],
        tags: '',
        doctor_name: '',
        is_critical: false
    });

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const uploadToBackend = async () => {
        if (!selectedFile) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('patient_name', reportData.patient_name);
        formData.append('report_type', reportData.report_type);
        formData.append('report_date', reportData.report_date);
        formData.append('tags', reportData.tags);
        formData.append('doctor_name', reportData.doctor_name);
        formData.append('is_critical', reportData.is_critical);

        try {
            const response = await healthCareServices.uploadReport(formData);
            alert("Upload Successful!");
        } catch (error) {
            console.error("Error uploading:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Add New Medical Report</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        id="file-input"
                        style={{ display: 'none' }}
                    />
                    {selectedFile && <p>Selected: {selectedFile.name}</p>}
                    <label htmlFor="file-input" style={buttonStyle}>
                        {selectedFile ? "Change File" : "📸 Take Photo / Select File"}
                    </label>
                    <input
                        type="text"
                        placeholder="Patient Name"
                        className="w-full p-3 border rounded-xl"
                        value={reportData.patient_name}
                        onChange={(e) => setReportData({ ...reportData, patient_name: e.target.value })}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Report Type"
                        className="w-full p-3 border rounded-xl"
                        value={reportData.report_type}
                        onChange={(e) => setReportData({ ...reportData, report_type: e.target.value })}
                        required
                    />
                    <input
                        type="date"
                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        value={reportData.report_date}
                        onChange={(e) => setReportData({ ...reportData, report_date: e.target.value })}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Doctor Name"
                        className="w-full p-3 border rounded-xl"
                        value={reportData.doctor_name}
                        onChange={(e) => setReportData({ ...reportData, doctor_name: e.target.value })}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Tags (comma separated)"
                        className="w-full p-3 border rounded-xl"
                        value={reportData.tags}
                        onChange={(e) => setReportData({ ...reportData, tags: e.target.value })}
                        required
                    />
                    <label className="flex items-center gap-2 mt-4">
                        <input
                            type="checkbox"
                            checked={reportData.is_critical}
                            onChange={(e) => setReportData({ ...reportData, is_critical: e.target.checked })}
                        />
                        <span className="text-sm text-gray-600">Mark as Critical</span>
                    </label>
                    {selectedFile && (
                        <div style={{ marginTop: '20px' }}>
                            <button onClick={uploadToBackend} disabled={loading} style={uploadButtonStyle}>
                                {loading ? "Uploading..." : "Confirm & Save to Cloud"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const buttonStyle = {
    padding: '15px 25px',
    backgroundColor: '#007bff',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'inline-block'
};

const uploadButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#28a745',
    border: 'none'
};

export default ReportUploader;