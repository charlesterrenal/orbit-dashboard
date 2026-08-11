import React from 'react';
import { 
  SiJellyfin, 
  SiRadarr, 
  SiSonarr, 
  SiN8n, 
  SiVaultwarden 
} from '@icons-pack/react-simple-icons';
import * as LucideIcons from 'lucide-react';

const ServiceIcon = ({ id, iconName, size = 22, ...props }) => {
  // Use custom brand logos based on the service id
  switch (id?.toLowerCase()) {
    case 'jellyfin':
      return <SiJellyfin size={size} color="#00A4DC" {...props} />;
    case 'radarr':
      return <SiRadarr size={size} color="#FFC230" {...props} />;
    case 'sonarr':
      return <SiSonarr size={size} color="#89C4F4" {...props} />;
    case 'n8n':
      return <SiN8n size={size} color="#FF6D5A" {...props} />;
    case 'vaultwarden':
      return <SiVaultwarden size={size} color="#175DDC" {...props} />;
    // Fallback if no specific brand logo exists
    default:
      break;
  }

  // Fallback to the configured Lucide icon
  const LucideIcon = LucideIcons[iconName] || LucideIcons.Server;
  return <LucideIcon size={size} strokeWidth={1.5} {...props} />;
};

export default ServiceIcon;
