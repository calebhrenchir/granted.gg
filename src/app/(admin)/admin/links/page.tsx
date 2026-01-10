"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MoreVertical, Eye, EyeOff, Link2, DollarSign, MousePointerClick, ShoppingCart, Calendar, User, ChevronLeft, ChevronRight, Edit, Save, X, Trash2, ExternalLink, Flag, AlertTriangle, Ban, Archive, FileX } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Link {
  id: string;
  url: string;
  name: string | null;
  price: number;
  totalEarnings: number;
  totalClicks: number;
  totalSales: number;
  isPurchaseable: boolean;
  isDownloadable: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    isFrozen?: boolean;
  } | null;
  _count: {
    files: number;
  };
}

interface LinkDetails extends Link {
  coverPhotoS3Url: string | null;
  isLinkTitleVisible: boolean;
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    createdAt: string;
  }>;
  purchaseCount: number;
}

interface ReportedLink extends Link {
  priority: boolean;
  recentReportCount: number;
  totalReportCount: number;
  reports: Array<{
    id: string;
    reason: string;
    description: string;
    status: string;
    createdAt: string;
  }>;
  files?: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    createdAt: string;
  }>;
}

const columns = [
  { key: "name", label: "Name", visible: true },
  { key: "url", label: "URL", visible: true },
  { key: "user", label: "Owner", visible: true },
  { key: "price", label: "Price", visible: true },
  { key: "stats", label: "Stats", visible: false },
  { key: "createdAt", label: "Created", visible: true },
];

function LinksPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLink, setSelectedLink] = useState<LinkDetails | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    price: 0,
    isPurchaseable: true,
    isDownloadable: true,
    isLinkTitleVisible: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: col.visible }), {} as Record<string, boolean>)
  );
  const [view, setView] = useState<"all" | "reports">("all");
  const [reportedLinks, setReportedLinks] = useState<ReportedLink[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReportedLink, setSelectedReportedLink] = useState<ReportedLink | null>(null);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [showFileSelector, setShowFileSelector] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      if (view === "all") {
        fetchLinks();
      } else {
        fetchReportedLinks();
      }
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session, search, page, view]);

  async function fetchReportedLinks() {
    try {
      setLoadingReports(true);
      const response = await fetch("/api/admin/reports?status=pending");
      if (response.ok) {
        const data = await response.json();
        setReportedLinks(data.links || []);
      } else {
        console.error("Failed to fetch reported links");
        setReportedLinks([]);
      }
    } catch (error) {
      console.error("Error fetching reported links:", error);
      setReportedLinks([]);
    } finally {
      setLoadingReports(false);
    }
  }

  async function fetchReportedLinkDetails(linkId: string) {
    try {
      const response = await fetch(`/api/admin/reports/${linkId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedReportedLink(data.link);
        setReportSheetOpen(true);
      } else {
        console.error("Failed to fetch reported link details");
      }
    } catch (error) {
      console.error("Error fetching reported link details:", error);
    }
  }

  async function moderateLink(action: string, fileIds?: string[], reason?: string) {
    if (!selectedReportedLink) return;

    if (!confirm(`Are you sure you want to ${action.replace(/_/g, " ")}? This action may be irreversible.`)) {
      return;
    }

    try {
      setIsModerating(true);
      const response = await fetch("/api/admin/reports/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linkId: selectedReportedLink.id,
          action,
          fileIds,
          reason,
        }),
      });

      if (response.ok) {
        await fetchReportedLinks();
        setReportSheetOpen(false);
        setSelectedReportedLink(null);
        alert("Moderation action completed successfully");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to perform moderation action");
      }
    } catch (error) {
      console.error("Error moderating link:", error);
      alert("Error performing moderation action");
    } finally {
      setIsModerating(false);
    }
  }

  // Handle linkId query parameter from command menu
  useEffect(() => {
    const linkId = searchParams.get("linkId");
    if (linkId && status === "authenticated") {
      fetchLinkDetails(linkId);
      // Clear the query parameter
      router.replace("/admin/links", { scroll: false });
    }
  }, [searchParams, status, session, router]);

  async function fetchLinks() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) {
        params.append("search", search);
      }
      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());
      
      const response = await fetch(`/api/admin/links?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLinks(data.links || []);
        if (data.pagination) {
          setTotalCount(data.pagination.totalCount);
          setTotalPages(data.pagination.totalPages);
        }
      } else {
        console.error("Failed to fetch links:", response.status, response.statusText);
        if (response.status === 401) {
          setLinks([]);
        }
      }
    } catch (error) {
      console.error("Error fetching links:", error);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLinkDetails(linkId: string) {
    try {
      const response = await fetch(`/api/admin/links/${linkId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedLink(data.link);
        setEditData({
          name: data.link.name || "",
          price: data.link.price,
          isPurchaseable: data.link.isPurchaseable,
          isDownloadable: data.link.isDownloadable,
          isLinkTitleVisible: data.link.isLinkTitleVisible || false,
        });
        setIsEditing(false);
        setSheetOpen(true);
      } else {
        console.error("Failed to fetch link details");
      }
    } catch (error) {
      console.error("Error fetching link details:", error);
    }
  }

  async function saveLinkChanges() {
    if (!selectedLink) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/admin/links/${selectedLink.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        const data = await response.json();
        // Update selected link with new data
        setSelectedLink({
          ...selectedLink,
          ...data.link,
        });
        setIsEditing(false);
        // Refresh the links list
        fetchLinks();
      } else {
        console.error("Failed to save link changes");
      }
    } catch (error) {
      console.error("Error saving link changes:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteFile(fileId: string) {
    if (!selectedLink) return;
    if (!confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/files/${fileId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove file from selected link
        setSelectedLink({
          ...selectedLink,
          files: selectedLink.files.filter((f) => f.id !== fileId),
          _count: {
            ...selectedLink._count,
            files: selectedLink._count.files - 1,
          },
        });
        // Refresh the links list
        fetchLinks();
      } else {
        console.error("Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  }

  function toggleColumn(key: string) {
    setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleLinkSelection(linkId: string) {
    setSelectedLinkIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(linkId)) {
        newSet.delete(linkId);
      } else {
        newSet.add(linkId);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selectedLinkIds.size === links.length) {
      setSelectedLinkIds(new Set());
    } else {
      setSelectedLinkIds(new Set(links.map((l) => l.id)));
    }
  }

  const allSelected = links.length > 0 && selectedLinkIds.size === links.length;
  const someSelected = selectedLinkIds.size > 0 && selectedLinkIds.size < links.length;

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
        <h1 className="text-4xl font-bold">
          {view === "all" ? `Links (${totalCount})` : `Reported Links (${reportedLinks.length})`}
        </h1>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView("all")}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors duration-200 font-semibold text-sm",
            view === "all"
              ? "bg-white text-black"
              : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
          )}
        >
          All Links
        </button>
        <button
          onClick={() => setView("reports")}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors duration-200 font-semibold text-sm flex items-center gap-2",
            view === "reports"
              ? "bg-white text-black"
              : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
          )}
        >
          <Flag className="w-4 h-4" />
          Reported Links
          {reportedLinks.filter(l => l.priority).length > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {reportedLinks.filter(l => l.priority).length}
            </span>
          )}
        </button>
      </div>

      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 size-4" />
          <Input
            placeholder="Search by name or URL..."
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
            {view === "reports" ? (
              loadingReports ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-white/50 py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : reportedLinks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-white/50 py-8">
                    No reported links found
                  </TableCell>
                </TableRow>
              ) : (
                reportedLinks.map((link) => {
                  const displayName = link.name || link.url;
                  const ownerName = link.user
                    ? link.user.firstName && link.user.lastName
                      ? `${link.user.firstName} ${link.user.lastName}`
                      : link.user.name || link.user.email || "Unknown"
                    : "No Owner";

                  return (
                    <TableRow
                      key={link.id}
                      className={cn(
                        "border-white/10 hover:bg-white/5 cursor-pointer",
                        link.priority && "bg-red-500/10"
                      )}
                      onClick={() => fetchReportedLinkDetails(link.id)}
                    >
                      <TableCell className="text-white">
                        {link.priority && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
                            Priority
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center gap-3">
                          <span>{displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/70">
                        <div className="flex items-center gap-2">
                          <Link2 className="size-4 text-white/50" />
                          <span className="font-mono text-sm">{link.url}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/70">{ownerName}</TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          <Flag className="size-4 text-red-400" />
                          <span>{link.totalReportCount} report{link.totalReportCount !== 1 ? 's' : ''}</span>
                          {link.recentReportCount > 0 && (
                            <span className="text-xs text-red-400">
                              ({link.recentReportCount} recent)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white/70">
                        {new Date(link.reports[0]?.createdAt || link.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell
                        className="text-white"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-black border-white/10 text-white">
                            <DropdownMenuItem onClick={() => fetchReportedLinkDetails(link.id)}>
                              View Reports
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )
            ) : loading ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 2} className="text-center text-white/50 py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : links.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 2} className="text-center text-white/50 py-8">
                  No links found
                </TableCell>
              </TableRow>
            ) : (
              links.map((link) => {
                const displayName = link.name || link.url;
                const ownerName = link.user
                  ? link.user.firstName && link.user.lastName
                    ? `${link.user.firstName} ${link.user.lastName}`
                    : link.user.name || link.user.email || "Unknown"
                  : "No Owner";

                return (
                  <TableRow
                    key={link.id}
                    className="border-white/10 hover:bg-white/5 cursor-pointer"
                    onClick={() => fetchLinkDetails(link.id)}
                  >
                    <TableCell
                      className="text-white"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedLinkIds.has(link.id)}
                        onCheckedChange={() => toggleLinkSelection(link.id)}
                      />
                    </TableCell>
                    {columnVisibility.name && (
                      <TableCell className="text-white">
                        <div className="flex items-center gap-3">
                          <span>{displayName}</span>
                        </div>
                      </TableCell>
                    )}
                    {columnVisibility.url && (
                      <TableCell className="text-white/70">
                        <div className="flex items-center gap-2">
                          <Link2 className="size-4 text-white/50" />
                          <span className="font-mono text-sm">{link.url}</span>
                        </div>
                      </TableCell>
                    )}
                    {columnVisibility.user && (
                      <TableCell className="text-white/70">{ownerName}</TableCell>
                    )}
                    {columnVisibility.price && (
                      <TableCell className="text-white">
                        ${link.price.toFixed(2)}
                      </TableCell>
                    )}
                    {columnVisibility.stats && (
                      <TableCell className="text-white">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <MousePointerClick className="size-4 text-white/50" />
                            {link.totalClicks}
                          </span>
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="size-4 text-white/50" />
                            {link.totalSales}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="size-4 text-white/50" />
                            ${link.totalEarnings.toFixed(2)}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    {columnVisibility.createdAt && (
                      <TableCell className="text-white/70">
                        {new Date(link.createdAt).toLocaleDateString()}
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
                          <DropdownMenuItem variant={"default"} onClick={() => fetchLinkDetails(link.id)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/${link.url}`} target="_blank" className="flex flex-row gap-2">
                            View Public Page <ExternalLink className="size-4" />
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="bg-white/10" />

                          <DropdownMenuItem>Disable</DropdownMenuItem>
                          <DropdownMenuItem>Archive</DropdownMenuItem>

                          <DropdownMenuSeparator className="bg-white/10" />

                          <DropdownMenuItem variant="destructive">
                            Delete Link
                          </DropdownMenuItem>
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
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} links
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

      <Sheet open={sheetOpen} onOpenChange={(open) => {
        setSheetOpen(open);
        if (!open) {
          setIsEditing(false);
        }
      }}>
        <SheetContent side="right" className="bg-black border-white/10 text-white w-full sm:max-w-lg overflow-y-auto">
          {selectedLink && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <SheetTitle className="text-white">
                      {selectedLink.name || selectedLink.url}
                    </SheetTitle>
                    <SheetDescription className="text-white/70">
                      Link Details
                    </SheetDescription>
                  </div>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <Edit className="size-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false);
                          // Reset edit data
                          setEditData({
                            name: selectedLink.name || "",
                            price: selectedLink.price,
                            isPurchaseable: selectedLink.isPurchaseable,
                            isDownloadable: selectedLink.isDownloadable,
                            isLinkTitleVisible: selectedLink.isLinkTitleVisible || false,
                          });
                        }}
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                      >
                        <X className="size-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={saveLinkChanges}
                        disabled={isSaving}
                        className="bg-white text-black hover:bg-white/90"
                      >
                        <Save className="size-4 mr-2" />
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Basic Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Link2 className="size-4 text-white/50" />
                      <span className="text-white font-mono text-sm">{selectedLink.url}</span>
                    </div>
                    {isEditing ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm text-white/70">Name</label>
                          <Input
                            value={editData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEditData({ ...editData, name: e.target.value })
                            }
                            placeholder="Link name"
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-white/70">Price</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-white/50" />
                            <Input
                              type="number"
                              step="0.01"
                              min="5"
                              value={editData.price}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })
                              }
                              className="pl-10 bg-white/5 border-white/10 text-white"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {selectedLink.name && (
                          <div className="flex items-center gap-3">
                            <span className="text-white">{selectedLink.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <DollarSign className="size-4 text-white/50" />
                          <span className="text-white">${selectedLink.price.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {selectedLink.user && (
                      <div className="flex items-center gap-3">
                        <User className="size-4 text-white/50" />
                        <span className="text-white">
                          {selectedLink.user.firstName && selectedLink.user.lastName
                            ? `${selectedLink.user.firstName} ${selectedLink.user.lastName}`
                            : selectedLink.user.name || selectedLink.user.email || "Unknown"}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="size-4 text-white/50" />
                      <span className="text-white">
                        Created {new Date(selectedLink.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Statistics</h3>
                  <div className="space-y-2 text-white">
                    <div className="flex justify-between">
                      <span className="text-white/70">Total Files:</span>
                      <span>{selectedLink._count.files}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Total Clicks:</span>
                      <span>{selectedLink.totalClicks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Total Sales:</span>
                      <span>{selectedLink.totalSales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Total Earnings:</span>
                      <span>${selectedLink.totalEarnings.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Purchase Count:</span>
                      <span>{selectedLink.purchaseCount}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Settings</h3>
                  <div className="space-y-4">
                    {isEditing ? (
                      <>
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-white/70">Purchaseable</label>
                          <Switch
                            checked={editData.isPurchaseable}
                            onCheckedChange={(checked) =>
                              setEditData({ ...editData, isPurchaseable: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-white/70">Downloadable</label>
                          <Switch
                            checked={editData.isDownloadable}
                            onCheckedChange={(checked) =>
                              setEditData({ ...editData, isDownloadable: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-white/70">Show Link Title</label>
                          <Switch
                            checked={editData.isLinkTitleVisible}
                            onCheckedChange={(checked) =>
                              setEditData({ ...editData, isLinkTitleVisible: checked })
                            }
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-white/70">Purchaseable:</span>
                          <span>{selectedLink.isPurchaseable ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Downloadable:</span>
                          <span>{selectedLink.isDownloadable ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Show Link Title:</span>
                          <span>{selectedLink.isLinkTitleVisible ? "Yes" : "No"}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {selectedLink.files && selectedLink.files.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white/70">Files ({selectedLink.files.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {selectedLink.files.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 bg-white/5 rounded-sm border border-white/10"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-white font-medium block truncate">
                                {file.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 ml-2">
                              <span className="text-white/70 text-sm whitespace-nowrap">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                              {isEditing && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteFile(file.id)}
                                  className="h-8 w-8 p-0 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-white/70">
                            {file.mimeType}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reports Sheet */}
      <Sheet open={reportSheetOpen} onOpenChange={setReportSheetOpen}>
        <SheetContent className="bg-black border-white/10 text-white overflow-y-auto">
          {selectedReportedLink && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-white text-2xl font-semibold">
                    Reports for {selectedReportedLink.name || selectedReportedLink.url}
                  </SheetTitle>
                  {selectedReportedLink.priority && (
                    <span className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded">
                      Priority
                    </span>
                  )}
                </div>
                <SheetDescription className="text-white/70">
                  {selectedReportedLink.totalReportCount} total report{selectedReportedLink.totalReportCount !== 1 ? 's' : ''}
                  {selectedReportedLink.recentReportCount > 0 && (
                    <span className="text-red-400 ml-2">
                      ({selectedReportedLink.recentReportCount} in last 7 days)
                    </span>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Link Info */}
                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Link Information</h3>
                  <div className="space-y-2 text-white">
                    <div className="flex items-center gap-2">
                      <Link2 className="size-4 text-white/50" />
                      <a
                        href={`/${selectedReportedLink.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-white/70 font-mono text-sm"
                      >
                        {selectedReportedLink.url}
                      </a>
                    </div>
                    {selectedReportedLink.user && (
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-white/50" />
                        <span>
                          {selectedReportedLink.user.firstName && selectedReportedLink.user.lastName
                            ? `${selectedReportedLink.user.firstName} ${selectedReportedLink.user.lastName}`
                            : selectedReportedLink.user.email || "Unknown"}
                        </span>
                        {selectedReportedLink.user.isFrozen && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                            Frozen
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <DollarSign className="size-4 text-white/50" />
                      <span>${Number(selectedReportedLink.price).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Reports List */}
                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Reports</h3>
                  <div className="space-y-4">
                    {selectedReportedLink.reports.map((report) => (
                      <div
                        key={report.id}
                        className="p-4 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-white font-semibold">{report.reason}</span>
                            <span className="text-white/50 text-xs ml-2">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <span className={cn(
                            "px-2 py-1 text-xs rounded",
                            report.status === "pending" && "bg-yellow-500/20 text-yellow-400",
                            report.status === "resolved" && "bg-green-500/20 text-green-400",
                            report.status === "dismissed" && "bg-gray-500/20 text-gray-400"
                          )}>
                            {report.status}
                          </span>
                        </div>
                        <p className="text-white/70 text-sm mt-2 whitespace-pre-wrap">
                          {report.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Moderation Actions */}
                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Moderation Actions</h3>
                  <div className="space-y-2">
                    <Button
                      onClick={() => moderateLink("freeze_user")}
                      disabled={isModerating || !selectedReportedLink.user}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Freeze User Account
                    </Button>
                    {showFileSelector ? (
                      <div className="space-y-2">
                        <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-white/5 rounded border border-white/10">
                          {selectedReportedLink.files?.map((file) => (
                            <div key={file.id} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded">
                              <Checkbox
                                checked={selectedFileIds.has(file.id)}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(selectedFileIds);
                                  if (checked) {
                                    newSet.add(file.id);
                                  } else {
                                    newSet.delete(file.id);
                                  }
                                  setSelectedFileIds(newSet);
                                }}
                              />
                              <span className="text-white text-sm flex-1 truncate">{file.name}</span>
                              <span className="text-white/50 text-xs">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              if (selectedFileIds.size === 0) {
                                alert("Please select at least one file to remove");
                                return;
                              }
                              moderateLink("remove_files", Array.from(selectedFileIds));
                              setShowFileSelector(false);
                              setSelectedFileIds(new Set());
                            }}
                            disabled={isModerating || selectedFileIds.size === 0}
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            Remove Selected ({selectedFileIds.size})
                          </Button>
                          <Button
                            onClick={() => {
                              setShowFileSelector(false);
                              setSelectedFileIds(new Set());
                            }}
                            variant="outline"
                            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setShowFileSelector(true)}
                        disabled={isModerating || !selectedReportedLink.files || selectedReportedLink.files.length === 0}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <FileX className="w-4 h-4 mr-2" />
                        Remove Specific Files
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        const reason = prompt("Enter reason for archiving:");
                        if (reason) {
                          moderateLink("archive_link", undefined, reason);
                        }
                      }}
                      disabled={isModerating}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive Link
                    </Button>
                    <Button
                      onClick={() => moderateLink("dismiss_reports")}
                      disabled={isModerating}
                      variant="outline"
                      className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      Dismiss Reports
                    </Button>
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

export default function LinksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/50">Loading...</p>
      </div>
    }>
      <LinksPageContent />
    </Suspense>
  );
}