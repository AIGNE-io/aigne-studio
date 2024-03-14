export function didSpaceReady(user: any) {
  if (!user?.didSpace?.endpoint) {
    return false;
  }

  if (!window.blocklet) {
    return false;
  }

  const { componentMountPoints } = window.blocklet;
  // @ts-expect-error 暂时还没有这个属性,升级之后就有了
  return componentMountPoints.some((c) => c?.capabilities?.didSpace === 'requiredOnConnect');
}
