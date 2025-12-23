// app/api/company-details/route.ts - UPDATED: Dynamic Singleton (No Hardcoded ID)

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import CompanyDetails from "@/models/CompanyDetails";
import { requireAuthAndPermission } from "@/lib/auth-utils";

export async function GET() {
  try {
    // 1. Permission Check
    // const { error } = await requireAuthAndPermission({
    //   companyDetails: ["read"],
    // });
    // if (error) return error;

    await dbConnect();
    
    // 2. Dynamic Fetch: Get the first document found
    let details = await CompanyDetails.findOne();
    
    // 3. Auto-Create if missing (Lazy Initialization)
    if (!details) {
      details = await CompanyDetails.create({
        companyName: "Your Company Name",
        // Add default values here if needed
      });
    }
    
    return NextResponse.json(details);
  } catch (error) {
    console.error("Failed to fetch company details:", error);
    return NextResponse.json({ error: "Failed to fetch company details" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 1. Permission Check
    const { error } = await requireAuthAndPermission({
      companyDetails: ["update"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();
    
    // 2. Dynamic Update: Update the first document found, or create one if empty
    // The filter {} matches any document. 
    // sort: { _id: 1 } ensures we always grab the "oldest" one if duplicates somehow exist.
    const details = await CompanyDetails.findOneAndUpdate(
      {}, 
      body,
      { 
        new: true, 
        upsert: true, 
        setDefaultsOnInsert: true,
        sort: { _id: 1 } 
      }
    );

    return NextResponse.json(details);
  } catch (error) {
    console.error("Failed to update company details:", error);
    return NextResponse.json({ error: "Failed to update company details" }, { status: 500 });
  }
}