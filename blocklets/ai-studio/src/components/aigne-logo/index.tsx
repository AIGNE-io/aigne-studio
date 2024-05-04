import { Box, styled } from '@mui/material';
import React, { useEffect, useState } from 'react';

export default function AigneLogo() {
  const [eyePosition, setEyePosition] = useState({ leftOffset: 0, topOffset: 0 });
  const [isBlinking, setIsBlinking] = useState(false); // 是否闭眼
  const avatarRef = React.useRef<HTMLDivElement>(null);

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
      style={{ backgroundImage: 'url("https://www.aigne.io/image-bin/uploads/cc17dbd7750530beb89374fcd7063e7f.png")' }}>
      <Eye
        leftPercentage={13.5 + eyePosition.leftOffset}
        topPercentage={51 + eyePosition.topOffset}
        isBlinking={isBlinking}
      />
      <Eye
        leftPercentage={21 + eyePosition.leftOffset}
        topPercentage={51 + eyePosition.topOffset}
        isBlinking={isBlinking}
      />
    </AvatarContainer>
  );
}

const AvatarContainer = styled(Box)`
  position: relative;
  width: 128px;
  height: 44px;
  background-size: contain;
  margin: auto;
`;

const Eye = styled(Box)<{ isBlinking?: boolean; leftPercentage: number; topPercentage: number }>`
  position: absolute;
  width: 3.5%;
  height: ${(props) => (props.isBlinking ? '0' : '18%')};
  background-color: black;
  border-radius: 100% / 100%;
  left: ${(props) => props.leftPercentage}%;
  top: ${(props) => props.topPercentage}%;
  transform: translate(-50%, -50%) scaleY(${(props) => (props.isBlinking ? '0.4' : '1')});
  transition: height 0.2s ease-out;
`;
