import { memo, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { useAnalyticsStore } from '@/services/analyticsService';
import { Activity, AlertTriangle } from 'lucide-react';

export const TrendAnalysis = memo(() => {
    const data = useAnalyticsStore((state) => state.data.hourlyRisk);

    const chartData = useMemo(() => data.map(d => ({
        ...d,
        score: Math.round(d.score)
    })), [data]);

    // Calculate high risk window for display
    const peakHour = useMemo(() => {
        const max = Math.max(...chartData.map(d => d.score));
        return chartData.find(d => d.score === max)?.hour || '18:00';
    }, [chartData]);

    return (
        <Card className="col-span-2 bg-gradient-to-b from-black/40 to-black/20 border-white/5 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-zinc-300">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    24h Risk Forecast
                </CardTitle>
                <div className="flex items-center gap-2 text-[10px] text-amber-500/80 bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10">
                    <AlertTriangle className="w-3 h-3" />
                    Peak Risk Window: Also {peakHour}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis
                                dataKey="hour"
                                stroke="#52525b"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                interval={3}
                            />
                            <YAxis
                                stroke="#52525b"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 100]}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px' }}
                                itemStyle={{ color: '#e4e4e7', fontSize: '12px', fontWeight: 500 }}
                                cursor={{ stroke: '#3f3f46', strokeDasharray: '4 4' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="score"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorRisk)"
                                strokeWidth={2}
                                activeDot={{ r: 4, fill: '#10b981', stroke: '#000', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
});
