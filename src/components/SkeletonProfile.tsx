import React from 'react';

export function SkeletonProfile() {
  return (
    <div className="w-full animate-pulse px-4 py-8 max-w-lg mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-28 h-28 bg-gray-200 rounded-full mb-6"></div>
        <div className="h-8 w-48 bg-gray-200 rounded-lg mb-2"></div>
        <div className="h-4 w-32 bg-gray-100 rounded-lg"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-50 h-32 rounded-3xl p-6 border border-gray-100">
          <div className="h-4 w-20 bg-gray-200 rounded-lg mb-2"></div>
          <div className="h-8 w-16 bg-gray-300 rounded-lg"></div>
        </div>
        <div className="bg-gray-50 h-32 rounded-3xl p-6 border border-gray-100">
          <div className="h-4 w-20 bg-gray-200 rounded-lg mb-2"></div>
          <div className="h-8 w-16 bg-gray-300 rounded-lg"></div>
        </div>
      </div>

      {/* Menu Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50">
            <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
            <div className="flex-1">
              <div className="h-4 w-24 bg-gray-200 rounded-lg mb-1.5"></div>
              <div className="h-3 w-40 bg-gray-100 rounded-lg"></div>
            </div>
            <div className="w-6 h-6 bg-gray-100 rounded-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
