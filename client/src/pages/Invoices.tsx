import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  FileText, Search, Send, CheckCircle, Clock, AlertTriangle,
  RefreshCw, Eye, ChevronDown, ChevronUp, Settings, Loader2,
  DollarSign, Building2, Package, Calendar, Hash, ExternalLink,
  XCircle, BarChart3
} from "lucide-react";
import { useLocation } from "wouter";

type TabType = "all" | "pending" | "reviewed" | "sent_to_economic" | "paid";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-3 h-3" /> },
  reviewed: { label: "Reviewed", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Eye className="w-3 h-3" /> },
  sent_to_economic: { label: "Sent to e-conomic", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: <Send className="w-3 h-3" /> },
  paid: { label: "Paid", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <XCircle className="w-3 h-3" /> },
};

export default function Invoices() {
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showSupplierSettings, setShowSupplierSettings] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ supplierName: "", eEconomicEndpoint: "", eEconomicApiKey: "", eEconomicAgreement: "" });

  // Data queries
  const { data: invoices = [], isLoading, refetch: refetchInvoices } = trpc.invoice.list.useQuery();
  const { data: stats } = trpc.invoice.stats.useQuery();
  const { data: pendingCount } = trpc.invoice.pendingCount.useQuery();
  const { data: suppliers = [], refetch: refetchSuppliers } = trpc.invoice.suppliers.useQuery();

  // Mutations
  const extractBatch = trpc.invoice.extractBatch.useMutation();
  const updateStatus = trpc.invoice.updateStatus.useMutation();
  const sendToEconomic = trpc.invoice.sendToEconomic.useMutation();
  const upsertSupplier = trpc.invoice.upsertSupplier.useMutation();

  // Batch extraction with auto-continue
  const handleExtractBatch = useCallback(async () => {
    setIsExtracting(true);
    try {
      const result = await extractBatch.mutateAsync();
      toast.success(`Extracted: ${result.processed}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
      refetchInvoices();
      // Auto-continue if more to process
      if (result.processed > 0 && pendingCount && pendingCount.needExtraction > result.processed) {
        setTimeout(() => handleExtractBatch(), 1000);
      } else {
        setIsExtracting(false);
      }
    } catch (err: any) {
      toast.error(err.message);
      setIsExtracting(false);
    }
  }, [extractBatch, refetchInvoices, pendingCount, toast]);

  const handleSendToEconomic = async (invoiceId: number) => {
    try {
      await sendToEconomic.mutateAsync({ invoiceId });
      toast.success("Invoice forwarded to e-conomic");
      refetchInvoices();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateStatus = async (invoiceId: number, status: "pending" | "reviewed" | "sent_to_economic" | "paid" | "rejected") => {
    try {
      await updateStatus.mutateAsync({ invoiceId, status });
      refetchInvoices();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveSupplier = async () => {
    if (!newSupplier.supplierName) return;
    try {
      await upsertSupplier.mutateAsync({
        ...newSupplier,
        isConfigured: !!(newSupplier.eEconomicEndpoint && newSupplier.eEconomicApiKey),
      });
      toast.success(`${newSupplier.supplierName} settings saved`);
      setNewSupplier({ supplierName: "", eEconomicEndpoint: "", eEconomicApiKey: "", eEconomicAgreement: "" });
      refetchSuppliers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Filter invoices
  const filtered = invoices.filter((inv: any) => {
    if (activeTab !== "all" && inv.status !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        inv.supplier?.toLowerCase().includes(q) ||
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.products?.toLowerCase().includes(q) ||
        inv.amount?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats?.total || 0 },
    { key: "pending", label: "Pending", count: stats?.pending || 0 },
    { key: "reviewed", label: "Reviewed", count: stats?.reviewed || 0 },
    { key: "sent_to_economic", label: "Sent", count: stats?.sentToEconomic || 0 },
    { key: "paid", label: "Paid", count: stats?.paid || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-7 h-7 text-amber-400" />
            Invoice Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            All invoices extracted from emails — review, manage, and send to e-conomic
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSupplierSettings(!showSupplierSettings)}
          >
            <Settings className="w-4 h-4 mr-1" />
            Supplier Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats?.total || 0}</div>
            <div className="text-xs text-muted-foreground">Total Invoices</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats?.pending || 0}</div>
            <div className="text-xs text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats?.reviewed || 0}</div>
            <div className="text-xs text-muted-foreground">Reviewed</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats?.sentToEconomic || 0}</div>
            <div className="text-xs text-muted-foreground">Sent to e-conomic</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats?.paid || 0}</div>
            <div className="text-xs text-muted-foreground">Paid</div>
          </CardContent>
        </Card>
      </div>

      {/* Extraction Banner */}
      {pendingCount && pendingCount.needExtraction > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {pendingCount.needExtraction} invoice emails need data extraction
                </p>
                <p className="text-xs text-muted-foreground">
                  AI will read each email and extract supplier, amount, date, and products
                </p>
              </div>
            </div>
            <Button
              onClick={handleExtractBatch}
              disabled={isExtracting}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Extract Invoice Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Supplier Settings Panel */}
      {showSupplierSettings && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              Supplier e-conomic Settings
            </CardTitle>
            <CardDescription>
              Configure e-conomic API endpoints for each supplier. Each company may have a different e-conomic address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing suppliers */}
            {suppliers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Configured Suppliers</h4>
                <div className="grid gap-2">
                  {suppliers.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <span className="font-medium text-sm">{s.supplierName}</span>
                        {s.eEconomicEndpoint && (
                          <span className="text-xs text-muted-foreground ml-2">{s.eEconomicEndpoint}</span>
                        )}
                      </div>
                      <Badge variant="outline" className={s.isConfigured ? "text-green-400 border-green-500/30" : "text-yellow-400 border-yellow-500/30"}>
                        {s.isConfigured ? "Configured" : "Not Configured"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new supplier */}
            <div className="space-y-3 pt-3 border-t border-border/50">
              <h4 className="text-sm font-medium text-muted-foreground">Add / Update Supplier</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Supplier Name (e.g., BC Catering)"
                  value={newSupplier.supplierName}
                  onChange={(e) => setNewSupplier(p => ({ ...p, supplierName: e.target.value }))}
                />
                <Input
                  placeholder="e-conomic Endpoint URL"
                  value={newSupplier.eEconomicEndpoint}
                  onChange={(e) => setNewSupplier(p => ({ ...p, eEconomicEndpoint: e.target.value }))}
                />
                <Input
                  placeholder="e-conomic API Key"
                  type="password"
                  value={newSupplier.eEconomicApiKey}
                  onChange={(e) => setNewSupplier(p => ({ ...p, eEconomicApiKey: e.target.value }))}
                />
                <Input
                  placeholder="e-conomic Agreement Grant Token"
                  type="password"
                  value={newSupplier.eEconomicAgreement}
                  onChange={(e) => setNewSupplier(p => ({ ...p, eEconomicAgreement: e.target.value }))}
                />
              </div>
              <Button onClick={handleSaveSupplier} disabled={!newSupplier.supplierName} size="sm">
                <Settings className="w-4 h-4 mr-1" />
                Save Supplier
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs + Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex gap-1 flex-wrap">
          {tabs.map(tab => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 text-xs opacity-70">({tab.count})</span>
              )}
            </Button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Invoice Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">
              {invoices.length === 0
                ? "No invoices extracted yet. Click 'Extract Invoice Data' above to start."
                : "No invoices match your current filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3">Supplier</div>
            <div className="col-span-1">Invoice #</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Due Date</div>
            <div className="col-span-2">Products</div>
            <div className="col-span-2">Actions</div>
          </div>

          {/* Table Rows */}
          {filtered.map((inv: any) => {
            const statusCfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
            const isExpanded = expandedRow === inv.id;
            const supplierConfigured = suppliers.some((s: any) => s.supplierName === inv.supplier && s.isConfigured);

            return (
              <Card key={inv.id} className="bg-card/50 border-border/50 hover:border-amber-500/30 transition-colors">
                <CardContent className="p-4">
                  {/* Main Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* Supplier */}
                    <div className="col-span-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <p className="font-medium text-sm text-foreground truncate">{inv.supplier}</p>
                        <Badge variant="outline" className={`text-[10px] mt-0.5 ${statusCfg.color}`}>
                          {statusCfg.icon}
                          <span className="ml-1">{statusCfg.label}</span>
                        </Badge>
                      </div>
                    </div>

                    {/* Invoice Number */}
                    <div className="col-span-1">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Hash className="w-3 h-3" />
                        <span className="truncate">{inv.invoiceNumber || "N/A"}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="font-semibold text-foreground">{inv.amount || "N/A"}</span>
                        <span className="text-xs text-muted-foreground">{inv.currency || "DKK"}</span>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{inv.dueDate && inv.dueDate !== "N/A" ? inv.dueDate : inv.paymentDate || "N/A"}</span>
                      </div>
                    </div>

                    {/* Products */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Package className="w-3 h-3 shrink-0" />
                        <span className="truncate">{inv.products || "N/A"}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center gap-1 justify-end">
                      {inv.emailId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/emails/${inv.emailId}`)}>
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Email</TooltipContent>
                        </Tooltip>
                      )}

                      {inv.status === "pending" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400" onClick={() => handleUpdateStatus(inv.id, "reviewed")}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mark Reviewed</TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${supplierConfigured ? "text-green-400" : "text-muted-foreground"}`}
                            onClick={() => supplierConfigured ? handleSendToEconomic(inv.id) : toast.error(`Configure e-conomic for "${inv.supplier}" in Supplier Settings first.`)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {supplierConfigured ? "Send to e-conomic" : `Configure e-conomic for ${inv.supplier} first`}
                        </TooltipContent>
                      </Tooltip>

                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedRow(isExpanded ? null : inv.id)}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Supplier</span>
                          <p className="font-medium">{inv.supplier}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Invoice Number</span>
                          <p className="font-medium">{inv.invoiceNumber || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Amount</span>
                          <p className="font-medium">{inv.amount} {inv.currency}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Payment Date</span>
                          <p className="font-medium">{inv.paymentDate || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Due Date</span>
                          <p className="font-medium">{inv.dueDate || "N/A"}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground text-xs">Products</span>
                          <p className="font-medium">{inv.products || "N/A"}</p>
                        </div>
                      </div>

                      {/* Line Items */}
                      {inv.lineItems && Array.isArray(inv.lineItems) && inv.lineItems.length > 0 && (
                        <div>
                          <span className="text-muted-foreground text-xs">Line Items</span>
                          <div className="mt-1 bg-muted/20 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border/50">
                                  <th className="text-left p-2 text-xs text-muted-foreground">Description</th>
                                  <th className="text-right p-2 text-xs text-muted-foreground">Qty</th>
                                  <th className="text-right p-2 text-xs text-muted-foreground">Unit Price</th>
                                  <th className="text-right p-2 text-xs text-muted-foreground">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(inv.lineItems as any[]).map((item: any, idx: number) => (
                                  <tr key={idx} className="border-b border-border/30 last:border-0">
                                    <td className="p-2">{item.description}</td>
                                    <td className="p-2 text-right">{item.quantity}</td>
                                    <td className="p-2 text-right">{item.unitPrice}</td>
                                    <td className="p-2 text-right font-medium">{item.total}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        {inv.status !== "paid" && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(inv.id, "paid")} className="text-emerald-400 border-emerald-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" /> Mark Paid
                          </Button>
                        )}
                        {inv.status !== "rejected" && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(inv.id, "rejected")} className="text-red-400 border-red-500/30">
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        )}
                        {inv.status !== "pending" && inv.status !== "sent_to_economic" && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(inv.id, "pending")} className="text-yellow-400 border-yellow-500/30">
                            <Clock className="w-3 h-3 mr-1" /> Reset to Pending
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
