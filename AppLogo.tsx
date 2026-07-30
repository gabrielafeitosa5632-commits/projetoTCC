interface AppLogoProps {
  size?: number;
  className?: string;
}

export function AppLogo({ size = 48, className }: AppLogoProps) {
  return (
    <img
      src="/logo-new.jpeg"
      width={size}
      height={size}
      className={className}
      alt="PhytoPathometric logo"
      style={{ objectFit: 'contain' }}
    />
  );
}

export default AppLogo;

