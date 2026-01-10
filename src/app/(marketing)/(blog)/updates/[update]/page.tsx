import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type ContentBlock = 
  | { type: "text"; content: string }
  | { type: "image"; url: string };

async function getBlogPost(slug: string) {
  try {
    const blogPost = await prisma.blogPost.findUnique({
      where: { slug },
    });

    return blogPost;
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return null;
  }
}

export default async function UpdatePage({
  params,
}: {
  params: Promise<{ update: string }>;
}) {
    const { update: slug } = await params;
    const post = await getBlogPost(slug);

    if (!post) {
        notFound();
    }

    // Convert content to ContentBlock format, handling both old (string[]) and new (ContentBlock[]) formats
    let content: ContentBlock[] = [];
    if (Array.isArray(post.content)) {
      content = post.content.map((item: any) => {
        if (typeof item === "string") {
          // Old format: string array
          return { type: "text" as const, content: item };
        } else if (item && typeof item === "object" && ("type" in item)) {
          // New format: ContentBlock
          return item as ContentBlock;
        }
        return { type: "text" as const, content: "" };
      }).filter((block: ContentBlock) => {
        if (block.type === "text") return block.content.trim();
        if (block.type === "image") return block.url.trim();
        return false;
      });
    }

    return (
        <div className="max-w-2xl mx-auto text-xl font-normal pt-8 sm:pt12 pb-16 sm:pb-32 px-6 lg:px-0">
            <div className="text-sm font-semibold mb-2 text-neutral-400">
                <Link href="/updates" className="flex flex-row items-center gap-2 hover:text-white transition-colors duration-300">
                    <ArrowLeft className="w-4 h-4" />
                    All updates
                </Link>

                <h1 className="text-4xl text-white lg:text-6xl font-bold mb-4 inline-flex py-1 mt-4">
                    {post.title}
                </h1>

                <div className="text-sm font-semibold mb-2 text-neutral-400">
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </div>

                {content.map((block: ContentBlock, index: number) => {
                    if (block.type === "text") {
                        return (
                            <p key={index} className="my-12 text-lg lg:text-xl font-semibold text-white/50">
                                {block.content}
                            </p>
                        );
                    } else if (block.type === "image") {
                        return (
                            <div key={index} className="relative w-full h-64 bg-white/5 rounded-xl overflow-hidden my-12">
                                <Image
                                    src={block.url}
                                    alt={`Image ${index + 1}`}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        );
                    }
                    return null;
                })}

                <div className="flex flex-col gap-4 mt-5">
                    <p className="font-semibold text-white">{post.author}</p>
                    <Image className="opacity-50" src="/assets/signature-white.png" alt="Signature" width={100} height={100} />
                </div>
            </div>
        </div>
    )
}