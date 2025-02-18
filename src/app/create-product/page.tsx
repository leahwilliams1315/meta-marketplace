"use client";

import { Suspense } from "react";
import CreateProductContent from "./CreateProductContent";

export default function CreateProductPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] pt-24">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <Suspense fallback={<div>Loading...</div>}>
            <CreateProductContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
