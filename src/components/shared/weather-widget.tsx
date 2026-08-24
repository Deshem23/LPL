'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaWind, FaTint } from 'react-icons/fa';
import { WiSunrise, WiSunset } from 'react-icons/wi';
import { getWeather, WeatherData } from '@/lib/services/weather';

interface WeatherWidgetProps {
  city?: string;
  locale?: string;
  className?: string;
}

export function WeatherWidget({ city = 'Port-au-Prince', locale = 'fr', className = '' }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const data = await getWeather(city);
        setWeather(data);
      } catch (error) {
        console.error('Error fetching weather:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, [city]);

  if (loading) {
    return (
      <div className={`apple-card p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 bg-muted/50 animate-pulse rounded" />
          <div className="h-10 w-10 bg-muted/50 animate-pulse rounded-full" />
        </div>
        <div className="mt-3 h-14 w-full bg-muted/50 animate-pulse rounded" />
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    // Was missing the locale prefix (plain "/weather"), which 404s under
    // this app's [locale]-scoped routing - every other internal link
    // includes it.
    <Link href={`/${locale}/weather`} className="block group">
      <div className={`apple-card p-4 transition-all hover:shadow-md hover:border-primary/20 ${className}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{weather.icon}</span>
              <span className="text-3xl font-bold">{weather.temperature}°C</span>
            </div>
            <p className="text-base font-medium text-muted-foreground">{weather.condition}</p>
            <p className="text-sm font-semibold text-muted-foreground">{weather.city}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FaTint className="h-4 w-4" />
              <span className="font-medium">{weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-2">
              <FaWind className="h-4 w-4" />
              <span className="font-medium">{weather.windSpeed} km/h</span>
            </div>
          </div>
        </div>

        {/* Sunrise / sunset */}
        <div className="mt-3 flex items-center gap-4 border-t pt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <WiSunrise className="h-6 w-6 text-amber-500" />
            <span className="font-medium">{weather.sunrise}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <WiSunset className="h-6 w-6 text-orange-600" />
            <span className="font-medium">{weather.sunset}</span>
          </div>
        </div>

        {/* Mini Forecast - Larger Text */}
        <div className="mt-4 flex justify-between border-t pt-3">
          {weather.forecast.slice(0, 4).map((day, index) => (
            <div key={index} className="text-center">
              <p className="text-sm font-medium text-muted-foreground">{day.day}</p>
              <span className="text-xl">{day.icon}</span>
              <p className="text-sm font-semibold">{day.temperature}°</p>
            </div>
          ))}
          <div className="flex items-center text-sm font-medium text-primary">
            <span>Voir plus</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
