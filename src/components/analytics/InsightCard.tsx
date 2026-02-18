import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface InsightCardProps {
    type: 'positive' | 'warning' | 'critical';
    title: string;
    description: string;
    recommendation: string;
    onDismiss?: () => void;
    onViewZone?: () => void;
}

export const InsightCard = memo(({ type, title, description, recommendation, onDismiss, onViewZone }: InsightCardProps) => {
    const colors = {
        positive: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400',
        warning: 'bg-amber-500/5 border-amber-500/20 text-amber-400',
        critical: 'bg-rose-500/5 border-rose-500/20 text-rose-400'
    };

    const icons = {
        positive: TrendingUp,
        warning: AlertTriangle,
        critical: AlertTriangle
    };

    const Icon = icons[type];
    const borderColorClass = type === 'critical' ? 'border-rose-500/40' :
        type === 'warning' ? 'border-amber-500/40' :
            'border-emerald-500/40';

    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <Card className={`border-l-[3px] ${borderColorClass} ${colors[type]} backdrop-blur-sm shadow-none`}>
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4`} />
                        <h4 className="font-semibold text-sm text-foreground/90">{title}</h4>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                        {description}
                    </p>

                    <div className="flex items-start gap-2 pt-3 border-t border-white/5">
                        <Lightbulb className="w-3 h-3 text-yellow-500/80 mt-0.5 shrink-0" />
                        <p className="text-xs font-medium text-zinc-300">
                            {recommendation}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button onClick={onDismiss} variant="ghost" size="sm" className="h-6 text-[10px] text-zinc-500 hover:text-zinc-300 px-2 cursor-pointer z-10 relative">
                            Dismiss
                        </Button>
                        <Button onClick={onViewZone} variant="outline" size="sm" className="h-6 text-[10px] border-zinc-700 bg-transparent hover:bg-white/5 text-zinc-300 gap-1 px-2 cursor-pointer z-10 relative">
                            View Zone <ArrowRight className="w-2.5 h-2.5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
});
