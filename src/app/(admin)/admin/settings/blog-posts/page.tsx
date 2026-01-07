"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Loader2, Calendar, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type ContentBlock = 
  | { type: "text"; content: string }
  | { type: "image"; url: string };

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: ContentBlock[];
  publishedAt: string;
  imageUrl: string | null;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export default function BlogPostsPage() {
  const { data: session, status } = useSession();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editedPost, setEditedPost] = useState<BlogPost | null>(null);
  const [isNewPost, setIsNewPost] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetchBlogPosts();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  async function fetchBlogPosts() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/blog-posts");
      if (response.ok) {
        const data = await response.json();
        setBlogPosts(data.blogPosts || []);
      } else {
        console.error("Failed to fetch blog posts");
      }
    } catch (error) {
      console.error("Error fetching blog posts:", error);
    } finally {
      setLoading(false);
    }
  }

  function createNewPost() {
    const newPost: BlogPost = {
      id: "",
      slug: "",
      title: "",
      excerpt: "",
      content: [{ type: "text", content: "" }],
      publishedAt: new Date().toISOString().split("T")[0],
      imageUrl: null,
      author: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditedPost(newPost);
    setSelectedPost(null);
    setIsNewPost(true);
  }

  function selectPost(post: BlogPost) {
    // Convert old format (string[]) to new format (ContentBlock[])
    const content = Array.isArray(post.content) 
      ? post.content.map((item: any) => {
          if (typeof item === "string") {
            return { type: "text" as const, content: item };
          }
          return item;
        })
      : [{ type: "text" as const, content: "" }];
    
    const formattedPost = {
      ...post,
      content: content as ContentBlock[],
    };
    
    setSelectedPost(formattedPost);
    setEditedPost(formattedPost);
    setIsNewPost(false);
  }

  async function savePost() {
    if (!editedPost) return;

    // Validate required fields
    if (!editedPost.slug || !editedPost.title || !editedPost.excerpt || !editedPost.author || !editedPost.publishedAt) {
      alert("Please fill in all required fields (slug, title, excerpt, author, published date)");
      return;
    }

    // Validate content has at least one non-empty block
    const validContent = editedPost.content.filter(block => {
      if (block.type === "text") {
        return block.content.trim();
      } else if (block.type === "image") {
        return block.url.trim();
      }
      return false;
    });
    if (validContent.length === 0) {
      alert("Please add at least one content block (text or image)");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/admin/blog-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editedPost.id || undefined,
          slug: editedPost.slug,
          title: editedPost.title,
          excerpt: editedPost.excerpt,
          content: validContent,
          publishedAt: editedPost.publishedAt,
          imageUrl: editedPost.imageUrl || null,
          author: editedPost.author,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchBlogPosts();
        setSelectedPost(data.blogPost);
        setEditedPost(data.blogPost);
        setIsNewPost(false);
        alert("Blog post saved successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to save blog post");
      }
    } catch (error) {
      console.error("Error saving blog post:", error);
      alert("Error saving blog post");
    } finally {
      setSaving(false);
    }
  }

  async function deletePost() {
    if (!selectedPost || !selectedPost.id) return;

    if (!confirm("Are you sure you want to delete this blog post? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/admin/blog-posts?id=${selectedPost.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchBlogPosts();
        setSelectedPost(null);
        setEditedPost(null);
        setIsNewPost(false);
        alert("Blog post deleted successfully!");
      } else {
        alert("Failed to delete blog post");
      }
    } catch (error) {
      console.error("Error deleting blog post:", error);
      alert("Error deleting blog post");
    } finally {
      setDeleting(false);
    }
  }

  function addTextBlock() {
    if (!editedPost) return;
    setEditedPost({
      ...editedPost,
      content: [...editedPost.content, { type: "text" as const, content: "" }],
    });
  }

  function addImageBlock() {
    if (!editedPost) return;
    setEditedPost({
      ...editedPost,
      content: [...editedPost.content, { type: "image" as const, url: "" }],
    });
  }

  function removeBlock(index: number) {
    if (!editedPost) return;
    setEditedPost({
      ...editedPost,
      content: editedPost.content.filter((_, i) => i !== index),
    });
  }

  function updateTextBlock(index: number, value: string) {
    if (!editedPost) return;
    const updatedContent = [...editedPost.content];
    if (updatedContent[index].type === "text") {
      updatedContent[index] = { type: "text", content: value };
      setEditedPost({
        ...editedPost,
        content: updatedContent,
      });
    }
  }

  function updateImageBlock(index: number, url: string) {
    if (!editedPost) return;
    const updatedContent = [...editedPost.content];
    if (updatedContent[index].type === "image") {
      updatedContent[index] = { type: "image", url };
      setEditedPost({
        ...editedPost,
        content: updatedContent,
      });
    }
  }

  function updateField(field: keyof BlogPost, value: string) {
    if (!editedPost) return;
    setEditedPost({
      ...editedPost,
      [field]: value,
    });
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/50">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold">Blog Posts Editor</h1>
        <div className="flex gap-2">
          <Button
            onClick={createNewPost}
            variant="outline"
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <Plus className="size-4 mr-2" />
            New Post
          </Button>
          {editedPost && (
            <Button
              onClick={savePost}
              disabled={saving || !editedPost}
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
                  Save Post
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Blog Posts List */}
        <div className="lg:col-span-1">
          <div className="bg-white/5 border border-white/10 rounded-sm p-4">
            <h2 className="text-white/70 text-sm font-semibold mb-4">All Posts</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {blogPosts.length === 0 ? (
                <p className="text-white/50 text-sm">No blog posts yet</p>
              ) : (
                blogPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => selectPost(post)}
                    className={cn(
                      "w-full text-left p-3 rounded-sm transition-colors",
                      selectedPost?.id === post.id
                        ? "bg-white/10 text-white"
                        : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <div className="font-semibold text-sm mb-1">{post.title}</div>
                    <div className="text-xs text-white/50">
                      {new Date(post.publishedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {editedPost ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-white/5 border border-white/10 rounded-sm p-4 space-y-4">
                <div>
                  <label className="text-white/70 text-sm font-semibold mb-2 block">
                    Slug (URL) *
                  </label>
                  <Input
                    value={editedPost.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                    placeholder="updates-are-now-live-on-granted-gg"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    URL: /updates/{editedPost.slug || "..."}
                  </p>
                </div>

                <div>
                  <label className="text-white/70 text-sm font-semibold mb-2 block">
                    Title *
                  </label>
                  <Input
                    value={editedPost.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Updates are now live on granted.gg"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                  />
                </div>

                <div>
                  <label className="text-white/70 text-sm font-semibold mb-2 block">
                    Excerpt *
                  </label>
                  <Textarea
                    value={editedPost.excerpt}
                    onChange={(e) => updateField("excerpt", e.target.value)}
                    placeholder="Short description/preview text"
                    rows={3}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/50 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/70 text-sm font-semibold mb-2 block">
                      Published Date *
                    </label>
                    <Input
                      type="date"
                      value={editedPost.publishedAt}
                      onChange={(e) => updateField("publishedAt", e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-white/70 text-sm font-semibold mb-2 block">
                      Author *
                    </label>
                    <Input
                      value={editedPost.author}
                      onChange={(e) => updateField("author", e.target.value)}
                      placeholder="Caleb Hrenchir - Founder"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white/70 text-sm font-semibold mb-2 block">
                    Featured Image URL (optional)
                  </label>
                  <Input
                    value={editedPost.imageUrl || ""}
                    onChange={(e) => updateField("imageUrl", e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                  />
                </div>
              </div>

              {/* Content Blocks */}
              <div className="bg-white/5 border border-white/10 rounded-sm p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-white/70 text-sm font-semibold">
                    Content Blocks *
                  </label>
                  <div className="flex gap-2">
                    <Button
                      onClick={addTextBlock}
                      variant="outline"
                      size="sm"
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <Plus className="size-4 mr-2" />
                      Add Text
                    </Button>
                    <Button
                      onClick={addImageBlock}
                      variant="outline"
                      size="sm"
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <ImageIcon className="size-4 mr-2" />
                      Add Image
                    </Button>
                  </div>
                </div>

                {editedPost.content.map((block, index) => (
                  <div
                    key={index}
                    className="bg-white/5 border border-white/10 rounded-sm p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-white/70 text-sm font-semibold">
                        {block.type === "text" ? `Text Block ${index + 1}` : `Image Block ${index + 1}`}
                      </h3>
                      {editedPost.content.length > 1 && (
                        <Button
                          onClick={() => removeBlock(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                    {block.type === "text" ? (
                      <Textarea
                        value={block.content}
                        onChange={(e) => updateTextBlock(index, e.target.value)}
                        placeholder="Enter paragraph content"
                        rows={4}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/50 resize-none"
                      />
                    ) : (
                      <div className="space-y-2">
                        <Input
                          value={block.url}
                          onChange={(e) => updateImageBlock(index, e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                        />
                        {block.url && (
                          <div className="relative w-full h-48 bg-white/5 rounded-sm overflow-hidden">
                            <Image
                              src={block.url}
                              alt={`Image ${index + 1}`}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="bg-white/5 border border-white/10 rounded-sm p-4">
                <h2 className="text-white/70 text-lg font-semibold mb-4">Preview</h2>
                <div className="bg-black/50 border border-white/10 rounded-sm p-6">
                  <div className="text-sm font-semibold mb-2 text-neutral-400">
                    {new Date(editedPost.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <h1 className="text-2xl lg:text-4xl font-bold mb-4 text-white">
                    {editedPost.title || "Untitled"}
                  </h1>
                  <p className="my-1.5 text-lg lg:text-xl font-semibold text-white/50 mb-4">
                    {editedPost.excerpt || "No excerpt"}
                  </p>
                  {editedPost.content
                    .filter(block => {
                      if (block.type === "text") return block.content.trim();
                      if (block.type === "image") return block.url.trim();
                      return false;
                    })
                    .map((block, index) => {
                      if (block.type === "text") {
                        return (
                          <p key={index} className="my-12 text-lg lg:text-xl font-semibold text-white/50">
                            {block.content}
                          </p>
                        );
                      } else {
                        return (
                          <div key={index} className="relative w-full h-64 bg-white/5 rounded-xl overflow-hidden my-12">
                            <Image
                              src={block.url}
                              alt={`Image ${index + 1}`}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        );
                      }
                    })}
                  {editedPost.author && (
                    <div className="flex flex-col gap-4 mt-5">
                      <p className="font-semibold text-white">{editedPost.author}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delete Button */}
              {!isNewPost && selectedPost && (
                <div className="flex justify-end">
                  <Button
                    onClick={deletePost}
                    disabled={deleting}
                    variant="outline"
                    className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-4 mr-2" />
                        Delete Post
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-sm p-8 text-center">
              <p className="text-white/50">Select a blog post to edit or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

