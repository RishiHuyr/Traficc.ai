import { useState, useCallback, useEffect, useRef } from 'react';
import { useRoutePlannerStore, LocationPoint } from '@/store/routePlannerStore';
import { geocodeAddress, fetchOSRMRoute, reverseGeocode } from '@/services/routeApi';
import { Search, MapPin, LocateFixed, Route as RouteIcon, Loader2, ArrowDownUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export const LocationInputPanel = () => {
    const {
        startLocation, destination,
        setStartLocation, setDestination,
        setRoutes, setIsCalculating, setError, isCalculating
    } = useRoutePlannerStore();

    const [startQuery, setStartQuery] = useState('');
    const [destQuery, setDestQuery] = useState('');

    const [startSuggestions, setStartSuggestions] = useState<LocationPoint[]>([]);
    const [destSuggestions, setDestSuggestions] = useState<LocationPoint[]>([]);

    const [isSearchingStart, setIsSearchingStart] = useState(false);
    const [isSearchingDest, setIsSearchingDest] = useState(false);

    // Focus tracking
    const [focusedInput, setFocusedInput] = useState<'start' | 'dest' | null>(null);

    const searchTimeoutRef = useRef<NodeJS.Timeout>();
    const hasAutoLocated = useRef(false);

    // Auto-detect location on mount
    useEffect(() => {
        if (!hasAutoLocated.current) {
            hasAutoLocated.current = true;
            detectLocation();
        }
    }, []);

    const handleSearch = useCallback(async (query: string, type: 'start' | 'dest') => {
        if (query.length < 3) {
            if (type === 'start') setStartSuggestions([]);
            else setDestSuggestions([]);
            return;
        }

        if (type === 'start') setIsSearchingStart(true);
        else setIsSearchingDest(true);

        try {
            const results = await geocodeAddress(query);
            if (type === 'start') setStartSuggestions(results);
            else setDestSuggestions(results);
        } catch (error) {
            console.error(error);
        } finally {
            if (type === 'start') setIsSearchingStart(false);
            else setIsSearchingDest(false);
        }
    }, []);

    const onStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setStartQuery(val);
        if (!val && startLocation) setStartLocation(null);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => handleSearch(val, 'start'), 500);
    };

    const onDestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDestQuery(val);
        if (!val && destination) setDestination(null);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => handleSearch(val, 'dest'), 500);
    };

    const selectStart = (loc: LocationPoint) => {
        setStartLocation(loc);
        setStartQuery(loc.label);
        setStartSuggestions([]);
        setFocusedInput(null);
    };

    const selectDest = (loc: LocationPoint) => {
        setDestination(loc);
        setDestQuery(loc.label);
        setDestSuggestions([]);
        setFocusedInput(null);
    };

    const detectLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        toast.promise(
            new Promise<LocationPoint>(async (resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        try {
                            const address = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
                            resolve({
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude,
                                label: address || 'Your Current Location'
                            });
                        } catch (e) {
                            resolve({
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude,
                                label: 'Your Current Location'
                            });
                        }
                    },
                    (err) => reject(err),
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            }),
            {
                loading: 'Detecting location...',
                success: (loc) => {
                    selectStart(loc);
                    return `Location detected: ${loc.label.split(',')[0]}`;
                },
                error: 'Could not detect your location.'
            }
        );
    };

    const handleFindRoute = async () => {
        if (!startLocation || !destination) {
            toast.error('Please select both a start location and destination');
            return;
        }

        setIsCalculating(true);
        setError(null);

        try {
            const paths = await fetchOSRMRoute(startLocation, destination);
            setRoutes(paths);
            if (paths.length > 0) {
                toast.success(`Found ${paths.length} routes!`);
            }
        } catch (error: any) {
            setError(error.message);
            toast.error('Failed to calculate routes: ' + error.message);
        } finally {
            setIsCalculating(false);
        }
    };

    return (
        <div className="w-full flex justify-center">
            <Card className="bg-zinc-950/80 backdrop-blur-xl border-zinc-800 shadow-2xl overflow-visible w-full max-w-4xl p-1.5 rounded-full ring-1 ring-white/10">
                <div className="flex flex-col md:flex-row items-center gap-1">

                    {/* Start Input */}
                    <div className="relative flex-1 w-full md:w-auto">
                        <div className="relative group">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                            <Input
                                placeholder="Starting location..."
                                className="pl-10 pr-10 bg-transparent border-0 focus-visible:ring-0 h-12 text-sm text-white placeholder:text-zinc-500 rounded-full"
                                value={startQuery}
                                onChange={onStartChange}
                                onFocus={() => setFocusedInput('start')}
                                onBlur={() => setTimeout(() => setFocusedInput(null), 200)}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-zinc-500 hover:text-primary transition-colors"
                                onClick={detectLocation}
                            >
                                <LocateFixed className="w-4 h-4" />
                            </Button>
                        </div>

                        <AnimatePresence>
                            {focusedInput === 'start' && (startSuggestions.length > 0 || isSearchingStart) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-[calc(100%+8px)] left-0 right-[-50px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[500] p-1"
                                >
                                    {isSearchingStart ? (
                                        <div className="px-4 py-3 text-xs text-zinc-500 flex items-center gap-3">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                                        </div>
                                    ) : (
                                        startSuggestions.map((s, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer text-xs text-zinc-300 rounded-xl transition-colors"
                                                onClick={() => selectStart(s)}
                                            >
                                                <Search className="w-3 h-3 text-zinc-500 shrink-0" />
                                                <span className="truncate">{s.label}</span>
                                            </div>
                                        ))
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="hidden md:block h-6 w-px bg-zinc-800 mx-2" />
                    <ArrowDownUp className="md:hidden w-4 h-4 text-zinc-700 my-1" />

                    {/* Destination Input */}
                    <div className="relative flex-1 w-full md:w-auto">
                        <div className="relative">
                            <RouteIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                            <Input
                                placeholder="Enter destination..."
                                className="pl-10 bg-transparent border-0 focus-visible:ring-0 h-12 text-sm text-white placeholder:text-zinc-500 rounded-full"
                                value={destQuery}
                                onChange={onDestChange}
                                onFocus={() => setFocusedInput('dest')}
                                onBlur={() => setTimeout(() => setFocusedInput(null), 200)}
                            />
                            {isSearchingDest && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-500" />}
                        </div>

                        <AnimatePresence>
                            {focusedInput === 'dest' && (destSuggestions.length > 0 || isSearchingDest) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-[calc(100%+8px)] left-[-50px] right-0 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[500] p-1"
                                >
                                    {isSearchingDest ? (
                                        <div className="px-4 py-3 text-xs text-zinc-500 flex items-center gap-3">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                                        </div>
                                    ) : (
                                        destSuggestions.map((s, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer text-xs text-zinc-300 rounded-xl transition-colors"
                                                onClick={() => selectDest(s)}
                                            >
                                                <Search className="w-3 h-3 text-zinc-500 shrink-0" />
                                                <span className="truncate">{s.label}</span>
                                            </div>
                                        ))
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Action Button */}
                    <Button
                        className="w-full md:w-auto h-11 px-8 bg-primary hover:bg-primary/90 text-white font-semibold rounded-full shadow-lg shadow-primary/20 transition-all ml-1"
                        onClick={handleFindRoute}
                        disabled={!startLocation || !destination || isCalculating}
                    >
                        {isCalculating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <span>Find Route</span>
                                <ArrowDownUp className="w-4 h-4 rotate-90" />
                            </div>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );
};
