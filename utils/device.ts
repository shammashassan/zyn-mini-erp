// utils/device.ts

export interface DeviceInfo {
  deviceName: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
}

export function parseUserAgent(userAgent: string | undefined): DeviceInfo {
  if (!userAgent) {
    return {
      deviceName: 'Unknown Device',
      browser: 'Unknown Browser',
      os: 'Unknown OS',
      deviceType: 'unknown'
    };
  }

  // Detect OS
  let os = 'Unknown OS';
  if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10';
  else if (userAgent.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (userAgent.includes('Windows NT 6.2')) os = 'Windows 8';
  else if (userAgent.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS X')) {
    const match = userAgent.match(/Mac OS X (\d+)[._](\d+)/);
    os = match ? `macOS ${match[1]}.${match[2]}` : 'macOS';
  }
  else if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android (\d+\.?\d*)/);
    os = match ? `Android ${match[1]}` : 'Android';
  }
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    const match = userAgent.match(/OS (\d+)_(\d+)/);
    os = match ? `iOS ${match[1]}.${match[2]}` : 'iOS';
  }
  else if (userAgent.includes('Linux')) os = 'Linux';

  // Detect Browser
  let browser = 'Unknown Browser';
  if (userAgent.includes('Edg/')) {
    const match = userAgent.match(/Edg\/(\d+)/);
    browser = match ? `Edge ${match[1]}` : 'Edge';
  }
  else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg')) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    browser = match ? `Chrome ${match[1]}` : 'Chrome';
  }
  else if (userAgent.includes('Firefox/')) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    browser = match ? `Firefox ${match[1]}` : 'Firefox';
  }
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    const match = userAgent.match(/Version\/(\d+)/);
    browser = match ? `Safari ${match[1]}` : 'Safari';
  }
  else if (userAgent.includes('Opera') || userAgent.includes('OPR/')) {
    browser = 'Opera';
  }

  // Detect Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    deviceType = userAgent.includes('Tablet') || userAgent.includes('iPad') ? 'tablet' : 'mobile';
  }

  // Generate device name
  const deviceName = `${os} - ${browser}`;

  return {
    deviceName,
    browser,
    os,
    deviceType
  };
}

export function getDeviceIcon(deviceType: string): string {
  switch (deviceType) {
    case 'mobile':
      return '📱';
    case 'tablet':
      return '📱';
    case 'desktop':
      return '💻';
    default:
      return '🖥️';
  }
}