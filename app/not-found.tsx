import { ErrorContent } from "@/components/layout/error-content";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
      <ErrorContent 
        code="404"
        description="The page you&apos;re looking for might have been\nmoved or doesn&apos;t exist."
        showExplore
      />
    </div>
  );
}
