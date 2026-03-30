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
  XCircle, BarChart3, Download, Trash2, Paperclip
} from "lucide-react";
import { useLocation } from "wouter";

// Strip currency codes/symbols from amount strings to avoid duplication
const CURRENCY_CODES = ["USD", "DKK", "EUR", "SEK", "NOK", "GBP", "CHF", "PLN", "CZK", "RON", "HUF", "ISK", "kr", "kr.", "$", "€", "£"];
function sanitizeAmount(amount: string | null | undefined): string {
  if (!amount || amount === "N/A") return "N/A";
  let clean = amount.trim();
  // Remove known currency codes/symbols (case-insensitive)
  for (const code of CURRENCY_CODES) {
    const regex = new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    clean = clean.replace(regex, '');
  }
  // Remove stray dots/commas at start/end, trim whitespace
  clean = clean.replace(/^[\s.,]+|[\s.,]+$/g, '').trim();
  return clean || "N/A";
}

function formatCurrency(currency: string | null | undefined): string {
  if (!currency) return "DKK";
  // Normalize common variants
  const upper = currency.trim().toUpperCase();
  if (upper === "KR" || upper === "KR." || upper === "DKR" || upper === "DANSKE KRONER") return "DKK";
  if (upper === "$" || upper === "DOLLAR") return "USD";
  if (upper === "€" || upper === "EURO") return "EUR";
  if (upper === "£" || upper === "POUND") return "GBP";
  return upper || "DKK";
}

type TabType = "all" | "pending" | "reviewed" | "sent_to_economic" | "paid" | "faktura" | "pbs";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-3 h-3" /> },
  reviewed: { label: "Reviewed", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Eye className="w-3 h-3" /> },
  sent_to_economic: { label: "Sent to e-conomic", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: <Send className="w-3 h-3" /> },
  paid: { label: "Paid", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <XCircle className="w-3 h-3" /> },
};

const INVOICE_TYPE_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  faktura: { label: "Faktura", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", description: "Manual payment required" },
  pbs: { label: "PBS", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", description: "Automatic payment (direct debit)" },
  unknown: { label: "Unknown", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", description: "Type not determined" },
};

export default function Invoices() {
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isResyncingAttachments, setIsResyncingAttachments] = useState(false);
  const [isDeletingExtractions, setIsDeletingExtractions] = useState(false);
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
  const resyncAttachments = trpc.invoice.resyncAttachments.useMutation();
  const deleteAllExtractions = trpc.invoice.deleteAllExtractions.useMutation();

  // Resync attachments from IMAP (downloads PDFs to S3)
  const handleResyncAttachments = async () => {
    setIsResyncingAttachments(true);
    try {
      const result = await resyncAttachments.mutateAsync();
      toast.success(`Downloaded PDFs: ${result.uploaded} new, ${result.skipped} skipped, ${result.failed} failed (${result.total} total invoice emails)`);
      // Auto-continue if there are more to process
      if (result.uploaded > 0 && result.uploaded + result.skipped + result.failed < result.total) {
        setTimeout(() => handleResyncAttachments(), 1000);
      } else {
        setIsResyncingAttachments(false);
      }
    } catch (err: any) {
      toast.error(err.message);
      setIsResyncingAttachments(false);
    }
  };

  // Delete all extractions so they can be re-processed with PDF content
  const handleDeleteAllExtractions = async () => {
    if (!confirm("This will delete all extracted invoice data so it can be re-processed with PDF attachments. Continue?")) return;
    setIsDeletingExtractions(true);
    try {
      const result = await deleteAllExtractions.mutateAsync();
      toast.success(`Deleted ${result.deleted} extractions. You can now re-extract with PDF content.`);
      refetchInvoices();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeletingExtractions(false);
    }
  };

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
    // Type filter tabs
    if (activeTab === "faktura" && inv.invoiceType !== "faktura") return false;
    if (activeTab === "pbs" && inv.invoiceType !== "pbs") return false;
    // Status filter tabs
    if (activeTab !== "all" && activeTab !== "faktura" && activeTab !== "pbs" && inv.status !== activeTab) return false;
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
    { key: "faktura", label: "\u{1F4C4} Faktura", count: stats?.faktura || 0 },
    { key: "pbs", label: "\u{1F501} PBS", count: stats?.pbs || 0 },
    { key: "pending", label: "Pending", count: stats?.pending || 0 },
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats?.total || 0}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-orange-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{stats?.faktura || 0}</div>
            <div className="text-xs text-orange-400/80">Faktura</div>
            <div className="text-[10px] text-muted-foreground">Manual Pay</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-cyan-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{stats?.pbs || 0}</div>
            <div className="text-xs text-cyan-400/80">PBS</div>
            <div className="text-[10px] text-muted-foreground">Auto Pay</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats?.pending || 0}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats?.sentToEconomic || 0}</div>
            <div className="text-xs text-muted-foreground">Sent</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats?.paid || 0}</div>
            <div className="text-xs text-muted-foreground">Paid</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-400">{stats?.unknown || 0}</div>
            <div className="text-xs text-muted-foreground">Untyped</div>
          </CardContent>
        </Card>
      </div>

      {/* Step-by-Step Workflow Banner */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <p className="text-sm font-bold text-foreground">Invoice Processing Workflow</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Most invoices arrive as PDF attachments. Follow these steps to extract accurate data:
          </p>

          {/* Step 1: Download Attachments */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <p className="text-sm font-medium">Download PDF Attachments</p>
                <p className="text-xs text-muted-foreground">Re-fetch invoice emails from IMAP to download PDF files (10 at a time)</p>
              </div>
            </div>
            <Button
              onClick={handleResyncAttachments}
              disabled={isResyncingAttachments}
              variant="outline"
              size="sm"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              {isResyncingAttachments ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Downloading...</>
              ) : (
                <><Download className="w-4 h-4 mr-1" /> Download PDFs</>
              )}
            </Button>
          </div>

          {/* Step 2: Reset Bad Extractions */}
          {stats && stats.total > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="text-sm font-medium">Reset Existing Extractions</p>
                  <p className="text-xs text-muted-foreground">Delete {stats.total} old extractions (made without PDF) so they can be re-processed</p>
                </div>
              </div>
              <Button
                onClick={handleDeleteAllExtractions}
                disabled={isDeletingExtractions}
                variant="outline"
                size="sm"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                {isDeletingExtractions ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4 mr-1" /> Reset Extractions</>
                )}
              </Button>
            </div>
          )}

          {/* Step 3: Extract with PDF */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <p className="text-sm font-medium">Extract Invoice Data (with PDF)</p>
                <p className="text-xs text-muted-foreground">
                  {pendingCount && pendingCount.needExtraction > 0
                    ? `${pendingCount.needExtraction} invoices need extraction — AI will read the PDF attachments`
                    : "All invoices have been extracted"}
                </p>
              </div>
            </div>
            <Button
              onClick={handleExtractBatch}
              disabled={isExtracting || (pendingCount?.needExtraction === 0)}
              className="bg-amber-500 hover:bg-amber-600 text-black"
              size="sm"
            >
              {isExtracting ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Extracting...</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-1" /> Extract Invoice Data</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                        <div className="flex items-center gap-1 mt-0.5">
                          {/* Invoice Type Badge (PBS / Faktura) */}
                          {(() => {
                            const typeCfg = INVOICE_TYPE_CONFIG[inv.invoiceType] || INVOICE_TYPE_CONFIG.unknown;
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className={`text-[10px] font-bold ${typeCfg.color}`}>
                                    {typeCfg.label}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>{typeCfg.description}</TooltipContent>
                              </Tooltip>
                            );
                          })()}
                          {/* Status Badge */}
                          <Badge variant="outline" className={`text-[10px] ${statusCfg.color}`}>
                            {statusCfg.icon}
                            <span className="ml-1">{statusCfg.label}</span>
                          </Badge>
                        </div>
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
                        <span className="font-semibold text-foreground">{sanitizeAmount(inv.amount)}</span>
                        <span className="text-xs text-muted-foreground">{formatCurrency(inv.currency)}</span>
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
                      {/* PDF Attachment Link */}
                      {inv.attachments && inv.attachments.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={inv.attachments.find((a: any) => a.mimeType === 'application/pdf')?.s3Url || inv.attachments[0]?.s3Url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                                <Paperclip className="w-3 h-3" />
                                PDF
                              </Button>
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>View original PDF attachment ({inv.attachments.length} file{inv.attachments.length > 1 ? 's' : ''})</TooltipContent>
                        </Tooltip>
                      )}

                      {inv.emailId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={() => navigate(`/emails/${inv.emailId}`)}>
                              <Eye className="w-3 h-3" />
                              Email
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Open original email to verify invoice details</TooltipContent>
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
                          <p className="font-medium">{sanitizeAmount(inv.amount)} {formatCurrency(inv.currency)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Payment Date</span>
                          <p className="font-medium">{inv.paymentDate || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Due Date</span>
                          <p className="font-medium">{inv.dueDate || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Invoice Type</span>
                          <div className="mt-1">
                            {(() => {
                              const typeCfg = INVOICE_TYPE_CONFIG[inv.invoiceType] || INVOICE_TYPE_CONFIG.unknown;
                              return (
                                <Badge variant="outline" className={`text-xs font-bold ${typeCfg.color}`}>
                                  {typeCfg.label}
                                  <span className="ml-1 font-normal text-muted-foreground">— {typeCfg.description}</span>
                                </Badge>
                              );
                            })()}
                          </div>
                        </div>
                        <div>
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
                                    <td className="p-2 text-right">{sanitizeAmount(item.unitPrice)}</td>
                                    <td className="p-2 text-right font-medium">{sanitizeAmount(item.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Attachments */}
                      {inv.attachments && inv.attachments.length > 0 && (
                        <div>
                          <span className="text-muted-foreground text-xs">Attachments</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {(inv.attachments as any[]).map((att: any, idx: number) => (
                              <a
                                key={idx}
                                href={att.s3Url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-colors text-sm"
                              >
                                <Paperclip className="w-3 h-3" />
                                {att.filename}
                                <span className="text-xs text-muted-foreground">({Math.round((att.size || 0) / 1024)} KB)</span>
                              </a>
                            ))}
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
