import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getBlogPosts() {
  try {
    const blogPosts = await prisma.blogPost.findMany({
      orderBy: {
        publishedAt: "desc",
      },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        imageUrl: true,
        author: true,
        createdAt: true,
      },
    });

    return blogPosts;
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }
}

export default async function UpdatesPage() {
    const blogPosts = await getBlogPosts();

    return (
        <div className="flex flex-col max-w-2xl mx-auto divide-y divide-neutral-800 -mt-8 sm:mt-4 px-6 lg:px-0 md:pb-12">
            {blogPosts.length === 0 ? (
                <div className="max-w-2xl mx-auto pt-16 pb-16">
                    <p className="text-white/50">No updates yet. Check back soon!</p>
                </div>
            ) : (
                blogPosts.map((post: any) => (
                    <div key={post.id} className="max-w-2xl mx-auto pt-16 pb-16 min-w-2xl">
                        <div className="text-sm font-semibold mb-2 text-neutral-400">
                            {new Date(post.publishedAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </div>

                        <h1 className="text-2xl lg:text-4xl font-bold">
                            <Link href={`/updates/${post.slug}`} className="hover:bg-white/10 text-white rounded-lg transition inline-flex px-4 py-2 -ml-5">
                                {post.title}
                            </Link>
                        </h1>

                        <p className="my-1.5 text-lg lg:text-xl font-semibold text-white/50">
                            {post.excerpt}
                        </p>

                        {post.imageUrl && (
                            <Link href={`/updates/${post.slug}`}>
                                <div className="relative flex flex-col items-center justify-center bg-white/10 lg:mx-40 overflow-hidden h-[340px] my-16 rounded-xl bg-cover bg-center">
                                    <span className="absolute inset-0 rounded-xl shadow-outline-bright z-20"></span>
                                    <Image 
                                        src={post.imageUrl} 
                                        alt={post.title} 
                                        width={1000} 
                                        height={1000} 
                                        className="absolute inset-0 object-cover" 
                                    />
                                </div>
                            </Link>
                        )}

                        <Link href={`/updates/${post.slug}`} className="block w-full px-4 py-3 text-lg text-center font-semibold text-white/50 hover:text-white transition border border-white/10 rounded-lg mt-4 hover:border-white/20">
                            Read the full post
                        </Link>
                    </div>
                ))
            )}
        </div>
    )
}