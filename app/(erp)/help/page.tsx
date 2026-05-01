// app/help/page.tsx

"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  HelpCircle,
  BookOpen,
  MessageSquare,
  Video,
  FileQuestion,
  Mail,
  Phone,
  ExternalLink,
  ChevronRight,
  Search,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { useHelpPermissions } from "@/hooks/use-permissions";
import { forbidden } from "next/navigation";
import { redirect, usePathname } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

interface HelpResource {
  id: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  href?: string;
  action?: () => void;
}

const HELP_RESOURCES: HelpResource[] = [
  {
    id: "documentation",
    title: "Documentation",
    description: "Browse our comprehensive documentation and guides",
    icon: BookOpen,
    href: "/docs",
  },
  {
    id: "video-tutorials",
    title: "Video Tutorials",
    description: "Watch step-by-step video guides and tutorials",
    icon: Video,
    action: () => toast.info("Video tutorials are coming soon!", {
      description: "We are recording new content to help you get started."
    }),
  },
  {
    id: "faq",
    title: "FAQ",
    description: "Find answers to frequently asked questions",
    icon: FileQuestion,
    action: () => {
      const faqSection = document.getElementById("faq-section");
      faqSection?.scrollIntoView({ behavior: "smooth" });
    },
  },
  {
    id: "contact",
    title: "Contact Support",
    description: "Get in touch with our support team",
    icon: MessageSquare,
    action: () => {
      const contactSection = document.getElementById("contact-section");
      contactSection?.scrollIntoView({ behavior: "smooth" });
    },
  },
];

const FAQ_ITEMS = [
  {
    question: "How do I reset my password?",
    answer: "Navigate to your Account Settings, and select 'Change Password'. Follow the prompts to set a new password.",
  },
  {
    question: "How do I create a new invoice?",
    answer: "Go to Documents > Invoices and click the 'Add Invoice' button. Fill in the customer details, add items, and save the invoice.",
  },
  {
    question: "Can I export reports to Excel?",
    answer: "Yes, all reports have an export function. Click the 'Export' button on any report page to download the data in Excel format.",
  },
  {
    question: "How do I manage user permissions?",
    answer: "If you're an admin or owner, go to HRM > User Management. Select a user and click 'Edit' to modify their role and permissions.",
  },
  {
    question: "What's the difference between Products and Materials?",
    answer: "Products are finished goods you sell to customers, while Materials are raw materials or components used in your business operations.",
  },
  {
    question: "How do I track inventory levels?",
    answer: "Navigate to Inventory and select the item you want to track. The current stock level is displayed, and you can use Stock Adjustment to modify quantities.",
  },
  {
    question: "Can I customize the company logo?",
    answer: "Yes, go to Settings > Company Details to upload your company logo, update business information, and customize branding.",
  },
  {
    question: "How do I generate financial statements?",
    answer: "Navigate to Accounting > Financial Statements. Select the date range and click 'Export' to view your Balance Sheet, Income Statement, and Cash Flow.",
  },
];

export default function GetHelpPage() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const {
    permissions: { canRead },
    session,
    isPending
  } = useHelpPermissions();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredFAQ = React.useMemo(() => {
    if (!searchQuery.trim()) return FAQ_ITEMS;

    const query = searchQuery.toLowerCase();
    return FAQ_ITEMS.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleResourceClick = (resource: HelpResource) => {
    if (resource.href) {
      window.open(resource.href, "_blank");
    } else if (resource.action) {
      resource.action();
    }
  };

  // Loading state
  if (!isMounted || isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!session) {
    redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
  }

  const currentUser = session?.user;

  // Access control
  if (!canRead) {
    forbidden();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <HelpCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Get Help</h1>
                <p className="text-muted-foreground">
                  Find answers and get support for your questions
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col gap-6 px-4 lg:px-6 xl:gap-8">
            <div className="max-w-5xl mx-auto w-full space-y-6">
              {/* Quick Help Resources */}
              <div>
                <div className="mb-4">
                  <h2 className="text-2xl font-semibold tracking-tight">Quick Help</h2>
                  <p className="text-muted-foreground">
                    Browse our help resources to find what you need
                  </p>
                </div>
                <ItemGroup className="gap-5">
                  {HELP_RESOURCES.map((resource) => {
                    const Icon = resource.icon;
                    return (
                      <Item
                        key={resource.id}
                        variant="outline"
                        asChild
                        className="cursor-pointer transition-all hover:bg-muted/50"
                      >
                        <button
                          onClick={() => handleResourceClick(resource)}
                          className="w-full text-left"
                        >
                          <ItemMedia variant="icon">
                            <Icon className="h-5 w-5" />
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{resource.title}</ItemTitle>
                            <ItemDescription>{resource.description}</ItemDescription>
                          </ItemContent>
                          <div className="ml-auto">
                            {resource.href ? (
                              <ExternalLink className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                      </Item>
                    );
                  })}
                </ItemGroup>
              </div>

              <Separator />

              {/* FAQ Section */}
              <Card id="faq-section">
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Search or browse common questions and answers
                  </CardDescription>
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search FAQ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredFAQ.length === 0 ? (
                    <div className="text-center py-8">
                      <FileQuestion className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-semibold mb-2">No results found</h3>
                      <p className="text-muted-foreground">
                        Try searching with different keywords
                      </p>
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {filteredFAQ.map((item, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger className="text-left">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Contact Support */}
              <Card id="contact-section">
                <CardHeader>
                  <CardTitle>Contact Support</CardTitle>
                  <CardDescription>
                    Can't find what you're looking for? Get in touch with us
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
                      <Mail className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold mb-1">Email Support</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          We typically respond within 24 hours
                        </p>
                        <a
                          href="mailto:support@example.com"
                          className="text-sm text-primary hover:underline"
                        >
                          support@example.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
                      <Phone className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold mb-1">Phone Support</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Monday - Friday, 9:00 AM - 5:00 PM
                        </p>
                        <a
                          href="tel:+1234567890"
                          className="text-sm text-primary hover:underline"
                        >
                          +1 (234) 567-890
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <h4 className="font-semibold mb-2">Need immediate assistance?</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      For urgent issues, please contact us directly. Include your user ID and a
                      detailed description of the problem.
                    </p>
                    {currentUser && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Your User ID:</span>
                        <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                          {currentUser.id}
                        </code>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* System Information */}
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                  <CardDescription>
                    Technical details that may help with troubleshooting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Browser:</span>
                      <div className="font-mono text-xs mt-1">
                        {typeof window !== "undefined" && window.navigator.userAgent}
                      </div>
                    </div>
                    {currentUser && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Role:</span>
                          <div className="font-medium mt-1 capitalize">
                            {currentUser.role || "user"}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <div className="font-medium mt-1">{currentUser.email}</div>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="text-muted-foreground">Screen Resolution:</span>
                      <div className="font-medium mt-1">
                        {typeof window !== "undefined" &&
                          `${window.screen.width}x${window.screen.height}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}