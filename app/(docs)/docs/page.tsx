"use client";

import * as React from "react";
import { DOC_SECTIONS } from "./content";
import { useDocs } from "@/components/docs/docs-context";

export default function DocumentationPage() {
    const { activeSectionId } = useDocs();

    // Scroll to top when section changes
    React.useEffect(() => {
        const mainContent = document.getElementById("doc-scroll-area");
        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [activeSectionId]);

    const activeContent = DOC_SECTIONS.find((s) => s.id === activeSectionId) || DOC_SECTIONS[0];

    return (
        <div id="doc-scroll-area" className="flex-1 overflow-y-auto p-6 lg:p-10 h-full">
            <div className="mx-auto max-w-4xl pb-20 animate-in fade-in-50 duration-300">
                <div className="mb-10 border-b pb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-full shrink-0">
                            <activeContent.icon className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{activeContent.title}</h1>
                            <p className="text-muted-foreground mt-1">
                                {activeContent.description}
                            </p>
                        </div>
                    </div>
                </div>

                {activeContent.content}
            </div>
        </div>
    );
}
