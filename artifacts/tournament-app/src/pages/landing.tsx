import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import {
  Calendar,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function Landing() {
  return (
    <PublicLayout>
      {/* HERO SECTION */}
      <section className="w-full flex-1 flex flex-col items-center justify-center relative overflow-hidden py-4 sm:py-6 px-4">
        {/* Solugenix Dual-Color Glow Gradients */}
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 md:w-[620px] h-96 md:h-[620px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-1/4 translate-x-1/3 -translate-y-1/3 w-80 md:w-[500px] h-80 md:h-[500px] bg-sky-400/20 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-4 sm:space-y-5 max-w-3xl mx-auto">
            {/* Solugenix Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/15 via-sky-500/15 to-blue-500/15 border border-sky-500/30 text-xs font-bold text-sky-700 dark:text-sky-300 tracking-wide shadow-xs backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-sky-500 animate-pulse" />
              <span>Innovative Technology. Intelligent Solutions.</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight font-['Outfit'] leading-[1.1]">
              Build Smarter. <br />
              <span className="gradient-text-primary">Create What’s Next.</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">
              Solugenix delivers innovative technology solutions that transform ideas into powerful digital products, intelligent solutions, and meaningful experiences.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Link href="/fixtures">
                <Button size="lg" className="rounded-xl px-7 py-5 text-sm font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 gap-2.5 transition-all">
                  <Calendar className="h-4 w-4" />
                  View Match Fixtures & Brackets
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="rounded-xl px-7 py-5 text-sm font-bold border-border/80 hover:border-sky-500/50 hover:bg-sky-500/10 gap-2 transition-all">
                  Register For Events <ArrowRight className="h-4 w-4 text-sky-500" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
