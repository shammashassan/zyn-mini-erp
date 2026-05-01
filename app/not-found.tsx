import { ErrorContent } from "@/components/layout/error-content";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      <ErrorContent
        code="404"
        description={`The page you're looking for might have been\nmoved or doesn't exist.`}
        showExplore
      />
    </div>
  );
}
