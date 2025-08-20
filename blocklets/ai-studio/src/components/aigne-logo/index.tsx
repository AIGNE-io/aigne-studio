import { Box, styled, useTheme } from '@mui/material';
import React, { useEffect, useState } from 'react';

interface EyeProps {
  leftPercentage: number;
  topPercentage: number;
  isBlinking: boolean;
  eyeColor: string;
}

interface EyePosition {
  left: number;
  top: number;
}

interface LogoConfig {
  py?: number;
  bgUrl: string;
  eyeColor: string;
  eyes: EyePosition[];
}

const LOGO_HEIGHT = 44;

// https://github.com/blocklet/arcblock-pages-kit-components/blob/2ad141ed68a2a8e7abaed6d15b72d2d04f260983/src/components/AnimateLogo/index.tsx#L38C17-L55C4
const aigneStudioLogoConfigs = {
  light: {
    bgUrl: 'https://www.aigne.io/image-bin/uploads/1d3070fd4b4b93ba7920f1d1e51c7536.png',
    eyeColor: 'black',
    eyes: [
      { left: 7.5, top: 51 },
      { left: 13.5, top: 51 },
    ],
  },
  dark: {
    bgUrl: 'https://www.aigne.io/image-bin/uploads/a2752eafda792ba59347cc5b99319efc.png',
    eyeColor: 'white',
    eyes: [
      { left: 7.5, top: 51 },
      { left: 13.5, top: 51 },
    ],
  },
};

export default function AigneLogo() {
  const logoConfig = useLogoConfig();
  return <AnimLogo logoConfig={logoConfig} />;
}

function useLogoConfig() {
  const theme = useTheme();
  const logoConfig = theme.palette.mode === 'dark' ? aigneStudioLogoConfigs.dark : aigneStudioLogoConfigs.light;
  return logoConfig;
}

const AnimLogo: React.FC<{ logoConfig: LogoConfig }> = ({ logoConfig }) => {
  const [eyePosition, setEyePosition] = useState({
    leftOffset: 0,
    topOffset: 0,
  });
  const [isBlinking, setIsBlinking] = useState(false); // 是否闭眼
  const avatarRef = React.useRef<HTMLDivElement>(null);
  const theme = useTheme();

  // 定时器，控制眼睛闭合和睁开
  useEffect(() => {
    const blinkInterval = setTimeout(
      () => {
        setIsBlinking(true); // 眨眼闭合
        const blinkTimeout = setTimeout(() => {
          setIsBlinking(false); // 眨眼睁开
        }, 100); // 持续时间
        return () => clearTimeout(blinkTimeout);
      },
      Math.random() * 5000 + 2000
    ); // 随机时间间隔
    return () => clearTimeout(blinkInterval);
  }, [isBlinking]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (avatarRef.current) {
        const rect = avatarRef.current.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width * 0.12; // 基于容器的百分比位置
        const eyeCenterY = rect.top + rect.height * 0.42;

        const deltaX = event.clientX - eyeCenterX;
        const deltaY = event.clientY - eyeCenterY;

        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistanceX = 4; // 水平移动范围百分比
        const maxDistanceY = 6; // 垂直移动范围百分比
        const moveDistanceX = Math.min(maxDistanceX, distance);
        const moveDistanceY = Math.min(maxDistanceY, distance);

        const angle = Math.atan2(deltaY, deltaX);
        const moveX = Math.cos(angle) * moveDistanceX;
        const moveY = Math.sin(angle) * moveDistanceY;

        setEyePosition({ leftOffset: moveX, topOffset: moveY });
      }
    };

    const handleDocMouseLeave = () => {
      setEyePosition({ leftOffset: 0, topOffset: 0 });
    };

    // 监听鼠标事件
    window.addEventListener('mousemove', handleMouseMove);

    document.addEventListener('mouseleave', handleDocMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleDocMouseLeave);
    };
  }, []);

  return (
    <AvatarContainer
      ref={avatarRef}
      style={{
        // backgroundImage: `url("${logoConfig.bgUrl}")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
      }}>
      <Box
        component="img"
        src={logoConfig.bgUrl}
        alt="logo"
        sx={{ width: '100%', height: LOGO_HEIGHT, py: logoConfig.py }}
      />
      {logoConfig.eyes.map((eye, index) => (
        <Eye
          key={index}
          leftPercentage={eye.left + eyePosition.leftOffset}
          topPercentage={eye.top + eyePosition.topOffset}
          isBlinking={isBlinking}
          eyeColor={logoConfig.eyeColor}
        />
      ))}
    </AvatarContainer>
  );
};

const AvatarContainer = styled(Box)`
  position: relative;
  width: auto;
  height: ${LOGO_HEIGHT}px;
  background-size: contain;
  margin: 0 auto;
`;

const Eye = styled(Box)<EyeProps>`
  position: absolute;
  width: 6px;
  height: ${(props) => (props.isBlinking ? '0' : '18%')};
  background-color: ${(props) => props.eyeColor};
  border-radius: 100% / 100%;
  left: ${(props) => props.leftPercentage}%;
  top: ${(props) => props.topPercentage}%;
  transform: translate(-50%, -50%) scaleY(${(props) => (props.isBlinking ? '0.4' : '1')});
  transition: height 0.2s ease-out;
`;
