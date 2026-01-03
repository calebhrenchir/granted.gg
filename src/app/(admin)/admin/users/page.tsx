"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MoreVertical, Eye, EyeOff, Mail, User, Calendar, Shield, CheckCircle, XCircle, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
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

interface User {
  id: string;
  name: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  isAdmin: boolean;
  isIdentityVerified: boolean;
  createdAt: string;
  _count: {
    links: number;
  };
}

interface UserDetails extends User {
  phoneNumber: string | null;
  dateOfBirth: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  platformFee: number;
  links: Array<{
    id: string;
    url: string;
    name: string | null;
    price: number;
    totalEarnings: number;
    totalClicks: number;
    totalSales: number;
    createdAt: string;
    _count: {
      files: number;
    };
  }>;
  totalEarnings: number;
}

const columns = [
  { key: "name", label: "Name", visible: true },
  { key: "email", label: "Email", visible: true },
  { key: "links", label: "Links", visible: false },
  { key: "status", label: "Status", visible: false },
  { key: "createdAt", label: "Joined", visible: true },
];

function UsersPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserDetails>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: col.visible }), {} as Record<string, boolean>)
  );

  useEffect(() => {
    if (status === "authenticated") {
      fetchUsers();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session, search, page]);

  // Handle userId query parameter from command menu
  useEffect(() => {
    const userId = searchParams.get("userId");
    if (userId && status === "authenticated") {
      fetchUserDetails(userId);
      // Clear the query parameter
      router.replace("/admin/users", { scroll: false });
    }
  }, [searchParams, status, session, router]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) {
        params.append("search", search);
      }
      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());
      
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        if (data.pagination) {
          setTotalCount(data.pagination.totalCount);
          setTotalPages(data.pagination.totalPages);
        }
      } else {
        console.error("Failed to fetch users:", response.status, response.statusText);
        if (response.status === 401) {
          setUsers([]);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserDetails(userId: string) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data.user);
        
        setEditingUser({
          email: data.user.email || "",
          firstName: data.user.firstName || "",
          lastName: data.user.lastName || "",
          phoneNumber: data.user.phoneNumber || "",
          dateOfBirth: data.user.dateOfBirth || "",
          addressLine1: data.user.addressLine1 || "",
          addressLine2: data.user.addressLine2 || "",
          city: data.user.city || "",
          state: data.user.state || "",
          postalCode: data.user.postalCode || "",
          country: data.user.country || "",
          isAdmin: data.user.isAdmin || false,
          isIdentityVerified: data.user.isIdentityVerified || false,
          platformFee: data.user.platformFee !== undefined ? Number(data.user.platformFee) : 20,
        });
        setSheetOpen(true);
        setSaveError(null);
      } else {
        console.error("Failed to fetch user details");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  }

  async function saveUserChanges() {
    if (!selectedUser) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingUser),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update user");
      }

      const data = await response.json();
      if (data.success) {
        // Update selectedUser with the response
        setSelectedUser({
          ...selectedUser,
          ...data.user,
        });
        // Update editingUser to match the saved data
        setEditingUser({
          email: data.user.email || "",
          name: data.user.name || "",
          firstName: data.user.firstName || "",
          lastName: data.user.lastName || "",
          phoneNumber: data.user.phoneNumber || "",
          dateOfBirth: data.user.dateOfBirth || "",
          addressLine1: data.user.addressLine1 || "",
          addressLine2: data.user.addressLine2 || "",
          city: data.user.city || "",
          state: data.user.state || "",
          postalCode: data.user.postalCode || "",
          country: data.user.country || "",
          isAdmin: data.user.isAdmin || false,
          isIdentityVerified: data.user.isIdentityVerified || false,
          platformFee: data.user.platformFee !== undefined ? Number(data.user.platformFee) : 20,
        });
        // Refresh the users list
        await fetchUsers();
      }
    } catch (error) {
      console.error("Error saving user changes:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleColumn(key: string) {
    setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    }
  }

  const allSelected = users.length > 0 && selectedUserIds.size === users.length;
  const someSelected = selectedUserIds.size > 0 && selectedUserIds.size < users.length;

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
        <h1 className="text-4xl font-bold">Users ({users.length})</h1>
      </div>

      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 size-4" />
          <Input
            placeholder="Search by email or name..."
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
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 2} className="text-center text-white/50 py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const displayName =
                  user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.name || user.email || "Unknown";

                return (
                  <TableRow
                    key={user.id}
                    className="border-white/10 hover:bg-white/5 cursor-pointer"
                    onClick={() => fetchUserDetails(user.id)}
                  >
                    <TableCell
                      className="text-white"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedUserIds.has(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                    </TableCell>
                    {columnVisibility.name && (
                      <TableCell className="text-white">
                        <div className="flex items-center gap-3">
                          <span>{displayName}</span>
                        </div>
                      </TableCell>
                    )}
                    {columnVisibility.email && (
                      <TableCell className="text-white/70">{user.email || "—"}</TableCell>
                    )}
                    {columnVisibility.links && (
                      <TableCell className="text-white">{user._count.links}</TableCell>
                    )}
                    {columnVisibility.status && (
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          {user.isIdentityVerified ? (
                            <CheckCircle className="size-4 text-green-500" />
                          ) : (
                            <XCircle className="size-4 text-yellow-500" />
                          )}
                          {user.isAdmin && (
                            <Shield className="size-4 text-blue-500" />
                          )}
                        </div>
                      </TableCell>
                    )}
                    {columnVisibility.createdAt && (
                      <TableCell className="text-white/70">
                        {new Date(user.createdAt).toLocaleDateString()}
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
                          <DropdownMenuItem variant={"default"} onClick={() => fetchUserDetails(user.id)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {user.isAdmin ? "Remove Admin" : "Make Admin"}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="bg-white/10" />

                          <DropdownMenuItem>Ban</DropdownMenuItem>
                          <DropdownMenuItem>Revoke Sessions</DropdownMenuItem>
                          <DropdownMenuItem>Impersonate</DropdownMenuItem>

                          <DropdownMenuSeparator className="bg-white/10" />

                          <DropdownMenuItem variant="destructive">
                            Delete User
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
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} users
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
          {selectedUser && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle className="text-white">
                      {editingUser.firstName && editingUser.lastName
                        ? `${editingUser.firstName} ${editingUser.lastName}`
                        : editingUser.name || editingUser.email || "User"}
                    </SheetTitle>
                    <SheetDescription className="text-white/70">
                      User Details
                    </SheetDescription>
                  </div>
                  <Button
                    onClick={saveUserChanges}
                    disabled={isSaving}
                    className="bg-white text-black hover:bg-white/90 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </SheetHeader>

              {saveError && (
                <div className="mt-4 mx-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{saveError}</p>
                </div>
              )}

              <div className="mt- space-y-6 px-4 mb-4">
                <div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-white/50 flex items-center gap-2">
                        <Mail className="size-3" />
                        Email
                      </label>
                      <Input
                        value={editingUser.email || ""}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        placeholder="Email"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-white/50">First Name</label>
                        <Input
                          value={editingUser.firstName || ""}
                          onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          placeholder="First Name"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-white/50">Last Name</label>
                        <Input
                          value={editingUser.lastName || ""}
                          onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          placeholder="Last Name"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-white/50">Phone Number</label>
                      <Input
                        value={editingUser.phoneNumber || ""}
                        onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        placeholder="Phone Number"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-white/50">Date of Birth</label>
                      <Input
                        type="date"
                        value={editingUser.dateOfBirth || ""}
                        onChange={(e) => setEditingUser({ ...editingUser, dateOfBirth: e.target.value })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <Calendar className="size-4 text-white/50" />
                      <span className="text-white text-sm">
                        Joined {new Date(selectedUser.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <Checkbox
                        checked={editingUser.isIdentityVerified || false}
                        onCheckedChange={(checked) => 
                          setEditingUser({ ...editingUser, isIdentityVerified: checked === true })
                        }
                      />
                      <label className="text-white text-sm flex items-center gap-2 cursor-pointer">
                        {editingUser.isIdentityVerified ? (
                          <>
                            <CheckCircle className="size-4 text-green-500" />
                            Identity Verified
                          </>
                        ) : (
                          <>
                            <XCircle className="size-4 text-yellow-500" />
                            Identity Not Verified
                          </>
                        )}
                      </label>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <Checkbox
                        checked={editingUser.isAdmin || false}
                        onCheckedChange={(checked) => 
                          setEditingUser({ ...editingUser, isAdmin: checked === true })
                        }
                      />
                      <label className="text-white text-sm flex items-center gap-2 cursor-pointer">
                        <Shield className="size-4 text-blue-500" />
                        Admin
                      </label>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <label className="text-xs text-white/50">Platform Fee (%)</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={editingUser.platformFee !== undefined ? editingUser.platformFee : 20}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 0 && value <= 100) {
                            setEditingUser({ ...editingUser, platformFee: value });
                          } else if (e.target.value === "") {
                            setEditingUser({ ...editingUser, platformFee: 0 });
                          }
                        }}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        placeholder="20"
                      />
                      <p className="text-xs text-white/50">
                        {editingUser.platformFee !== undefined && editingUser.platformFee > 0 ? (
                          <>
                            Buyer pays: +{editingUser.platformFee / 2}% | Seller receives: -{editingUser.platformFee / 2}%
                          </>
                        ) : (
                          "Buyer pays: +0% | Seller receives: -0% (No platform fee)"
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Address</h3>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-white/50">Address Line 1</label>
                      <Input
                        value={editingUser.addressLine1 || ""}
                        onChange={(e) => setEditingUser({ ...editingUser, addressLine1: e.target.value })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        placeholder="Address Line 1"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-white/50">Address Line 2</label>
                      <Input
                        value={editingUser.addressLine2 || ""}
                        onChange={(e) => setEditingUser({ ...editingUser, addressLine2: e.target.value })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        placeholder="Address Line 2 (optional)"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-white/50">City</label>
                        <Input
                          value={editingUser.city || ""}
                          onChange={(e) => setEditingUser({ ...editingUser, city: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          placeholder="City"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-white/50">State</label>
                        <Input
                          value={editingUser.state || ""}
                          onChange={(e) => setEditingUser({ ...editingUser, state: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          placeholder="State"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-white/50">Postal Code</label>
                        <Input
                          value={editingUser.postalCode || ""}
                          onChange={(e) => setEditingUser({ ...editingUser, postalCode: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          placeholder="Postal Code"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-white/50">Country</label>
                        <Input
                          value={editingUser.country || ""}
                          onChange={(e) => setEditingUser({ ...editingUser, country: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          placeholder="Country"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Statistics</h3>
                  <div className="space-y-2 text-white">
                    <div className="flex justify-between">
                      <span className="text-white/70">Total Links:</span>
                      <span>{selectedUser._count.links}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Total Earnings:</span>
                      <span>${selectedUser.totalEarnings.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {selectedUser.links.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/70 mb-3">Links</h3>
                    <div className="space-y-2">
                      {selectedUser.links.map((link) => (
                        <div
                          key={link.id}
                          className="p-3 bg-white/5 rounded-sm border border-white/10"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-white font-medium">
                              {link.name || link.url}
                            </span>
                            <span className="text-white/70 text-sm">
                              ${link.price.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex gap-4 text-sm text-white/70">
                            <span>{link._count.files} files</span>
                            <span>{link.totalClicks} clicks</span>
                            <span>{link.totalSales} sales</span>
                            <span>${link.totalEarnings.toFixed(2)} earned</span>
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
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/50">Loading...</p>
      </div>
    }>
      <UsersPageContent />
    </Suspense>
  );
}