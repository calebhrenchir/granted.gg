"use client";
import { useRouter } from "next/navigation"

export default function FilePage() {
    const router = useRouter();

    return router.push("/home");
}