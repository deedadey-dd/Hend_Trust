export default function WalletView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
      </div>
      <div className="rounded-md border bg-white p-8 text-center text-muted-foreground">
        <p>Your available balance and withdrawal history will appear here.</p>
      </div>
    </div>
  );
}
