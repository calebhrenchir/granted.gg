"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search, MoreVertical, Eye, EyeOff, Link2, DollarSign, Calendar, User, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Sale {
  id: string;
  amount: number;
  amountInCents: number;
  stripePaymentIntentId: string | null;
  createdAt: string;
  link: {
    id: string;
    url: string;
    name: string | null;
    price: number;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
}

interface SaleDetails extends Sale {
  link: {
    id: string;
    url: string;
    name: string | null;
    price: number;
    totalEarnings: number;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
    } | null;
    _count: {
      files: number;
    };
  };
}

const columns = [
  { key: "link", label: "Link", visible: true },
  { key: "owner", label: "Owner", visible: true },
  { key: "amount", label: "Amount", visible: true },
  { key: "paymentId", label: "Payment ID", visible: false },
  { key: "createdAt", label: "Date", visible: true },
];

export default function SalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<SaleDetails | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: col.visible }), {} as Record<string, boolean>)
  );

  useEffect(() => {
    if (status === "authenticated") {
      fetchSales();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session, search, page]);

  async function fetchSales() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) {
        params.append("search", search);
      }
      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());
      
      const response = await fetch(`/api/admin/sales?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSales(data.sales || []);
        if (data.pagination) {
          setTotalCount(data.pagination.totalCount);
          setTotalPages(data.pagination.totalPages);
        }
      } else {
        console.error("Failed to fetch sales:", response.status, response.statusText);
        if (response.status === 401) {
          setSales([]);
        }
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSaleDetails(saleId: string) {
    try {
      const response = await fetch(`/api/admin/sales/${saleId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSale(data.sale);
        setSheetOpen(true);
      } else {
        console.error("Failed to fetch sale details");
      }
    } catch (error) {
      console.error("Error fetching sale details:", error);
    }
  }

  function toggleColumn(key: string) {
    setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleSaleSelection(saleId: string) {
    setSelectedSaleIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(saleId)) {
        newSet.delete(saleId);
      } else {
        newSet.add(saleId);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selectedSaleIds.size === sales.length) {
      setSelectedSaleIds(new Set());
    } else {
      setSelectedSaleIds(new Set(sales.map((s) => s.id)));
    }
  }

  const allSelected = sales.length > 0 && selectedSaleIds.size === sales.length;
  const someSelected = selectedSaleIds.size > 0 && selectedSaleIds.size < sales.length;

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/50">Loading...</p>
      </div>
    );
  }


  const visibleColumns = columns.filter((col) => columnVisibility[col.key]);

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-4xl font-bold">Sales ({totalCount})</h1>
      </div>

      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 size-4" />
          <Input
            placeholder="Search by link, owner, or payment ID..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:text-white/50 hover:bg-white/5 !py-5 !px-4">
              <Eye className="size-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-black border-white/10 text-white">
            {columns.map((column) => (
              <DropdownMenuItem
                key={column.key}
                onClick={() => toggleColumn(column.key)}
                className="flex items-center gap-2"
              >
                {columnVisibility[column.key] ? (
                  <Eye className="size-4" />
                ) : (
                  <EyeOff className="size-4" />
                )}
                {column.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="border border-white/10 rounded-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/70 w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  className={cn(
                    someSelected && "data-[state=checked]:bg-white/50"
                  )}
                />
              </TableHead>
              {visibleColumns.map((column) => (
                <TableHead key={column.key} className="text-white/70">
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="text-white/70 w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 2} className="text-center text-white/50 py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 2} className="text-center text-white/50 py-8">
                  No sales found
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => {
                const linkName = sale.link.name || sale.link.url;
                const ownerName = sale.link.user
                  ? sale.link.user.firstName && sale.link.user.lastName
                    ? `${sale.link.user.firstName} ${sale.link.user.lastName}`
                    : sale.link.user.name || sale.link.user.email || "Unknown"
                  : "No Owner";

                return (
                  <TableRow
                    key={sale.id}
                    className="border-white/10 hover:bg-white/5 cursor-pointer"
                    onClick={() => fetchSaleDetails(sale.id)}
                  >
                    <TableCell
                      className="text-white"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedSaleIds.has(sale.id)}
                        onCheckedChange={() => toggleSaleSelection(sale.id)}
                      />
                    </TableCell>
                    {columnVisibility.link && (
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          <Link2 className="size-4 text-white/50" />
                          <span className="truncate max-w-[200px]">{linkName}</span>
                        </div>
                      </TableCell>
                    )}
                    {columnVisibility.owner && (
                      <TableCell className="text-white/70">{ownerName}</TableCell>
                    )}
                    {columnVisibility.amount && (
                      <TableCell className="text-white font-semibold">
                        ${sale.amount.toFixed(2)}
                      </TableCell>
                    )}
                    {columnVisibility.paymentId && (
                      <TableCell className="text-white/70 font-mono text-xs">
                        {sale.stripePaymentIntentId || "—"}
                      </TableCell>
                    )}
                    {columnVisibility.createdAt && (
                      <TableCell className="text-white/70">
                        {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString()}
                      </TableCell>
                    )}
                    <TableCell
                      className="text-white"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-white/10"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black border-white/10 text-white">
                          <DropdownMenuItem variant={"default"} onClick={() => fetchSaleDetails(sale.id)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/p/${sale.link.url}`, "_blank")}>
                            <ExternalLink className="size-4 mr-2" />
                            View Public Page
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="bg-white/10" />

                          <DropdownMenuItem>Refund</DropdownMenuItem>
                          <DropdownMenuItem>Export Receipt</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-white/70">
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} sales
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  disabled={loading}
                  className={cn(
                    page === pageNum
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10",
                    "disabled:opacity-50"
                  )}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="bg-black border-white/10 text-white w-full sm:max-w-lg overflow-y-auto">
          {selectedSale && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">
                  Sale Details
                </SheetTitle>
                <SheetDescription className="text-white/70">
                  Purchase Information
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Transaction</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <DollarSign className="size-4 text-white/50" />
                      <div className="flex-1">
                        <span className="text-white/70 text-sm">Amount</span>
                        <p className="text-white text-2xl font-bold">${selectedSale.amount.toFixed(2)}</p>
                      </div>
                    </div>
                    {selectedSale.stripePaymentIntentId && (
                      <div className="flex items-center gap-3">
                        <span className="text-white/70 text-sm">Payment Intent ID</span>
                        <span className="text-white font-mono text-xs">{selectedSale.stripePaymentIntentId}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="size-4 text-white/50" />
                      <div className="flex-1">
                        <span className="text-white/70 text-sm">Date</span>
                        <p className="text-white">
                          {new Date(selectedSale.createdAt).toLocaleDateString()} {new Date(selectedSale.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Link Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Link2 className="size-4 text-white/50" />
                      <div className="flex-1">
                        <span className="text-white/70 text-sm">Link Name</span>
                        <p className="text-white">{selectedSale.link.name || selectedSale.link.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/70 text-sm">URL</span>
                      <span className="text-white font-mono text-sm">{selectedSale.link.url}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/70 text-sm">Link Price</span>
                      <span className="text-white">${selectedSale.link.price.toFixed(2)}</span>
                    </div>
                    {selectedSale.link._count && (
                      <div className="flex items-center gap-3">
                        <span className="text-white/70 text-sm">Files</span>
                        <span className="text-white">{selectedSale.link._count.files}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedSale.link.user && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/70 mb-3">Link Owner</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="size-4 text-white/50" />
                        <span className="text-white">
                          {selectedSale.link.user.firstName && selectedSale.link.user.lastName
                            ? `${selectedSale.link.user.firstName} ${selectedSale.link.user.lastName}`
                            : selectedSale.link.user.name || selectedSale.link.user.email || "Unknown"}
                        </span>
                      </div>
                      {selectedSale.link.user.email && (
                        <div className="flex items-center gap-3">
                          <span className="text-white/70 text-sm">Email</span>
                          <span className="text-white">{selectedSale.link.user.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Earnings</h3>
                  <div className="space-y-2 text-white">
                    <div className="flex justify-between">
                      <span className="text-white/70">Sale Amount:</span>
                      <span>${selectedSale.amount.toFixed(2)}</span>
                    </div>
                    {selectedSale.link.totalEarnings !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-white/70">Link Total Earnings:</span>
                        <span>${selectedSale.link.totalEarnings.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}