import { Box, styled, useTheme } from '@mui/material';
import React, { useEffect, useState } from 'react';

export default function AigneLogo() {
  const [eyePosition, setEyePosition] = useState({ leftOffset: 0, topOffset: 0 });
  const [isBlinking, setIsBlinking] = useState(false); // 是否闭眼
  const avatarRef = React.useRef<HTMLDivElement>(null);
  const theme = useTheme();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (isBlinking) {
      timeoutId = setTimeout(() => setIsBlinking(false), 100);
    } else {
      timeoutId = setTimeout(() => setIsBlinking(true), Math.random() * 5000 + 2000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
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
        backgroundImage: 'url("https://www.aigne.io/image-bin/uploads/cc17dbd7750530beb89374fcd7063e7f.png")',
        filter: theme.palette.mode === 'dark' ? 'invert(1)' : 'none',
      }}>
      <Eye
        style={{
          left: `${13.5 + eyePosition.leftOffset}%`,
          top: `${51 + eyePosition.topOffset}%`,
          height: isBlinking ? '0' : '18%',
          transform: `translate(-50%, -50%) scaleY(${isBlinking ? '0.4' : '1'})`,
        }}
      />
      <Eye
        style={{
          left: `${21 + eyePosition.leftOffset}%`,
          top: `${51 + eyePosition.topOffset}%`,
          height: isBlinking ? '0' : '18%',
          transform: `translate(-50%, -50%) scaleY(${isBlinking ? '0.4' : '1'})`,
        }}
      />
    </AvatarContainer>
  );
}

const AvatarContainer = styled(Box)`
  position: relative;
  width: 128px;
  min-width: 128px;
  height: 44px;
  overflow: hidden;
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  margin: auto;
`;

const Eye = styled(Box)<{ isBlinking?: boolean; leftPercentage?: number; topPercentage?: number }>`
  position: absolute;
  width: 3.5%;
  background-color: black;
  border-radius: 100% / 100%;
  transition: height 0.2s ease-out;
`;
