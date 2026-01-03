import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";

export default function LinkDeleteModal({
    linkId, 
    open,
    onOpenChange,
}: {
    linkId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="!max-w-md rounded-xl mx-auto bg-neutral-900/90 backdrop-blur-xl border border-neutral-600/30 transition-all duration-300">
                <AlertDialogHeader className="text-center">
                    <AlertDialogTitle className="text-white text-2xl font-semibold">Delete Link</AlertDialogTitle>
                    <AlertDialogDescription className="text-white text-md font-medium">Are you sure you want to delete this link?  This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-2 justify-center">
                    <AlertDialogCancel className="w-1/2 bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700 w-1/2 transition-colors duration-200">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}