import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Sparkles } from "lucide-react";
import { usePackages } from "@/hooks/usePackages";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

export const PackagesPreview = () => {
  const { data: packages, isLoading } = usePackages({ activeOnly: true, featuredOnly: false });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-12 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!packages || packages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">لا توجد باقات متاحة حالياً</p>
      </div>
    );
  }

  // Show max 3 packages (prioritize featured)
  const displayPackages = packages
    .sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return (a.display_order || 0) - (b.display_order || 0);
    })
    .slice(0, 3);

  const icons = [Zap, Sparkles, Crown];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {displayPackages.map((pkg, index) => {
        const Icon = icons[index % icons.length];
        const price = Number(pkg.price_monthly) || 0;
        const isFree = price === 0;
        const features = Array.isArray(pkg.features) ? (pkg.features as string[]).slice(0, 4) : [];

        return (
          <Card
            key={pkg.id}
            className={`border-2 transition-all hover:shadow-xl hover:border-primary/50 ${
              pkg.is_featured ? "border-primary shadow-lg" : "border-border"
            }`}
          >
            {pkg.is_featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3 py-1">
                  مميزة ⭐
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <CardTitle className="text-xl mb-2">{pkg.name_ar}</CardTitle>
              <CardDescription className="space-y-1">
                <span className="text-3xl font-bold text-foreground block">
                  {isFree ? (
                    "مجاني"
                  ) : (
                    <>
                      {price} <span className="text-base text-muted-foreground">ر.س</span>
                    </>
                  )}
                </span>
                <span className="text-sm block">شهرياً</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {features.length > 0 && (
                <ul className="space-y-2 mb-6">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              )}

              <Link to="/subscription">
                <Button
                  className="w-full"
                  variant={pkg.is_featured ? "default" : "outline"}
                >
                  {isFree ? "ابدأ مجاناً" : "اشترك الآن"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
