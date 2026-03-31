export default function HealthCareOverview() {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Health Care Overview</h2>
                <p className="text-gray-500">
                    Use the Documents tab to upload, review, and manage medical reports for patients, doctors, and claims.
                </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-sm text-slate-500">Total documents</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">—</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-sm text-slate-500">Recent uploads</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">—</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-sm text-slate-500">Pending reviews</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">—</p>
                </div>
            </div>
        </div>
    );
}
