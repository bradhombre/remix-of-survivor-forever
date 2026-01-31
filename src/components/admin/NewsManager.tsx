import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Newspaper, AlertTriangle, Clock, RefreshCw, Rss, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface NewsPost {
  id: string;
  title: string;
  content: string;
  is_spoiler: boolean;
  published_at: string;
  expires_at: string | null;
  source: string;
  source_url: string | null;
}

export const NewsManager = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  const fetchPosts = async () => {
    // Super admins can see all posts via RLS policy
    const { data, error } = await supabase
      .from("news_posts")
      .select("*")
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Error fetching news posts:", error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSyncNews = async () => {
    setSyncing(true);
    try {
      const response = await supabase.functions.invoke("fetch-survivor-news");
      
      if (response.error) {
        toast.error("Failed to sync news: " + response.error.message);
      } else {
        const data = response.data;
        if (data.inserted > 0) {
          toast.success(`Synced ${data.inserted} new articles`);
        } else {
          toast.info("No new articles to sync");
        }
        fetchPosts();
      }
    } catch (error) {
      toast.error("Failed to sync news");
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setIsSpoiler(false);
    setExpiresAt("");
    setEditingPost(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (post: NewsPost) => {
    setEditingPost(post);
    setTitle(post.title);
    setContent(post.content);
    setIsSpoiler(post.is_spoiler);
    setExpiresAt(post.expires_at ? post.expires_at.split("T")[0] : "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    const postData = {
      title: title.trim(),
      content: content.trim(),
      is_spoiler: isSpoiler,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      author_id: user?.id,
    };

    if (editingPost) {
      const { error } = await supabase
        .from("news_posts")
        .update(postData)
        .eq("id", editingPost.id);

      if (error) {
        toast.error("Failed to update post");
        console.error(error);
      } else {
        toast.success("Post updated");
        setIsDialogOpen(false);
        resetForm();
        fetchPosts();
      }
    } else {
      const { error } = await supabase.from("news_posts").insert(postData);

      if (error) {
        toast.error("Failed to create post");
        console.error(error);
      } else {
        toast.success("Post created");
        setIsDialogOpen(false);
        resetForm();
        fetchPosts();
      }
    }
  };

  const handleDelete = async (postId: string) => {
    const { error } = await supabase.from("news_posts").delete().eq("id", postId);

    if (error) {
      toast.error("Failed to delete post");
      console.error(error);
    } else {
      toast.success("Post deleted");
      fetchPosts();
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading news posts...</p>;
  }

  const filteredPosts = posts.filter((post) => {
    if (activeTab === "all") return true;
    if (activeTab === "manual") return post.source === "manual";
    if (activeTab === "rss") return post.source.startsWith("rss_");
    return true;
  });

  const manualCount = posts.filter((p) => p.source === "manual").length;
  const rssCount = posts.filter((p) => p.source.startsWith("rss_")).length;

  const getSourceBadge = (source: string) => {
    if (source === "manual") {
      return <Badge variant="outline">Manual</Badge>;
    }
    if (source === "rss_insidesurvivor") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Rss className="h-3 w-3" />
          Inside Survivor
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            News Posts ({posts.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handleSyncNews} size="sm" variant="outline" disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync RSS"}
            </Button>
            <Button onClick={openNewDialog} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Post
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">All ({posts.length})</TabsTrigger>
            <TabsTrigger value="manual">Manual ({manualCount})</TabsTrigger>
            <TabsTrigger value="rss">RSS ({rssCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredPosts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {activeTab === "all"
              ? "No news posts yet. Create one or sync from RSS."
              : `No ${activeTab} posts found.`}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-center">Spoiler</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium max-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{post.title}</span>
                      {post.source_url && (
                        <a
                          href={post.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getSourceBadge(post.source)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(post.published_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-center">
                    {post.is_spoiler && (
                      <AlertTriangle className="h-4 w-4 text-warning mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {post.expires_at ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(post.expires_at), "MMM d")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(post)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Post</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{post.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(post.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPost ? "Edit Post" : "Create New Post"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter post title..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter post content..."
                  rows={5}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="spoiler"
                  checked={isSpoiler}
                  onCheckedChange={(checked) => setIsSpoiler(checked === true)}
                />
                <Label htmlFor="spoiler" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Contains Spoilers
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires">Expires At (optional)</Label>
                <Input
                  id="expires"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Post will be hidden after this date
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingPost ? "Save Changes" : "Create Post"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
