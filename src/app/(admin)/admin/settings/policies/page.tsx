"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PolicySection {
  title: string;
  description: string;
}

interface Policy {
  id: string;
  type: string;
  title: string;
  lastUpdated: string;
  sections: PolicySection[];
}

const POLICY_TYPES = [
  { value: "terms", label: "Terms of Service" },
  { value: "privacy", label: "Privacy Policy" },
  { value: "removal", label: "Removal Policy" },
];

export default function PoliciesPage() {
  const { data: session, status } = useSession();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string>("terms");
  const [loading, setLoading] = useState(true);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedPolicy, setEditedPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPolicies();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  async function fetchPolicies() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/policies");
      if (response.ok) {
        const data = await response.json();
        setPolicies(data.policies || []);
        loadPolicyForType(selectedPolicy, data.policies || []);
      } else {
        console.error("Failed to fetch policies");
      }
    } catch (error) {
      console.error("Error fetching policies:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPolicyForType(type: string, policiesList?: Policy[]) {
    try {
      setLoadingPolicy(true);
      
      // First check if we have it in the policies list
      const policiesToCheck = policiesList || policies;
      const existingPolicy = policiesToCheck.find(p => p.type === type);
      
      if (existingPolicy) {
        setEditedPolicy(existingPolicy);
        setLoadingPolicy(false);
        return;
      }

      // If not found, fetch it from the API
      const response = await fetch(`/api/admin/policies/${type}`);
      if (response.ok) {
        const data = await response.json();
        if (data.policy) {
          setEditedPolicy(data.policy);
          // Add to policies list if not already there
          setPolicies(prev => {
            const exists = prev.find(p => p.type === type);
            if (!exists) {
              return [...prev, data.policy];
            }
            return prev;
          });
        } else {
          // Create default policy structure
          setEditedPolicy({
            id: "",
            type: type,
            title: POLICY_TYPES.find(p => p.value === type)?.label || "",
            lastUpdated: new Date().toISOString(),
            sections: [
              { title: "", description: "" }
            ],
          });
        }
      } else if (response.status === 404) {
        // Policy doesn't exist yet, create default structure
        setEditedPolicy({
          id: "",
          type: type,
          title: POLICY_TYPES.find(p => p.value === type)?.label || "",
          lastUpdated: new Date().toISOString(),
          sections: [
            { title: "", description: "" }
          ],
        });
      }
    } catch (error) {
      console.error("Error loading policy:", error);
      // Create default policy structure on error
      setEditedPolicy({
        id: "",
        type: type,
        title: POLICY_TYPES.find(p => p.value === type)?.label || "",
        lastUpdated: new Date().toISOString(),
        sections: [
          { title: "", description: "" }
        ],
      });
    } finally {
      setLoadingPolicy(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated" && !loading) {
      loadPolicyForType(selectedPolicy, policies);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPolicy, status, loading]);

  async function savePolicy() {
    if (!editedPolicy) return;

    try {
      setSaving(true);
      const response = await fetch("/api/admin/policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: editedPolicy.type,
          title: editedPolicy.title,
          sections: editedPolicy.sections.filter(s => s.title.trim() || s.description.trim()),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update policies list
        setPolicies(prev => {
          const existing = prev.findIndex(p => p.type === data.policy.type);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = data.policy;
            return updated;
          }
          return [...prev, data.policy];
        });
        setEditedPolicy(data.policy);
        alert("Policy saved successfully!");
      } else {
        console.error("Failed to save policy");
        alert("Failed to save policy");
      }
    } catch (error) {
      console.error("Error saving policy:", error);
      alert("Error saving policy");
    } finally {
      setSaving(false);
    }
  }

  function addSection() {
    if (!editedPolicy) return;
    setEditedPolicy({
      ...editedPolicy,
      sections: [...editedPolicy.sections, { title: "", description: "" }],
    });
  }

  function removeSection(index: number) {
    if (!editedPolicy) return;
    setEditedPolicy({
      ...editedPolicy,
      sections: editedPolicy.sections.filter((_, i) => i !== index),
    });
  }

  function updateSection(index: number, field: "title" | "description", value: string) {
    if (!editedPolicy) return;
    const updatedSections = [...editedPolicy.sections];
    updatedSections[index] = {
      ...updatedSections[index],
      [field]: value,
    };
    setEditedPolicy({
      ...editedPolicy,
      sections: updatedSections,
    });
  }

  function updateTitle(value: string) {
    if (!editedPolicy) return;
    setEditedPolicy({
      ...editedPolicy,
      title: value,
    });
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/50">Loading...</p>
      </div>
    );
  }

  if (loadingPolicy) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-white/50">Loading policy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold">Policy Editor</h1>
        <Button
          onClick={savePolicy}
          disabled={saving || !editedPolicy}
          className="bg-white text-black hover:bg-white/90"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-4 mr-2" />
              Save Policy
            </>
          )}
        </Button>
      </div>

      {/* Policy Type Selector */}
      <div className="mb-6">
        <label className="text-white/70 text-sm font-semibold mb-2 block">
          Select Policy
        </label>
        <div className="flex gap-2">
          {POLICY_TYPES.map((type) => (
            <Button
              key={type.value}
              variant={selectedPolicy === type.value ? "default" : "outline"}
              onClick={() => setSelectedPolicy(type.value)}
              className={cn(
                selectedPolicy === type.value
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-white/5 border-white/10 text-white hover:text-white hover:bg-white/10"
              )}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {editedPolicy && (
        <div className="space-y-6">
          {/* Policy Title */}
          <div>
            <label className="text-white/70 text-sm font-semibold mb-2 block">
              Policy Title
            </label>
            <Input
              value={editedPolicy.title}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Enter policy title"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
            />
          </div>

          {/* Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-white/70 text-sm font-semibold">
                Sections
              </label>
              <Button
                onClick={addSection}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <Plus className="size-4 mr-2" />
                Add Section
              </Button>
            </div>

            {editedPolicy.sections.map((section, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-sm p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-white/70 text-sm font-semibold">
                    Section {index + 1}
                  </h3>
                  {editedPolicy.sections.length > 1 && (
                    <Button
                      onClick={() => removeSection(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                <div>
                  <label className="text-white/50 text-xs mb-1 block">
                    Section Title (h1 style)
                  </label>
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(index, "title", e.target.value)}
                    placeholder="Section Title"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                  />
                </div>

                <div>
                  <label className="text-white/50 text-xs mb-1 block">
                    Section Description (p style)
                  </label>
                  <Textarea
                    value={section.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSection(index, "description", e.target.value)}
                    placeholder="Section description/content"
                    rows={4}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/50 resize-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-8">
            <h2 className="text-white/70 text-lg font-semibold mb-4">Preview</h2>
            <div className="bg-black/50 border border-white/10 rounded-sm p-6">
              <div className="flex flex-col gap-10 mb-10">
                {editedPolicy.sections
                  .filter(s => s.title.trim() || s.description.trim())
                  .map((section, index) => (
                    <div key={index} className="flex flex-col gap-2 sm:gap-5">
                      {section.title && (
                        <h1 className="text-2xl sm:text-4xl font-semibold text-white">
                          {section.title}
                        </h1>
                      )}
                      {section.description && (
                        <p className="text-white/50 font-medium text-sm whitespace-pre-wrap">
                          {section.description}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
