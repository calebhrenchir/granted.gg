import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Checks if the current user is an admin by querying the database.
 * Returns the user object if admin, null otherwise.
 */
export async function checkAdminStatus() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return null;
    }

    // Check admin status directly from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        isAdmin: true,
      },
    });

    if (!user || !user.isAdmin) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return null;
  }
}

