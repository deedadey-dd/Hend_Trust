export default function AdminDisputes() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-red-600 tracking-tight">Active Disputes</h1>
      </div>
      <div className="rounded-md border bg-red-50 p-8 text-center text-red-800">
        <p>Admin Dispute resolution center. Only platform admins have access to this.</p>
      </div>
    </div>
  );
}
