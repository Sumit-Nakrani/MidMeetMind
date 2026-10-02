import React, { useState, useMemo } from 'react';
import { Trip, BudgetBreakdown } from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Hotel, 
  Plane, 
  Utensils, 
  Ticket, 
  ShieldAlert, 
  Sparkles, 
  Coins, 
  Calendar, 
  MapPin, 
  ArrowRight,
  Info,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  Layers,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { 
  formatPrice, 
  convertCurrency, 
  getTripConvertedBudget, 
  CURRENCY_SYMBOLS 
} from '../lib/currency';

interface FinancialSummaryViewProps {
  trip: Trip;
  currency: string;
  onOpenBudgetModal?: () => void;
  onApplyBudget?: (totalBudget: number, breakdown?: BudgetBreakdown, appliedCurrency?: string) => void;
  onSelectStop?: (stopId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  accommodations: '#3b82f6', // Blue
  transport: '#0ea5e9',      // Sky blue
  foodAndDining: '#f59e0b',  // Amber
  activitiesAndSightseeing: '#6366f1', // Indigo
  miscellaneous: '#10b981',  // Emerald
};

export const FinancialSummaryView: React.FC<FinancialSummaryViewProps> = ({
  trip,
  currency,
  onOpenBudgetModal,
  onApplyBudget,
  onSelectStop,
}) => {
  const [chartViewMode, setChartViewMode] = useState<'categories' | 'daily' | 'cities'>('categories');
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const totalNights = trip.stops.reduce((sum, s) => sum + s.nights, 0) || trip.totalDays || 7;
  const travelers = trip.travelers || 2;

  // Compute live budget metrics in active currency
  const budgetData = useMemo(() => {
    return getTripConvertedBudget(trip, currency);
  }, [trip, currency]);

  const { totalBudget, breakdown, plannedActivitiesTotal, plannedTransitTotal } = budgetData;

  const averageCostPerDay = Math.round(totalBudget / Math.max(1, totalNights));
  const dailyPerPerson = Math.round(totalBudget / Math.max(1, totalNights * travelers));

  // 1. Prepare Pie Chart Data (Category Breakdown)
  const categoryPieData = useMemo(() => {
    const total = totalBudget || 1;
    return [
      {
        id: 'accommodations',
        name: 'Stay & Accommodation',
        value: breakdown.accommodations,
        percentage: Math.round((breakdown.accommodations / total) * 100),
        color: CATEGORY_COLORS.accommodations,
        icon: Hotel,
        description: `Lodging across ${totalNights} nights (${formatPrice(Math.round(breakdown.accommodations / totalNights), currency)}/night)`,
      },
      {
        id: 'transport',
        name: 'Transit & Flights',
        value: breakdown.transport,
        percentage: Math.round((breakdown.transport / total) * 100),
        color: CATEGORY_COLORS.transport,
        icon: Plane,
        description: `Inter-city trains, flights & local metro (${formatPrice(plannedTransitTotal, currency)} scheduled)`,
      },
      {
        id: 'foodAndDining',
        name: 'Meals & Dining',
        value: breakdown.foodAndDining,
        percentage: Math.round((breakdown.foodAndDining / total) * 100),
        color: CATEGORY_COLORS.foodAndDining,
        icon: Utensils,
        description: `Daily breakfast, lunch, cafe & dinner (~${formatPrice(Math.round(breakdown.foodAndDining / (totalNights * travelers)), currency)}/day/person)`,
      },
      {
        id: 'activitiesAndSightseeing',
        name: 'Activities & Sightseeing',
        value: breakdown.activitiesAndSightseeing,
        percentage: Math.round((breakdown.activitiesAndSightseeing / total) * 100),
        color: CATEGORY_COLORS.activitiesAndSightseeing,
        icon: Ticket,
        description: `Tours, museum passes & excursions (${formatPrice(plannedActivitiesTotal, currency)} scheduled)`,
      },
      {
        id: 'miscellaneous',
        name: 'Contingency & Misc',
        value: breakdown.miscellaneous,
        percentage: Math.round((breakdown.miscellaneous / total) * 100),
        color: CATEGORY_COLORS.miscellaneous,
        icon: ShieldAlert,
        description: `Tourist taxes, local eSIM data, tips & safety buffer`,
      },
    ];
  }, [totalBudget, breakdown, totalNights, travelers, currency, plannedTransitTotal, plannedActivitiesTotal]);

  // 2. Prepare Daily Breakdown Data & Detect Overbudget Days
  const { dailyCostData, overbudgetDays, totalScheduledDirectCost } = useMemo(() => {
    const list: {
      dayIndex: number;
      dayLabel: string;
      stopName: string;
      stopId: string;
      activitiesCost: number;
      transitCost: number;
      estimatedStayMealCost: number;
      totalDayCost: number;
      targetDailyBudget: number;
      isOverbudget: boolean;
      overageAmount: number;
      activitiesCount: number;
      mainEvent: string;
    }[] = [];

    const baseCurrency = trip.currency || 'USD';
    const baselineDailyStayMeal = Math.round((breakdown.accommodations + breakdown.foodAndDining + breakdown.miscellaneous) / Math.max(1, totalNights));
    const targetDaily = averageCostPerDay;

    let dayCounter = 1;
    let totalScheduled = 0;

    trip.stops.forEach((stop) => {
      // Transit cost to get to this stop (assigned to first day of stop)
      const stopTransitCost = stop.transitCost ? convertCurrency(stop.transitCost, baseCurrency, currency) : 0;

      stop.days.forEach((day, dIdx) => {
        const activitiesCost = day.activities.reduce((sum, act) => {
          return sum + (act.cost ? convertCurrency(act.cost, baseCurrency, currency) : 0);
        }, 0);

        const transitCost = dIdx === 0 ? stopTransitCost : 0;
        const totalDayCost = activitiesCost + transitCost + baselineDailyStayMeal;
        const isOver = totalDayCost > targetDaily * 1.15; // 15% threshold
        const overage = Math.max(0, totalDayCost - targetDaily);

        totalScheduled += (activitiesCost + transitCost);

        const topActivity = day.activities.length > 0
          ? day.activities.reduce((prev, curr) => ((curr.cost || 0) > (prev.cost || 0) ? curr : prev)).title
          : transitCost > 0 ? `${stop.transitMode || 'Transit'} to ${stop.cityName}` : 'City Exploration';

        list.push({
          dayIndex: dayCounter,
          dayLabel: `Day ${dayCounter} (${stop.cityName})`,
          stopName: stop.cityName,
          stopId: stop.id,
          activitiesCost,
          transitCost,
          estimatedStayMealCost: baselineDailyStayMeal,
          totalDayCost,
          targetDailyBudget: targetDaily,
          isOverbudget: isOver,
          overageAmount: overage,
          activitiesCount: day.activities.length,
          mainEvent: topActivity,
        });

        dayCounter++;
      });
    });

    const overList = list.filter((d) => d.isOverbudget);

    return {
      dailyCostData: list,
      overbudgetDays: overList,
      totalScheduledDirectCost: totalScheduled,
    };
  }, [trip, breakdown, currency, totalNights, averageCostPerDay]);

  // 3. Prepare City-by-City Cost Data
  const cityCostData = useMemo(() => {
    const baseCurrency = trip.currency || 'USD';
    const perNightStayMeal = Math.round((breakdown.accommodations + breakdown.foodAndDining) / Math.max(1, totalNights));

    return trip.stops.map((stop) => {
      const transit = stop.transitCost ? convertCurrency(stop.transitCost, baseCurrency, currency) : 0;
      const activities = stop.days.reduce((sum, d) => {
        return sum + d.activities.reduce((aSum, a) => aSum + (a.cost ? convertCurrency(a.cost, baseCurrency, currency) : 0), 0);
      }, 0);
      const stayAndMeals = perNightStayMeal * stop.nights;
      const totalStopCost = transit + activities + stayAndMeals;

      return {
        stopId: stop.id,
        cityName: stop.cityName,
        country: stop.country,
        nights: stop.nights,
        transitCost: transit,
        activitiesCost: activities,
        stayAndMealsCost: stayAndMeals,
        totalCost: totalStopCost,
        costPerNight: Math.round(totalStopCost / Math.max(1, stop.nights)),
      };
    });
  }, [trip, breakdown, currency, totalNights]);

  // Custom Pie Chart Tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.name}</span>
          </div>
          <div className="text-sm font-extrabold text-white">
            {formatPrice(data.value, currency)}{' '}
            <span className="text-xs font-normal text-slate-400">({data.percentage}%)</span>
          </div>
          <p className="text-[11px] text-slate-300">{data.description}</p>
        </div>
      );
    }
    return null;
  };

  // Custom Bar Chart Tooltip
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-2 max-w-xs">
          <div className="font-bold text-sm text-blue-300">{data.dayLabel}</div>
          <div className="space-y-1 text-[11px] border-t border-slate-800 pt-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Stay & Dining:</span>
              <span className="font-semibold">{formatPrice(data.estimatedStayMealCost, currency)}</span>
            </div>
            {data.transitCost > 0 && (
              <div className="flex justify-between">
                <span className="text-sky-400">Transit:</span>
                <span className="font-semibold text-sky-300">{formatPrice(data.transitCost, currency)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-indigo-400">Activities ({data.activitiesCount}):</span>
              <span className="font-semibold text-indigo-300">{formatPrice(data.activitiesCost, currency)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-white text-xs">
              <span>Total Day Cost:</span>
              <span className={data.isOverbudget ? 'text-amber-400' : 'text-emerald-400'}>
                {formatPrice(data.totalDayCost, currency)}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Target Daily Avg:</span>
              <span>{formatPrice(data.targetDailyBudget, currency)}</span>
            </div>
          </div>
          {data.isOverbudget && (
            <div className="bg-amber-500/20 text-amber-300 p-1.5 rounded-lg text-[10px] flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Over average daily budget by {formatPrice(data.overageAmount, currency)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Metrics Card Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Estimated Cost */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-24 h-24 text-white" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-300 tracking-wider uppercase">
                Estimated Total Trip Cost
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                {currency}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              {formatPrice(totalBudget, currency)}
            </div>
          </div>
          <p className="text-xs text-blue-200/80 mt-3 pt-2 border-t border-blue-800/50 flex items-center justify-between">
            <span>{travelers} traveler{travelers > 1 ? 's' : ''}</span>
            <span>{totalNights} nights ({trip.stops.length} cities)</span>
          </p>
        </div>

        {/* Metric 2: Average Cost Per Day */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                Average Daily Cost
              </span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              {formatPrice(averageCostPerDay, currency)}{' '}
              <span className="text-xs font-normal text-slate-500">/ day</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Per Person Rate:</span>
            <span className="font-bold text-slate-800">{formatPrice(dailyPerPerson, currency)} / person / day</span>
          </p>
        </div>

        {/* Metric 3: Planned & Scheduled Bookings */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                Scheduled Items Sum
              </span>
              <Ticket className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-900 mt-2">
              {formatPrice(totalScheduledDirectCost, currency)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Transit: {formatPrice(plannedTransitTotal, currency)}</span>
            <span>Activities: {formatPrice(plannedActivitiesTotal, currency)}</span>
          </div>
        </div>

        {/* Metric 4: Budget Health & Overbudget Alerts Status */}
        <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${
          overbudgetDays.length > 0 
            ? 'bg-amber-50/70 border-amber-200' 
            : 'bg-emerald-50/70 border-emerald-200'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold tracking-wider uppercase ${
                overbudgetDays.length > 0 ? 'text-amber-800' : 'text-emerald-800'
              }`}>
                Budget Health Status
              </span>
              {overbudgetDays.length > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <div className={`text-xl sm:text-2xl font-black mt-2 ${
              overbudgetDays.length > 0 ? 'text-amber-950' : 'text-emerald-950'
            }`}>
              {overbudgetDays.length > 0 
                ? `${overbudgetDays.length} Peak Expense ${overbudgetDays.length === 1 ? 'Day' : 'Days'}`
                : 'Balanced Daily Plan'
              }
            </div>
          </div>
          <p className={`text-xs mt-3 pt-2 border-t font-medium ${
            overbudgetDays.length > 0 
              ? 'text-amber-800 border-amber-200' 
              : 'text-emerald-800 border-emerald-200'
          }`}>
            {overbudgetDays.length > 0 
              ? 'Some days exceed average daily cost due to transit or tours.'
              : 'All daily schedules are within balanced thresholds.'}
          </p>
        </div>

      </div>

      {/* 2. Overbudget Days Alert Banner (If Applicable) */}
      {overbudgetDays.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-50 to-orange-50 border border-amber-200 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-amber-950">
                  Alert: High-Expense Travel Days Detected ({overbudgetDays.length})
                </h4>
                <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Threshold: &gt; 115% of daily average ({formatPrice(Math.round(averageCostPerDay * 1.15), currency)})
                </span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                The following days have higher expenditures than your average daily budget allocation, typically driven by long-distance transit bookings or premium activities. Consider spreading activities across lighter days or balancing with free sightseeing.
              </p>

              {/* Overbudget Day Badges */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {overbudgetDays.map((day) => (
                  <div
                    key={`over-${day.dayIndex}`}
                    className="p-3 bg-white/90 rounded-xl border border-amber-200/90 flex flex-col justify-between shadow-xs hover:border-amber-400 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {day.dayLabel}
                        </span>
                        <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          +{formatPrice(day.overageAmount, currency)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-1">
                        Primary driver: <span className="font-semibold text-slate-700">{day.mainEvent}</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 pt-1.5 border-t border-slate-100">
                      <span>Total: <strong className="text-slate-900">{formatPrice(day.totalDayCost, currency)}</strong></span>
                      {onSelectStop && (
                        <button
                          onClick={() => onSelectStop(day.stopId)}
                          className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                        >
                          <span>View Day</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Interactive Chart & Breakdown Centerpiece */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        
        {/* Navigation Switcher for Chart Views */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>Financial Analytics & Visual Breakdown</span>
            </h3>
            <p className="text-xs text-slate-500">
              Interactive cost models comparing category allocations, daily schedules, and city investments.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              id="btn-chart-mode-categories"
              onClick={() => setChartViewMode('categories')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartViewMode === 'categories'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>By Category (Pie)</span>
            </button>

            <button
              id="btn-chart-mode-daily"
              onClick={() => setChartViewMode('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartViewMode === 'daily'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Daily Timeline (Bar)</span>
            </button>

            <button
              id="btn-chart-mode-cities"
              onClick={() => setChartViewMode('cities')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartViewMode === 'cities'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>City Comparison</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: CATEGORY BREAKDOWN (PIE CHART + PROGRESS LIST) */}
        {chartViewMode === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Recharts Pie Chart */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="w-full h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="text-center -mt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Total Budget
                </span>
                <span className="text-xl font-extrabold text-slate-900">
                  {formatPrice(totalBudget, currency)}
                </span>
              </div>
            </div>

            {/* Right: Detailed Category Progress Cards */}
            <div className="lg:col-span-7 space-y-3">
              {categoryPieData.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <div
                    key={cat.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                          style={{ backgroundColor: cat.color }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{cat.name}</span>
                          <span className="text-[11px] text-slate-500 block">{cat.description}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900 block">
                          {formatPrice(cat.value, currency)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 inline-block mt-0.5">
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(2, cat.percentage)}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: DAILY TIMELINE (BAR CHART COMPARING TO TARGET DAILY BUDGET) */}
        {chartViewMode === 'daily' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
                  <span className="font-semibold text-slate-700">Estimated Stay & Dining</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />
                  <span className="font-semibold text-slate-700">Scheduled Activities</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-sky-500 inline-block" />
                  <span className="font-semibold text-slate-700">Inter-City Transit</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                <span className="w-3 h-0.5 bg-rose-500 inline-block border-t border-rose-500" />
                <span>Target Daily Average ({formatPrice(averageCostPerDay, currency)})</span>
              </div>
            </div>

            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyCostData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="dayIndex" 
                    tickLine={false} 
                    stroke="#64748b" 
                    tickFormatter={(val) => `D${val}`} 
                    fontSize={11}
                  />
                  <YAxis 
                    tickLine={false} 
                    stroke="#64748b" 
                    fontSize={11}
                    tickFormatter={(val) => formatPrice(val, currency)}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <ReferenceLine 
                    y={averageCostPerDay} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{
                      value: `Target Avg: ${formatPrice(averageCostPerDay, currency)}`,
                      fill: '#ef4444',
                      fontSize: 10,
                      position: 'insideTopRight'
                    }}
                  />
                  <Bar dataKey="estimatedStayMealCost" stackId="a" fill="#3b82f6" name="Stay & Meals" />
                  <Bar dataKey="activitiesCost" stackId="a" fill="#6366f1" name="Activities" />
                  <Bar dataKey="transitCost" stackId="a" fill="#0ea5e9" name="Transit" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Hover over bars to inspect itemized breakdown. Days with tall bars include scheduled transit legs or multiple booked excursions.
            </p>
          </div>
        )}

        {/* VIEW 3: CITY-BY-CITY COMPARISON */}
        {chartViewMode === 'cities' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cityCostData.map((city) => (
                <div
                  key={city.stopId}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{city.cityName}</h4>
                        <span className="text-xs text-slate-500">{city.country} • {city.nights} nights</span>
                      </div>
                      <span className="text-xs font-extrabold text-blue-900 bg-blue-100/80 px-2.5 py-1 rounded-xl border border-blue-200">
                        {formatPrice(city.totalCost, currency)}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 mt-4 border-t border-slate-200/80 pt-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Lodging & Dining:</span>
                        <span className="font-semibold">{formatPrice(city.stayAndMealsCost, currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Activities & Tours:</span>
                        <span className="font-semibold text-indigo-700">{formatPrice(city.activitiesCost, currency)}</span>
                      </div>
                      {city.transitCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Transit to City:</span>
                          <span className="font-semibold text-sky-700">{formatPrice(city.transitCost, currency)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Nightly Average:</span>
                    <strong className="text-slate-900 font-bold">{formatPrice(city.costPerNight, currency)} / night</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* 4. Action & Optimization Footer */}
      <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Need to adjust or optimize your trip budget?</h4>
            <p className="text-xs text-slate-300">
              Run AI financial simulations, change travel styles, or set custom budget goals.
            </p>
          </div>
        </div>

        {onOpenBudgetModal && (
          <button
            id="btn-financial-open-estimator"
            onClick={onOpenBudgetModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0"
          >
            <span>Open Budget Estimator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

    </div>
  );
};
