import React from 'react';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  CloudDrizzle, 
  CloudFog,
  Wind,
  Droplets,
  Moon,
  CloudMoon
} from 'lucide-react';

interface WeatherIconProps {
  icon: string;
  className?: string;
  size?: number;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ icon, className = 'w-6 h-6', size }) => {
  switch (icon) {
    case 'sun':
      return <Sun className={`${className} text-amber-400`} size={size} />;
    case 'moon':
      return <Moon className={`${className} text-sky-200`} size={size} />;
    case 'cloud-moon':
      return <CloudMoon className={`${className} text-indigo-300`} size={size} />;
    case 'sun-dim':
    case 'cloud-sun':
      return <CloudSun className={`${className} text-amber-300`} size={size} />;
    case 'cloud':
      return <Cloud className={`${className} text-slate-300`} size={size} />;
    case 'cloud-rain':
      return <CloudRain className={`${className} text-blue-400`} size={size} />;
    case 'cloud-drizzle':
      return <CloudDrizzle className={`${className} text-cyan-300`} size={size} />;
    case 'cloud-snow':
    case 'snowflake':
      return <CloudSnow className={`${className} text-indigo-200`} size={size} />;
    case 'cloud-lightning':
      return <CloudLightning className={`${className} text-yellow-400`} size={size} />;
    case 'cloud-fog':
      return <CloudFog className={`${className} text-slate-400`} size={size} />;
    case 'wind':
      return <Wind className={`${className} text-teal-300`} size={size} />;
    case 'droplets':
      return <Droplets className={`${className} text-sky-400`} size={size} />;
    default:
      return <CloudSun className={`${className} text-amber-300`} size={size} />;
  }
};
