import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Newspaper, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NewsPost {
  id: string;
  title: string;
  content: string;
  published_at: string;
  source: string;
  source_url: string | null;
}

export const NewsFeed = () => {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("id, title, content, published_at, source, source_url")
        .order("published_at", { ascending: false })
        .limit(5);

      if (!error && data) {
        setPosts(data);
      }
      setLoading(false);
    };

    fetchNews();
  }, []);

  // Don't render anything if no posts or still loading
  if (loading || posts.length === 0) {
    return null;
  }

  const getSourceLabel = (source: string) => {
    if (source === "rss_insidesurvivor") return "Inside Survivor";
    return null;
  };

  return (
    <>
      <div className="border-b border-border bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between py-3 h-auto"
              >
                <div className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-primary" />
                  <span className="font-medium">News</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {posts.length}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="pb-3 space-y-2">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="w-full text-left px-4 py-2 rounded-md hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium text-sm truncate">{post.title}</p>
                      {post.source_url && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(post.published_at), "MMM d")}
                    </span>
                  </div>
                </button>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* News Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedPost?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {selectedPost &&
                  format(new Date(selectedPost.published_at), "MMMM d, yyyy")}
              </span>
              {selectedPost && getSourceLabel(selectedPost.source) && (
                <span className="text-primary">
                  via {getSourceLabel(selectedPost.source)}
                </span>
              )}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{selectedPost?.content}</p>
            </div>
            {selectedPost?.source_url && (
              <a
                href={selectedPost.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Read full article
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
