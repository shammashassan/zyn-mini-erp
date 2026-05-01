import { ErrorContent } from "@/components/layout/error-content";

export default function Forbidden() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
      <ErrorContent 
        code="403"
        description="You don&apos;t have permission to access\nthis specific resource."
      />
    </div>
  );
}
