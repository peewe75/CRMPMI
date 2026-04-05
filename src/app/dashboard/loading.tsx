export default function DashboardLoading() {
  const shimmerStyle = (delay = 0) => ({
    background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
    backgroundSize: '200% 100%',
    animation: `shimmer 1.5s infinite`,
    animationDelay: `${delay}s`,
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page title skeleton */}
      <div className="h-8 w-48 rounded-lg" style={shimmerStyle()} />

      {/* Card skeletons */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-white p-4 shadow-sm space-y-3">
          <div className="h-5 w-32 rounded" style={shimmerStyle(i * 0.1)} />
          <div className="space-y-2">
            <div className="h-4 w-full rounded" style={shimmerStyle(i * 0.1 + 0.05)} />
            <div className="h-4 w-3/4 rounded" style={shimmerStyle(i * 0.1 + 0.1)} />
          </div>
        </div>
      ))}
    </div>
  );
}
